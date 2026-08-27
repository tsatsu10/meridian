import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRolePermissions = vi.fn();

vi.mock("../../roles/lib/resolve-role-permissions", () => ({
  resolveRolePermissions: (role: string, workspaceId: string | null) =>
    resolveRolePermissions(role, workspaceId),
  invalidateRoleCache: vi.fn(),
}));

const mockDb = {
  select: vi.fn(),
};

vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

/**
 * Builds a chainable select() whose awaited value is `rows`.
 */
function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  // requirePermission orders the role-assignment query deterministically; the
  // chain has to accept it. Like `where`, this mock discards the argument — so
  // it cannot verify the ordering, which is why the ordering is pinned against
  // a real database in require-permission-determinism.integration.test.ts.
  chain.orderBy = vi.fn().mockReturnValue(chain);
  // biome-ignore lint/suspicious/noThenProperty: mock must be awaitable like drizzle's builder
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve);
  return chain;
}

describe("requirePermission with custom roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEMO_MODE = "false";
  });

  it("grants access when the assigned custom role carries the permission", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectReturning([{ id: "user-1", email: "u@example.com" }]),
      )
      .mockReturnValueOnce(
        selectReturning([
          { role: "custom-role-1", workspaceId: "ws-1", isActive: true },
        ]),
      )
      .mockReturnValueOnce(selectReturning([]));

    resolveRolePermissions.mockResolvedValue({ canViewTasks: true });

    const { requirePermission } = await import("../rbac");
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "u@example.com");
      await next();
    });
    app.get("/protected", requirePermission("canViewTasks"), (c) =>
      c.json({ ok: true }),
    );

    const res = await app.request("/protected");

    expect(res.status).toBe(200);
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
          { role: "deleted-role", workspaceId: "ws-1", isActive: true },
        ]),
      )
      .mockReturnValueOnce(selectReturning([]));

    resolveRolePermissions.mockResolvedValue({});

    const { requirePermission } = await import("../rbac");
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c, next) => {
      c.set("userEmail", "u@example.com");
      await next();
    });
    app.get("/protected", requirePermission("canViewTasks"), (c) =>
      c.json({ ok: true }),
    );

    expect((await app.request("/protected")).status).toBe(403);
  });
});
