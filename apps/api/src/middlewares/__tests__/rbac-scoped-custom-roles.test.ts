import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRolePermissions = vi.fn();

vi.mock("../../roles/lib/resolve-role-permissions", () => ({
  resolveRolePermissions: (role: string, workspaceId: string | null) =>
    resolveRolePermissions(role, workspaceId),
  invalidateRoleCache: vi.fn(),
}));

const mockDb = { select: vi.fn() };

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

/**
 * These tests are about how a CUSTOM ROLE resolves, not about custom
 * permission overrides. The real override resolver issues its own db.select(),
 * which would consume one of the `mockReturnValueOnce` values queued below and
 * silently shift every subsequent row onto the wrong query. Stub it to pass
 * the role's decision straight through; its own behaviour is covered against a
 * real database in custom-permission-override.integration.test.ts.
 */
vi.mock("../custom-permission-override", () => ({
  applyCustomPermissionOverride: vi.fn(
    async (
      _userId: string,
      _permission: string,
      roleGrants: boolean,
    ): Promise<boolean> => roleGrants,
  ),
}));

function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  // biome-ignore lint/suspicious/noThenProperty: mock must be awaitable like drizzle's builder
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve);
  return chain;
}

describe("checkWorkspacePermission with custom roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEMO_MODE = "false";
  });

  // Before this task these functions called getRolePermissions directly, so a
  // custom role id resolved to {} and denied on every workspace-scoped route.
  it("grants when the workspace assignment carries a custom role with the permission", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectReturning([{ id: "user-1", email: "u@example.com" }]),
      )
      .mockReturnValueOnce(
        selectReturning([
          {
            role: "custom-role-1",
            workspaceId: "ws-1",
            isActive: true,
            projectIds: null,
          },
        ]),
      );

    resolveRolePermissions.mockResolvedValue({ canViewTasks: true });

    const { checkWorkspacePermission } = await import("../rbac");
    const result = await checkWorkspacePermission(
      "u@example.com",
      "ws-1",
      "canViewTasks",
    );

    expect(result.allowed).toBe(true);
    // The workspace-scoped assignment already carries the right workspace.
    expect(resolveRolePermissions).toHaveBeenCalledWith(
      "custom-role-1",
      "ws-1",
    );
  });

  it("denies when the custom role resolves to no permissions", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectReturning([{ id: "user-1", email: "u@example.com" }]),
      )
      .mockReturnValueOnce(
        selectReturning([
          {
            role: "revoked-role",
            workspaceId: "ws-1",
            isActive: true,
            projectIds: null,
          },
        ]),
      );

    resolveRolePermissions.mockResolvedValue({});

    const { checkWorkspacePermission } = await import("../rbac");
    const result = await checkWorkspacePermission(
      "u@example.com",
      "ws-1",
      "canViewTasks",
    );

    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  // Task 12: checkWorkspacePermission computed restrictedToProjectIds by
  // testing userRole === "project-manager" || userRole === "project-viewer",
  // literal string comparisons a custom role id can never satisfy. A
  // projectIds restriction stored on a custom-role assignment was therefore
  // silently ignored and its holder got workspace-wide access instead of
  // project-scoped access.
  it("restricts a custom role to its assigned projects when the assignment carries projectIds", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectReturning([{ id: "user-1", email: "u@example.com" }]),
      )
      .mockReturnValueOnce(
        selectReturning([
          {
            role: "custom-role-1",
            workspaceId: "ws-1",
            isActive: true,
            projectIds: ["proj-1"],
          },
        ]),
      );

    resolveRolePermissions.mockResolvedValue({ canViewTasks: true });

    const { checkWorkspacePermission } = await import("../rbac");
    const result = await checkWorkspacePermission(
      "u@example.com",
      "ws-1",
      "canViewTasks",
    );

    expect(result.allowed).toBe(true);
    expect(result.restrictedToProjectIds).toEqual(["proj-1"]);
  });

  // Control: proves the added `!isSystemRoleId(userRole)` condition did not
  // change built-in behaviour. A built-in "member" assignment is not one of
  // the project-scoped roles, so it must still come back unrestricted (null)
  // even when the assignment happens to carry projectIds.
  it("does not restrict a built-in member role even when the assignment carries projectIds", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectReturning([{ id: "user-1", email: "u@example.com" }]),
      )
      .mockReturnValueOnce(
        selectReturning([
          {
            role: "member",
            workspaceId: "ws-1",
            isActive: true,
            projectIds: ["proj-1"],
          },
        ]),
      );

    resolveRolePermissions.mockResolvedValue({ canViewTasks: true });

    const { checkWorkspacePermission } = await import("../rbac");
    const result = await checkWorkspacePermission(
      "u@example.com",
      "ws-1",
      "canViewTasks",
    );

    expect(result.allowed).toBe(true);
    expect(result.restrictedToProjectIds).toBeNull();
  });
});

describe("checkProjectPermission with custom roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEMO_MODE = "false";
  });

  // Task 12: checkProjectPermission gated its projectIds membership check on
  // userRole === "project-manager" || userRole === "project-viewer". A custom
  // role id never equals either, so a project-scoped custom-role assignment
  // was let through to ANY project in the workspace instead of only the ones
  // listed in projectIds.
  it("denies a custom role access to a project outside its assigned projectIds", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectReturning([{ id: "user-1", email: "u@example.com" }]),
      )
      .mockReturnValueOnce(selectReturning([{ workspaceId: "ws-1" }]))
      .mockReturnValueOnce(
        selectReturning([
          {
            role: "custom-role-1",
            workspaceId: "ws-1",
            isActive: true,
            projectIds: ["proj-1"],
          },
        ]),
      );

    resolveRolePermissions.mockResolvedValue({ canViewTasks: true });

    const { checkProjectPermission } = await import("../rbac");
    const result = await checkProjectPermission(
      "u@example.com",
      "proj-2",
      "canViewTasks",
    );

    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  // Control: a built-in "member" assignment carrying the same projectIds is
  // not one of the project-scoped roles and must remain unrestricted, proving
  // the added `!isSystemRoleId(userRole)` condition left built-in behaviour
  // unchanged.
  it("does not restrict a built-in member role to projectIds when checking project access", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectReturning([{ id: "user-1", email: "u@example.com" }]),
      )
      .mockReturnValueOnce(selectReturning([{ workspaceId: "ws-1" }]))
      .mockReturnValueOnce(
        selectReturning([
          {
            role: "member",
            workspaceId: "ws-1",
            isActive: true,
            projectIds: ["proj-1"],
          },
        ]),
      );

    resolveRolePermissions.mockResolvedValue({ canViewTasks: true });

    const { checkProjectPermission } = await import("../rbac");
    const result = await checkProjectPermission(
      "u@example.com",
      "proj-2",
      "canViewTasks",
    );

    expect(result.allowed).toBe(true);
  });
});
