import { useState, useEffect, useCallback } from 'react';
import { useHighContrast } from './useHighContrast';

interface ThemeColors {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Foreground colors
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  
  // Primary colors
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  
  // Accent colors
  accent: string;
  accentForeground: string;
  accentHover: string;
  
  // Border colors
  border: string;
  borderHover: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Card colors
  card: string;
  cardForeground: string;
  
  // Muted colors
  muted: string;
  mutedForeground: string;
  
  // Popover colors
  popover: string;
  popoverForeground: string;
  
  // Input colors
  input: string;
  inputForeground: string;
  
  // Ring/focus colors
  ring: string;
}

const lightTheme: ThemeColors = {
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  backgroundTertiary: '#f1f5f9',
  
  foreground: '#0f172a',
  foregroundSecondary: '#334155',
  foregroundMuted: '#64748b',
  
  primary: '#2563eb',
  primaryForeground: '#ffffff',
  primaryHover: '#1d4ed8',
  
  accent: '#f59e0b',
  accentForeground: '#ffffff',
  accentHover: '#d97706',
  
  border: '#e2e8f0',
  borderHover: '#cbd5e1',
  
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
  
  card: '#ffffff',
  cardForeground: '#0f172a',
  
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  
  popover: '#ffffff',
  popoverForeground: '#0f172a',
  
  input: '#ffffff',
  inputForeground: '#0f172a',
  
  ring: '#2563eb'
};

const darkTheme: ThemeColors = {
  background: '#0f172a',
  backgroundSecondary: '#1e293b',
  backgroundTertiary: '#334155',
  
  foreground: '#f8fafc',
  foregroundSecondary: '#cbd5e1',
  foregroundMuted: '#94a3b8',
  
  primary: '#3b82f6',
  primaryForeground: '#ffffff',
  primaryHover: '#2563eb',
  
  accent: '#fbbf24',
  accentForeground: '#0f172a',
  accentHover: '#f59e0b',
  
  border: '#334155',
  borderHover: '#475569',
  
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  card: '#1e293b',
  cardForeground: '#f8fafc',
  
  muted: '#334155',
  mutedForeground: '#94a3b8',
  
  popover: '#1e293b',
  popoverForeground: '#f8fafc',
  
  input: '#1e293b',
  inputForeground: '#f8fafc',
  
  ring: '#3b82f6'
};

// Enhanced theme variations
const lightThemeEnhanced: ThemeColors = {
  ...lightTheme,
  // Enhanced contrast ratios for better accessibility
  foreground: '#020617',
  foregroundSecondary: '#1e293b',
  foregroundMuted: '#475569',
  
  primary: '#1e40af',
  primaryHover: '#1e3a8a',
  
  border: '#cbd5e1',
  borderHover: '#94a3b8',
  
  success: '#047857',
  warning: '#b45309',
  error: '#b91c1c',
  
  mutedForeground: '#475569'
};

const darkThemeEnhanced: ThemeColors = {
  ...darkTheme,
  // Enhanced contrast ratios for better dark mode readability
  background: '#020617',
  backgroundSecondary: '#0f172a',
  backgroundTertiary: '#1e293b',
  
  foreground: '#f1f5f9',
  foregroundSecondary: '#e2e8f0',
  foregroundMuted: '#cbd5e1',
  
  primary: '#60a5fa',
  primaryHover: '#3b82f6',
  
  border: '#475569',
  borderHover: '#64748b',
  
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  
  card: '#0f172a',
  muted: '#1e293b',
  mutedForeground: '#cbd5e1'
};

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeVariant = 'default' | 'enhanced';

