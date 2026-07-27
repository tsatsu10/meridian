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
});
