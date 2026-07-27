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

  // Pins the tenant boundary: `row.workspaceId === null || row.workspaceId
  // === workspaceId` is the only thing stopping a custom role owned by
  // workspace A from resolving for a caller in workspace B. Without it, a
  // custom role from another workspace would silently grant its permissions
  // to an unrelated caller. Uses a role id ("role-2") not used by any other
  // test in this file, and relies on `vi.resetModules()` in `beforeEach` to
  // give this test a fresh module instance — and therefore a fresh in-memory
  // cache — so the result below cannot be a stale cache hit left over from
  // another test.
  it("denies when the custom role belongs to a different workspace", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-2",
        permissions: ["canViewTasks"],
        isActive: true,
        deletedAt: null,
        workspaceId: "ws-A",
      },
    ]);

    const { resolveRolePermissions } = await import(
      "../resolve-role-permissions"
    );

    expect(await resolveRolePermissions("role-2", "ws-B")).toEqual({});
  });

  // Control for the test above: the identical stored row resolves correctly
  // when the caller's workspace matches. This proves the denial above comes
  // specifically from the workspace mismatch, not from some other reason the
  // row failed to resolve.
  it("resolves the same role when the workspace matches", async () => {
    mockDb.__setSelectResults([
      {
        id: "role-2",
        permissions: ["canViewTasks"],
        isActive: true,
        deletedAt: null,
        workspaceId: "ws-A",
      },
    ]);

    const { resolveRolePermissions } = await import(
      "../resolve-role-permissions"
    );

    expect(await resolveRolePermissions("role-2", "ws-A")).toEqual({
      canViewTasks: true,
    });
  });
});
