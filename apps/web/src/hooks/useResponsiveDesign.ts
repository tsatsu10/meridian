import { useState, useEffect, useCallback } from 'react';

// Breakpoint definitions (matches Tailwind CSS)
export const breakpoints = {
  sm: 640,   // Small screens (mobile landscape)
  md: 768,   // Medium screens (tablets)
  lg: 1024,  // Large screens (small laptops)
  xl: 1280,  // Extra large screens (desktop)
  '2xl': 1536 // 2x extra large screens (large desktop)
} as const;

export type Breakpoint = keyof typeof breakpoints;

interface ViewportInfo {
  width: number;
  height: number;
  currentBreakpoint: Breakpoint | 'xs';
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isExtraLargeScreen: boolean;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

interface ResponsiveConfig {
  // Component visibility
  showSidebar: boolean;
  sidebarCollapsed: boolean;
  showMobileMenu: boolean;
  
  // Layout configuration
  columnsCount: number;
  gridTemplate: string;
  contentWidth: 'full' | 'container' | 'narrow';
  
  // Typography scaling
  textScale: number;
  headingScale: number;
  
  // Spacing adjustments
  padding: 'sm' | 'md' | 'lg' | 'xl';
  margin: 'sm' | 'md' | 'lg' | 'xl';
  
  // Interactive elements
  buttonSize: 'sm' | 'md' | 'lg';
  inputSize: 'sm' | 'md' | 'lg';
  
  // Navigation
  navigationStyle: 'tabs' | 'dropdown' | 'sidebar' | 'bottom';
  
