import { useEffect, createContext, useContext, ReactNode } from 'react';
import { useSettingsStore } from '@/store/settings';

interface SettingsContextType {
  // Add any context values you might need later
}

const SettingsContext = createContext<SettingsContextType>({});

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { settings } = useSettingsStore();

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
      root.style.setProperty('--animations-enabled', '0');
    } else {
      root.classList.remove('no-animations');
      root.style.setProperty('--animations-enabled', '1');
    }

    // Apply sound effects preference to data attribute
    if (appearanceSettings.soundEffects) {
      root.setAttribute('data-sound-enabled', 'true');
    } else {
      root.setAttribute('data-sound-enabled', 'false');
    }
  };

  // Apply settings when they change or component mounts
  useEffect(() => {
    applyAppearanceSettings(settings.appearance);
  }, [settings.appearance]);

  // Apply initial settings on mount
  useEffect(() => {
    applyAppearanceSettings(settings.appearance);
  }, []);

  return (
    <SettingsContext.Provider value={{}}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext); 