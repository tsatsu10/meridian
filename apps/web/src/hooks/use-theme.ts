/**
 * Theme Management Hooks
 * Theme switching, customization, and persistence
 * Phase 2.5 - Enhanced Personalization
 */

import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'custom';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface CustomTheme {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  colors?: Partial<ThemeColors>;
  fontFamily?: string;
  fontSize?: 'sm' | 'base' | 'lg';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animation?: 'none' | 'reduced' | 'normal';
}

const THEME_STORAGE_KEY = 'meridian-theme';
const DEFAULT_THEME: CustomTheme = {
  mode: 'system',
  colorScheme: 'blue',
  fontSize: 'base',
  borderRadius: 'md',
  animation: 'normal',
};

const THEME_PRESETS: Record<ColorScheme, Partial<ThemeColors>> = {
  blue: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primaryActive: '#1D4ED8',
    accent: '#60A5FA',
  },
  purple: {
    primary: '#9333EA',
    primaryHover: '#7E22CE',
    primaryActive: '#6B21A8',
    accent: '#A78BFA',
  },
  green: {
    primary: '#10B981',
    primaryHover: '#059669',
    primaryActive: '#047857',
    accent: '#34D399',
  },
  orange: {
    primary: '#F59E0B',
    primaryHover: '#D97706',
    primaryActive: '#B45309',
    accent: '#FBB F24',
  },
  pink: {
    primary: '#EC4899',
    primaryHover: '#DB2777',
    primaryActive: '#BE185D',
    accent: '#F472B6',
  },
  custom: {},
};

/**
 * Hook for theme management
 */
export function useTheme() {
  const [theme, setThemeState] = useState<CustomTheme>(DEFAULT_THEME);
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  // Load theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setThemeState({ ...DEFAULT_THEME, ...parsed });
      } catch (e) {
        console.error('Failed to parse stored theme:', e);
      }
    }
  }, []);

  // Resolve system theme
  useEffect(() => {
    const updateResolvedMode = () => {
      if (theme.mode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedMode(isDark ? 'dark' : 'light');
      } else {
        setResolvedMode(theme.mode as 'light' | 'dark');
      }
    };

    updateResolvedMode();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => updateResolvedMode();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Legacy browsers
      // @ts-ignore
      mediaQuery.addListener(handler);
      // @ts-ignore
      return () => mediaQuery.removeListener(handler);
    }
  }, [theme.mode]);

  // Apply theme to document
  useEffect(() => {
    applyTheme(theme, resolvedMode);
  }, [theme, resolvedMode]);

  const setTheme = useCallback((updates: Partial<CustomTheme>) => {
    setThemeState((prev) => {
      const newTheme = { ...prev, ...updates };
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme));
      return newTheme;
    });
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setTheme({ mode });
  }, [setTheme]);

  const setColorScheme = useCallback((colorScheme: ColorScheme) => {
    setTheme({ colorScheme });
  }, [setTheme]);

  const setCustomColors = useCallback((colors: Partial<ThemeColors>) => {
    setTheme({ colorScheme: 'custom', colors });
  }, [setTheme]);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    setThemeState(DEFAULT_THEME);
  }, []);

  return {
    theme,
    resolvedMode,
    setTheme,
    setMode,
    setColorScheme,
    setCustomColors,
    resetTheme,
    isDark: resolvedMode === 'dark',
  };
}

/**
 * Apply theme to document
 */
function applyTheme(theme: CustomTheme, resolvedMode: 'light' | 'dark') {
  const root = document.documentElement;

  // Apply mode
  if (resolvedMode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Apply color scheme
  const colors = theme.colorScheme === 'custom' && theme.colors
    ? theme.colors
    : THEME_PRESETS[theme.colorScheme];

  if (colors.primary) {
    root.style.setProperty('--color-primary', colors.primary);
  }
  if (colors.primaryHover) {
    root.style.setProperty('--color-primary-hover', colors.primaryHover);
  }
  if (colors.primaryActive) {
    root.style.setProperty('--color-primary-active', colors.primaryActive);
  }
  if (colors.accent) {
    root.style.setProperty('--color-accent', colors.accent);
  }

  // Apply font size
  const fontSizeMap = {
    sm: '14px',
    base: '16px',
    lg: '18px',
  };
  if (theme.fontSize) {
    root.style.setProperty('--font-size-base', fontSizeMap[theme.fontSize]);
  }

  // Apply border radius
  const borderRadiusMap = {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
  };
  if (theme.borderRadius) {
    root.style.setProperty('--border-radius', borderRadiusMap[theme.borderRadius]);
  }

  // Apply font family
  if (theme.fontFamily) {
    root.style.setProperty('--font-family', theme.fontFamily);
  }

  // Apply animation preference
  if (theme.animation === 'none') {
    root.style.setProperty('--transition-duration', '0ms');
  } else if (theme.animation === 'reduced') {
    root.style.setProperty('--transition-duration', '150ms');
  } else {
    root.style.setProperty('--transition-duration', '300ms');
  }
}

/**
 * Hook to detect system dark mode preference
 */
export function usePrefersDarkMode(): boolean {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // @ts-ignore
      mediaQuery.addListener(handler);
      // @ts-ignore
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  return prefersDark;
}

/**
 * Hook to detect reduced motion preference
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // @ts-ignore
      mediaQuery.addListener(handler);
      // @ts-ignore
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  return prefersReduced;
}

export default useTheme;

