import { useState, useEffect, useCallback } from 'react';

// High contrast accessibility hook
export interface HighContrastConfig {
  enabled: boolean;
  scheme: 'high-contrast-light' | 'high-contrast-dark' | 'auto';
  increaseFontWeight: boolean;
  increaseFontSize: boolean;
  enhanceFocus: boolean;
  reducedMotion: boolean;
}

const DEFAULT_CONFIG: HighContrastConfig = {
  enabled: false,
  scheme: 'auto',
  increaseFontWeight: true,
  increaseFontSize: false,
  enhanceFocus: true,
  reducedMotion: false,
};

const STORAGE_KEY = 'meridian-high-contrast-config';

export function useHighContrast() {
  const [config, setConfig] = useState<HighContrastConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Apply high contrast styles to document
  useEffect(() => {
    const root = document.documentElement;

    if (config.enabled) {
      root.classList.add('high-contrast');
      root.classList.add(`high-contrast-${config.scheme}`);

      if (config.increaseFontWeight) {
        root.classList.add('high-contrast-bold');
      }

      if (config.increaseFontSize) {
        root.classList.add('high-contrast-large-text');
      }

      if (config.enhanceFocus) {
        root.classList.add('high-contrast-focus');
      }

      if (config.reducedMotion) {
        root.classList.add('reduce-motion');
      }
    } else {
      // Remove all high contrast classes
      root.classList.remove(
        'high-contrast',
        'high-contrast-high-contrast-light',
        'high-contrast-high-contrast-dark',
        'high-contrast-auto',
        'high-contrast-bold',
        'high-contrast-large-text',
        'high-contrast-focus',
        'reduce-motion'
      );
    }

    return () => {
      // Cleanup on unmount
      root.classList.remove(
        'high-contrast',
        'high-contrast-high-contrast-light',
        'high-contrast-high-contrast-dark',
        'high-contrast-auto',
        'high-contrast-bold',
        'high-contrast-large-text',
        'high-contrast-focus',
        'reduce-motion'
      );
    };
  }, [config]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save high contrast config:', error);
    }
  }, [config]);

  const updateConfig = useCallback((updates: Partial<HighContrastConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const toggle = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    updateConfig,
    toggle,
    reset,
    isEnabled: config.enabled,
  };
}

export default useHighContrast;