import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));
vi.mock("../lib/audit", () => ({ recordRoleAudit: vi.fn() }));

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
});

describe("deleteRole", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  it("refuses to delete a built-in role", async () => {
    const { deleteRole } = await import("../controllers/delete-role");
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
    await expect(deleteRole("role-1", "user-1")).rejects.toThrow(/3/);
  });
});
