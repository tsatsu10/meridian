import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: updateSettings() threw away rapid changes. Anything arriving
 * inside UPDATE_THROTTLE_MS (100ms) of the previous call took the throttle
 * branch, which cleared the *shared* autoSaveTimeout and rescheduled only its
 * own payload — so of N updates fired in one tick, only one survived.
 *
 * Observed live before this fix: "Reset to Defaults" on the Appearance page
 * issues four updates in a row and changed nothing at all, while still toasting
 * success. Reproduced directly in the browser too: three different settings
 * flipped in one tick, only the first persisted.
 *
 * The local state update is cheap and must always apply; only the network save
 * is expensive, so only the save is debounced.
 */
describe("updateSettings: rapid successive updates", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
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

  it("keeps every change when several land in the same tick", async () => {
    const { useSettingsStore } = await import("../settings");
    const store = useSettingsStore.getState();

    await Promise.all([
      store.updateSettings("appearance", { highContrast: true }),
      store.updateSettings("appearance", { reducedMotion: true }),
      store.updateSettings("appearance", { scheduledThemeEnabled: true }),
    ]);

    const { appearance } = useSettingsStore.getState().settings;
    expect(appearance.highContrast).toBe(true);
    expect(appearance.reducedMotion).toBe(true);
    expect(appearance.scheduledThemeEnabled).toBe(true);
  });

  it("keeps every change when they are awaited back-to-back", async () => {
    const { useSettingsStore } = await import("../settings");
    const store = useSettingsStore.getState();

    await store.updateSettings("appearance", { highContrast: true });
    await store.updateSettings("appearance", { reducedMotion: true });
    await store.updateSettings("appearance", { compactMode: true });

    const { appearance } = useSettingsStore.getState().settings;
    expect(appearance.highContrast).toBe(true);
    expect(appearance.reducedMotion).toBe(true);
    expect(appearance.compactMode).toBe(true);
  });

  it("applies a change to a different section without dropping the first", async () => {
    const { useSettingsStore } = await import("../settings");
    const store = useSettingsStore.getState();

    await store.updateSettings("appearance", { highContrast: true });
    await store.updateSettings("profile", { name: "Ada" });

    const { appearance, profile } = useSettingsStore.getState().settings;
    expect(appearance.highContrast).toBe(true);
    expect(profile.name).toBe("Ada");
  });

  it("resetSection restores that section's defaults in one shot", async () => {
    const { useSettingsStore } = await import("../settings");
    const store = useSettingsStore.getState();

    await store.updateSettings("appearance", {
      highContrast: true,
      reducedMotion: true,
      largeText: true,
      scheduledThemeEnabled: true,
    });

    await useSettingsStore.getState().resetSection("appearance");

    const { appearance } = useSettingsStore.getState().settings;
    expect(appearance.highContrast).toBe(false);
    expect(appearance.reducedMotion).toBe(false);
    expect(appearance.largeText).toBe(false);
    expect(appearance.scheduledThemeEnabled).toBe(false);
  });
});
