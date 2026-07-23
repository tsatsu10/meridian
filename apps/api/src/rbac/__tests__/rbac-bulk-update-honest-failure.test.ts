/**
 * POST /permissions/bulk-update used to return `success: true` for any
 * authorized caller while persisting nothing — a misleading response, same
 * class of bug fixed in #59 (2FA-enforcement toggle faking success). This
 * proves an authorized caller now gets an honest 501 instead of fake
 * success. See https://github.com/tsatsu10/meridian/issues/67.
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import rbacRoutes from "../index";

vi.mock("../../database/connection", () => ({
  getDatabase: () => ({}),
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

// Stand in for a caller who DOES have canManageRoles — the guard passes
// through to the real handler.
vi.mock("../../middlewares/rbac", () => ({
  requirePermission:
    () => async (_c: import("hono").Context, next: () => Promise<void>) =>
      next(),
}));

describe("POST /permissions/bulk-update honest-failure response", () => {
  it("does not claim success for an authorized caller (not implemented)", async () => {
    const app = new Hono();
    app.route("/", rbacRoutes);

    const res = await app.request("/permissions/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permissions: { member: { canManageWorkspace: true } },
      }),
    });

    const body = await res.json();
    expect(body.success).not.toBe(true);
    expect(res.status).toBe(501);
  });
});