export function useEnhancedTheme() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [variant, setVariant] = useState<ThemeVariant>('default');
  const [isDark, setIsDark] = useState(false);
  const { isHighContrast, colors: highContrastColors } = useHighContrast();

  // Detect system theme preference
  useEffect(() => {
    const checkSystemTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (mode === 'system') {
        setIsDark(prefersDark);
      }
    };

    checkSystemTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mode === 'system') {
        setIsDark(mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  // Load saved preferences
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    const savedVariant = localStorage.getItem('theme-variant') as ThemeVariant;
    
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setMode(savedMode);
      if (savedMode !== 'system') {
        setIsDark(savedMode === 'dark');
      }
    }
    
    if (savedVariant && ['default', 'enhanced'].includes(savedVariant)) {
      setVariant(savedVariant);
    }
  }, []);

  // Get current theme colors
  const getCurrentTheme = useCallback((): ThemeColors => {
    // High contrast mode overrides everything
    if (isHighContrast) {
      return {
        background: highContrastColors.background,
        backgroundSecondary: highContrastColors.background,
        backgroundTertiary: highContrastColors.background,
        foreground: highContrastColors.foreground,
        foregroundSecondary: highContrastColors.foreground,
        foregroundMuted: highContrastColors.muted,
        primary: highContrastColors.primary,
        primaryForeground: highContrastColors.background,
        primaryHover: highContrastColors.primary,
        accent: highContrastColors.accent,
        accentForeground: highContrastColors.background,
        accentHover: highContrastColors.accent,
        border: highContrastColors.border,
        borderHover: highContrastColors.border,
        success: highContrastColors.success,
        warning: highContrastColors.warning,
        error: highContrastColors.error,
        info: highContrastColors.info,
        card: highContrastColors.background,
        cardForeground: highContrastColors.foreground,
        muted: highContrastColors.muted,
        mutedForeground: highContrastColors.foreground,
        popover: highContrastColors.background,
        popoverForeground: highContrastColors.foreground,
        input: highContrastColors.background,
        inputForeground: highContrastColors.foreground,
        ring: highContrastColors.accent
      };
    }

    // Regular theme selection
    if (variant === 'enhanced') {
      return isDark ? darkThemeEnhanced : lightThemeEnhanced;
    }
    
    return isDark ? darkTheme : lightTheme;
  }, [isDark, variant, isHighContrast, highContrastColors]);

  // Apply theme to CSS custom properties
  useEffect(() => {
    const theme = getCurrentTheme();
    const root = document.documentElement;

    // Apply all theme colors as CSS custom properties
    Object.entries(theme).forEach(([key, value]) => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply semantic color mappings
    const semanticMappings = {
      '--background': theme.background,
      '--foreground': theme.foreground,
      '--card': theme.card,
      '--card-foreground': theme.cardForeground,
      '--popover': theme.popover,
      '--popover-foreground': theme.popoverForeground,
      '--primary': theme.primary,
      '--primary-foreground': theme.primaryForeground,
      '--secondary': theme.backgroundSecondary,
      '--secondary-foreground': theme.foregroundSecondary,
      '--muted': theme.muted,
      '--muted-foreground': theme.mutedForeground,
      '--accent': theme.accent,
      '--accent-foreground': theme.accentForeground,
      '--destructive': theme.error,
      '--destructive-foreground': theme.primaryForeground,
      '--border': theme.border,
      '--input': theme.input,
      '--ring': theme.ring,
      '--success': theme.success,
      '--warning': theme.warning,
      '--error': theme.error,
      '--info': theme.info
    };

    Object.entries(semanticMappings).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Add theme class to document
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Add variant class
    root.classList.remove('theme-default', 'theme-enhanced');
    root.classList.add(`theme-${variant}`);

  }, [getCurrentTheme, isDark, variant]);

  // Theme control methods
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
    
    if (newMode !== 'system') {
      setIsDark(newMode === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
  }, []);

  const setThemeVariant = useCallback((newVariant: ThemeVariant) => {
    setVariant(newVariant);
    localStorage.setItem('theme-variant', newVariant);
  }, []);

  const toggleTheme = useCallback(() => {
    if (mode === 'system') {
      setThemeMode(isDark ? 'light' : 'dark');
    } else {
      setThemeMode(mode === 'light' ? 'dark' : 'light');
    }
  }, [mode, isDark, setThemeMode]);

  // Color utility functions
  const getContrastRatio = useCallback((color1: string, color2: string): number => {
    const getLuminance = (color: string): number => {
      const rgb = parseInt(color.replace('#', ''), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }, []);

  const validateThemeContrast = useCallback(() => {
    const theme = getCurrentTheme();
    const validationResults = {
      textContrast: getContrastRatio(theme.foreground, theme.background),
      primaryContrast: getContrastRatio(theme.primaryForeground, theme.primary),
      borderContrast: getContrastRatio(theme.border, theme.background),
      wcagAA: true,
      wcagAAA: true
    };

    validationResults.wcagAA = validationResults.textContrast >= 4.5;
    validationResults.wcagAAA = validationResults.textContrast >= 7;

    return validationResults;
  }, [getCurrentTheme, getContrastRatio]);

  return {
    // Current state
    mode,
    variant,
    isDark,
    isHighContrast,
    theme: getCurrentTheme(),
    
    // Control methods
    setThemeMode,
    setThemeVariant,
    toggleTheme,
    
    // Utility methods
    getContrastRatio,
    validateThemeContrast,
    
    // Theme presets
    themes: {
      light: lightTheme,
      dark: darkTheme,
      lightEnhanced: lightThemeEnhanced,
      darkEnhanced: darkThemeEnhanced
    }
  };
}

// Theme context provider component
export function getThemeCSS(theme: ThemeColors): string {
  return Object.entries(theme)
    .map(([key, value]) => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      return `${cssVar}: ${value};`;
    })
    .join('\n');
}

// Utility function for theme-aware class names
export function themeClass(lightClass: string, darkClass: string, isDark: boolean): string {
  return isDark ? darkClass : lightClass;
}