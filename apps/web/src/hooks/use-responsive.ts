/**
 * Responsive Design Hooks
 * Utilities for responsive behavior and breakpoint detection
 * Phase 2.4 - Mobile Optimization
 */

import { useState, useEffect } from 'react';

// Tailwind-compatible breakpoints
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook to detect current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xl');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < BREAKPOINTS.sm) {
        setBreakpoint('xs');
      } else if (width < BREAKPOINTS.md) {
        setBreakpoint('sm');
      } else if (width < BREAKPOINTS.lg) {
        setBreakpoint('md');
      } else if (width < BREAKPOINTS.xl) {
        setBreakpoint('lg');
      } else if (width < BREAKPOINTS['2xl']) {
        setBreakpoint('xl');
      } else {
        setBreakpoint('2xl');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Hook to check if screen is mobile
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to check if screen is tablet
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= BREAKPOINTS.md && width < BREAKPOINTS.lg);
    };

    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  return isTablet;
}

/**
 * Hook to get screen size category
 */
export function useScreenSize(): 'mobile' | 'tablet' | 'desktop' {
  const [size, setSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      
      if (width < BREAKPOINTS.md) {
        setSize('mobile');
      } else if (width < BREAKPOINTS.lg) {
        setSize('tablet');
      } else {
        setSize('desktop');
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

/**
 * Hook to check if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - Legacy IE check
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

/**
 * Hook to get viewport dimensions
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  return viewport;
}

/**
 * Hook to detect orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatches = () => {
      setMatches(media.matches);
    };

    updateMatches();
    
    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', updateMatches);
      return () => media.removeEventListener('change', updateMatches);
    } else {
      // Legacy browsers
      // @ts-ignore
      media.addListener(updateMatches);
      // @ts-ignore
      return () => media.removeListener(updateMatches);
    }
  }, [query]);

  return matches;
}

/**
 * Hook to check if screen is at least a certain breakpoint
 */
export function useMinBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
}

/**
 * Hook to check if screen is at most a certain breakpoint
 */
export function useMaxBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`);
}

export default useBreakpoint;

