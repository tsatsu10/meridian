/**
 * 🎨 Advanced Color System for Meridian Themes
 * 
 * Provides a comprehensive color token system supporting:
 * - Dynamic theme generation
 * - Brand customization
 * - Accessibility compliance
 * - Role-based color schemes
 * 
 * @epic-3.2-themes
 */

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface SemanticColors {
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;
}

export interface BrandColors {
  logo: string;
  accent: string;
  background: string;
  text: string;
  border: string;
}

export interface ThemeColors {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;
  semantic: SemanticColors;
  brand?: BrandColors;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  mode: 'light' | 'dark';
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    colorBlindFriendly: boolean;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      linear: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
}

// Default color scales
export const defaultColorScales = {
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  } as ColorScale,
  
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  } as ColorScale,
  
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  } as ColorScale,
  
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  } as ColorScale,
  
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  } as ColorScale,
  
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  } as ColorScale,
};

// Semantic color mappings
export const semanticColors: SemanticColors = {
  success: defaultColorScales.green,
  warning: defaultColorScales.yellow,
  error: defaultColorScales.red,
  info: defaultColorScales.blue,
};

// Default theme definitions
export const defaultThemes: Record<string, ThemeDefinition> = {
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean and bright interface',
    mode: 'light',
    colors: {
      primary: defaultColorScales.blue,
      secondary: defaultColorScales.neutral,
      accent: defaultColorScales.purple,
      neutral: defaultColorScales.neutral,
      semantic: semanticColors,
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      colorBlindFriendly: true,
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
    borderRadius: {
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },
  },
  
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Easy on the eyes for late-night work',
    mode: 'dark',
    colors: {
      primary: defaultColorScales.blue,
      secondary: defaultColorScales.neutral,
      accent: defaultColorScales.purple,
      neutral: defaultColorScales.neutral,
      semantic: semanticColors,
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      colorBlindFriendly: true,
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      lineHeight: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
    borderRadius: {
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },
  },
};

// Role-based theme preferences
export const roleThemeDefaults = {
  'workspace-manager': 'professional-dark',
  'department-head': 'executive-light',
  'project-manager': 'productivity-blue',
  'team-lead': 'collaboration-green',
  'member': 'light',
  'project-viewer': 'minimal-light',
  'workspace-viewer': 'minimal-light',
  'guest': 'light',
  'client': 'brand-neutral',
  'contractor': 'focus-mode',
  'stakeholder': 'executive-light',
};

// Utility functions
export function generateColorScale(baseColor: string): ColorScale {
  // This would implement color scale generation logic
  // For now, returning a placeholder
  return defaultColorScales.blue;
}

export function validateColorContrast(
  foreground: string, 
  background: string
): { ratio: number; passes: boolean; level: 'AA' | 'AAA' | 'fail' } {
  // Implement WCAG color contrast validation
  // Placeholder implementation
  return { ratio: 4.5, passes: true, level: 'AA' };
}

export function generateThemeCSS(theme: ThemeDefinition): string {
  // Generate CSS custom properties for the theme
  const cssVariables = Object.entries(theme.colors.primary).map(
    ([key, value]) => `  --color-primary-${key}: ${value};`
  ).join('\n');
  
  return `:root {\n${cssVariables}\n}`;
}

export function applyThemeToDocument(theme: ThemeDefinition): void {
  const root = document.documentElement;
  
  // Apply color variables
  Object.entries(theme.colors.primary).forEach(([key, value]) => {
    root.style.setProperty(`--color-primary-${key}`, value);
  });
  
  Object.entries(theme.colors.secondary).forEach(([key, value]) => {
    root.style.setProperty(`--color-secondary-${key}`, value);
  });
  
  Object.entries(theme.colors.neutral).forEach(([key, value]) => {
    root.style.setProperty(`--color-neutral-${key}`, value);
  });
  
  // Apply typography
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  
  // Apply spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Apply animations
  Object.entries(theme.animations.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value);
  });
  
  // Apply shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });
  
  // Apply border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });
} 