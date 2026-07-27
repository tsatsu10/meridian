import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));
vi.mock("../lib/audit", () => ({ recordRoleAudit: vi.fn() }));

// invalidateRoleCache is otherwise the real (pure, in-memory) implementation;
// mocked here purely so tests can assert it fired.
vi.mock("../lib/resolve-role-permissions", () => ({
  invalidateRoleCache: vi.fn(),
}));

const getRoleUsage = vi.fn();
vi.mock("../controllers/get-role-usage", () => ({
  getRoleUsage: (id: string) => getRoleUsage(id),
}));

const mockDb = createMockDb();

describe("updateRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    mockDb.returning.mockResolvedValue([{ id: "role-1", name: "Renamed" }]);
  });

  it("refuses to modify a built-in role", async () => {
    const { updateRole } = await import("../controllers/update-role");

    await expect(
      updateRole("workspace-manager", {
        name: "Hijacked",
        actorUserId: "user-1",
        actorPermissions: { canManageRoles: true },
      }),
    ).rejects.toThrow(/built-in/i);
  });

  it("rejects permissions the actor does not hold", async () => {
    mockDb.__setSelectResults([
      { id: "role-1", type: "custom", workspaceId: "ws-1", permissions: [] },
    ]);
    const { updateRole } = await import("../controllers/update-role");

    await expect(
      updateRole("role-1", {
        permissions: ["canManageRoles"],
        actorUserId: "user-1",
        actorPermissions: { canViewTasks: true },
      }),
    ).rejects.toThrow(/canManageRoles/);
  });

  // Holders must pick up the change immediately, not after the cache TTL —
  // stale permissions would otherwise let a just-revoked grant keep working.
  it("invalidates the role cache after a successful update", async () => {
    mockDb.__setSelectResults([
      { id: "role-1", type: "custom", workspaceId: "ws-1", permissions: [] },
    ]);
    const { updateRole } = await import("../controllers/update-role");
    const { invalidateRoleCache } = await import(
      "../lib/resolve-role-permissions"
    );

    await updateRole("role-1", {
      name: "Renamed",
      actorUserId: "user-1",
      actorPermissions: {},
    });

    expect(invalidateRoleCache).toHaveBeenCalledWith("role-1");
  });
});

describe("deleteRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("refuses to delete a built-in role", async () => {
    const { deleteRole } = await import("../controllers/delete-role");
    // No memberWorkspaceIds arg here on purpose: isSystemRoleId short-circuits
    // before it would ever be used, so the default ([]) is exercised safely.
    await expect(deleteRole("member", "user-1")).rejects.toThrow(/built-in/i);
  });

  // Deleting a role in use would silently strip its holders of all access.
  it("refuses to delete a role that is still assigned, with the count", async () => {
    mockDb.__setSelectResults([
      { id: "role-1", type: "custom", workspaceId: "ws-1" },
    ]);
    getRoleUsage.mockResolvedValue({
      usersCount: 3,
      lastUsedAt: null,
      assignments: [],
    });

    const { deleteRole } = await import("../controllers/delete-role");
    await expect(deleteRole("role-1", "user-1", ["ws-1"])).rejects.toThrow(/3/);
  });

  it("invalidates the role cache after a successful delete", async () => {
    mockDb.__setSelectResults([
      { id: "role-1", type: "custom", workspaceId: "ws-1" },
    ]);
    getRoleUsage.mockResolvedValue({
      usersCount: 0,
      lastUsedAt: null,
      assignments: [],
    });

    const { deleteRole } = await import("../controllers/delete-role");
    const { invalidateRoleCache } = await import(
      "../lib/resolve-role-permissions"
    );

    await deleteRole("role-1", "user-1", ["ws-1"]);

    expect(invalidateRoleCache).toHaveBeenCalledWith("role-1");
  });
});

describe("cloneRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  const systemRole = {
    id: "guest",
    name: "Guest",
    description: null,
    type: "system" as const,
    color: "#3B82F6",
    createdAt: new Date("2026-01-01"),
    isActive: true,
    workspaceId: null,
    // guest's real permission set (ROLE_PERMISSIONS.guest) is a single key,
    // so any actorPermissions that include it clear the subset guard
    // trivially — this test is about cloneability, not the guard.
    permissions: null,
  };

  it("clones a system role into a custom role in the destination workspace", async () => {
    mockDb.__setSelectResults([systemRole]);
    mockDb.returning.mockResolvedValue([
      { id: "new-role", name: "Guest (copy)", type: "custom" },
    ]);

    const { cloneRole } = await import("../controllers/clone-role");
    await cloneRole("guest", {
      workspaceId: "ws-dest",
      actorUserId: "user-1",
      actorPermissions: { canViewPublicProjects: true },
      memberWorkspaceIds: [],
    });

    // The insert always sets type: "custom" regardless of the source's own
    // type — this is what makes cloning a system role legal: the copy is
    // never itself a system role.
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ type: "custom", baseRoleId: "guest" }),
    );
  });

  it("404s when the source is a custom role outside the caller's workspaces", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-1",
        name: "Auditor",
        description: null,
        type: "custom" as const,
        color: "#3B82F6",
        createdAt: new Date("2026-01-01"),
        isActive: true,
        workspaceId: "ws-other",
        permissions: [],
      },
    ]);

    const { cloneRole } = await import("../controllers/clone-role");
    await expect(
      cloneRole("role-1", {
        workspaceId: "ws-dest",
        actorUserId: "user-1",
        actorPermissions: {},
        // Caller belongs to the destination, but NOT to the source's
        // workspace — getRole must treat the source as invisible.
        memberWorkspaceIds: ["ws-dest"],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  // The same escalation guard create-role applies must apply to clone: you
  // cannot mint a copy more powerful than you are, regardless of how
  // powerful the source role happens to be.
  it("applies the excess-permission guard to the cloned permissions", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-1",
        name: "Power role",
        description: null,
        type: "custom" as const,
        color: "#3B82F6",
        createdAt: new Date("2026-01-01"),
        isActive: true,
        workspaceId: "ws-source",
        permissions: ["canManageRoles"],
      },
    ]);

    const { cloneRole } = await import("../controllers/clone-role");
    await expect(
      cloneRole("role-1", {
        workspaceId: "ws-dest",
        actorUserId: "user-1",
        // Does not include canManageRoles, which the source grants.
        actorPermissions: { canViewTasks: true },
        memberWorkspaceIds: ["ws-source", "ws-dest"],
      }),
    ).rejects.toThrow(/canManageRoles/);
  });
});
