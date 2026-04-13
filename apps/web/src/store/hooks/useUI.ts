import { useCallback, useMemo, useEffect, useState } from 'react';
import { useTheme, useLayout, useModals, useDevice, useIsMobile, useIsTablet, useIsDesktop, usePreferences, useUIStore } from '../consolidated/ui';
import { useAppSelector, useAppDispatch } from './index';

export interface UseUIReturn {
  // Theme
  theme: string;
  colorScheme: string;
  fontSize: string;
  density: string;

  // Layout
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  headerHeight: number;
  footerVisible: boolean;

  // Modals
  modals: Record<string, boolean>;
  modalData: Record<string, any>;

  // Navigation
  breadcrumbs: any[];
  activeTab: string;
  navigationHistory: string[];

  // Responsive
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: string;

  // Accessibility
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;

  // Performance
  lazyLoadingEnabled: boolean;
  animationsEnabled: boolean;
  prefersPerformance: boolean;

  // User preferences
  notifications: any;
  shortcuts: any[];
  customizations: any;

  // Loading states
  loading: any;
  errors: any;

  // Actions
  setTheme: (theme: string) => void;
  setColorScheme: (scheme: string) => void;
  setFontSize: (size: string) => void;
  setDensity: (density: string) => void;

  // Layout actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setHeaderHeight: (height: number) => void;
  setFooterVisible: (visible: boolean) => void;

  // Modal actions
  openModal: (modalId: string, data?: any) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string, data?: any) => void;
  closeAllModals: () => void;

  // Navigation actions
  setBreadcrumbs: (breadcrumbs: any[]) => void;
  setActiveTab: (tab: string) => void;
  addToHistory: (path: string) => void;
  goBack: () => void;
  goForward: () => void;

  // Responsive actions
  setBreakpoint: (breakpoint: string) => void;
  updateViewport: (width: number, height: number) => void;

  // Accessibility actions
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setScreenReader: (enabled: boolean) => void;
  setKeyboardNavigation: (enabled: boolean) => void;

  // Performance actions
  setLazyLoading: (enabled: boolean) => void;
  setAnimations: (enabled: boolean) => void;
  setPrefersPerformance: (enabled: boolean) => void;

  // User preference actions
  updateNotificationSettings: (settings: any) => void;
  addShortcut: (shortcut: any) => void;
  removeShortcut: (shortcutId: string) => void;
  updateCustomizations: (customizations: any) => void;

  // Utilities
  isModalOpen: (modalId: string) => boolean;
  getModalData: (modalId: string) => any;
  getCurrentBreakpoint: () => string;
  
  // Reset
  resetUI: () => void;
  resetToDefaults: () => void;
}

