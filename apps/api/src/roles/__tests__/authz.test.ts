import { describe, expect, it, vi } from "vitest";
import rolesRouter from "../index";

// requirePermission calls getDatabase() unconditionally before it even looks
// at userEmail (to look up the user record for a real permission check), so
// without this mock the test would depend on a live Postgres instance being
// reachable at the hardcoded test DATABASE_URL and would 500 instead of
// 401/403 in any environment where it isn't — exactly the false negative this
// test exists to avoid. userEmail is unset in every case below, so
// requirePermission returns 401 before `db` is ever used for a query.
vi.mock("../../database/connection", () => ({
  getDatabase: vi.fn(() => ({})),
}));

/**
 * Every mutating route must sit behind requirePermission("canManageRoles").
 * With no userEmail set on the context the middleware short-circuits, so a
 * route that reaches its handler (and therefore fails differently) is a route
 * that is not gated.
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
