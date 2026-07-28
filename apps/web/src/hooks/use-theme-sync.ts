import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettingsStore } from "@/store/settings";
import useTheme from "@/components/providers/theme-provider/hooks/use-theme";
import {
  getSunTimes,
  themeForSchedule,
  themeForSunTimes,
} from "@/lib/theme/auto-theme";

/**
 * Hook to sync theme and appearance settings across the entire application
 * @epic-3.2-settings: Theme and appearance synchronization
 */

/** How often the automatic schedules re-evaluate. */
const AUTO_THEME_TICK_MS = 30_000;

export function useThemeSync() {
  const { settings, updateSettings } = useSettingsStore();
  const { theme: providerTheme, setTheme: setProviderTheme } = useTheme();
  const appearance = settings.appearance;

  const {
    scheduledThemeEnabled,
    lightThemeTime,
    darkThemeTime,
    locationBasedEnabled,
    locationLatitude,
    locationLongitude,
  } = appearance;

  const autoThemeActive = scheduledThemeEnabled || locationBasedEnabled;

  // Ticks only while an automatic schedule is on, so pages with a fixed theme
  // don't re-render on a timer.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!autoThemeActive) {
      return;
    }
    const interval = setInterval(() => setTick(Date.now()), AUTO_THEME_TICK_MS);
    return () => clearInterval(interval);
  }, [autoThemeActive]);

  /**
   * The theme actually applied to the document. The user's stored `theme` is
   * their manual choice; an enabled schedule overrides what gets applied
   * *without* writing back to that choice.
   *
   * Writing the computed value back into settings is what made this crash
   * before: the location effect depended on `theme` and called a `setTheme`
   * that was rebuilt on every render, so it re-ran and re-set on every render
   * until React threw "Maximum update depth exceeded".
   */
  const effectiveTheme = useMemo(() => {
    const now = new Date(tick);

    if (
      locationBasedEnabled &&
      locationLatitude !== null &&
      locationLongitude !== null
    ) {
      const sunTimes = getSunTimes(now, locationLatitude, locationLongitude);
      if (sunTimes) {
        return themeForSunTimes(now, sunTimes);
      }
      // Polar day/night: no sunrise to follow. Fall through to the fixed
      // schedule if there is one, otherwise the manual choice.
    }

    if (scheduledThemeEnabled) {
      return themeForSchedule(now, lightThemeTime, darkThemeTime);
    }

    return appearance.theme;
  }, [
    tick,
    locationBasedEnabled,
    locationLatitude,
    locationLongitude,
    scheduledThemeEnabled,
    lightThemeTime,
    darkThemeTime,
    appearance.theme,
  ]);

  // Push the effective theme at the provider. Guarded so this only fires on an
  // actual change.
  useEffect(() => {
    if (providerTheme !== effectiveTheme) {
      setProviderTheme(effectiveTheme);
    }
  }, [effectiveTheme, providerTheme, setProviderTheme]);

  // Apply every appearance setting to the document root. This runs wherever the
  // hook is mounted, so the accessibility, typography and background
  // preferences take effect across the app rather than only on the settings
  // page that used to toggle the classes by hand.
  useEffect(() => {
    const root = document.documentElement;

    // Reading size. Consumed via --app-font-size-rem (see index.css).
    root.style.setProperty("--app-font-size", `${appearance.fontSize}px`);

    // Typography. Previously these were applied to a preview element only,
    // while the card claimed the settings applied "across the application".
    root.style.setProperty("--app-font-family", appearance.fontFamily);
    root.style.setProperty("--app-font-weight", String(appearance.fontWeight));
    root.style.setProperty("--app-line-height", String(appearance.lineHeight));
    root.style.setProperty(
      "--app-letter-spacing",
      `${appearance.letterSpacing}px`,
    );

    // Background image. A URL served by the API, or nothing.
    if (appearance.backgroundImage) {
      root.style.setProperty(
        "--app-background-image",
        `url("${appearance.backgroundImage}")`,
      );
      root.style.setProperty(
        "--app-background-position",
        appearance.backgroundPosition,
      );
      root.style.setProperty(
        "--app-background-blur",
        `${appearance.backgroundBlur}px`,
      );
      root.style.setProperty(
        "--app-background-opacity",
        String(appearance.backgroundOpacity / 100),
      );
      root.classList.add("has-custom-background");
    } else {
      root.style.removeProperty("--app-background-image");
      root.classList.remove("has-custom-background");
    }

    // Density. (There was a third variable here, --app-gap, that no stylesheet
    // ever read; it has been dropped rather than left looking functional.)
    const densityMap = {
      compact: { spacing: "0.5rem", padding: "0.75rem" },
      comfortable: { spacing: "1rem", padding: "1rem" },
      spacious: { spacing: "1.5rem", padding: "1.5rem" },
    };
    const density = densityMap[appearance.density as keyof typeof densityMap];
    if (density) {
      root.style.setProperty("--app-spacing", density.spacing);
      root.style.setProperty("--app-padding", density.padding);
    }

    // Class-based toggles. `reduce-motion` is the name index.css defines; the
    // accessibility four are read back from here rather than from a second
    // store, which is why they now survive a reload.
    const classToggles: Array<[string, boolean]> = [
      ["high-contrast", appearance.highContrast],
      ["reduce-motion", appearance.reducedMotion],
      ["compact-mode", appearance.compactMode],
      ["no-animations", !appearance.animations],
      ["large-text", appearance.largeText],
      ["enhanced-focus", appearance.enhancedFocus],
      ["screen-reader-mode", appearance.screenReaderMode],
      ["keyboard-nav", appearance.keyboardNavigation],
    ];
    for (const [className, enabled] of classToggles) {
      root.classList.toggle(className, enabled);
    }

    root.style.setProperty(
      "--contrast-multiplier",
      appearance.highContrast ? "1.5" : "1",
    );
    root.style.setProperty(
      "--animation-duration",
      appearance.reducedMotion ? "0.01ms" : "0.3s",
    );
    root.style.setProperty(
      "--transition-duration",
      appearance.reducedMotion ? "0.01ms" : "0.2s",
    );
    root.style.setProperty(
      "--sidebar-width",
      appearance.compactMode ? "60px" : "280px",
    );
    root.style.setProperty(
      "--header-height",
      appearance.compactMode ? "50px" : "72px",
    );
  }, [appearance]);

  /** Records the user's manual theme choice. */
  const setTheme = useCallback(
    (newTheme: "light" | "dark" | "system") => {
      updateSettings("appearance", { theme: newTheme });
    },
    [updateSettings],
  );

  return {
    /** The user's stored choice, which is what the theme picker reflects. */
    theme: appearance.theme,
    /** What is actually applied right now — differs when a schedule is on. */
    effectiveTheme,
    setTheme,
    /** True when a schedule is overriding the manual choice. */
    autoThemeActive,
  };
}