export function useUI(): UseUIReturn {
  const dispatch = useAppDispatch();
  
  // Mock implementation - would use actual selectors
  const theme = useAppSelector(state => state.ui?.theme || 'light');
  const colorScheme = useAppSelector(state => state.ui?.colorScheme || 'blue');
  const fontSize = useAppSelector(state => state.ui?.fontSize || 'medium');
  const density = useAppSelector(state => state.ui?.density || 'comfortable');
  
  const sidebarCollapsed = useAppSelector(state => state.ui?.sidebar?.collapsed || false);
  const sidebarWidth = useAppSelector(state => state.ui?.sidebar?.width || 280);
  const headerHeight = useAppSelector(state => state.ui?.header?.height || 60);
  const footerVisible = useAppSelector(state => state.ui?.footer?.visible || true);
  
  const modals = useAppSelector(state => state.ui?.modals || {});
  const modalData = useAppSelector(state => state.ui?.modalData || {});
  
  const breadcrumbs = useAppSelector(state => state.ui?.navigation?.breadcrumbs || []);
  const activeTab = useAppSelector(state => state.ui?.navigation?.activeTab || '');
  const navigationHistory = useAppSelector(state => state.ui?.navigation?.history || []);
  
  const breakpoint = useAppSelector(state => state.ui?.responsive?.breakpoint || 'desktop');
  const viewport = useAppSelector(state => state.ui?.responsive?.viewport || { width: 1920, height: 1080 });
  
  const highContrast = useAppSelector(state => state.ui?.accessibility?.highContrast || false);
  const reduceMotion = useAppSelector(state => state.ui?.accessibility?.reduceMotion || false);
  const screenReader = useAppSelector(state => state.ui?.accessibility?.screenReader || false);
  const keyboardNavigation = useAppSelector(state => state.ui?.accessibility?.keyboardNavigation || false);
  
  const lazyLoadingEnabled = useAppSelector(state => state.ui?.performance?.lazyLoading || true);
  const animationsEnabled = useAppSelector(state => state.ui?.performance?.animations || true);
  const prefersPerformance = useAppSelector(state => state.ui?.performance?.prefersPerformance || false);
  
  const notifications = useAppSelector(state => state.ui?.preferences?.notifications || {});
  const shortcuts = useAppSelector(state => state.ui?.preferences?.shortcuts || []);
  const customizations = useAppSelector(state => state.ui?.preferences?.customizations || {});
  
  const loading = useAppSelector(state => state.ui?.loading || {});
  const errors = useAppSelector(state => state.ui?.errors || {});

  // Computed values
  const isMobile = useMemo(() => breakpoint === 'mobile', [breakpoint]);
  const isTablet = useMemo(() => breakpoint === 'tablet', [breakpoint]);
  const isDesktop = useMemo(() => ['desktop', 'wide'].includes(breakpoint), [breakpoint]);

  // Theme actions
  const handleSetTheme = useCallback((theme: string) => {
    dispatch({ type: 'ui/setTheme', payload: theme });
  }, [dispatch]);

  const handleSetColorScheme = useCallback((scheme: string) => {
    dispatch({ type: 'ui/setColorScheme', payload: scheme });
  }, [dispatch]);

  const handleSetFontSize = useCallback((size: string) => {
    dispatch({ type: 'ui/setFontSize', payload: size });
  }, [dispatch]);

  const handleSetDensity = useCallback((density: string) => {
    dispatch({ type: 'ui/setDensity', payload: density });
  }, [dispatch]);

  // Layout actions
  const handleToggleSidebar = useCallback(() => {
    dispatch({ type: 'ui/toggleSidebar' });
  }, [dispatch]);

  const handleSetSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'ui/setSidebarCollapsed', payload: collapsed });
  }, [dispatch]);

  const handleSetSidebarWidth = useCallback((width: number) => {
    dispatch({ type: 'ui/setSidebarWidth', payload: width });
  }, [dispatch]);

  const handleSetHeaderHeight = useCallback((height: number) => {
    dispatch({ type: 'ui/setHeaderHeight', payload: height });
  }, [dispatch]);

  const handleSetFooterVisible = useCallback((visible: boolean) => {
    dispatch({ type: 'ui/setFooterVisible', payload: visible });
  }, [dispatch]);

  // Modal actions
  const handleOpenModal = useCallback((modalId: string, data?: any) => {
    dispatch({ type: 'ui/openModal', payload: { modalId, data } });
  }, [dispatch]);

  const handleCloseModal = useCallback((modalId: string) => {
    dispatch({ type: 'ui/closeModal', payload: modalId });
  }, [dispatch]);

  const handleToggleModal = useCallback((modalId: string, data?: any) => {
    if (modals[modalId]) {
      handleCloseModal(modalId);
    } else {
      handleOpenModal(modalId, data);
    }
  }, [modals, handleOpenModal, handleCloseModal]);

  const handleCloseAllModals = useCallback(() => {
    dispatch({ type: 'ui/closeAllModals' });
  }, [dispatch]);

  // Navigation actions
  const handleSetBreadcrumbs = useCallback((breadcrumbs: any[]) => {
    dispatch({ type: 'ui/setBreadcrumbs', payload: breadcrumbs });
  }, [dispatch]);

  const handleSetActiveTab = useCallback((tab: string) => {
    dispatch({ type: 'ui/setActiveTab', payload: tab });
  }, [dispatch]);

  const handleAddToHistory = useCallback((path: string) => {
    dispatch({ type: 'ui/addToHistory', payload: path });
  }, [dispatch]);

  const handleGoBack = useCallback(() => {
    dispatch({ type: 'ui/goBack' });
  }, [dispatch]);

  const handleGoForward = useCallback(() => {
    dispatch({ type: 'ui/goForward' });
  }, [dispatch]);

  // Responsive actions
  const handleSetBreakpoint = useCallback((breakpoint: string) => {
    dispatch({ type: 'ui/setBreakpoint', payload: breakpoint });
  }, [dispatch]);

  const handleUpdateViewport = useCallback((width: number, height: number) => {
    dispatch({ type: 'ui/updateViewport', payload: { width, height } });
  }, [dispatch]);

  // Accessibility actions
  const handleSetHighContrast = useCallback((enabled: boolean) => {
    dispatch({ type: 'ui/setHighContrast', payload: enabled });
  }, [dispatch]);

  const handleSetReduceMotion = useCallback((enabled: boolean) => {
    dispatch({ type: 'ui/setReduceMotion', payload: enabled });
  }, [dispatch]);

  const handleSetScreenReader = useCallback((enabled: boolean) => {
    dispatch({ type: 'ui/setScreenReader', payload: enabled });
  }, [dispatch]);

  const handleSetKeyboardNavigation = useCallback((enabled: boolean) => {
    dispatch({ type: 'ui/setKeyboardNavigation', payload: enabled });
  }, [dispatch]);

  // Performance actions
  const handleSetLazyLoading = useCallback((enabled: boolean) => {
    dispatch({ type: 'ui/setLazyLoading', payload: enabled });
  }, [dispatch]);

  const handleSetAnimations = useCallback((enabled: boolean) => {
    dispatch({ type: 'ui/setAnimations', payload: enabled });
  }, [dispatch]);

  const handleSetPrefersPerformance = useCallback((enabled: boolean) => {
    dispatch({ type: 'ui/setPrefersPerformance', payload: enabled });
  }, [dispatch]);

  // User preference actions
  const handleUpdateNotificationSettings = useCallback((settings: any) => {
    dispatch({ type: 'ui/updateNotificationSettings', payload: settings });
  }, [dispatch]);

  const handleAddShortcut = useCallback((shortcut: any) => {
    dispatch({ type: 'ui/addShortcut', payload: shortcut });
  }, [dispatch]);

  const handleRemoveShortcut = useCallback((shortcutId: string) => {
    dispatch({ type: 'ui/removeShortcut', payload: shortcutId });
  }, [dispatch]);

  const handleUpdateCustomizations = useCallback((customizations: any) => {
    dispatch({ type: 'ui/updateCustomizations', payload: customizations });
  }, [dispatch]);

  // Utilities
  const isModalOpen = useCallback((modalId: string) => {
    return !!modals[modalId];
  }, [modals]);

  const getModalData = useCallback((modalId: string) => {
    return modalData[modalId] || null;
  }, [modalData]);

  const getCurrentBreakpoint = useCallback(() => {
    return breakpoint;
  }, [breakpoint]);

  const handleResetUI = useCallback(() => {
    dispatch({ type: 'ui/reset' });
  }, [dispatch]);

  const handleResetToDefaults = useCallback(() => {
    dispatch({ type: 'ui/resetToDefaults' });
  }, [dispatch]);

  return {
    // Theme
    theme,
    colorScheme,
    fontSize,
    density,

    // Layout
    sidebarCollapsed,
    sidebarWidth,
    headerHeight,
    footerVisible,

    // Modals
    modals,
    modalData,

    // Navigation
    breadcrumbs,
    activeTab,
    navigationHistory,

    // Responsive
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,

    // Accessibility
    highContrast,
    reduceMotion,
    screenReader,
    keyboardNavigation,

    // Performance
    lazyLoadingEnabled,
    animationsEnabled,
    prefersPerformance,

    // User preferences
    notifications,
    shortcuts,
    customizations,

    // Loading states
    loading,
    errors,

    // Actions
    setTheme: handleSetTheme,
    setColorScheme: handleSetColorScheme,
    setFontSize: handleSetFontSize,
    setDensity: handleSetDensity,

    // Layout actions
    toggleSidebar: handleToggleSidebar,
    setSidebarCollapsed: handleSetSidebarCollapsed,
    setSidebarWidth: handleSetSidebarWidth,
    setHeaderHeight: handleSetHeaderHeight,
    setFooterVisible: handleSetFooterVisible,

    // Modal actions
    openModal: handleOpenModal,
    closeModal: handleCloseModal,
    toggleModal: handleToggleModal,
    closeAllModals: handleCloseAllModals,

    // Navigation actions
    setBreadcrumbs: handleSetBreadcrumbs,
    setActiveTab: handleSetActiveTab,
    addToHistory: handleAddToHistory,
    goBack: handleGoBack,
    goForward: handleGoForward,

    // Responsive actions
    setBreakpoint: handleSetBreakpoint,
    updateViewport: handleUpdateViewport,

    // Accessibility actions
    setHighContrast: handleSetHighContrast,
    setReduceMotion: handleSetReduceMotion,
    setScreenReader: handleSetScreenReader,
    setKeyboardNavigation: handleSetKeyboardNavigation,

    // Performance actions
    setLazyLoading: handleSetLazyLoading,
    setAnimations: handleSetAnimations,
    setPrefersPerformance: handleSetPrefersPerformance,

    // User preference actions
    updateNotificationSettings: handleUpdateNotificationSettings,
    addShortcut: handleAddShortcut,
    removeShortcut: handleRemoveShortcut,
    updateCustomizations: handleUpdateCustomizations,

    // Utilities
    isModalOpen,
    getModalData,
    getCurrentBreakpoint,

    // Reset
    resetUI: handleResetUI,
    resetToDefaults: handleResetToDefaults,
  };
}

