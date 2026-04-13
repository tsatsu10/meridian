// Meridian Design System - Component Index
// Professional component library with persona-aware styling

// Core Layout Components
export * from './meridian-layout';

// Card Components
export * from './meridian-card';

// Button Components  
export * from './meridian-button';

// Badge Components
export * from './meridian-badge';

// Form Components
export * from './meridian-form';

// Data Display Components
export * from './meridian-data-table';

// Original UI Components (updated with Meridian styling)
export * from './button';
export * from './card';
export * from './badge';
export * from './input';
export * from './label';
export * from './select';
export * from './textarea';
export * from './checkbox';
export * from './switch';
export * from './dialog';
export * from './popover';
export * from './tabs';
export * from './calendar';
export * from './separator';
export * from './collapsible';

// Design System Constants
export const MERIDIAN_PERSONAS = {
  PM: 'pm',
  TL: 'tl', 
  EXEC: 'exec',
  DEV: 'dev',
  DESIGN: 'design'
} as const;

export const MERIDIAN_VARIANTS = {
  DEFAULT: 'default',
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  OUTLINE: 'outline',
  GHOST: 'ghost',
  GLASS: 'glass',
  GRADIENT: 'gradient'
} as const;

export const MERIDIAN_SIZES = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl'
} as const; 