/**
 * POST /roles let a caller mint a custom role inside a workspace they held
 * canManageRoles in *some* workspace but not the target one, using their
 * permissions from that unrelated workspace as the ceiling
 * (requirePermission's assignment lookup is unscoped — "does this user hold
 * canManageRoles *anywhere*?"). This pins the fix in two layers:
 *
 *  - Part 1: the route now calls checkWorkspacePermission(userEmail,
 *    workspaceId, "canManageRoles") before calling createRole, and rejects
 *    with 404 (not 403 — consistent with the read routes, and it doesn't
 *    confirm the workspace exists to someone outside it) unless the caller
 *    holds an ACTIVE assignment IN that specific workspace that itself
 *    grants canManageRoles there.
 *
 *    An earlier version of this fix checked only workspace membership, not
 *    the permission — membership plus an unrelated canManageRoles grant
 *    elsewhere was enough to pass both requirePermission and that check,
 *    reopening the exact same escalation one layer down: a workspace-manager
 *    of their own workspace A, invited into workspace B as a plain member,
 *    could still mutate roles in B.
 *
 *  - Part 2: actorContext resolves the ceiling via resolveRolePermissions
 *    using the assignment's workspaceId, not just any assignment the user
 *    holds anywhere.
 *
 * checkWorkspacePermission itself is mocked at the module boundary here —
 * its own SQL-level tenant scoping is a separate, shared primitive, not
 * something this route owns — isolating what this file actually verifies:
 * that the route calls it with the right workspaceId and permission,
 * respects `.allowed`, and never leaks its 403 body.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

// Stub requirePermission (covered elsewhere) but keep checkWorkspacePermission
// controllable — it's the primitive this file is actually about.
vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (_c: Context, next: Next) => {
    await next();
  },
  checkWorkspacePermission: (...args: unknown[]) =>
    checkWorkspacePermissionMock(...args),
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
// permission + ceiling-scoping plumbing.
vi.mock("../controllers/create-role", () => ({
  createRole: (...args: unknown[]) => createRoleMock(...args),
}));

const mockDb = createMockDb();
const checkWorkspacePermissionMock = vi.fn();
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

  it("rejects with 404 when the caller does not hold canManageRoles in the requested workspace", async () => {
    const targetWorkspaceId = "workspace-the-caller-cant-manage-roles-in";
    checkWorkspacePermissionMock.mockResolvedValue({
      allowed: false,
      status: 403,
      body: { error: "Insufficient permissions for this workspace" },
    });

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
    // Discriminating assertion: a leaked 403 body, or falling through to
    // createRole, would both indicate the guard didn't actually fire.
    expect(await res.json()).toEqual({ error: "Workspace not found" });
    expect(checkWorkspacePermissionMock).toHaveBeenCalledWith(
      "actor@example.com",
      targetWorkspaceId,
      "canManageRoles",
    );
    expect(createRoleMock).not.toHaveBeenCalled();
  });

  it("proceeds when the caller holds canManageRoles in the target workspace, and resolves the ceiling for THAT workspace", async () => {
    const targetWorkspaceId = "ws-1";
    checkWorkspacePermissionMock.mockResolvedValue({ allowed: true });
    mockDb.__setSelectResults(
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