// Enhanced hook with theme detection and responsive breakpoints
export function useUIWithAutoDetection(): UseUIReturn & {
  systemPrefersDark: boolean;
  systemPrefersReducedMotion: boolean;
  isOnline: boolean;
} {
  const ui = useUI();
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
      if (ui.theme === 'auto') {
        ui.setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [ui.theme, ui.setTheme]);

  // Detect system motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersReducedMotion(e.matches);
      ui.setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [ui.setReduceMotion]);

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Responsive breakpoint detection
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      let breakpoint = 'desktop';

      if (width < 640) {
        breakpoint = 'mobile';
      } else if (width < 1024) {
        breakpoint = 'tablet';
      } else if (width >= 1920) {
        breakpoint = 'wide';
      }

      ui.setBreakpoint(breakpoint);
      ui.updateViewport(window.innerWidth, window.innerHeight);
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, [ui.setBreakpoint, ui.updateViewport]);

  return {
    ...ui,
    systemPrefersDark,
    systemPrefersReducedMotion,
    isOnline,
  };
}

// Hook for modal management
export function useModal(modalId: string) {
  const ui = useUI();

  const isOpen = useMemo(() => {
    return ui.isModalOpen(modalId);
  }, [ui, modalId]);

  const data = useMemo(() => {
    return ui.getModalData(modalId);
  }, [ui, modalId]);

  const open = useCallback((data?: any) => {
    ui.openModal(modalId, data);
  }, [ui, modalId]);

  const close = useCallback(() => {
    ui.closeModal(modalId);
  }, [ui, modalId]);

  const toggle = useCallback((data?: any) => {
    ui.toggleModal(modalId, data);
  }, [ui, modalId]);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
  };
}

// Hook for keyboard shortcuts
export function useKeyboardShortcuts() {
  const ui = useUI();

  const addShortcut = useCallback((key: string, action: () => void, options?: any) => {
    const shortcut = {
      id: `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      action,
      ...options,
    };

    ui.addShortcut(shortcut);

    // Add event listener
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === key && (!options?.ctrlKey || event.ctrlKey) && (!options?.altKey || event.altKey)) {
        event.preventDefault();
        action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      ui.removeShortcut(shortcut.id);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ui]);

  return {
    shortcuts: ui.shortcuts,
    addShortcut,
    removeShortcut: ui.removeShortcut,
  };
}