/**
 * Consolidated UI Store - Phase 3 Store Migration
 * 
 * Consolidates multiple UI-related stores:
 * - uiSlice.ts (Redux slice with comprehensive UI state)
 * - settings.ts (appearance, theme, preferences)
 * - user-preferences.ts (sidebar, view mode)
 * 
 * This creates a single source of truth for all UI state management.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from '@/lib/toast';

// ===== CORE TYPES =====

export interface Modal {
  id: string;
  type: string;
  props?: Record<string, any>;
  options?: {
    closable?: boolean;
    overlay?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    position?: 'center' | 'top' | 'bottom';
  };
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: string;
}

export interface ContextMenu {
  id: string;
  position: { x: number; y: number };
  items: Array<{
    id: string;
    label: string;
    icon?: string;
    action: () => void;
    disabled?: boolean;
    separator?: boolean;
    submenu?: Array<{
      id: string;
      label: string;
      action: () => void;
      disabled?: boolean;
    }>;
  }>;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primary: string;
  secondary: string;
  accent: string;
  fontSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fontFamily: 'system' | 'inter' | 'roboto' | 'custom';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface Layout {
  header: {
    height: number;
    isVisible: boolean;
    isSticky: boolean;
  };
  sidebar: {
    width: number;
    isCollapsed: boolean;
    isOverlay: boolean;
    breakpoint: number;
  };
  footer: {
    height: number;
    isVisible: boolean;
    isSticky: boolean;
  };
  content: {
    padding: number;
    maxWidth?: number;
    centered: boolean;
  };
}

export interface LoadingState {
  global: boolean;
  components: Record<string, boolean>;
  operations: Record<string, boolean>;
}

export interface CommandPalette {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  commands: Array<{
    id: string;
    title: string;
    description?: string;
    icon?: string;
    keywords: string[];
    action: () => void;
    category: string;
  }>;
}

export interface Preferences {
  animations: boolean;
  sounds: boolean;
  notifications: boolean;
  autoSave: boolean;
  confirmActions: boolean;
  compactMode: boolean;
  showTooltips: boolean;
  showShortcuts: boolean;
  viewMode: 'board' | 'list';
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface Viewport {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  isScrolling: boolean;
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';
  screenSize: {
    width: number;
    height: number;
  };
  touchSupport: boolean;
  darkModeSupport: boolean;
  reducedMotionPreference: boolean;
}

// ===== CONSOLIDATED UI STATE =====

export interface ConsolidatedUIState {
  // Theme and appearance
  theme: ThemeConfig;
  
  // Layout configuration
  layout: Layout;
  
  // Modals management
  modals: Modal[];
  activeModalId: string | null;
  
  // Toast notifications
  toasts: Toast[];
  maxToasts: number;
  
  // Context menus
  contextMenus: ContextMenu[];
  
  // Loading states
  loading: LoadingState;
  
  // Command palette
  commandPalette: CommandPalette;
  
  // Global search
  globalSearch: {
    isOpen: boolean;
    query: string;
    results: Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      url: string;
      score: number;
    }>;
    isLoading: boolean;
  };
  
  // UI preferences (consolidated from multiple stores)
  preferences: Preferences;
  
  // Viewport information
  viewport: Viewport;
  
  // Device information
  device: DeviceInfo;
  
  // Focus management
  focusedElement: string | null;
  focusHistory: string[];
  trapFocus: boolean;
  
  // Breadcrumbs
  breadcrumbs: Array<{
    id: string;
    label: string;
    url?: string;
    icon?: string;
  }>;
  
  // Error boundaries
  errors: Array<{
    id: string;
    message: string;
    stack?: string;
    componentStack?: string;
    timestamp: string;
    dismissed: boolean;
  }>;
  
  // Feature flags
  featureFlags: Record<string, boolean>;
  
  // Performance monitoring
  performance: {
    metrics: {
      renderTime: number;
      memoryUsage: number;
      bundleSize: number;
      loadTime: number;
    };
    warnings: Array<{
      type: 'slow-render' | 'memory-leak' | 'large-bundle';
      message: string;
      timestamp: string;
    }>;
    enabled: boolean;
  };
  
  // Onboarding/tours
  onboarding: {
    isActive: boolean;
    currentStep: number;
    totalSteps: number;
    stepId: string;
    tourId: string;
    hasCompleted: string[];
  };
}

// ===== CONSOLIDATED UI STORE =====

interface ConsolidatedUIStore extends ConsolidatedUIState {
  // ===== THEME & APPEARANCE =====
  setTheme: (theme: Partial<ThemeConfig>) => void;
  toggleDarkMode: () => void;
  setPreferences: (preferences: Partial<Preferences>) => void;
  
  // ===== LAYOUT =====
  setLayout: (layout: Partial<Layout>) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // ===== MODALS =====
  openModal: (modal: Modal) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  updateModal: (id: string, updates: Partial<Modal>) => void;
  
  // ===== TOASTS =====
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;
  
  // ===== CONTEXT MENUS =====
  showContextMenu: (menu: ContextMenu) => void;
  hideContextMenu: (menuId: string) => void;
  hideAllContextMenus: () => void;
  
  // ===== LOADING STATES =====
  setGlobalLoading: (loading: boolean) => void;
  setComponentLoading: (component: string, loading: boolean) => void;
  setOperationLoading: (operation: string, loading: boolean) => void;
  
  // ===== COMMAND PALETTE =====
  toggleCommandPalette: () => void;
  setCommandPaletteQuery: (query: string) => void;
  setCommandPaletteSelection: (index: number) => void;
  setCommandPaletteCommands: (commands: CommandPalette['commands']) => void;
  
  // ===== GLOBAL SEARCH =====
  toggleGlobalSearch: () => void;
  setGlobalSearchQuery: (query: string) => void;
  setGlobalSearchResults: (results: ConsolidatedUIState['globalSearch']['results']) => void;
  setGlobalSearchLoading: (loading: boolean) => void;
  
  // ===== FOCUS MANAGEMENT =====
  setFocusedElement: (element: string | null) => void;
  restorePreviousFocus: () => void;
  setTrapFocus: (trap: boolean) => void;
  
  // ===== BREADCRUMBS =====
  setBreadcrumbs: (breadcrumbs: ConsolidatedUIState['breadcrumbs']) => void;
  addBreadcrumb: (breadcrumb: ConsolidatedUIState['breadcrumbs'][0]) => void;
  removeBreadcrumb: (breadcrumbId: string) => void;
  
  // ===== ERROR MANAGEMENT =====
  addError: (error: Omit<ConsolidatedUIState['errors'][0], 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissError: (errorId: string) => void;
  clearErrors: () => void;
  
  // ===== DEVICE & VIEWPORT =====
  setViewport: (viewport: Partial<Viewport>) => void;
  setDeviceInfo: (device: Partial<DeviceInfo>) => void;
  
  // ===== FEATURE FLAGS =====
  setFeatureFlag: (flag: string, enabled: boolean) => void;
  setFeatureFlags: (flags: Record<string, boolean>) => void;
  
  // ===== PERFORMANCE =====
  updatePerformanceMetrics: (metrics: Partial<ConsolidatedUIState['performance']['metrics']>) => void;
  addPerformanceWarning: (warning: Omit<ConsolidatedUIState['performance']['warnings'][0], 'timestamp'>) => void;
  
  // ===== ONBOARDING =====
  startOnboarding: (tourId: string, totalSteps: number) => void;
  nextOnboardingStep: (stepId: string) => void;
  skipOnboarding: () => void;
  
  // ===== UTILITY =====
  resetUI: () => void;
  
  // ===== COMPUTED PROPERTIES =====
  getIsDarkMode: () => boolean;
  getIsMobile: () => boolean;
  getIsTablet: () => boolean;
  getIsDesktop: () => boolean;
  getShouldShowSidebar: () => boolean;
}

// ===== DEFAULT STATE =====

const getDefaultTheme = (): ThemeConfig => ({
  mode: 'system',
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#8b5cf6',
  fontSize: 'md',
  fontFamily: 'system',
  borderRadius: 'md',
  animations: true,
  reducedMotion: false,
  highContrast: false,
  colorBlindMode: 'none',
});

const getDefaultLayout = (): Layout => ({
  header: {
    height: 64,
    isVisible: true,
    isSticky: true,
  },
  sidebar: {
    width: 280,
    isCollapsed: false,
    isOverlay: false,
    breakpoint: 768,
  },
  footer: {
    height: 48,
    isVisible: true,
    isSticky: false,
  },
  content: {
    padding: 24,
    maxWidth: undefined,
    centered: false,
  },
});

const getDefaultPreferences = (): Preferences => ({
  animations: true,
  sounds: false,
  notifications: true,
  autoSave: true,
  confirmActions: true,
  compactMode: false,
  showTooltips: true,
  showShortcuts: true,
  viewMode: 'board',
  density: 'comfortable',
});

const getDefaultDevice = (): DeviceInfo => ({
  type: 'desktop',
  os: 'unknown',
  browser: 'unknown',
  screenSize: { width: 1920, height: 1080 },
  touchSupport: false,
  darkModeSupport: true,
  reducedMotionPreference: false,
});

const getDefaultViewport = (): Viewport => ({
  width: 1920,
  height: 1080,
  scrollX: 0,
  scrollY: 0,
  isScrolling: false,
});

const defaultState: ConsolidatedUIState = {
  theme: getDefaultTheme(),
  layout: getDefaultLayout(),
  modals: [],
  activeModalId: null,
  toasts: [],
  maxToasts: 5,
  contextMenus: [],
  loading: {
    global: false,
    components: {},
    operations: {},
  },
  commandPalette: {
    isOpen: false,
    query: '',
    selectedIndex: 0,
    commands: [],
  },
  globalSearch: {
    isOpen: false,
    query: '',
    results: [],
    isLoading: false,
  },
  preferences: getDefaultPreferences(),
  viewport: getDefaultViewport(),
  device: getDefaultDevice(),
  focusedElement: null,
  focusHistory: [],
  trapFocus: false,
  breadcrumbs: [],
  errors: [],
  featureFlags: {},
  performance: {
    metrics: {
      renderTime: 0,
      memoryUsage: 0,
      bundleSize: 0,
      loadTime: 0,
    },
    warnings: [],
    enabled: process.env.NODE_ENV === 'development',
  },
  onboarding: {
    isActive: false,
    currentStep: 0,
    totalSteps: 0,
    stepId: '',
    tourId: '',
    hasCompleted: [],
  },
};

// ===== STORE IMPLEMENTATION =====

export const useUIStore = create<ConsolidatedUIStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      // ===== THEME & APPEARANCE =====
      setTheme: (theme: Partial<ThemeConfig>) => {
        set(state => ({
          theme: { ...state.theme, ...theme }
        }));
      },
      
      toggleDarkMode: () => {
        set(state => ({
          theme: {
            ...state.theme,
            mode: state.theme.mode === 'dark' ? 'light' : 'dark'
          }
        }));
      },
      
      setPreferences: (preferences: Partial<Preferences>) => {
        set(state => ({
          preferences: { ...state.preferences, ...preferences }
        }));
      },
      
      // ===== LAYOUT =====
      setLayout: (layout: Partial<Layout>) => {
        set(state => ({
          layout: { ...state.layout, ...layout }
        }));
      },
      
      toggleSidebar: () => {
        set(state => ({
          layout: {
            ...state.layout,
            sidebar: {
              ...state.layout.sidebar,
              isCollapsed: !state.layout.sidebar.isCollapsed
            }
          }
        }));
      },
      
      setSidebarWidth: (width: number) => {
        set(state => ({
          layout: {
            ...state.layout,
            sidebar: { ...state.layout.sidebar, width }
          }
        }));
      },
      
      setSidebarCollapsed: (collapsed: boolean) => {
        set(state => ({
          layout: {
            ...state.layout,
            sidebar: { ...state.layout.sidebar, isCollapsed: collapsed }
          }
        }));
      },
      
      // ===== MODALS =====
      openModal: (modal: Modal) => {
        set(state => ({
          modals: [...state.modals, modal],
          activeModalId: modal.id
        }));
      },
      
      closeModal: (modalId: string) => {
        set(state => {
          const modals = state.modals.filter(modal => modal.id !== modalId);
          const activeModalId = state.activeModalId === modalId 
            ? (modals.length > 0 ? modals[modals.length - 1].id : null)
            : state.activeModalId;
          
          return { modals, activeModalId };
        });
      },
      
      closeAllModals: () => {
        set({ modals: [], activeModalId: null });
      },
      
      updateModal: (id: string, updates: Partial<Modal>) => {
        set(state => ({
          modals: state.modals.map(modal =>
            modal.id === id ? { ...modal, ...updates } : modal
          )
        }));
      },
      
      // ===== TOASTS =====
      addToast: (toastData: Omit<Toast, 'id' | 'createdAt'>) => {
        const toast: Toast = {
          ...toastData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        
        set(state => {
          const toasts = [toast, ...state.toasts];
          return {
            toasts: toasts.slice(0, state.maxToasts)
          };
        });
      },
      
      removeToast: (toastId: string) => {
        set(state => ({
          toasts: state.toasts.filter(toast => toast.id !== toastId)
        }));
      },
      
      clearToasts: () => {
        set({ toasts: [] });
      },
      
      // ===== CONTEXT MENUS =====
      showContextMenu: (menu: ContextMenu) => {
        set({ contextMenus: [menu] }); // Replace existing menus
      },
      
      hideContextMenu: (menuId: string) => {
        set(state => ({
          contextMenus: state.contextMenus.filter(menu => menu.id !== menuId)
        }));
      },
      
      hideAllContextMenus: () => {
        set({ contextMenus: [] });
      },
      
      // ===== LOADING STATES =====
      setGlobalLoading: (loading: boolean) => {
        set(state => ({
          loading: { ...state.loading, global: loading }
        }));
      },
      
      setComponentLoading: (component: string, loading: boolean) => {
        set(state => ({
          loading: {
            ...state.loading,
            components: { ...state.loading.components, [component]: loading }
          }
        }));
      },
      
      setOperationLoading: (operation: string, loading: boolean) => {
        set(state => ({
          loading: {
            ...state.loading,
            operations: { ...state.loading.operations, [operation]: loading }
          }
        }));
      },
      
      // ===== COMMAND PALETTE =====
      toggleCommandPalette: () => {
        set(state => ({
          commandPalette: {
            ...state.commandPalette,
            isOpen: !state.commandPalette.isOpen,
            query: state.commandPalette.isOpen ? '' : state.commandPalette.query,
            selectedIndex: 0
          }
        }));
      },
      
      setCommandPaletteQuery: (query: string) => {
        set(state => ({
          commandPalette: {
            ...state.commandPalette,
            query,
            selectedIndex: 0
          }
        }));
      },
      
      setCommandPaletteSelection: (index: number) => {
        set(state => ({
          commandPalette: { ...state.commandPalette, selectedIndex: index }
        }));
      },
      
      setCommandPaletteCommands: (commands: CommandPalette['commands']) => {
        set(state => ({
          commandPalette: { ...state.commandPalette, commands }
        }));
      },
      
      // ===== GLOBAL SEARCH =====
      toggleGlobalSearch: () => {
        set(state => ({
          globalSearch: {
            ...state.globalSearch,
            isOpen: !state.globalSearch.isOpen,
            query: state.globalSearch.isOpen ? '' : state.globalSearch.query,
            results: state.globalSearch.isOpen ? [] : state.globalSearch.results
          }
        }));
      },
      
      setGlobalSearchQuery: (query: string) => {
        set(state => ({
          globalSearch: { ...state.globalSearch, query }
        }));
      },
      
      setGlobalSearchResults: (results: ConsolidatedUIState['globalSearch']['results']) => {
        set(state => ({
          globalSearch: { ...state.globalSearch, results }
        }));
      },
      
      setGlobalSearchLoading: (loading: boolean) => {
        set(state => ({
          globalSearch: { ...state.globalSearch, isLoading: loading }
        }));
      },
      
      // ===== FOCUS MANAGEMENT =====
      setFocusedElement: (element: string | null) => {
        set(state => {
          const focusHistory = state.focusedElement 
            ? [...state.focusHistory, state.focusedElement].slice(-10)
            : state.focusHistory;
          
          return {
            focusedElement: element,
            focusHistory
          };
        });
      },
      
      restorePreviousFocus: () => {
        set(state => {
          const focusHistory = [...state.focusHistory];
          const previousElement = focusHistory.pop() || null;
          
          return {
            focusedElement: previousElement,
            focusHistory
          };
        });
      },
      
      setTrapFocus: (trap: boolean) => {
        set({ trapFocus: trap });
      },
      
      // ===== BREADCRUMBS =====
      setBreadcrumbs: (breadcrumbs: ConsolidatedUIState['breadcrumbs']) => {
        set({ breadcrumbs });
      },
      
      addBreadcrumb: (breadcrumb: ConsolidatedUIState['breadcrumbs'][0]) => {
        set(state => ({
          breadcrumbs: [...state.breadcrumbs, breadcrumb]
        }));
      },
      
      removeBreadcrumb: (breadcrumbId: string) => {
        set(state => ({
          breadcrumbs: state.breadcrumbs.filter(item => item.id !== breadcrumbId)
        }));
      },
      
      // ===== ERROR MANAGEMENT =====
      addError: (errorData: Omit<ConsolidatedUIState['errors'][0], 'id' | 'timestamp' | 'dismissed'>) => {
        const error = {
          ...errorData,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          dismissed: false,
        };
        
        set(state => ({
          errors: [error, ...state.errors]
        }));
      },
      
      dismissError: (errorId: string) => {
        set(state => ({
          errors: state.errors.map(error =>
            error.id === errorId ? { ...error, dismissed: true } : error
          )
        }));
      },
      
      clearErrors: () => {
        set({ errors: [] });
      },
      
      // ===== DEVICE & VIEWPORT =====
      setViewport: (viewport: Partial<Viewport>) => {
        set(state => ({
          viewport: { ...state.viewport, ...viewport }
        }));
      },
      
      setDeviceInfo: (device: Partial<DeviceInfo>) => {
        set(state => ({
          device: { ...state.device, ...device }
        }));
      },
      
      // ===== FEATURE FLAGS =====
      setFeatureFlag: (flag: string, enabled: boolean) => {
        set(state => ({
          featureFlags: { ...state.featureFlags, [flag]: enabled }
        }));
      },
      
      setFeatureFlags: (flags: Record<string, boolean>) => {
        set(state => ({
          featureFlags: { ...state.featureFlags, ...flags }
        }));
      },
      
      // ===== PERFORMANCE =====
      updatePerformanceMetrics: (metrics: Partial<ConsolidatedUIState['performance']['metrics']>) => {
        set(state => ({
          performance: {
            ...state.performance,
            metrics: { ...state.performance.metrics, ...metrics }
          }
        }));
      },
      
      addPerformanceWarning: (warningData: Omit<ConsolidatedUIState['performance']['warnings'][0], 'timestamp'>) => {
        const warning = {
          ...warningData,
          timestamp: new Date().toISOString(),
        };
        
        set(state => ({
          performance: {
            ...state.performance,
            warnings: [warning, ...state.performance.warnings.slice(0, 49)]
          }
        }));
      },
      
      // ===== ONBOARDING =====
      startOnboarding: (tourId: string, totalSteps: number) => {
        set(state => ({
          onboarding: {
            isActive: true,
            currentStep: 0,
            totalSteps,
            stepId: '',
            tourId,
            hasCompleted: state.onboarding.hasCompleted,
          }
        }));
      },
      
      nextOnboardingStep: (stepId: string) => {
        set(state => {
          const newStep = state.onboarding.currentStep + 1;
          const isComplete = newStep >= state.onboarding.totalSteps;
          
          return {
            onboarding: {
              ...state.onboarding,
              currentStep: newStep,
              stepId,
              isActive: !isComplete,
              hasCompleted: isComplete 
                ? [...state.onboarding.hasCompleted, state.onboarding.tourId]
                : state.onboarding.hasCompleted
            }
          };
        });
      },
      
      skipOnboarding: () => {
        set(state => ({
          onboarding: {
            ...state.onboarding,
            isActive: false,
            hasCompleted: [...state.onboarding.hasCompleted, state.onboarding.tourId]
          }
        }));
      },
      
      // ===== UTILITY =====
      resetUI: () => {
        set(defaultState);
      },
      
      // ===== COMPUTED PROPERTIES =====
      getIsDarkMode: () => {
        const state = get();
        const { mode } = state.theme;
        if (mode === 'system') {
          return state.device.darkModeSupport && 
                 typeof window !== 'undefined' && 
                 window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return mode === 'dark';
      },
      
      getIsMobile: () => {
        const state = get();
        return state.device.type === 'mobile' || state.viewport.width < 768;
      },
      
      getIsTablet: () => {
        const state = get();
        return state.device.type === 'tablet' || 
               (state.viewport.width >= 768 && state.viewport.width < 1024);
      },
      
      getIsDesktop: () => {
        const state = get();
        return state.device.type === 'desktop' || state.viewport.width >= 1024;
      },
      
      getShouldShowSidebar: () => {
        const state = get();
        const isMobile = state.device.type === 'mobile' || state.viewport.width < 768;
        const { isCollapsed } = state.layout.sidebar;
        return !isMobile && !isCollapsed;
      },
    }),
    {
      name: 'meridian-consolidated-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
        preferences: state.preferences,
        featureFlags: state.featureFlags,
        onboarding: {
          hasCompleted: state.onboarding.hasCompleted,
        },
        // Don't persist temporary UI state like modals, toasts, etc.
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          // Update viewport on rehydration
          state.setViewport({
            width: window.innerWidth,
            height: window.innerHeight,
          });
          
          // Detect device info
          const userAgent = navigator.userAgent;
          const deviceInfo: Partial<DeviceInfo> = {
            touchSupport: 'ontouchstart' in window,
            darkModeSupport: window.matchMedia('(prefers-color-scheme: dark)').matches,
            reducedMotionPreference: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          };
          
          // Detect OS
          if (userAgent.includes('Mac')) deviceInfo.os = 'macos';
          else if (userAgent.includes('Win')) deviceInfo.os = 'windows';
          else if (userAgent.includes('Linux')) deviceInfo.os = 'linux';
          else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceInfo.os = 'ios';
          else if (userAgent.includes('Android')) deviceInfo.os = 'android';
          
          // Detect browser
          if (userAgent.includes('Chrome')) deviceInfo.browser = 'chrome';
          else if (userAgent.includes('Firefox')) deviceInfo.browser = 'firefox';
          else if (userAgent.includes('Safari')) deviceInfo.browser = 'safari';
          else if (userAgent.includes('Edge')) deviceInfo.browser = 'edge';
          
          // Detect device type
          if (window.innerWidth < 768) deviceInfo.type = 'mobile';
          else if (window.innerWidth < 1024) deviceInfo.type = 'tablet';
          else deviceInfo.type = 'desktop';
          
          state.setDeviceInfo(deviceInfo);
        }
      },
    }
  )
);

// ===== SELECTOR HOOKS =====

// Theme selectors
export const useTheme = () => useUIStore(state => state.theme);
export const useIsDarkMode = () => useUIStore(state => state.getIsDarkMode());

// Layout selectors  
export const useLayout = () => useUIStore(state => state.layout);
export const useSidebar = () => useUIStore(state => ({
  isCollapsed: state.layout.sidebar.isCollapsed,
  width: state.layout.sidebar.width,
  toggle: state.toggleSidebar,
  setWidth: state.setSidebarWidth,
  setCollapsed: state.setSidebarCollapsed,
}));

// Modal selectors
export const useModals = () => useUIStore(state => ({
  modals: state.modals,
  activeModal: state.modals.find(m => m.id === state.activeModalId),
  open: state.openModal,
  close: state.closeModal,
  closeAll: state.closeAllModals,
  update: state.updateModal,
}));

// Toast selectors
export const useToasts = () => useUIStore(state => ({
  toasts: state.toasts,
  add: state.addToast,
  remove: state.removeToast,
  clear: state.clearToasts,
}));

// Loading selectors
export const useLoading = () => useUIStore(state => state.loading);
export const useGlobalLoading = () => useUIStore(state => state.loading.global);
export const useComponentLoading = (component: string) => 
  useUIStore(state => state.loading.components[component] || false);

// Command palette selectors
export const useCommandPalette = () => useUIStore(state => ({
  ...state.commandPalette,
  toggle: state.toggleCommandPalette,
  setQuery: state.setCommandPaletteQuery,
  setSelection: state.setCommandPaletteSelection,
  setCommands: state.setCommandPaletteCommands,
}));

// Device selectors
export const useDevice = () => useUIStore(state => state.device);
export const useViewport = () => useUIStore(state => state.viewport);
export const useIsMobile = () => useUIStore(state => state.getIsMobile());
export const useIsTablet = () => useUIStore(state => state.getIsTablet());
export const useIsDesktop = () => useUIStore(state => state.getIsDesktop());

// Preferences selectors
export const usePreferences = () => useUIStore(state => state.preferences);
export const useViewMode = () => useUIStore(state => state.preferences.viewMode);

// Utility to sync with window events
export const initializeUIStore = () => {
  if (typeof window === 'undefined') return;
  
  const store = useUIStore.getState();
  
  // Viewport resize handler
  const handleResize = () => {
    store.setViewport({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };
  
  // Scroll handler
  const handleScroll = () => {
    store.setViewport({
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      isScrolling: true,
    });
  };
  
  // Stop scrolling after delay
  let scrollTimeout: NodeJS.Timeout;
  const handleScrollEnd = () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      store.setViewport({ isScrolling: false });
    }, 150);
  };
  
  // Event listeners
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('scroll', handleScrollEnd);
  
  // Initial setup
  handleResize();
  
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('scroll', handleScrollEnd);
  };
};

export default useUIStore;