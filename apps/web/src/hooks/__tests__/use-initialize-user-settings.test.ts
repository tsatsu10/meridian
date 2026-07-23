import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettingsStore } from "@/store/settings";
import { useInitializeUserSettings } from "../use-initialize-user-settings";

/**
 * Regression: useSettingsStore.saveSettings() no-ops until `initialize(email)`
 * has been called at least once (it sets the module-level currentUserId that
 * saveSettings gates on). Nothing in the app ever called initialize(), so
 * every settings save silently never reached the network — this hook is the
 * missing wiring.
 */
describe("useInitializeUserSettings", () => {
  beforeEach(() => {
    useSettingsStore.setState({ initialize: vi.fn() });
  });

  it("initializes the settings store once the user's email is known", () => {
    const initialize = vi.fn();
    useSettingsStore.setState({ initialize });

    renderHook(() => useInitializeUserSettings("ada@example.com"));

    expect(initialize).toHaveBeenCalledWith("ada@example.com");
  });

  it("does not initialize while the user's email is unknown", () => {
    const initialize = vi.fn();
    useSettingsStore.setState({ initialize });

    renderHook(() => useInitializeUserSettings(undefined));

    expect(initialize).not.toHaveBeenCalled();
  });

  it("re-initializes if the user's email changes", () => {
    const initialize = vi.fn();
    useSettingsStore.setState({ initialize });

    const { rerender } = renderHook(
      ({ email }) => useInitializeUserSettings(email),
      { initialProps: { email: "ada@example.com" as string | undefined } },
    );

    rerender({ email: "grace@example.com" });

    expect(initialize).toHaveBeenNthCalledWith(1, "ada@example.com");
    expect(initialize).toHaveBeenNthCalledWith(2, "grace@example.com");
  });
});
