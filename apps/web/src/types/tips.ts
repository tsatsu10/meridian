// Tips and Hints System Types
// Football Manager-style contextual tips and onboarding system

export type TipCategory =
  | 'navigation'
  | 'tasks'
  | 'communication'
  | 'analytics'
  | 'automation'
  | 'shortcuts'
  | 'collaboration'
  | 'workflows'
  | 'reports'
  | 'settings';

export type TipLevel = 'beginner' | 'intermediate' | 'advanced';

export type TipType =
  | 'loading'      // Shown during loading screens
  | 'contextual'   // Shown in specific contexts (hover, focus)
  | 'notification' // Shown as in-app notification
  | 'onboarding'   // Part of onboarding flow
  | 'tooltip'      // Quick inline tooltip
  | 'modal';       // Full modal tip/tutorial

export type TipFrequency =
  | 'once'         // Show only once
  | 'daily'        // Once per day
  | 'weekly'       // Once per week
  | 'session'      // Once per session
  | 'always';      // Show every time condition is met

export type TipTriggerCondition =
  | 'route'        // Triggered by route navigation
  | 'action'       // Triggered by user action
  | 'time'         // Triggered by time-based condition
  | 'event'        // Triggered by system event
  | 'behavior'     // Triggered by behavior analysis
  | 'error'        // Triggered by error/issue
  | 'achievement'; // Triggered by milestone

export interface TipTrigger {
  condition: TipTriggerCondition;
  route?: string;              // Route pattern to match
  action?: string;             // Action identifier
  context?: Record<string, any>; // Additional context data
  delay?: number;              // Delay before showing (ms)
  minOccurrences?: number;     // Min times condition must occur
}

export interface TipMedia {
  type: 'image' | 'video' | 'gif';
  url: string;
  alt?: string;
  thumbnail?: string;
}

export interface TipAction {
  label: string;
  action: 'link' | 'command' | 'dismiss' | 'custom';
  url?: string;
  command?: string;
  handler?: () => void;
  icon?: string;
}

export interface Tip {
  id: string;
  category: TipCategory;
  type: TipType;
  title: string;
  content: string;
  level: TipLevel;
  priority: number;              // Higher = more important

  // Triggers and conditions
  triggers?: TipTrigger[];
  frequency: TipFrequency;

  // Content enhancements
  media?: TipMedia;
  example?: string;              // Code example or usage example
  relatedTips?: string[];        // Related tip IDs
  relatedFeatures?: string[];    // Feature identifiers

  // Actions
  actions?: TipAction[];
  learnMoreUrl?: string;
  videoUrl?: string;

  // Metadata
  tags?: string[];
  keywords?: string[];           // For search
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;              // For temporary tips

  // Conditions
  requiredPermissions?: string[]; // RBAC permissions needed
  excludeRoles?: string[];        // Don't show to these roles
  minUserAge?: number;            // Min days since user signup
  maxUserAge?: number;            // Max days since user signup
}

export interface UserTipProgress {
  userId: string;
  seenTips: string[];            // Tip IDs that were shown
  dismissedTips: string[];       // Tip IDs that were dismissed
  bookmarkedTips: string[];      // Tip IDs that were bookmarked
  completedOnboarding?: boolean;
  onboardingStep?: number;

  // Tracking
  lastShownTip?: string;
  lastShownDate?: Date;
  tipViewCounts: Record<string, number>; // Tip ID -> view count

  // User behavior insights
  userLevel?: TipLevel;          // Inferred from usage patterns
  preferredCategories?: TipCategory[];
  actionsFromTips?: number;      // Times user acted on a tip
}

export interface TipPreferences {
  enabled: boolean;
  frequency: 'high' | 'medium' | 'low' | 'off';
  categories: TipCategory[];     // Categories user wants to see
  types: TipType[];              // Types user wants to see
  showOnboarding: boolean;
  showLoadingTips: boolean;
  showContextualTips: boolean;
  showNotificationTips: boolean;
  autoAdvanceOnboarding: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

export interface TipContext {
  route: string;
  workspace?: string;
  project?: string;
  user?: {
    id: string;
    role: string;
    signupDate: Date;
    lastActive?: Date;
  };
  recentActions?: string[];
  currentTask?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface TipAnalytics {
  tipId: string;
  views: number;
  dismissals: number;
  actions: number;
  bookmarks: number;
  avgTimeVisible: number;        // Milliseconds
  conversionRate: number;        // Actions / views
  lastShown?: Date;
}

// Onboarding specific types
export interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  targetElement?: string;        // CSS selector
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  tip?: Tip;
  action?: OnboardingAction;
  completed?: boolean;
  skippable: boolean;
}

export interface OnboardingAction {
  type: 'click' | 'input' | 'navigate' | 'wait';
  target?: string;
  value?: any;
  timeout?: number;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  category: string;
  estimatedDuration: number;     // Minutes
  requiredForRole?: string[];
  optional: boolean;
}

// Store types
export interface TipsStore {
  tips: Tip[];
  userProgress: UserTipProgress;
  preferences: TipPreferences;
  analytics: Record<string, TipAnalytics>;
  currentTip: Tip | null;
  currentOnboardingFlow: OnboardingFlow | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  getTipForContext: (context: TipContext) => Tip | null;
  getNextLoadingTip: () => Tip | null;
  markTipAsSeen: (tipId: string) => void;
  dismissTip: (tipId: string, permanent?: boolean) => void;
  bookmarkTip: (tipId: string) => void;
  unbookmarkTip: (tipId: string) => void;
  recordTipAction: (tipId: string, action: string) => void;

  // Preferences
  updatePreferences: (preferences: Partial<TipPreferences>) => void;

  // Onboarding
  startOnboarding: (flowId: string) => void;
  completeOnboardingStep: (stepId: string) => void;
  skipOnboardingStep: (stepId: string) => void;
  completeOnboarding: () => void;

  // Search and filter
  searchTips: (query: string) => Tip[];
  getTipsByCategory: (category: TipCategory) => Tip[];
  getTipsByLevel: (level: TipLevel) => Tip[];
  getBookmarkedTips: () => Tip[];

  // Analytics
  getTipAnalytics: (tipId: string) => TipAnalytics | null;
  recordTipView: (tipId: string, duration: number) => void;

  // Reset
  resetProgress: () => void;
  resetPreferences: () => void;
}
