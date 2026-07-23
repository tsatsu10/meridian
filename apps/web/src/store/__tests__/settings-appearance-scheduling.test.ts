import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: Scheduled Theme Switching and Location-Based Theme on the
 * Appearance settings page lived entirely in local useState — never part
 * of AllSettings, never sent anywhere. Configure a schedule, refresh the
 * page, and it silently resets: scheduledThemeEnabled/lightThemeTime/
 * darkThemeTime/locationBasedEnabled need to be real, persisted appearance
 * settings fields like theme/highContrast already are.
 */
describe("appearance settings: scheduled/location theme fields", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { settings: {}, conflicts: [] },
        success: true,
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to disabled scheduling, matching the page's prior local-state defaults", async () => {
    const { useSettingsStore } = await import("../settings");
    const { appearance } = useSettingsStore.getState().settings;

    expect(appearance.scheduledThemeEnabled).toBe(false);
    expect(appearance.lightThemeTime).toBe("06:00");
    expect(appearance.darkThemeTime).toBe("18:00");
    expect(appearance.locationBasedEnabled).toBe(false);
  });

  it("persists an enabled schedule through updateSettings, not local state", async () => {
    const { useSettingsStore } = await import("../settings");

    await useSettingsStore.getState().updateSettings("appearance", {
      scheduledThemeEnabled: true,
      lightThemeTime: "07:30",
      darkThemeTime: "19:00",
    });

    const { appearance } = useSettingsStore.getState().settings;
    expect(appearance.scheduledThemeEnabled).toBe(true);
    expect(appearance.lightThemeTime).toBe("07:30");
    expect(appearance.darkThemeTime).toBe("19:00");
  });
});