  // Chat specific
  showChatSidebar: boolean;
  chatLayout: 'single' | 'split' | 'overlay';
  messageLayout: 'compact' | 'comfortable' | 'spacious';
}

export function useResponsiveDesign() {
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    currentBreakpoint: 'xs',
    isSmallScreen: false,
    isMediumScreen: false,
    isLargeScreen: false,
    isExtraLargeScreen: false,
    isTouchDevice: false,
    orientation: 'portrait',
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1
  });

  // Determine current breakpoint
  const getCurrentBreakpoint = useCallback((width: number): Breakpoint | 'xs' => {
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  }, []);

  // Check if device supports touch
  const isTouchDevice = useCallback(() => {
    return typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints > 0
    );
  }, []);

  // Update viewport information
  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const currentBreakpoint = getCurrentBreakpoint(width);
    
    setViewport({
      width,
      height,
      currentBreakpoint,
      isSmallScreen: width < breakpoints.md,
      isMediumScreen: width >= breakpoints.md && width < breakpoints.lg,
      isLargeScreen: width >= breakpoints.lg && width < breakpoints.xl,
      isExtraLargeScreen: width >= breakpoints.xl,
      isTouchDevice: isTouchDevice(),
      orientation: height > width ? 'portrait' : 'landscape',
      pixelRatio: window.devicePixelRatio || 1
    });
  }, [getCurrentBreakpoint, isTouchDevice]);

  // Setup viewport tracking
  useEffect(() => {
    updateViewport();

    const handleResize = () => updateViewport();
    const handleOrientationChange = () => {
      setTimeout(updateViewport, 100); // Delay to ensure dimensions are updated
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateViewport]);

  // Generate responsive configuration
  const getResponsiveConfig = useCallback((): ResponsiveConfig => {
    const { currentBreakpoint, isSmallScreen, isTouchDevice, orientation } = viewport;

    // Base configuration for mobile-first approach
    let config: ResponsiveConfig = {
      showSidebar: false,
      sidebarCollapsed: true,
      showMobileMenu: true,
      columnsCount: 1,
      gridTemplate: '1fr',
      contentWidth: 'full',
      textScale: 0.875, // 14px base
      headingScale: 1,
      padding: 'sm',
      margin: 'sm',
      buttonSize: 'md',
      inputSize: 'md',
      navigationStyle: 'bottom',
      showChatSidebar: false,
      chatLayout: 'single',
      messageLayout: 'compact'
    };

    // Tablet adjustments
    if (currentBreakpoint === 'sm' || currentBreakpoint === 'md') {
      config = {
        ...config,
        showSidebar: orientation === 'landscape',
        sidebarCollapsed: true,
        columnsCount: orientation === 'landscape' ? 2 : 1,
        gridTemplate: orientation === 'landscape' ? '1fr 2fr' : '1fr',
        contentWidth: 'container',
        textScale: 0.9, // 14.4px base
        padding: 'md',
        margin: 'md',
        navigationStyle: orientation === 'landscape' ? 'sidebar' : 'tabs',
        showChatSidebar: orientation === 'landscape',
        chatLayout: orientation === 'landscape' ? 'split' : 'single',
        messageLayout: 'comfortable'
      };
    }

    // Desktop adjustments
    if (currentBreakpoint === 'lg') {
      config = {
        ...config,
        showSidebar: true,
        sidebarCollapsed: false,
        showMobileMenu: false,
        columnsCount: 3,
        gridTemplate: '250px 1fr 300px',
        contentWidth: 'container',
        textScale: 1, // 16px base
        headingScale: 1.1,
        padding: 'lg',
        margin: 'lg',
        buttonSize: 'lg',
        inputSize: 'lg',
        navigationStyle: 'sidebar',
        showChatSidebar: true,
        chatLayout: 'split',
        messageLayout: 'comfortable'
      };
    }

    // Large desktop adjustments
    if (currentBreakpoint === 'xl' || currentBreakpoint === '2xl') {
      config = {
        ...config,
        showSidebar: true,
        sidebarCollapsed: false,
        showMobileMenu: false,
        columnsCount: currentBreakpoint === '2xl' ? 4 : 3,
        gridTemplate: currentBreakpoint === '2xl' ? '280px 1fr 300px 250px' : '260px 1fr 320px',
        contentWidth: currentBreakpoint === '2xl' ? 'full' : 'container',
        textScale: currentBreakpoint === '2xl' ? 1.1 : 1,
        headingScale: currentBreakpoint === '2xl' ? 1.25 : 1.15,
        padding: 'xl',
        margin: 'xl',
        navigationStyle: 'sidebar',
        showChatSidebar: true,
        chatLayout: 'split',
        messageLayout: 'spacious'
      };
    }

    // Touch device specific adjustments
    if (isTouchDevice) {
      config.buttonSize = config.buttonSize === 'sm' ? 'md' : config.buttonSize;
      config.inputSize = config.inputSize === 'sm' ? 'md' : config.inputSize;
      
      // Increase padding for better touch targets
      if (config.padding === 'sm') config.padding = 'md';
    }

    return config;
  }, [viewport]);

  // Responsive utilities
  const isBreakpoint = useCallback((breakpoint: Breakpoint | 'xs') => {
    return viewport.currentBreakpoint === breakpoint;
  }, [viewport.currentBreakpoint]);

  const isBreakpointUp = useCallback((breakpoint: Breakpoint) => {
    const currentIndex = Object.keys(breakpoints).indexOf(viewport.currentBreakpoint as Breakpoint);
    const targetIndex = Object.keys(breakpoints).indexOf(breakpoint);
    return currentIndex >= targetIndex || viewport.currentBreakpoint === '2xl';
  }, [viewport.currentBreakpoint]);

  const isBreakpointDown = useCallback((breakpoint: Breakpoint) => {
    if (viewport.currentBreakpoint === 'xs') return true;
    const currentIndex = Object.keys(breakpoints).indexOf(viewport.currentBreakpoint as Breakpoint);
    const targetIndex = Object.keys(breakpoints).indexOf(breakpoint);
    return currentIndex <= targetIndex;
  }, [viewport.currentBreakpoint]);

  // CSS custom properties for responsive design
  const getCSSVariables = useCallback(() => {
    const config = getResponsiveConfig();
    
    return {
      '--responsive-columns': config.columnsCount.toString(),
      '--responsive-grid-template': config.gridTemplate,
      '--responsive-text-scale': config.textScale.toString(),
      '--responsive-heading-scale': config.headingScale.toString(),
      '--responsive-padding': getPaddingValue(config.padding),
      '--responsive-margin': getMarginValue(config.margin),
      '--responsive-button-size': getButtonSizeValue(config.buttonSize),
      '--responsive-input-size': getInputSizeValue(config.inputSize)
    };
  }, [getResponsiveConfig]);

  // Apply CSS variables to document
  useEffect(() => {
    const variables = getCSSVariables();
    const root = document.documentElement;
    
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [getCSSVariables]);

  // Responsive class names generator
  const getResponsiveClasses = useCallback((classes: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  }) => {
    const { currentBreakpoint } = viewport;
    
    // Find the appropriate class for current breakpoint
    const breakpointOrder: (Breakpoint | 'xs')[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (classes[bp]) {
        return classes[bp];
      }
    }
    
    return classes.xs || '';
  }, [viewport.currentBreakpoint]);

  return {
    // Viewport information
    viewport,
    
    // Configuration
    config: getResponsiveConfig(),
    
    // Utilities
    isBreakpoint,
    isBreakpointUp,
    isBreakpointDown,
    getResponsiveClasses,
    getCSSVariables,
    
    // Responsive state helpers
    isMobile: viewport.isSmallScreen,
    isTablet: viewport.isMediumScreen,
    isDesktop: viewport.isLargeScreen || viewport.isExtraLargeScreen,
    isTouchDevice: viewport.isTouchDevice,
    isPortrait: viewport.orientation === 'portrait',
    isLandscape: viewport.orientation === 'landscape'
  };
}

