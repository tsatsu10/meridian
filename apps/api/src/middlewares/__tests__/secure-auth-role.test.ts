/**
 * authMiddleware previously hardcoded `role: "USER"` on every authenticated
 * session instead of reading the user's real role from the database — the
 * TODO left in place meant the value returned by validateSessionToken() was
 * silently discarded. This proves the session's actual `users.role` column
 * value reaches `c.get("user").role`.
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { authMiddleware } from "../secure-auth";

vi.mock("../../services/security-logging", () => ({
  getSecurityLoggingService: () => ({
    logAuthenticationEvent: vi.fn(),
    logEvent: vi.fn(),
    logAuthorizationEvent: vi.fn(),
  }),
}));

vi.mock("../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../../user/utils/validate-session-token.js", () => ({
  validateSessionToken: vi.fn(async () => ({
    session: { id: "session-1", expiresAt: new Date(Date.now() + 100000) },
    user: {
      id: "user-1",
      email: "admin@example.com",
      role: "workspace-manager",
    },
  })),
}));

describe("authMiddleware role propagation", () => {
  it("sets the authenticated user's real role, not a hardcoded default", async () => {
    const app = new Hono();
    let capturedRole: string | undefined;

    app.get("/protected", authMiddleware(), (c) => {
      capturedRole = c.get("user")?.role;
      return c.json({ ok: true });
    });

    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer sometoken" },
    });

    expect(res.status).toBe(200);
    expect(capturedRole).toBe("workspace-manager");
  });
});
