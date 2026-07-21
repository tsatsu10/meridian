/**
 * GET /assignments/:userId requires canManageRoles (see rbac-authorization
 * .test.ts) — but the web app's RBACProvider calls this endpoint with the
 * CALLER'S OWN id to learn their own role for the UI. Gating that behind
 * canManageRoles means an ordinary member can no longer see their own role,
 * which was masked only by a since-removed frontend hardcode that ignored
 * this endpoint's response entirely (apps/web/src/lib/permissions/provider.tsx).
 *
 * This proves a caller looking up their OWN id is let through even without
 * canManageRoles, while looking up someone else's id is still denied.
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import rbacRoutes from "../index";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([{ id: "caller-id" }]),
  orderBy: vi.fn().mockResolvedValue([]),
};

vi.mock("../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../../services/rbac/role-audit-service", () => ({
  RoleAuditService: {
    getUserAuditTrail: vi.fn(),
    getWorkspaceAuditTrail: vi.fn(),
    getAuditStats: vi.fn(),
  },
}));

// Stub canManageRoles to always deny, standing in for a caller whose role
// lacks the permission — the "not self" case must still hit this and 403.
vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (c: import("hono").Context) =>
    c.json({ error: "Insufficient permissions" }, 403),
}));

describe("GET /assignments/:userId self-lookup exception", () => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("userEmail", "caller@example.com");
    await next();
  });
  app.route("/", rbacRoutes);

  it("allows a caller to look up their own role without canManageRoles", async () => {
    const res = await app.request("/assignments/caller-id");
    expect(res.status).toBe(200);
  });

  it("still blocks a caller looking up someone else's role", async () => {
    const res = await app.request("/assignments/someone-else-id");
    expect(res.status).toBe(403);
  });
});
