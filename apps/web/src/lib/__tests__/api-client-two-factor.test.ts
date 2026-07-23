import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: apiClient.auth.twoFactor.* built its URL as
 * `${API_URL}/auth/two-factor/...`, but API_URL (constants/urls.ts) does
 * NOT include the `/api` prefix — that's what API_BASE_URL is for. The
 * two-factor router is mounted at /api/auth/two-factor
 * (apps/api/src/index.ts), so every call actually hit
 * `/auth/two-factor/...` on the Vite dev server (or the bare API origin in
 * prod), which has no such route. In dev this falls through to the SPA's
 * index.html (200, wrong content, not JSON); the whole 2FA UI silently
 * never worked — getStatus() always rejected trying to parse HTML as JSON,
 * so twoFactorStatus stayed undefined forever.
 */
describe("apiClient.auth.twoFactor URLs", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const urlOf = () =>
    (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;

  it("generate() calls the /api-prefixed route", async () => {
    const { apiClient } = await import("../api-client");
    await apiClient.auth.twoFactor.generate();
    expect(urlOf()).toBe("http://localhost:3005/api/auth/two-factor/generate");
  });

  it("verify() calls the /api-prefixed route", async () => {
    const { apiClient } = await import("../api-client");
    await apiClient.auth.twoFactor.verify({ secret: "s", token: "123456" });
    expect(urlOf()).toBe("http://localhost:3005/api/auth/two-factor/verify");
  });

  it("disable() calls the /api-prefixed route", async () => {
    const { apiClient } = await import("../api-client");
    await apiClient.auth.twoFactor.disable({ password: "pw" });
    expect(urlOf()).toBe("http://localhost:3005/api/auth/two-factor/disable");
  });

  it("verifyLogin() calls the /api-prefixed route", async () => {
    const { apiClient } = await import("../api-client");
    await apiClient.auth.twoFactor.verifyLogin({ userId: "u1", token: "1" });
    expect(urlOf()).toBe(
      "http://localhost:3005/api/auth/two-factor/verify-login",
    );
  });

  it("regenerateBackupCodes() calls the /api-prefixed route", async () => {
    const { apiClient } = await import("../api-client");
    await apiClient.auth.twoFactor.regenerateBackupCodes();
    expect(urlOf()).toBe(
      "http://localhost:3005/api/auth/two-factor/backup-codes/regenerate",
    );
  });

  it("getStatus() calls the /api-prefixed route", async () => {
    const { apiClient } = await import("../api-client");
    await apiClient.auth.twoFactor.getStatus();
    expect(urlOf()).toBe("http://localhost:3005/api/auth/two-factor/status");
  });
});
