/**
 * actorContext (roles/index.ts) resolves the actor's permission CEILING —
 * the set of permissions any role they mint, edit or clone may not exceed.
 *
 * Its assignment lookup omitted `eq(roleAssignmentTable.isActive, true)`,
 * making it the only assignment lookup in the whole RBAC surface that read
 * inactive rows (compare middlewares/rbac.ts: requirePermission,
 * requireRole, checkWorkspacePermission and checkProjectPermission all
 * filter on isActive).
 *
 * Why that is exploitable rather than merely untidy: POST /api/rbac/assign
 * does not delete a superseded assignment, it flips the old row to
 * isActive:false and inserts a new one. A demoted user therefore holds TWO
 * rows for the SAME workspace, and this lookup ends in `.limit(1)` with no
 * `orderBy` — the database is free to return either. The gate in front of
 * these routes (checkWorkspacePermission, via canManageRolesInWorkspace)
 * reads only ACTIVE assignments, so a user demoted from workspace-manager to
 * a narrow custom role that still grants canManageRoles could pass the gate
 * on the narrow role while the ceiling behind it resolved from the revoked
 * workspace-manager row — and then mint a role carrying permissions they no
 * longer hold.
 *
 * The shared mock db (tests/helpers/test-database.ts) accepts and discards
 * `.where()` predicates, so "returns only active rows" cannot be exercised
 * as behaviour here — the mock would hand back the inactive row either way.
 * What IS observable is the predicate the route hands to drizzle, so that is
 * what this file pins: the exact `and(...)` conjunction, compared against
 * one built from the same drizzle primitives. Dropping any of the three
 * clauses (userId, workspaceId, isActive) changes that object and fails the
 * assertion.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { and, eq } from "drizzle-orm";
import { roleAssignmentTable } from "../../database/schema";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (_c: Context, next: Next) => {
    await next();
  },
  checkWorkspacePermission: (...args: unknown[]) =>
    checkWorkspacePermissionMock(...args),
}));

vi.mock("../lib/resolve-role-permissions", () => ({
  resolveRolePermissions: (...args: unknown[]) =>
    resolveRolePermissionsMock(...args),
  invalidateRoleCache: vi.fn(),
}));

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

/**
 * The predicate handed to the Nth `db.select()` chain's `.where()`.
 * On POST /roles the chains are, in order: 0 = actorContext's user lookup,
 * 1 = actorContext's role-assignment lookup.
 */
function wherePredicateOfSelect(index: number): unknown {
  const chain = (
    mockDb.select as unknown as {
      mock: {
        results: { value: { where: { mock: { calls: unknown[][] } } } }[];
      };
    }
  ).mock.results[index]?.value;
  return chain?.where.mock.calls[0]?.[0];
}

describe("actorContext assignment lookup", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    checkWorkspacePermissionMock.mockResolvedValue({ allowed: true });
  });

  it("reads only ACTIVE assignments, scoped to the user and the target workspace", async () => {
    mockDb.__setSelectResults(
      [{ id: "user-1" }], // user lookup
      [{ role: "member", workspaceId: "ws-1" }], // assignment lookup
    );

    const app = await buildApp();
    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Auditor",
        permissions: ["canViewTasks"],
        workspaceId: "ws-1",
      }),
    });

    expect(res.status).toBe(201);

    // All three clauses, in the order the route builds them. An `and(...)`
    // missing eq(isActive, true) — the bug — is a structurally different
    // object and does not match.
    expect(wherePredicateOfSelect(1)).toEqual(
      and(
        eq(roleAssignmentTable.userId, "user-1"),
        eq(roleAssignmentTable.workspaceId, "ws-1"),
        eq(roleAssignmentTable.isActive, true),
      ),
    );
  });

  // Discriminating control for the assertion above: proves `toEqual` on these
  // drizzle predicates actually distinguishes a two-clause conjunction from a
  // three-clause one, i.e. that the test above could fail. Without this, a
  // structural comparison that quietly matched anything would look identical.
  it("does not match a predicate that omits the isActive clause", async () => {
    mockDb.__setSelectResults([{ id: "user-1" }], [{ role: "member" }]);

    const app = await buildApp();
    await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Auditor",
        permissions: ["canViewTasks"],
        workspaceId: "ws-1",
      }),
    });

    expect(wherePredicateOfSelect(1)).not.toEqual(
      and(
        eq(roleAssignmentTable.userId, "user-1"),
        eq(roleAssignmentTable.workspaceId, "ws-1"),
      ),
    );
  });

  // The ceiling and the actor's role slug both come from that one lookup, so
  // whatever it returns is what the escalation guard downstream measures
  // against. This pins the wiring the isActive filter protects.
  it("threads the resolved role and permissions from that assignment into createRole", async () => {
    resolveRolePermissionsMock.mockResolvedValue({ canViewTasks: true });
    mockDb.__setSelectResults(
      [{ id: "user-1" }],
      [{ role: "department-head", workspaceId: "ws-1" }],
    );

    const app = await buildApp();
    await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Auditor",
        permissions: ["canViewTasks"],
        workspaceId: "ws-1",
      }),
    });

    expect(resolveRolePermissionsMock).toHaveBeenCalledWith(
      "department-head",
      "ws-1",
    );
    expect(createRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorRole: "department-head",
        actorPermissions: { canViewTasks: true },
      }),
    );
  });

  // Documents the real fallback, which the function's comment used to
  // misstate as "{} (fails closed)": with no matching active assignment the
  // role resolves to "guest", whose permission set is NOT empty — it grants
  // canViewPublicProjects.
  it("falls back to the guest role, not to an empty permission set", async () => {
    mockDb.__setSelectResults(
      [{ id: "user-1" }],
      [], // no active assignment in this workspace
    );

    const app = await buildApp();
    await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Auditor",
        permissions: [],
        workspaceId: "ws-1",
      }),
    });

    expect(resolveRolePermissionsMock).toHaveBeenCalledWith("guest", null);
    expect(createRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorRole: "guest" }),
    );
  });
});
