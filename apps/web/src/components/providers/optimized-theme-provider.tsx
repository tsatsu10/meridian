import React, { createContext, useContext, useEffect, useCallback, useMemo, memo } from 'react';
import { useOptimizedThemeState } from '@/hooks/use-optimized-dashboard-state';
import { useDebouncedCallback } from '@/hooks/use-performance-hooks';

/**
 * Optimized Theme Provider that eliminates excessive re-renders
 * @epic-2.4-performance: Replaces multiple localStorage operations with batched updates
 * Uses debounced updates and memoized context values
 */

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface OptimizedThemeContextType {
  // Current state
  mode: 'light' | 'dark' | 'system';
  variant: 'default' | 'enhanced';
  isDark: boolean;
  isHighContrast: boolean;
  colors: ThemeColors;
  
  // Actions
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setThemeVariant: (variant: 'default' | 'enhanced') => void;
  toggleTheme: () => void;
  setHighContrast: (enabled: boolean) => void;
  
  // Utilities
  getContrastRatio: (color1: string, color2: string) => number;
  validateAccessibility: () => boolean;
}

const OptimizedThemeContext = createContext<OptimizedThemeContextType | null>(null);

// Theme color definitions (optimized with useMemo)
const THEME_COLORS = {
  light: {
    background: '#ffffff',
    foreground: '#0f172a',
    primary: '#2563eb',
    secondary: '#f8fafc',
    accent: '#f59e0b',
    muted: '#f1f5f9',
    border: '#e2e8f0',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb'
  },
  dark: {
    background: '#0f172a',
    foreground: '#f8fafc',
    primary: '#3b82f6',
    secondary: '#1e293b',
    accent: '#fbbf24',
    muted: '#334155',
    border: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  },
  highContrast: {
    light: {
      background: '#ffffff',
      foreground: '#000000',
      primary: '#0000ff',
      secondary: '#f0f0f0',
      accent: '#ff8800',
      muted: '#666666',
      border: '#000000',
      success: '#008000',
      warning: '#ff8800',
      error: '#ff0000',
      info: '#0000ff'
    },
    dark: {
      background: '#000000',
      foreground: '#ffffff',
      primary: '#00ffff',
      secondary: '#333333',
      accent: '#ffff00',
      muted: '#999999',
      border: '#ffffff',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff'
    }
  }
} as const;

interface OptimizedThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: 'light' | 'dark' | 'system';
  defaultVariant?: 'default' | 'enhanced';
}

export const OptimizedThemeProvider = memo<OptimizedThemeProviderProps>(({
  children,
  defaultMode = 'system',
  defaultVariant = 'default'
}) => {
  // Use optimized state hook with batched localStorage
  const {
    mode,
    variant,
    highContrast,
    setThemeMode,
    setThemeVariant,
    setHighContrast
  } = useOptimizedThemeState();

  // Detect system theme preference with debounced updates
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Debounced theme application to prevent excessive DOM updates
  const applyThemeToDOM = useDebouncedCallback((colors: ThemeColors, dark: boolean) => {
    const root = document.documentElement;
    
    // Apply color custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply theme classes
    root.classList.remove('light', 'dark', 'high-contrast');
    root.classList.add(dark ? 'dark' : 'light');
    
    if (highContrast) {
      root.classList.add('high-contrast');
    }
  }, 100, [highContrast]);

  // Memoized theme colors
  const colors = useMemo((): ThemeColors => {
    if (highContrast) {
      return THEME_COLORS.highContrast[isDark ? 'dark' : 'light'];
    }
    return THEME_COLORS[isDark ? 'dark' : 'light'];
  }, [isDark, highContrast]);

  // System theme detection effect
  useEffect(() => {
    if (mode !== 'system') {
      setIsDark(mode === 'dark');
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    setIsDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  // Apply theme to DOM when colors or dark mode changes
  useEffect(() => {
    applyThemeToDOM(colors, isDark);
  }, [colors, isDark, applyThemeToDOM]);

  // Memoized utility functions
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

  const validateAccessibility = useCallback((): boolean => {
    const textContrast = getContrastRatio(colors.foreground, colors.background);
    const primaryContrast = getContrastRatio(colors.primary, colors.background);
    
    // WCAG AA compliance requires 4.5:1 for normal text
    return textContrast >= 4.5 && primaryContrast >= 4.5;
  }, [colors, getContrastRatio]);

  const toggleTheme = useCallback(() => {
    if (mode === 'system') {
      setThemeMode(isDark ? 'light' : 'dark');
    } else {
      setThemeMode(mode === 'light' ? 'dark' : 'light');
    }
  }, [mode, isDark, setThemeMode]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo((): OptimizedThemeContextType => ({
    mode,
    variant,
    isDark,
    isHighContrast: highContrast,
    colors,
    setThemeMode,
    setThemeVariant,
    toggleTheme,
    setHighContrast,
    getContrastRatio,
    validateAccessibility
  }), [
    mode,
    variant,
    isDark,
    highContrast,
    colors,
    setThemeMode,
    setThemeVariant,
    toggleTheme,
    setHighContrast,
    getContrastRatio,
    validateAccessibility
  ]);

  return (
    <OptimizedThemeContext.Provider value={contextValue}>
      {children}
    </OptimizedThemeContext.Provider>
  );
});

OptimizedThemeProvider.displayName = 'OptimizedThemeProvider';

// Optimized hook for consuming theme context
export function useOptimizedTheme(): OptimizedThemeContextType {
  const context = useContext(OptimizedThemeContext);
  
  if (!context) {
    throw new Error('useOptimizedTheme must be used within an OptimizedThemeProvider');
  }
  
  return context;
}

// Utility hook for theme-aware styling with memoization
export function useThemeStyles<T extends Record<string, any>>(
  lightStyles: T,
  darkStyles: T
): T {
  const { isDark } = useOptimizedTheme();
  
  return useMemo(() => {
    return isDark ? darkStyles : lightStyles;
  }, [isDark, lightStyles, darkStyles]);
}

// Component for theme-aware class names with memo
interface ThemeAwareProps {
  light: string;
  dark: string;
  children: (className: string) => React.ReactNode;
}

export const ThemeAware = memo<ThemeAwareProps>(({ light, dark, children }) => {
  const { isDark } = useOptimizedTheme();
  const className = useMemo(() => isDark ? dark : light, [isDark, light, dark]);
  
  return <>{children(className)}</>;
});

ThemeAware.displayName = 'ThemeAware';

// High-performance theme toggle component
interface OptimizedThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export const OptimizedThemeToggle = memo<OptimizedThemeToggleProps>(({
  size = 'md',
  showLabels = true,
  className = ''
}) => {
  const { mode, isDark, toggleTheme } = useOptimizedTheme();
  
  const sizes = useMemo(() => ({
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }), []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    toggleTheme();
  }, [toggleTheme]);

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center rounded-md border border-border
        bg-background hover:bg-accent hover:text-accent-foreground
        transition-colors focus:outline-none focus:ring-2 focus:ring-ring
        ${sizes[size]} ${className}
      `}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
      {showLabels && (
        <span className="ml-2 text-sm font-medium">
          {mode === 'system' ? 'Auto' : isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
});

OptimizedThemeToggle.displayName = 'OptimizedThemeToggle';