// Helper functions for CSS values
function getPaddingValue(size: 'sm' | 'md' | 'lg' | 'xl'): string {
  switch (size) {
    case 'sm': return '0.5rem';
    case 'md': return '1rem';
    case 'lg': return '1.5rem';
    case 'xl': return '2rem';
    default: return '1rem';
  }
}

function getMarginValue(size: 'sm' | 'md' | 'lg' | 'xl'): string {
  switch (size) {
    case 'sm': return '0.5rem';
    case 'md': return '1rem';
    case 'lg': return '1.5rem';
    case 'xl': return '2rem';
    default: return '1rem';
  }
}

function getButtonSizeValue(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return '2rem'; // h-8
    case 'md': return '2.5rem'; // h-10
    case 'lg': return '3rem'; // h-12
    default: return '2.5rem';
  }
}

function getInputSizeValue(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return '2.25rem'; // h-9
    case 'md': return '2.5rem'; // h-10
    case 'lg': return '3rem'; // h-12
    default: return '2.5rem';
  }
}

// Responsive component wrapper
interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  breakpoint?: Breakpoint | 'xs';
  show?: 'up' | 'down' | 'only';
}

export function ResponsiveWrapper({ 
  children, 
  className, 
  breakpoint = 'sm', 
  show = 'up' 
}: ResponsiveWrapperProps) {
  const { isBreakpoint, isBreakpointUp, isBreakpointDown } = useResponsiveDesign();
  
  let shouldShow = false;
  
  if (breakpoint === 'xs') {
    shouldShow = show === 'only' ? isBreakpoint('xs') : 
                 show === 'up' ? true : 
                 show === 'down' ? isBreakpoint('xs') : false;
  } else {
    shouldShow = show === 'only' ? isBreakpoint(breakpoint) :
                 show === 'up' ? isBreakpointUp(breakpoint) :
                 show === 'down' ? isBreakpointDown(breakpoint) : false;
  }
  
  if (!shouldShow) return null;
  
  return <div className={className}>{children}</div>;
}