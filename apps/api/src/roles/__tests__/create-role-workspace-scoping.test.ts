/**
 * POST /roles let a caller mint a custom role inside a workspace they are
 * not a member of, using their permissions from an unrelated workspace as
 * the ceiling (requirePermission's assignment lookup is unscoped — "does
 * this user hold canManageRoles *anywhere*?"). This pins the fix in two
 * layers:
 *
 *  - Part 1: the route now checks memberWorkspaceIds(userEmail) before
 *    calling createRole, and rejects with 404 (not 403 — consistent with
 *    the read routes, and it doesn't confirm the workspace exists to
 *    someone outside it) when the target workspace isn't one of them.
 *  - Part 2: actorContext resolves the ceiling via resolveRolePermissions
 *    using the assignment's workspaceId, not just any assignment the user
 *    holds anywhere.
 *
 * NOTE on coverage limits: the shared mock database
 * (apps/api/src/tests/helpers/test-database.ts) implements `.where()` as
 * `vi.fn().mockReturnValue(chain)` — it discards whatever predicate is
 * passed to it and returns canned results by call order only. That means
 * the actual SQL predicate `eq(roleAssignmentTable.workspaceId, workspaceId)`
 * inside actorContext is NOT exercised by this harness: a regression that
 * silently dropped that predicate from the query (so the DB itself returned
 * an assignment from the wrong workspace) would not be caught here, only by
 * an integration test against a real database. What IS covered below is the
 * application-level plumbing: that the value read off the returned
 * assignment row is what gets threaded into resolveRolePermissions, rather
 * than being dropped, hardcoded, or swapped for an unrelated value.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

// Stub the permission guard so it always passes through. This test is about
// the workspace-membership check inside the POST handler, not about
// requirePermission itself, which is covered elsewhere.
vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (_c: Context, next: Next) => {
    await next();
  },
}));

// Isolate the route's own wiring from resolveRolePermissions' internals
// (already covered by resolve-role-permissions.test.ts) so this file can
// assert purely on what arguments the route threads through to it.
vi.mock("../lib/resolve-role-permissions", () => ({
  resolveRolePermissions: (...args: unknown[]) =>
    resolveRolePermissionsMock(...args),
  invalidateRoleCache: vi.fn(),
}));

// Isolate from createRole's own escalation-guard/insert logic (covered by
// create-role.test.ts) so this file is purely about the route's
// membership + ceiling-scoping plumbing.
vi.mock("../controllers/create-role", () => ({
  createRole: (...args: unknown[]) => createRoleMock(...args),
}));

const mockDb = createMockDb();
const resolveRolePermissionsMock = vi.fn(async () => ({ canViewTasks: true }));
const createRoleMock = vi.fn(async () => ({
  id: "new-role",
  name: "Auditor",
  description: null,
  type: "custom" as const,
  color: "#3B82F6",
  usersCount: 0,
  lastUsedAt: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
}));

function buildApp() {
  return import("../index").then(({ default: rolesRouter }) => {
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "actor@example.com");
      await next();
    });
    app.route("/", rolesRouter);
    return app;
  });
}

describe("POST /roles cross-workspace escalation guard", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("rejects with 404 when the caller is not a member of the requested workspace", async () => {
    // Regression guard for a defective earlier version of this test: it
    // seeded mockDb.__setSelectResults([]) (an empty queue) and asserted
    // only res.status === 404. That passed whether or not the guard fired,
    // because an empty select queue makes actorContext's own user lookup
    // return zero rows, and actorContext throws its own
    // HTTPException(404, { message: "User not found" }) when that happens.
    // So with the guard deleted entirely, execution falls through past the
    // membership check, straight into actorContext, which 404s anyway for
    // an unrelated reason — createRole is never reached either way, and
    // both old assertions (status 404, createRoleMock not called) were
    // satisfied by the wrong code path. The test was advertising coverage
    // for the tenant-boundary guard that did not exist.
    //
    // The fix: seed every row actorContext would need to succeed — the same
    // rows the "proceeds when the caller is a member" test below uses for
    // the target workspace — so that if the guard were bypassed, the
    // request would fall through to a 201, not a 404. The ONLY thing that
    // makes this request different from the happy-path sibling is that
    // memberWorkspaceIds resolves to a workspace list that does NOT contain
    // the requested workspaceId. And the assertion checks the specific
    // error body ("Workspace not found"), not just the status code, so a
    // 404 coming from actorContext's "User not found" branch is
    // distinguishable and fails the test.
    const targetWorkspaceId = "workspace-the-caller-is-not-in";
    mockDb.__setSelectResults(
      // memberWorkspaceIds: caller belongs only to an unrelated workspace,
      // not the requested one.
      [{ workspaceId: "some-other-workspace" }],
      // actorContext: user lookup — present, so if the guard were bypassed
      // actorContext would NOT throw its own "User not found" 404.
      [{ id: "user-1" }],
      // actorContext: role-assignment lookup, scoped to the target
      // workspace — present, so if the guard were bypassed the request
      // would proceed all the way to createRole and succeed.
      [{ role: "member", workspaceId: targetWorkspaceId }],
    );

    const app = await buildApp();

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Superuser",
        permissions: ["canManageRoles"],
        workspaceId: targetWorkspaceId,
      }),
    });

    expect(res.status).toBe(404);
    // Discriminating assertion: a 404 from actorContext's "User not found"
    // branch (the false-pass path from the guard being bypassed/removed)
    // must fail this check, since only the guard produces this message.
    expect(await res.json()).toEqual({ error: "Workspace not found" });
    expect(createRoleMock).not.toHaveBeenCalled();
  });

  it("proceeds when the caller is a member, and resolves the ceiling for the TARGET workspace", async () => {
    const targetWorkspaceId = "ws-1";
    mockDb.__setSelectResults(
      // memberWorkspaceIds: caller belongs to the target workspace
      [{ workspaceId: targetWorkspaceId }],
      // actorContext: user lookup
      [{ id: "user-1" }],
      // actorContext: role-assignment lookup, scoped to the target workspace
      [{ role: "member", workspaceId: targetWorkspaceId }],
    );

    const app = await buildApp();

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Auditor",
        permissions: ["canViewTasks"],
        workspaceId: targetWorkspaceId,
      }),
    });

    expect(res.status).toBe(201);

    // The observable boundary the harness CAN see: whatever the route reads
    // off the returned assignment row must be what actually reaches
    // resolveRolePermissions — not a dropped, hardcoded, or unrelated
    // workspaceId. (See file-header note on what this does and doesn't
    // prove.)
    expect(resolveRolePermissionsMock).toHaveBeenCalledWith(
      expect.anything(),
      targetWorkspaceId,
    );

    // And the resolved ceiling must be what gets passed on as the actor's
    // permissions for the escalation guard to check against.
    expect(createRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: targetWorkspaceId,
        actorPermissions: { canViewTasks: true },
      }),
    );
  });
});
