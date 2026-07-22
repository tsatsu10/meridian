/**
 * PUT /:teamId/permissions/:userId claims to update a member's custom
 * permissions but had no permission guard at all — any authenticated user
 * could call it. It's currently a no-op (see
 * https://github.com/tsatsu10/meridian/issues/66), but the missing guard is
 * a bug in its own right: the moment persistence is implemented without a
 * guard, any authenticated user could grant themselves or anyone else
 * arbitrary custom permissions. This proves the route now requires
 * canManageTeamMembers before reaching the handler.
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import teamRoutes from "../index";

vi.mock("../../database/connection", () => ({
  getDatabase: () => ({}),
}));

vi.mock("../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Stub the permission guard to always deny, standing in for a caller whose
// role lacks canManageTeamMembers. If the route doesn't actually invoke a
// guard, the request reaches the real handler instead (a different status).
vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (c: import("hono").Context) =>
    c.json({ error: "Insufficient permissions" }, 403),
}));

describe("PUT /:teamId/permissions/:userId requires canManageTeamMembers", () => {
  it("blocks a caller without canManageTeamMembers", async () => {
    const app = new Hono();
    app.route("/", teamRoutes);

    const res = await app.request("/team-1/permissions/user-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: { canViewReports: true } }),
    });

    expect(res.status).toBe(403);
  });
});
