import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsAPI } from "../settings-server";

describe("ProductionSettingsAPI auth (#97)", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Regression: every request through this client read a Bearer token from
  // localStorage/sessionStorage that the real sign-in flow never populates
  // (the app authenticates via an HttpOnly session cookie), and never set
  // credentials: "include" to send that cookie either — so every call
  // hit the API unauthenticated and 401'd. Confirmed live via
  // POST /api/settings/profile/validate and /appearance/validate.
  it("sends the session cookie instead of a Bearer token", async () => {
    await SettingsAPI.validateSettings("profile", { name: "Test" });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(options.credentials).toBe("include");
    expect(options.headers?.Authorization).toBeUndefined();
  });
});
