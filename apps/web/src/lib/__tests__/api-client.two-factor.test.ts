import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api-client";

describe("apiClient.auth.twoFactor", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Regression: these six calls used the bare API_URL constant (empty
  // string in dev, no /api prefix in any environment) instead of
  // API_BASE_URL, so every 2FA request hit a URL neither the dev-server
  // proxy nor the real API server has a route for — 404 on every call.
  it("calls generate under /api/auth/two-factor", async () => {
    await apiClient.auth.twoFactor.generate();
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("/api/auth/two-factor/generate");
  });

  it("calls verify under /api/auth/two-factor", async () => {
    await apiClient.auth.twoFactor.verify({ secret: "s", token: "123456" });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("/api/auth/two-factor/verify");
  });

  it("calls disable under /api/auth/two-factor", async () => {
    await apiClient.auth.twoFactor.disable({ password: "pw" });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("/api/auth/two-factor/disable");
  });

  it("calls verifyLogin under /api/auth/two-factor", async () => {
    await apiClient.auth.twoFactor.verifyLogin({
      userId: "u1",
      token: "123456",
    });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("/api/auth/two-factor/verify-login");
  });

  it("calls regenerateBackupCodes under /api/auth/two-factor", async () => {
    await apiClient.auth.twoFactor.regenerateBackupCodes();
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("/api/auth/two-factor/backup-codes/regenerate");
  });

  it("calls getStatus under /api/auth/two-factor", async () => {
    await apiClient.auth.twoFactor.getStatus();
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("/api/auth/two-factor/status");
  });
});
