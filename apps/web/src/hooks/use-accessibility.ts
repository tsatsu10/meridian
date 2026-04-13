/**
 * Accessibility Hooks & Utilities
 * WCAG 2.1 compliance utilities
 * Phase 2.5 - Enhanced Personalization
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus trap in modals/dialogs
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element
    firstElement?.focus();

    container.addEventListener('keydown', handleTab as any);
    return () => container.removeEventListener('keydown', handleTab as any);
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation(
  onEscape?: () => void,
  onEnter?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
      } else if (e.key === 'Enter' && onEnter) {
        onEnter();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onEnter]);
}

/**
 * Hook for skip to content functionality
 */
export function useSkipToContent() {
  const skipToMain = useCallback(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { skipToMain };
}

/**
 * Hook for screen reader announcements
 */
export function useAnnouncer() {
  const [announcement, setAnnouncement] = useState('');
  const announcerRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message);
    
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
    }

    // Clear after a delay
    setTimeout(() => setAnnouncement(''), 100);
  }, []);

  const AnnouncerComponent = () => (
    <div
      ref={announcerRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );

  return { announce, AnnouncerComponent };
}

/**
 * Hook for detecting high contrast mode
 */
export function useHighContrast(): boolean {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Windows High Contrast Mode
      const isWindowsHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // Or check for specific high contrast colors
      const testDiv = document.createElement('div');
      testDiv.style.cssText = 'background-color: rgb(0, 255, 0); position: absolute; z-index: -1';
      document.body.appendChild(testDiv);
      
      const computedColor = window.getComputedStyle(testDiv).backgroundColor;
      document.body.removeChild(testDiv);
      
      // If green becomes something else, high contrast is likely active
      const isColorChanged = computedColor !== 'rgb(0, 255, 0)';
      
      setIsHighContrast(isWindowsHighContrast || isColorChanged);
    };

    checkHighContrast();

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handler = () => checkHighContrast();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  return isHighContrast;
}

/**
 * Hook for color contrast ratio calculation
 */
export function useContrastRatio() {
  const getRelativeLuminance = (rgb: number[]): number => {
    const [r, g, b] = rgb.map((val) => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  };

  const calculateContrastRatio = (color1: string, color2: string): number => {
    const lum1 = getRelativeLuminance(hexToRgb(color1));
    const lum2 = getRelativeLuminance(hexToRgb(color2));
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  };

  const meetsWCAG = (
    color1: string,
    color2: string,
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ): boolean => {
    const ratio = calculateContrastRatio(color1, color2);
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    } else {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5;
    }
  };

  return { calculateContrastRatio, meetsWCAG };
}

/**
 * Hook for accessible error announcements
 */
export function useErrorAnnouncement() {
  const { announce, AnnouncerComponent } = useAnnouncer();

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, [announce]);

  return { announceError, announceSuccess, AnnouncerComponent };
}

/**
 * Hook for managing aria-describedby relationships
 */
export function useAriaDescribedBy(descriptionText: string) {
  const [id] = useState(() => `desc-${Math.random().toString(36).substr(2, 9)}`);

  const DescriptionComponent = () => (
    <div id={id} className="sr-only">
      {descriptionText}
    </div>
  );

  return { 'aria-describedby': id, DescriptionComponent };
}

/**
 * Utility: Generate unique ID for accessibility attributes
 */
export function useUniqueId(prefix: string = 'id'): string {
  const [id] = useState(() => `${prefix}-${Math.random().toString(36).substr(2, 9)}`);
  return id;
}

export default useFocusTrap;
