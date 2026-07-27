import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import rolesRouter from "../index";
import { createMockDb, resetMockDb } from "../../tests/helpers/test-database";

// requirePermission calls getDatabase() unconditionally before it even looks
// at userEmail (to look up the user record for a real permission check), so
// without this mock the tests below would depend on a live Postgres instance
// being reachable at the hardcoded test DATABASE_URL and would 500 instead of
// 401/403 in any environment where it isn't — exactly the false negative this
// file exists to avoid.
vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

/**
 * Every mutating route must sit behind requirePermission("canManageRoles").
 * With no userEmail set on the context the middleware short-circuits, so a
 * route that reaches its handler (and therefore fails differently) is a route
 * that is not gated. `db` is never queried in this describe block: userEmail
 * is unset in every case, so requirePermission returns 401 before it ever
 * touches the database.
 */
describe("roles write endpoints require canManageRoles", () => {
  const cases: [string, string][] = [
    ["POST", "/"],
    ["PUT", "/some-role"],
    ["DELETE", "/some-role"],
    ["POST", "/some-role/clone"],
  ];

  it.each(cases)("%s %s is not publicly writable", async (method, path) => {
    const res = await rolesRouter.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify({}),
    });

    expect([401, 403]).toContain(res.status);
  });
});

/**
 * The suite above proves "not public" — but any guard returning 401/403
 * would satisfy it identically, including requirePermission wired to the
 * wrong permission entirely (e.g. "canViewTasks", which an authenticated
 * member typically holds and which would then wrongly let them through, or
 * a permission so obscure nobody has it, which would wrongly lock everyone
 * out for the wrong reason). This distinguishes "requires *some* permission"
 * from "requires canManageRoles specifically": an authenticated caller who
 * IS a member of a workspace, with an active "member" assignment there —
 * which does not grant canManageRoles — must still be rejected by
 * requirePermission itself, before the route's own workspace-permission
 * check (mutate-role-workspace-scoping.test.ts) is ever reached.
 */
describe("roles write endpoints reject an authenticated member without canManageRoles", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  function buildApp() {
    const app = new Hono<{ Variables: { userEmail: string } }>();
    app.use("*", async (c: Context, next: Next) => {
      c.set("userEmail", "member@example.com");
      await next();
    });
    app.route("/", rolesRouter);
    return app;
  }

  const cases: [string, string][] = [
    ["POST", "/"],
    ["PUT", "/some-role"],
    ["DELETE", "/some-role"],
    ["POST", "/some-role/clone"],
  ];

  it.each(cases)("%s %s rejects a plain member", async (method, path) => {
    // requirePermission's own three queries: the user row, their active role
    // assignment (a plain "member", which does not grant canManageRoles),
    // and the (empty) custom-permission overrides table.
    mockDb.__setSelectResults(
      [{ id: "user-1" }],
      [{ role: "member", workspaceId: "ws-1" }],
      [],
    );

    const app = buildApp();
    const res = await app.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify({}),
    });

    expect(res.status).toBe(403);
  });
});
