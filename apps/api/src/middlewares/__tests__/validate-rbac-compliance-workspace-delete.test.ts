/**
 * Regression: validateRBACCompliance() is mounted globally
 * (workspace.use("*", validateRBACCompliance())) BEFORE any route's own
 * requireWorkspacePermission middleware runs — so when it checks
 * isAdminOperation() + hasAdminRole(c.get("userRole")) for
 * DELETE /workspace(s)/:id, userRole has never been set yet (that happens
 * inside requireWorkspacePermission, further down the chain). The check
 * always sees userRole === undefined and always rejects with 403 —
 * for literally every caller, including real workspace owners/admins.
 * Confirmed live: even the demo admin account got 403 deleting a
 * workspace it just created itself.
 *
 * requireWorkspacePermission("canDeleteWorkspace", "id") on the actual
 * DELETE /:id route already performs the correct, DB-backed,
 * workspace-scoped check — so this blanket admin-role re-check for
 * workspace deletion is both redundant and permanently broken. It should
 * not block the request.
 */

import { Hono } from "hono";
import { describe, it, expect } from "vitest";
import { validateRBACCompliance } from "../security-audit";

function buildApp() {
  const app = new Hono<{
    Variables: { userEmail: string; userRole?: string };
  }>();
  app.use("*", async (c, next) => {
    c.set("userEmail", "owner@example.com");
    // Deliberately not setting userRole — matches what actually happens on
    // the real workspace router before requireWorkspacePermission runs.
    await next();
  });
  app.use("*", validateRBACCompliance());
  app.delete("/api/workspace/:id", (c) => c.json({ deleted: true }));
  return app;
}

describe("validateRBACCompliance does not block workspace deletion before role is known", () => {
  it("lets DELETE /api/workspace/:id reach the route handler", async () => {
    const res = await buildApp().request("/api/workspace/ws-123", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
  });
});
