import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockDb,
  resetMockDb,
} from "../../../tests/helpers/test-database";

vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("resolveRolePermissions", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
    vi.resetModules();
  });

  // The whole point of name-first resolution: existing assignments must not
  // touch the database or change behaviour at all.
  it("resolves a built-in role from the constant without querying", async () => {
    const { resolveRolePermissions } = await import(
      "../resolve-role-permissions"
    );
    const { getRolePermissions } = await import("../../../constants/rbac");

    const result = await resolveRolePermissions("workspace-manager", null);

    expect(result).toEqual(getRolePermissions("workspace-manager"));
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("resolves a custom role from its stored permission list", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-1",
        permissions: ["canViewTasks", "canCreateTasks"],
        isActive: true,
        deletedAt: null,
        workspaceId: "ws-1",
      },
    ]);

    const { resolveRolePermissions } = await import(
      "../resolve-role-permissions"
    );
    const result = await resolveRolePermissions("role-1", "ws-1");

    expect(result).toEqual({ canViewTasks: true, canCreateTasks: true });
  });

  it("denies when the custom role does not exist", async () => {
    mockDb.__setSelectResults([]);

    const { resolveRolePermissions } = await import(
      "../resolve-role-permissions"
    );

    expect(await resolveRolePermissions("does-not-exist", "ws-1")).toEqual({});
  });

  it("denies when the role has no stored permissions", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-1",
        permissions: null,
        isActive: true,
        deletedAt: null,
        workspaceId: "ws-1",
      },
    ]);

    const { resolveRolePermissions } = await import(
      "../resolve-role-permissions"
    );

    expect(await resolveRolePermissions("role-1", "ws-1")).toEqual({});
  });
});
