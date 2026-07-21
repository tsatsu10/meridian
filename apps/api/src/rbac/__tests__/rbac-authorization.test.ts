/**
 * RBAC route-level authorization tests.
 *
 * GET /assignments, GET /assignments/:userId, POST /assign,
 * DELETE /remove/:userId, POST /permissions/custom and POST
 * /permissions/check had NO permission check at all — any authenticated
 * user (any role, e.g. a default "member") could view every user's role
 * assignments (including an arbitrary target's full assignment + custom
 * permission rows via /permissions/check), assign themselves (or anyone)
 * the "workspace-manager" role, remove anyone's role, or grant/revoke
 * arbitrary custom permissions. This is a privilege-escalation and
 * info-disclosure vulnerability, not a hypothetical: nothing in the request
 * chain checked the caller's own permissions before performing the action.
 *
 * These tests prove each endpoint now rejects a caller lacking
 * "canManageRoles" with 403 BEFORE reaching the handler — i.e. the guard is
 * actually wired into the route chain, not just present elsewhere unused.
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

// Stub canManageRoles to always deny, standing in for a caller whose role
// lacks the permission. If a route doesn't actually invoke this guard, the
// request reaches the real handler instead and this test fails differently
// (a non-403 status), which is what happened before the fix.
vi.mock("../../middlewares/rbac", () => ({
  requirePermission: () => async (c: import("hono").Context) =>
    c.json({ error: "Insufficient permissions" }, 403),
}));

describe("rbac routes require canManageRoles", () => {
  const app = new Hono();
  app.route("/", rbacRoutes);

  it("blocks GET /assignments for a caller without canManageRoles", async () => {
    const res = await app.request("/assignments");
    expect(res.status).toBe(403);
  });

  it("blocks GET /assignments/:userId for a caller without canManageRoles", async () => {
    const res = await app.request("/assignments/some-user-id");
    expect(res.status).toBe(403);
  });

  it("blocks POST /assign for a caller without canManageRoles", async () => {
    const res = await app.request("/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "victim-id", role: "workspace-manager" }),
    });
    expect(res.status).toBe(403);
  });

  it("blocks DELETE /remove/:userId for a caller without canManageRoles", async () => {
    const res = await app.request("/remove/some-user-id", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("blocks POST /permissions/custom for a caller without canManageRoles", async () => {
    const res = await app.request("/permissions/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "victim-id",
        permission: "canManageWorkspace",
        granted: true,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("blocks POST /permissions/check for a caller without canManageRoles", async () => {
    const res = await app.request("/permissions/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "victim-id",
        permission: "canManageWorkspace",
      }),
    });
    expect(res.status).toBe(403);
  });
});
