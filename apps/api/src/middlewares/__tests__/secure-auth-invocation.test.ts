/**
 * Regression test for a bug where `authMiddleware` (a factory exported from
 * secure-auth.ts as `() => (c, next) => {...}`) was passed UNINVOKED into
 * Hono route handler chains across ~11 files (`authMiddleware` instead of
 * `authMiddleware()`).
 *
 * Tracing Hono's compose() (node_modules/hono/dist/compose.js):
 *   res = await handler(context, () => dispatch(i + 1))
 * Calling the bare factory as `handler(context, next)` executes the
 * factory's synchronous body (which ignores the two args) and returns the
 * INNER middleware function without ever invoking the passed `next`
 * callback — so the chain never advances, the real route handler never
 * runs, and Hono assigns the returned function object itself as
 * `context.res` (not a Response). `app.request()` on the buggy pattern
 * resolves to a non-Response value with `status: undefined`.
 *
 * This test proves the CURRENT (fixed) code takes the real code path: an
 * unauthenticated request reaches the middleware's own logic and gets back
 * a genuine 401 Response, which could only happen if the factory was
 * actually invoked.
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import monitoringRoutes from "../../monitoring";

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

describe("authMiddleware invocation (monitoringRoutes as a representative consumer)", () => {
  it("returns a real 401 Response for an unauthenticated request", async () => {
    const app = new Hono();
    app.route("/", monitoringRoutes);

    const res = await app.request("/metrics");

    // The buggy (uninvoked-factory) version resolves to a plain function
    // object here, not a Response, and res.status is undefined.
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(401);

    const body = await res.text();
    expect(body).toContain("Authentication required");
  });
});
