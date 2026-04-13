// Meridian Design System - TypeScript Type Definitions
// Comprehensive type system for persona-aware components

// Core Persona Types
export type PersonaType = 'pm' | 'tl' | 'exec' | 'dev' | 'design' | 'none';

export interface PersonaConfig {
  key: PersonaType;
  label: string;
  description: string;
  primaryColor: string;
  backgroundColor: string;
  borderColor: string;
  focusColor: string;
}

// Theme Configuration
export interface MeridianTheme {
  name: string;
  mode: 'light' | 'dark';
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    neutral: ColorScale;
  };
  shadows: ShadowScale;
  spacing: SpacingScale;
  typography: TypographyScale;
  borderRadius: BorderRadiusScale;
}

// Color System
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

// Shadow System
export interface ShadowScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}

// Spacing System
export interface SpacingScale {
  0: string;
  px: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  2.5: string;
  3: string;
  3.5: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  14: string;
  16: string;
  20: string;
  24: string;
  28: string;
  32: string;
  36: string;
  40: string;
  44: string;
  48: string;
  52: string;
  56: string;
  60: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

// Typography System
export interface TypographyScale {
  xs: FontConfig;
  sm: FontConfig;
  base: FontConfig;
  lg: FontConfig;
  xl: FontConfig;
  '2xl': FontConfig;
  '3xl': FontConfig;
  '4xl': FontConfig;
  '5xl': FontConfig;
  '6xl': FontConfig;
  '7xl': FontConfig;
  '8xl': FontConfig;
  '9xl': FontConfig;
}

export interface FontConfig {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  fontWeight?: string;
}

// Border Radius System
export interface BorderRadiusScale {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

// Component Variant Types
export type ComponentVariant = 
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'outline'
  | 'ghost'
  | 'glass'
  | 'gradient'
  | 'soft'
  | 'soft-success'
  | 'soft-warning'
  | 'soft-error'
  | 'outline-primary'
  | 'outline-success'
  | 'outline-warning'
  | 'outline-error';

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ComponentDensity = 'compact' | 'comfortable' | 'spacious';

// Status Types
export type StatusType = 
  | 'active'
  | 'inactive'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'deferred';

export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';

export type RoleType = 'admin' | 'manager' | 'member' | 'viewer' | 'guest';

// Layout Types
export type LayoutVariant = 'default' | 'compact' | 'hero' | 'sidebar' | 'full-width';

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 'auto';

export type SidebarPosition = 'left' | 'right';

// Form Types
export type FormVariant = 'default' | 'glass' | 'outline' | 'filled';

export type FormState = 'default' | 'success' | 'error' | 'warning' | 'loading';

export type InputType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week'
  | 'color'
  | 'file'
  | 'hidden'
  | 'range';

// Data Table Types
export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
  hidden?: boolean;
  group?: string;
}

export interface TableAction<T = any> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T, index: number) => void;
  variant?: 'default' | 'destructive';
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: string | number | boolean | string[];
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
}

// Animation Types
export type AnimationType = 
  | 'none'
  | 'fade'
  | 'slide'
  | 'scale'
  | 'rotate'
  | 'bounce'
  | 'pulse'
  | 'shake'
  | 'flip';

export type AnimationDuration = 'fast' | 'normal' | 'slow';

export type AnimationEasing = 
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic';

// Interaction Types
export type InteractionState = 'idle' | 'hover' | 'active' | 'focus' | 'disabled';

export interface InteractionConfig {
  hover?: boolean;
  focus?: boolean;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

// Accessibility Types
export interface AccessibilityConfig {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-current'?: string;
  role?: string;
  tabIndex?: number;
}

// Component Base Props
export interface BaseComponentProps extends AccessibilityConfig {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  'data-testid'?: string;
  'data-persona'?: PersonaType;
  'data-variant'?: ComponentVariant;
  'data-size'?: ComponentSize;
}

// Event Handler Types
export type ClickHandler = (event: React.MouseEvent<HTMLElement>) => void;
export type ChangeHandler<T = string> = (value: T) => void;
export type FocusHandler = (event: React.FocusEvent<HTMLElement>) => void;
export type KeyHandler = (event: React.KeyboardEvent<HTMLElement>) => void;

// Validation Types
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Chart and Data Visualization Types
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'doughnut' | 'scatter' | 'radar';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  type: ChartType;
  data: ChartDataPoint[];
  options?: Record<string, any>;
  responsive?: boolean;
  interactive?: boolean;
  theme?: 'light' | 'dark';
}

// Notification Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationConfig {
  id?: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: ComponentVariant;
  }>;
}

// Media Query Types
export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BreakpointConfig {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

// Feature Flag Types
export interface FeatureFlags {
  enableGlassEffects: boolean;
  enableAnimations: boolean;
  enablePersonaTheming: boolean;
  enableAdvancedCharts: boolean;
  enableRealTimeUpdates: boolean;
  enableAccessibilityEnhancements: boolean;
}

// Export all persona configurations
export const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  pm: {
    key: 'pm',
    label: 'Project Manager',
    description: 'Sarah - Organized and detail-oriented',
    primaryColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    focusColor: '#3B82F6'
  },
  tl: {
    key: 'tl',
    label: 'Team Lead',
    description: 'David - Analytics and team-focused',
    primaryColor: '#10B981',
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
    focusColor: '#10B981'
  },
  exec: {
    key: 'exec',
    label: 'Executive',
    description: 'Jennifer - Strategic and high-level',
    primaryColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    focusColor: '#8B5CF6'
  },
  dev: {
    key: 'dev',
    label: 'Developer',
    description: 'Mike - Efficient and minimal',
    primaryColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    borderColor: '#FED7AA',
    focusColor: '#F59E0B'
  },
  design: {
    key: 'design',
    label: 'Designer',
    description: 'Lisa - Creative and visual',
    primaryColor: '#EC4899',
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
    focusColor: '#EC4899'
  },
  none: {
    key: 'none',
    label: 'Default',
    description: 'Standard styling',
    primaryColor: '#6B7280',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    focusColor: '#6B7280'
  }
}; 