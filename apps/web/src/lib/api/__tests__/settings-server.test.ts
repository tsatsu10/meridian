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

// Regression: ProductionSettingsAPI.save()/load() (backing getSettings/
// updateSettings) targeted PUT/GET /api/users/:userId/settings, a route
// that doesn't exist anywhere in the API — every call 404'd and silently
// fell back to localStorage-only persistence. The real backend only
// exposes GET /api/settings/:userId and PATCH /api/settings/:userId/:section
// (apps/api/src/settings/index.ts), where :userId is compared against the
// authenticated user's email, not a database id.
describe("SettingsAPI.getSettings targets the real per-user GET route", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls GET /api/settings/:userId", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { profile: { name: "Ada" } },
        success: true,
      }),
    });

    await SettingsAPI.getSettings("ada@example.com");

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe("http://localhost:3005/api/settings/ada@example.com");
    expect(options.method ?? "GET").toBe("GET");
  });

  it("merges the server response with client-side defaults", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { profile: { name: "Ada" } },
        success: true,
      }),
    });

    const settings = await SettingsAPI.getSettings("ada@example.com");

    expect(settings.profile.name).toBe("Ada");
    expect(settings.appearance.theme).toBe("system");
  });

  it("falls back to localStorage when the request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    });

    const settings = await SettingsAPI.getSettings("ada@example.com");

    expect(settings.profile.name).toBe("");
    expect(settings.appearance.theme).toBe("system");
  });
});

describe("SettingsAPI.updateSettings targets the real per-section PATCH route", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls PATCH /api/settings/:userId/:section with { updates } as the body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { settings: { appearance: { theme: "dark" } }, conflicts: [] },
        success: true,
      }),
    });

    await SettingsAPI.updateSettings("ada@example.com", "appearance", {
      theme: "dark",
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(
      "http://localhost:3005/api/settings/ada@example.com/appearance",
    );
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body as string)).toEqual({
      updates: { theme: "dark" },
    });
  });

  it("returns the server's merged settings rather than a client reconstruction", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          settings: { appearance: { theme: "dark", fontSize: 18 } },
          conflicts: [],
        },
        success: true,
      }),
    });

    const result = await SettingsAPI.updateSettings(
      "ada@example.com",
      "appearance",
      { theme: "dark" },
    );

    expect(result.settings.appearance.theme).toBe("dark");
    expect(result.settings.appearance.fontSize).toBe(18);
  });

  it("falls back to localStorage when the request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    });

    const result = await SettingsAPI.updateSettings(
      "ada@example.com",
      "appearance",
      { theme: "dark" },
    );

    expect(result.settings.appearance.theme).toBe("dark");
    const stored = JSON.parse(
      localStorage.getItem("meridian-settings-ada@example.com") ?? "{}",
    );
    expect(stored.appearance.theme).toBe("dark");
  });
});

describe("SettingsAPI.resetSection targets the real per-section reset route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /api/settings/:userId/:section/reset", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { appearance: { theme: "system" } },
        success: true,
      }),
    });

    await SettingsAPI.resetSection("ada@example.com", "appearance");

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(
      "http://localhost:3005/api/settings/ada@example.com/appearance/reset",
    );
    expect(options.method).toBe("POST");
  });
});
