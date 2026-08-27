/**
 * DELETE /remove/:userId security fix (Task 12, coordinator re-review round).
 *
 * Flagged as "out of scope for Task 12, but the same Critical class" as the
 * two Criticals fixed on POST /assign (see assign-role-security.test.ts and
 * task-12-report.md): this route was gated only by the workspace-unscoped
 * requirePermission("canManageRoles") (`.limit(1)`, no `orderBy`, no
 * workspace filter), and its deactivate-existing UPDATE had no workspace
 * predicate at all — it deactivated whichever active assignment `.limit(1)`
 * happened to return, from ANY workspace. A workspace-manager of their own
 * workspace could strip a user's role in a completely unrelated workspace.
 * It matters now because the frontend's removeRole() was wired to this route
 * earlier today (apps/web/src/lib/permissions/provider.tsx).
 *
 * The route previously took no workspace context at all (no query param, no
 * body), so there was nothing to scope by. Fixed by adding a REQUIRED
 * `workspaceId` query param, gating on
 * checkWorkspacePermission(removerEmail, workspaceId, "canManageRoles")
 * before any read or write (uniform 404 on failure, same as /assign), and
 * scoping both the assignment lookup and the deactivate UPDATE to that
 * workspace.
 *
 * NOTE for whoever updates the frontend: removeRole() in
 * apps/web/src/lib/permissions/provider.tsx currently calls
 * `DELETE /rbac/remove/${userId}` with no query string at all. It needs to
 * start sending `?workspaceId=<the workspace being managed>` — it already
 * receives a `context?: PermissionContext` parameter (currently unused,
 * prefixed `_context`) that carries this.
 *
 * checkWorkspacePermission is mocked at the module boundary, same as
 * assign-role-security.test.ts — its own internals are covered by
 * middlewares/__tests__/rbac-scoped-custom-roles.test.ts.
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
  resolveRolePermissions: vi.fn(async () => ({})),
  invalidateRoleCache: vi.fn(),
}));

const mockDb = createMockDb();
const checkWorkspacePermissionMock = vi.fn();

function buildApp() {
  return import("../index").then(({ default: rbacRoutes }) => {
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "remover@example.com");
      await next();
    });
    app.route("/", rbacRoutes);
    return app;
  });
}

function deleteRemove(userId: string, query?: string) {
  return buildApp().then((app) =>
    app.request(`/remove/${userId}${query ? `?${query}` : ""}`, {
      method: "DELETE",
    }),
  );
}

describe("DELETE /remove/:userId security fix", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("rejects with 400 when the workspaceId query param is missing", async () => {
    const res = await deleteRemove("victim-id");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "workspaceId query parameter is required",
    });
    expect(checkWorkspacePermissionMock).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects with 404 when the remover lacks canManageRoles in the target workspace", async () => {
    checkWorkspacePermissionMock.mockResolvedValue({
      allowed: false,
      status: 403,
      body: { error: "Insufficient permissions for this workspace" },
    });

    const res = await deleteRemove("victim-id", "workspaceId=ws-1");

    expect(res.status).toBe(404);
    // Discriminating: a leaked 403 body, or a write going through, would
    // both indicate the gate didn't actually fire.
    expect(await res.json()).toEqual({ error: "Workspace not found" });
    expect(checkWorkspacePermissionMock).toHaveBeenCalledWith(
      "remover@example.com",
      "ws-1",
      "canManageRoles",
    );
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("succeeds when the remover holds canManageRoles in the target workspace", async () => {
    checkWorkspacePermissionMock.mockResolvedValue({
      allowed: true,
      userId: "remover-id",
      userRole: "workspace-manager",
    });
    mockDb.__setSelectResults(
      [{ id: "remover-row-id" }], // remover user lookup
      [{ id: "assignment-1", role: "member", workspaceId: "ws-1" }], // current assignment, scoped to ws-1
    );

    const res = await deleteRemove("victim-id", "workspaceId=ws-1");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      message: "Role removed successfully",
    });
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // role-history row
  });

  it("returns 404 when there is no active assignment for the user in that workspace", async () => {
    checkWorkspacePermissionMock.mockResolvedValue({
      allowed: true,
      userId: "remover-id",
      userRole: "workspace-manager",
    });
    mockDb.__setSelectResults(
      [{ id: "remover-row-id" }], // remover user lookup
      [], // current assignment: no row in this workspace
    );

    const res = await deleteRemove("victim-id", "workspaceId=ws-1");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "No active role assignment found",
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
