/**
 * PUT /:id, DELETE /:id and POST /:id/clone all authorize a mutation
 * against a role that lives in (or, for clone, will be created in) a
 * specific workspace. An earlier version of these three routes checked only
 * "is the caller a member of that workspace?" — not "does the caller hold
 * canManageRoles IN that workspace?" But requirePermission's own gate is
 * workspace-unscoped (it asks "does this user hold canManageRoles
 * *anywhere*?", via `.limit(1)` with no `orderBy` on whichever active
 * assignment the query happens to return first). That combination let a
 * workspace-manager of their OWN workspace A mutate/delete/clone-into a role
 * in an unrelated workspace B where they were merely a plain member,
 * because requirePermission passed (canManageRoles somewhere) and the
 * membership-only check passed (member of B) despite holding no
 * canManageRoles grant in B at all — the same escalation POST /roles was
 * fixed for, reopened through three different verbs.
 *
 * This pins the fix: the router now calls checkWorkspacePermission(userEmail,
 * workspaceId, "canManageRoles") for PUT, DELETE and clone (the destination
 * workspace, for clone), mirroring what create-role-workspace-scoping.test.ts
 * already covers for POST. checkWorkspacePermission is mocked at the module
 * boundary here — its own internals are that other file's / its own unit's
 * concern — so this file verifies purely the router's plumbing: it calls the
 * primitive with the right workspaceId and permission, respects `.allowed`,
 * and collapses any failure to the same 404 without leaking a 403 body.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
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

// These three controllers' own logic is covered by
// update-delete-clone.test.ts; mocking them here isolates the router's
// authorization plumbing from what happens once it's cleared.
vi.mock("../controllers/update-role", () => ({
  updateRole: (...args: unknown[]) => updateRoleMock(...args),
}));
vi.mock("../controllers/delete-role", () => ({
  deleteRole: (...args: unknown[]) => deleteRoleMock(...args),
}));
vi.mock("../controllers/clone-role", () => ({
  cloneRole: (...args: unknown[]) => cloneRoleMock(...args),
}));

const mockDb = createMockDb();
const checkWorkspacePermissionMock = vi.fn();
const resolveRolePermissionsMock = vi.fn(async () => ({ canViewTasks: true }));
const updateRoleMock = vi.fn(async () => ({ id: "role-1", name: "Renamed" }));
const deleteRoleMock = vi.fn(async () => ({ success: true as const }));
const cloneRoleMock = vi.fn(async () => ({ id: "new-role", name: "Clone" }));

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

describe("PUT /:id workspace-permission guard", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("rejects with 404 when the caller lacks canManageRoles in the role's workspace", async () => {
    mockDb.__setSelectResults([{ id: "role-1", workspaceId: "ws-1" }]); // loadRoleForMutation
    checkWorkspacePermissionMock.mockResolvedValue({
      allowed: false,
      status: 403,
      body: { error: "Insufficient permissions for this workspace" },
    });

    const app = await buildApp();
    const res = await app.request("/role-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hijacked" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workspace not found" });
    expect(checkWorkspacePermissionMock).toHaveBeenCalledWith(
      "actor@example.com",
      "ws-1",
      "canManageRoles",
    );
    expect(updateRoleMock).not.toHaveBeenCalled();
  });

  it("proceeds when the caller holds canManageRoles in the role's workspace", async () => {
    mockDb.__setSelectResults(
      [{ id: "role-1", workspaceId: "ws-1" }], // loadRoleForMutation
      [{ id: "user-1" }], // actorContext user lookup
      [{ role: "workspace-manager", workspaceId: "ws-1" }], // actorContext assignment lookup
    );
    checkWorkspacePermissionMock.mockResolvedValue({ allowed: true });

    const app = await buildApp();
    const res = await app.request("/role-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });

    expect(res.status).toBe(200);
    expect(updateRoleMock).toHaveBeenCalledWith(
      "role-1",
      expect.objectContaining({ name: "Renamed", actorUserId: "user-1" }),
    );
  });
});

describe("DELETE /:id workspace-permission guard", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("rejects with 404 when the caller lacks canManageRoles in the role's workspace", async () => {
    mockDb.__setSelectResults([{ id: "role-1", workspaceId: "ws-1" }]);
    checkWorkspacePermissionMock.mockResolvedValue({ allowed: false });

    const app = await buildApp();
    const res = await app.request("/role-1", { method: "DELETE" });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workspace not found" });
    expect(checkWorkspacePermissionMock).toHaveBeenCalledWith(
      "actor@example.com",
      "ws-1",
      "canManageRoles",
    );
    expect(deleteRoleMock).not.toHaveBeenCalled();
  });

  it("proceeds when the caller holds canManageRoles in the role's workspace, threading the caller's real memberships through", async () => {
    mockDb.__setSelectResults(
      [{ id: "role-1", workspaceId: "ws-1" }], // loadRoleForMutation
      [{ workspaceId: "ws-1" }], // memberWorkspaceIds, threaded into deleteRole
      [{ id: "user-1" }], // actorContext user lookup
      [{ role: "workspace-manager", workspaceId: "ws-1" }], // actorContext assignment lookup
    );
    checkWorkspacePermissionMock.mockResolvedValue({ allowed: true });

    const app = await buildApp();
    const res = await app.request("/role-1", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect(deleteRoleMock).toHaveBeenCalledWith(
      "role-1",
      "user-1",
      ["ws-1"],
      expect.anything(),
    );
  });
});

describe("POST /:id/clone workspace-permission guard", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("rejects with 404 when the caller lacks canManageRoles in the destination workspace", async () => {
    checkWorkspacePermissionMock.mockResolvedValue({ allowed: false });

    const app = await buildApp();
    const res = await app.request("/role-1/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-dest" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Workspace not found" });
    expect(checkWorkspacePermissionMock).toHaveBeenCalledWith(
      "actor@example.com",
      "ws-dest",
      "canManageRoles",
    );
    expect(cloneRoleMock).not.toHaveBeenCalled();
  });

  it("proceeds when the caller holds canManageRoles in the destination workspace, and resolves the ceiling for THAT workspace", async () => {
    mockDb.__setSelectResults(
      [{ workspaceId: "ws-dest" }], // memberWorkspaceIds, forwarded to cloneRole for source visibility
      [{ id: "user-1" }], // actorContext user lookup
      [{ role: "workspace-manager", workspaceId: "ws-dest" }], // actorContext assignment lookup
    );
    checkWorkspacePermissionMock.mockResolvedValue({ allowed: true });

    const app = await buildApp();
    const res = await app.request("/role-1/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: "ws-dest" }),
    });

    expect(res.status).toBe(201);
    expect(resolveRolePermissionsMock).toHaveBeenCalledWith(
      expect.anything(),
      "ws-dest",
    );
    expect(cloneRoleMock).toHaveBeenCalledWith(
      "role-1",
      expect.objectContaining({
        workspaceId: "ws-dest",
        actorPermissions: { canViewTasks: true },
        memberWorkspaceIds: ["ws-dest"],
      }),
    );
  });
});
