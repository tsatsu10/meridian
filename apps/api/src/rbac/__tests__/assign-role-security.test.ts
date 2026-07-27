/**
 * POST /assign security fixes (Task 12 fix round).
 *
 * Task 12 widened assignRoleSchema.role from an enum of the 11 built-in
 * slugs to an arbitrary string, which is what makes custom roles assignable
 * — and what makes the gaps below reachable for the first time. All five
 * were pre-existing on main; none were introduced by Task 12's diff.
 *
 * CRITICAL 1 — the route's only actor gate was requirePermission
 * ("canManageRoles"), whose lookup is workspace-unscoped (`.limit(1)`, no
 * `orderBy`, no workspace filter). Since canManageRoles is granted by
 * exactly one built-in role (workspace-manager), and
 * workspace/controllers/create-workspace.ts self-assigns it to whoever
 * creates a workspace, any authenticated user could create their own
 * workspace, then call this route with an arbitrary victim workspaceId and
 * grant themselves workspace-manager there. Fixed by gating on
 * checkWorkspacePermission(assignerEmail, data.workspaceId,
 * "canManageRoles") before any read or write, collapsing any failure to a
 * uniform 404 (never leaking checkWorkspacePermission's own 403 body).
 *
 * CRITICAL 2 — workspaceId was optional, so (a) the cross-workspace check on
 * a custom role silently no-op'd when it was omitted, and (b) the
 * deactivate-existing UPDATE had no workspace predicate at all, wiping the
 * user's assignment in EVERY workspace they held one in. Fixed by making
 * workspaceId required in the schema and adding
 * eq(roleAssignmentTable.workspaceId, data.workspaceId) to the UPDATE's
 * predicate (schema-level coverage lives in assign-custom-role.test.ts).
 *
 * IMPORTANT 3 — the role-validation block added in Task 12 had no test at
 * all; deleting it left every existing test green. Covered below.
 *
 * IMPORTANT 4 — no ceiling on what could be assigned: createRole/updateRole
 * both reject granting a permission the actor doesn't hold
 * (findExcessPermissions), but /assign had no counterpart, so that ceiling
 * was trivially bypassed by assigning an existing powerful role instead of
 * minting a new one. Covered below.
 *
 * IMPORTANT 5 — nothing checked the assignee was a member of the target
 * workspace, so a complete outsider could be granted access. Covered below.
 *
 * checkWorkspacePermission and resolveRolePermissions are mocked at the
 * module boundary — their own internals are each covered elsewhere
 * (middlewares/__tests__/rbac-scoped-custom-roles.test.ts,
 * roles/lib/__tests__/resolve-role-permissions.test.ts). This file verifies
 * only /assign's own plumbing: that it calls those primitives with the right
 * arguments, respects their results, and performs the remaining checks
 * in the right order relative to the database writes.
 *
 * NOTE on the customRole select tests below: the mock's `.where()` accepts
 * and discards its predicate (a pre-existing harness limitation also noted
 * in Task 2/3's fix rounds), so "inactive" and "soft-deleted" are exercised
 * as "the query returns no row" — the same observable outcome the real
 * eq(roles.isActive, true) / isNull(roles.deletedAt) predicates produce at
 * the database layer. What this proves is the ROUTE's response given an
 * empty result; the predicate itself is not re-verified here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock("../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../../services/rbac/role-audit-service", () => ({
  RoleAuditService: {
    getUserAuditTrail: vi.fn(),
    getWorkspaceAuditTrail: vi.fn(),
    getAuditStats: vi.fn(),
  },
}));

vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (_c: Context, next: Next) => {
    await next();
  },
  checkWorkspacePermission: (...args: unknown[]) =>
    checkWorkspacePermissionMock(...args),
}));

vi.mock("../../roles/lib/resolve-role-permissions", () => ({
  resolveRolePermissions: (...args: unknown[]) =>
    resolveRolePermissionsMock(...args),
  invalidateRoleCache: vi.fn(),
}));

const mockDb = createMockDb();
const checkWorkspacePermissionMock = vi.fn();
const resolveRolePermissionsMock = vi.fn();

function buildApp() {
  return import("../index").then(({ default: rbacRoutes }) => {
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "assigner@example.com");
      await next();
    });
    app.route("/", rbacRoutes);
    return app;
  });
}

function postAssign(body: Record<string, unknown>) {
  return buildApp().then((app) =>
    app.request("/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const baseBody = {
  userId: "victim-id",
  role: "member",
  workspaceId: "ws-1",
};

describe("POST /assign security fixes", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    // Default: ceiling check passes (actor and assigned role both resolve to
    // the same trivial permission set) unless a test overrides it.
    resolveRolePermissionsMock.mockResolvedValue({ canViewTasks: true });
  });

  describe("Critical 1: cross-tenant gate", () => {
    it("rejects with 404 when the caller lacks canManageRoles in the target workspace", async () => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: false,
        status: 403,
        body: { error: "Insufficient permissions for this workspace" },
      });

      const res = await postAssign(baseBody);

      expect(res.status).toBe(404);
      // Discriminating: a leaked 403 body, or a write going through, would
      // both indicate the gate didn't actually fire.
      expect(await res.json()).toEqual({ error: "Workspace not found" });
      expect(checkWorkspacePermissionMock).toHaveBeenCalledWith(
        "assigner@example.com",
        "ws-1",
        "canManageRoles",
      );
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("Important 3: role-validation block", () => {
    beforeEach(() => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "workspace-manager",
      });
    });

    it("returns 404 when the role id does not exist", async () => {
      mockDb.__setSelectResults([]); // customRole select: no row

      const res = await postAssign({ ...baseBody, role: "no-such-role" });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Role not found" });
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("returns 404 when the role exists but is inactive", async () => {
      // eq(roles.isActive, true) excludes it at the database layer; the
      // mock's equivalent is an empty result set (see file header note).
      mockDb.__setSelectResults([]);

      const res = await postAssign({ ...baseBody, role: "inactive-role" });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Role not found" });
    });

    it("returns 404 when the role has been soft-deleted", async () => {
      // isNull(roles.deletedAt) excludes it at the database layer; same
      // empty-result equivalence as above.
      mockDb.__setSelectResults([]);

      const res = await postAssign({ ...baseBody, role: "deleted-role" });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Role not found" });
    });

    it("returns 400 when the role belongs to a different workspace", async () => {
      mockDb.__setSelectResults([
        { id: "custom-role-1", workspaceId: "ws-other" },
      ]);

      const res = await postAssign({
        ...baseBody,
        role: "custom-role-1",
        workspaceId: "ws-1",
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Role belongs to a different workspace",
      });
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("Important 4: permission ceiling", () => {
    it("rejects with 403 naming the excess permissions when the assigned role grants more than the assigner holds", async () => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "member",
      });
      // First resolveRolePermissions call is the actor's own ceiling; the
      // second is the role being assigned (built-in "workspace-manager" here,
      // so no customRole select happens first).
      resolveRolePermissionsMock
        .mockResolvedValueOnce({ canViewTasks: true })
        .mockResolvedValueOnce({ canViewTasks: true, canManageRoles: true });

      const res = await postAssign({
        ...baseBody,
        role: "workspace-manager",
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("canManageRoles");
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("proceeds when the assigned role's permissions are a subset of the assigner's", async () => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "workspace-manager",
      });
      resolveRolePermissionsMock
        .mockResolvedValueOnce({ canViewTasks: true, canManageRoles: true })
        .mockResolvedValueOnce({ canViewTasks: true });
      mockDb.__setSelectResults(
        [{ id: "membership-1" }], // membership check
        [{ id: "assigner-row-id" }], // assigner user lookup
      );

      const res = await postAssign({ ...baseBody, role: "member" });

      expect(res.status).toBe(200);
    });
  });

  describe("Important 5: assignee membership", () => {
    beforeEach(() => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "workspace-manager",
      });
    });

    it("rejects with 400 when the assignee is not a member of the target workspace", async () => {
      mockDb.__setSelectResults([]); // membership check: no row

      const res = await postAssign(baseBody);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "User is not a member of this workspace",
      });
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("happy path (all guards satisfied)", () => {
    it("assigns a built-in role end-to-end", async () => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "workspace-manager",
      });
      mockDb.__setSelectResults(
        [{ id: "membership-1" }], // membership check
        [{ id: "assigner-row-id" }], // assigner user lookup
      );

      const res = await postAssign({ ...baseBody, role: "member" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // assignment + history
    });

    it("assigns a custom role end-to-end", async () => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "workspace-manager",
      });
      mockDb.__setSelectResults(
        [{ id: "custom-role-1", workspaceId: "ws-1" }], // customRole select
        [{ id: "membership-1" }], // membership check
        [{ id: "assigner-row-id" }], // assigner user lookup
      );

      const res = await postAssign({ ...baseBody, role: "custom-role-1" });

      expect(res.status).toBe(200);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
  });
});
