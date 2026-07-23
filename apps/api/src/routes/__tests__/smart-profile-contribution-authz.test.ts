/**
 * POST /:userId/contributions is documented as "admin/manager" only
 * ("Record major contribution (admin/manager)") but had no permission check
 * at all — any authenticated user could fabricate a "major contribution"
 * record (project_lead/key_feature/etc.) for themselves or anyone else, with
 * no manager approval. This proves the route now requires
 * canManageTeamMembers (the permission the comment's "admin/manager" intent
 * maps to — granted to team-lead/department-head/workspace-manager) before
 * reaching the handler.
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import smartProfileRoutes from "../smart-profile";

vi.mock("../../middlewares/auth", () => ({
  auth: async (c: import("hono").Context, next: () => Promise<void>) => {
    c.set("userEmail", "caller@example.com");
    c.set("userId", "caller-id");
    await next();
  },
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

describe("POST /:userId/contributions requires canManageTeamMembers", () => {
  it("blocks a caller without canManageTeamMembers", async () => {
    const app = new Hono();
    app.route("/", smartProfileRoutes);

    const res = await app.request("/victim-id/contributions?workspaceId=ws-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Shipped the thing",
        projectId: "project-1",
      }),
    });

    expect(res.status).toBe(403);
  });
});
