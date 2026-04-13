import { useEffect, useRef, useCallback } from 'react';

interface AccessibilityOptions {
  announceMessages?: boolean;
  enableKeyboardShortcuts?: boolean;
  highContrastMode?: boolean;
  reducedMotion?: boolean;
}

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useAccessibility(options: AccessibilityOptions = {}) {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const shortcuts = useRef<KeyboardShortcut[]>([]);

  // Create live region for announcements
  useEffect(() => {
    if (!options.announceMessages) return;

    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('class', 'sr-only');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(liveRegion);
    liveRegionRef.current = liveRegion;

    return () => {
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
      }
    };
  }, [options.announceMessages]);

  // Announce messages to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear after announcement to allow repeat announcements
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  // Register keyboard shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcuts.current.push(shortcut);
  }, []);

  // Unregister keyboard shortcut
  const unregisterShortcut = useCallback((key: string) => {
    shortcuts.current = shortcuts.current.filter(s => s.key !== key);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    if (!options.enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const matchingShortcut = shortcuts.current.find(shortcut => {
        return shortcut.key.toLowerCase() === event.key.toLowerCase() &&
               !!shortcut.ctrlKey === event.ctrlKey &&
               !!shortcut.altKey === event.altKey &&
               !!shortcut.shiftKey === event.shiftKey &&
               !!shortcut.metaKey === event.metaKey;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [options.enableKeyboardShortcuts]);

  // Check for reduced motion preference
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check for high contrast preference
  const prefersHighContrast = useCallback(() => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }, []);

  // Focus management utilities
  const focusManager = {
    // Save current focus and restore it later
    saveFocus: (): Element | null => {
      return document.activeElement;
    },

    // Restore focus to previously saved element
    restoreFocus: (element: Element | null) => {
      if (element && 'focus' in element && typeof element.focus === 'function') {
        (element as HTMLElement).focus();
      }
    },

    // Focus first focusable element in container
    focusFirst: (container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    },

    // Focus last focusable element in container
    focusLast: (container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      if (lastElement) {
        lastElement.focus();
      }
    },

    // Trap focus within container
    trapFocus: (container: HTMLElement, event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  // Color contrast utilities
  const colorUtils = {
    // Calculate contrast ratio between two colors
    getContrastRatio: (color1: string, color2: string): number => {
      const getLuminance = (color: string): number => {
        // Simplified luminance calculation
        const rgb = parseInt(color.replace('#', ''), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >>  8) & 0xff;
        const b = (rgb >>  0) & 0xff;
        
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const l1 = getLuminance(color1);
      const l2 = getLuminance(color2);
      
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    },

    // Check if contrast ratio meets WCAG standards
    meetsWCAG: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
      const ratio = colorUtils.getContrastRatio(color1, color2);
      return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
    }
  };

  // Animation utilities
  const animationUtils = {
    // Respect reduced motion preference
    shouldAnimate: (): boolean => {
      return !prefersReducedMotion() && !options.reducedMotion;
    },

    // Get appropriate animation duration
    getDuration: (baseDuration: number): number => {
      return animationUtils.shouldAnimate() ? baseDuration : 0;
    },

    // Create accessible transitions
    createTransition: (property: string, duration: number, easing = 'ease'): string => {
      const actualDuration = animationUtils.getDuration(duration);
      return `${property} ${actualDuration}ms ${easing}`;
    }
  };

  return {
    announce,
    registerShortcut,
    unregisterShortcut,
    focusManager,
    colorUtils,
    animationUtils,
    prefersReducedMotion,
    prefersHighContrast,
    shortcuts: shortcuts.current
  };
}

// Hook for managing focus trap in modals/dialogs
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save current focus
    previousFocus.current = document.activeElement;

    // Focus first element in container
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        // Let parent component handle escape
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore previous focus
      if (previousFocus.current && 'focus' in previousFocus.current) {
        (previousFocus.current as HTMLElement).focus();
      }
    };
  }, [isActive, containerRef]);
}

// Hook for keyboard navigation in lists
export function useKeyboardNavigation(
  itemsRef: React.RefObject<HTMLElement[]>,
  onSelect?: (index: number) => void
) {
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!itemsRef.current) return;

    const items = itemsRef.current.filter(item => item !== null);
    if (items.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        currentIndex.current = Math.min(currentIndex.current + 1, items.length - 1);
        items[currentIndex.current].focus();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        currentIndex.current = Math.max(currentIndex.current - 1, 0);
        items[currentIndex.current].focus();
        break;
        
      case 'Home':
        event.preventDefault();
        currentIndex.current = 0;
        items[currentIndex.current].focus();
        break;
        
      case 'End':
        event.preventDefault();
        currentIndex.current = items.length - 1;
        items[currentIndex.current].focus();
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(currentIndex.current);
        break;
    }
  }, [itemsRef, onSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { currentIndex: currentIndex.current };
}