/**
 * @fileoverview Mobile Keyboard Hook
 * @description React hook for handling mobile keyboard interactions and viewport adjustments
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Virtual keyboard detection
 * - Viewport height adjustments
 * - Auto-scroll to focused inputs
 * - Keyboard show/hide events
 */

import { useState, useEffect, useCallback } from 'react';
import { useMobileDetection } from './useMobileDetection';

interface MobileKeyboardState {
  isVisible: boolean;
  height: number;
  viewportHeight: number;
  originalViewportHeight: number;
}

interface MobileKeyboardOptions {
  autoScrollToInput?: boolean;
  adjustViewport?: boolean;
  scrollOffset?: number;
  onKeyboardShow?: (height: number) => void;
  onKeyboardHide?: () => void;
}

export const useMobileKeyboard = (options: MobileKeyboardOptions = {}) => {
  const {
    autoScrollToInput = true,
    adjustViewport = true,
    scrollOffset = 20,
    onKeyboardShow,
    onKeyboardHide,
  } = options;

  const { isMobile } = useMobileDetection();
  
  const [keyboardState, setKeyboardState] = useState<MobileKeyboardState>({
    isVisible: false,
    height: 0,
    viewportHeight: window.innerHeight,
    originalViewportHeight: window.innerHeight,
  });

  // Detect keyboard visibility by monitoring viewport height changes
  useEffect(() => {
    if (!isMobile) return;

    let lastHeight = window.innerHeight;
    const originalHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = lastHeight - currentHeight;
      
      // Keyboard is likely visible if viewport height decreased significantly
      const keyboardThreshold = 150; // Minimum keyboard height
      const isKeyboardVisible = heightDifference > keyboardThreshold;
      
      setKeyboardState(prev => {
        const newState = {
          ...prev,
          isVisible: isKeyboardVisible,
          height: isKeyboardVisible ? heightDifference : 0,
          viewportHeight: currentHeight,
          originalViewportHeight: originalHeight,
        };

        // Call callbacks
        if (isKeyboardVisible && !prev.isVisible) {
          onKeyboardShow?.(heightDifference);
        } else if (!isKeyboardVisible && prev.isVisible) {
          onKeyboardHide?.();
        }

        return newState;
      });

      lastHeight = currentHeight;
    };

    // Listen for viewport changes
    window.addEventListener('resize', handleResize);
    
    // Also listen for visual viewport API if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [isMobile, onKeyboardShow, onKeyboardHide]);

  // Auto-scroll to focused input when keyboard appears
  useEffect(() => {
    if (!isMobile || !autoScrollToInput) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true'
      )) {
        // Wait for keyboard to appear
        setTimeout(() => {
          const rect = target.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const targetBottom = rect.bottom + scrollOffset;
          
          if (targetBottom > viewportHeight) {
            const scrollAmount = targetBottom - viewportHeight;
            window.scrollBy(0, scrollAmount);
          }
        }, 300); // Delay to ensure keyboard is visible
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isMobile, autoScrollToInput, scrollOffset]);

  // Scroll to specific element when keyboard is visible
  const scrollToElement = useCallback((element: HTMLElement, offset = scrollOffset) => {
    if (!isMobile || !keyboardState.isVisible) return;
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const targetBottom = rect.bottom + offset;
    
    if (targetBottom > viewportHeight) {
      const scrollAmount = targetBottom - viewportHeight;
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [isMobile, keyboardState.isVisible, scrollOffset]);

  // Get safe viewport height (adjusted for keyboard)
  const getSafeViewportHeight = useCallback(() => {
    if (!isMobile || !adjustViewport) return window.innerHeight;
    
    return keyboardState.isVisible 
      ? keyboardState.viewportHeight 
      : keyboardState.originalViewportHeight;
  }, [isMobile, adjustViewport, keyboardState]);

  // CSS custom properties for keyboard-aware layouts
  useEffect(() => {
    if (!isMobile) return;

    const root = document.documentElement;
    
    root.style.setProperty('--keyboard-height', `${keyboardState.height}px`);
    root.style.setProperty('--safe-viewport-height', `${getSafeViewportHeight()}px`);
    root.style.setProperty('--keyboard-visible', keyboardState.isVisible ? '1' : '0');
    
    return () => {
      root.style.removeProperty('--keyboard-height');
      root.style.removeProperty('--safe-viewport-height');
      root.style.removeProperty('--keyboard-visible');
    };
  }, [isMobile, keyboardState, getSafeViewportHeight]);

  return {
    ...keyboardState,
    scrollToElement,
    getSafeViewportHeight,
    isMobileKeyboard: isMobile && keyboardState.isVisible,
  };
};

export default useMobileKeyboard;