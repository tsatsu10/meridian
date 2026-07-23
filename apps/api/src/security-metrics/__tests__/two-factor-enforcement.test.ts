/**
 * POST /enforcement ("Toggle 2FA enforcement") never stored the setting
 * anywhere (no workspace-settings table exists to store it in — confirmed
 * via grep, matching the separate "Settings table not yet implemented"
 * TODO in settings/index.ts) — it just wrote a settings_audit_log row
 * claiming "two_factor_enforcement_enabled"/"...disabled" and returned
 * `{ success: true, enabled }`. Anyone reviewing the audit log, or the
 * caller itself, would believe 2FA enforcement is now active when nothing
 * in the codebase actually enforces it. This proves the endpoint no longer
 * claims success or logs a misleading "enforcement changed" audit entry
 * for a setting that was never persisted.
 */

import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import twoFactorRoutes from "../two-factor";

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../database/connection", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../utils/logger", () => ({
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../../middlewares/secure-auth", () => ({
  authMiddleware:
    () => async (c: import("hono").Context, next: () => Promise<void>) => {
      c.set("userEmail", "admin@example.com");
      await next();
    },
}));

describe("POST /enforcement", () => {
  it("does not claim success or log a fake enforcement-changed audit entry", async () => {
    const app = new Hono();
    app.route("/", twoFactorRoutes);

    const res = await app.request("/enforcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.success).not.toBe(true);

    const auditInsertCalls = mockDb.insert.mock.calls;
    expect(auditInsertCalls.length).toBe(0);
  });
});
