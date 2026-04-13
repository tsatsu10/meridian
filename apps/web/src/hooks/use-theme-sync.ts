import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings";
import useTheme from "@/components/providers/theme-provider/hooks/use-theme";

/**
 * Hook to sync theme and appearance settings across the entire application
 * @epic-3.2-settings: Theme and appearance synchronization
 */
export function useThemeSync() {
  const { settings, updateSettings } = useSettingsStore();
  const { theme, setTheme: setProviderTheme } = useTheme();

  // Apply all appearance settings to the document root
  const applyAppearanceSettings = (appearanceSettings: typeof settings.appearance) => {
    const root = document.documentElement;
    
    // Apply font size
    root.style.setProperty('--app-font-size', `${appearanceSettings.fontSize}px`);
    
    // Apply density
    const densityMap = {
      compact: { spacing: '0.5rem', padding: '0.75rem', gap: '0.5rem' },
      comfortable: { spacing: '1rem', padding: '1rem', gap: '1rem' },
      spacious: { spacing: '1.5rem', padding: '1.5rem', gap: '1.5rem' }
    };
    const density = densityMap[appearanceSettings.density as keyof typeof densityMap];
    if (density) {
      root.style.setProperty('--app-spacing', density.spacing);
      root.style.setProperty('--app-padding', density.padding);
      root.style.setProperty('--app-gap', density.gap);
    }
    
    // Apply high contrast
    if (appearanceSettings.highContrast) {
      root.classList.add('high-contrast');
      root.style.setProperty('--contrast-multiplier', '1.5');
    } else {
      root.classList.remove('high-contrast');
      root.style.setProperty('--contrast-multiplier', '1');
    }
    
    // Apply reduced motion
    if (appearanceSettings.reducedMotion) {
      root.classList.add('reduce-motion');
      root.style.setProperty('--animation-duration', '0.1s');
      root.style.setProperty('--transition-duration', '0.1s');
    } else {
      root.classList.remove('reduce-motion');
      root.style.setProperty('--animation-duration', '0.3s');
      root.style.setProperty('--transition-duration', '0.2s');
    }

    // Apply compact mode
    if (appearanceSettings.compactMode) {
      root.classList.add('compact-mode');
      root.style.setProperty('--sidebar-width', '60px');
      root.style.setProperty('--header-height', '50px');
    } else {
      root.classList.remove('compact-mode');
      root.style.setProperty('--sidebar-width', '240px');
      root.style.setProperty('--header-height', '64px');
    }

    // Apply animations
    if (!appearanceSettings.animations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  };

  // Apply appearance settings when they change
  useEffect(() => {
    applyAppearanceSettings(settings.appearance);
  }, [settings.appearance]);

  // Sync theme from settings store to theme provider
  useEffect(() => {
    if (settings.appearance.theme !== theme) {
      setProviderTheme(settings.appearance.theme);
    }
  }, [settings.appearance.theme, theme, setProviderTheme]);

  // Function to update theme in both stores
  const setTheme = (newTheme: "light" | "dark" | "system") => {
    // Update settings store
    updateSettings("appearance", { theme: newTheme });
    // Update theme provider (will be synced via useEffect)
    setProviderTheme(newTheme);
  };

  return {
    theme: settings.appearance.theme,
    setTheme,
    applyAppearanceSettings, // Export for manual application
  };
} 