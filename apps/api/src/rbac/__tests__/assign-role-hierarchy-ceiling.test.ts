/**
 * POST /assign — the escalation ceiling, and why it is measured two
 * different ways (see roles/lib/role-ceiling.ts for the full argument).
 *
 * The ceiling originally compared permission SETS for every case: the
 * assigned role's permissions had to be a subset of the assigner's. That is
 * correct for custom roles but wrong for the built-ins, because the built-ins
 * are an ordered ladder, not a lattice. `workspace-manager` is the only role
 * granting canManageRoles — so it is the only role that can reach this route
 * at all — yet it does NOT hold:
 *
 *   - contractor's      canViewAssignedTasks / canUpdateAssignedTasks
 *   - department-head's canManageDepartment
 *
 * (verify against ROLE_PERMISSIONS in constants/rbac.ts). Under a pure subset
 * ceiling those two built-in roles were therefore unassignable by ANY actor —
 * a 403 with no configuration that could ever satisfy it.
 *
 * The fix compares ROLE_HIERARCHY levels when BOTH sides are built-in, and
 * keeps the subset check whenever either side is a custom role. The last test
 * in this file is the one that matters most: it proves the fix was not a
 * blanket "the target is a system role" exemption, which would have let a
 * custom role that happens to grant canManageRoles hand out
 * workspace-manager — a full privilege escalation, and the exact hole the
 * subset ceiling was added to close.
 *
 * checkWorkspacePermission and resolveRolePermissions are mocked at the
 * module boundary (same as assign-role-security.test.ts) so this file tests
 * only /assign's ceiling logic; their internals are covered elsewhere.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";
import { ROLE_PERMISSIONS } from "../../constants/rbac";

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

/** Selects consumed after the ceiling on a built-in target: membership, assigner. */
function allowRemainingLookups() {
  mockDb.__setSelectResults(
    [{ id: "membership-1" }], // assignee membership check
    [{ id: "assigner-row-id" }], // assigner user lookup
  );
}

const baseBody = { userId: "victim-id", workspaceId: "ws-1" };

describe("POST /assign escalation ceiling", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe("both sides built-in: ROLE_HIERARCHY", () => {
    beforeEach(() => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "workspace-manager",
      });
    });

    // Sanity-check the premise this whole branch exists for, straight from
    // the constant: if these ever became subsets of workspace-manager, the
    // hierarchy branch would no longer be load-bearing.
    it("premise: workspace-manager is not a permission superset of contractor or department-head", () => {
      const manager = ROLE_PERMISSIONS["workspace-manager"];
      expect(manager.canViewAssignedTasks).toBeUndefined();
      expect(manager.canUpdateAssignedTasks).toBeUndefined();
      expect(manager.canManageDepartment).toBeUndefined();
      expect(ROLE_PERMISSIONS.contractor.canViewAssignedTasks).toBe(true);
      expect(ROLE_PERMISSIONS["department-head"].canManageDepartment).toBe(
        true,
      );
    });

    it("lets a workspace-manager assign contractor", async () => {
      allowRemainingLookups();

      const res = await postAssign({ ...baseBody, role: "contractor" });

      expect(res.status).toBe(200);
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // assignment + history
      // Discriminating: the hierarchy branch must not consult permission sets
      // at all. If resolveRolePermissions ran, the subset check ran, and this
      // request only passed by luck of the mock's return value.
      expect(resolveRolePermissionsMock).not.toHaveBeenCalled();
    });

    it("lets a workspace-manager assign department-head", async () => {
      allowRemainingLookups();

      const res = await postAssign({ ...baseBody, role: "department-head" });

      expect(res.status).toBe(200);
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      expect(resolveRolePermissionsMock).not.toHaveBeenCalled();
    });

    it("still refuses a built-in role ABOVE the assigner's own level", async () => {
      // department-head (6) may not hand out workspace-manager (10).
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "department-head",
      });
      allowRemainingLookups();

      const res = await postAssign({
        ...baseBody,
        role: "workspace-manager",
      });

      expect(res.status).toBe(403);
      expect((await res.json()).error).toContain("workspace-manager");
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("allows a built-in role at exactly the assigner's own level", async () => {
      allowRemainingLookups();

      const res = await postAssign({
        ...baseBody,
        role: "workspace-manager",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("either side custom: permission subset (unchanged)", () => {
    // THE regression test for this fix. An actor holding a CUSTOM role that
    // grants canManageRoles clears the route's gate (checkWorkspacePermission
    // resolves that custom role's permissions and finds canManageRoles), so
    // the ceiling is the only thing left. Had the fix taken the shape of
    // "exempt built-in TARGET roles", this request would succeed and hand the
    // caller the keys to the workspace.
    it("does NOT let a custom role granting canManageRoles assign workspace-manager", async () => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "custom-role-with-manage-roles",
      });
      resolveRolePermissionsMock
        // actor: the custom role — canManageRoles and nothing else
        .mockResolvedValueOnce({ canManageRoles: true })
        // target: workspace-manager's real, very large permission set
        .mockResolvedValueOnce(ROLE_PERMISSIONS["workspace-manager"]);
      allowRemainingLookups();

      const res = await postAssign({
        ...baseBody,
        role: "workspace-manager",
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/cannot assign permissions you do not hold/);
      // Names something workspace-manager grants and the custom role does not.
      expect(body.error).toContain("canManageWorkspace");
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("still allows a custom actor to assign a role within its own permission set", async () => {
      checkWorkspacePermissionMock.mockResolvedValue({
        allowed: true,
        userId: "assigner-id",
        userRole: "custom-role-with-manage-roles",
      });
      resolveRolePermissionsMock
        .mockResolvedValueOnce({ canManageRoles: true, canViewTasks: true })
        .mockResolvedValueOnce({ canViewTasks: true });
      allowRemainingLookups();

      const res = await postAssign({ ...baseBody, role: "project-viewer" });

      expect(res.status).toBe(200);
      // Proves the subset branch (not the hierarchy branch) decided this one.
      expect(resolveRolePermissionsMock).toHaveBeenCalledTimes(2);
    });
  });
});
