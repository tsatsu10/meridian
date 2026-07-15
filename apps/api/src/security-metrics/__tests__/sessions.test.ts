/**
 * Session termination ownership tests.
 *
 * POST /:sessionId/terminate previously deleted whatever session id the
 * caller supplied with NO check that it belonged to them — any authenticated
 * user could terminate any other user's session (IDOR / forced-logout DoS).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { inspect } from "node:util";
import { Hono } from "hono";
import sessionRoutes from "../sessions";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  orderBy: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock("../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../utils/logger", () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// The route wires the real authMiddleware (from ../../middlewares/secure-auth)
// directly into its handler chain; stub it here so tests exercise the route's
// own authorization logic rather than session-cookie plumbing, matching the
// pattern in auth/routes/__tests__/two-factor.test.ts.
vi.mock("../../middlewares/secure-auth", () => ({
  authMiddleware: async (
    c: import("hono").Context,
    next: () => Promise<void>,
  ) => {
    c.set("userEmail", "caller@example.com");
    await next();
  },
}));

describe("POST /:sessionId/terminate", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/", sessionRoutes);
  });

  it("does not delete a session belonging to another user", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "caller-user-id" }]); // user lookup
    mockDb.returning.mockResolvedValueOnce([]); // scoped delete matched nothing

    const res = await app.request("/other-users-session/terminate", {
      method: "POST",
    });

    expect(res.status).toBe(404);
    // The delete call must scope by BOTH session id and the caller's userId —
    // asserting only "was delete called" would pass even without the fix.
    // Drizzle's condition objects are circular, so inspect() rather than
    // JSON.stringify().
    expect(mockDb.where).toHaveBeenCalled();
    const whereArgs = mockDb.where.mock.calls.map((call) =>
      inspect(call, { depth: 8 }),
    );
    expect(whereArgs.some((a) => a.includes("caller-user-id"))).toBe(true);
  });

  it("deletes a session that belongs to the caller", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "caller-user-id" }]);
    mockDb.returning.mockResolvedValueOnce([{ id: "my-session-id" }]);

    const res = await app.request("/my-session-id/terminate", {
      method: "POST",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 404 when the caller has no user record", async () => {
    mockDb.limit.mockResolvedValueOnce([]);

    const res = await app.request("/any-session/terminate", {
      method: "POST",
    });

    expect(res.status).toBe(404);
    expect(mockDb.delete).not.toHaveBeenCalled();
  });
});
