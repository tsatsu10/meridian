/**
 * @fileoverview Mobile Detection Hook
 * @description React hook for detecting mobile devices and screen properties
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Mobile device detection
 * - Screen size and orientation tracking
 * - Touch capability detection
 * - iOS/Android specific detection
 */

import { useState, useEffect } from 'react';

interface MobileDetectionState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  hasNotch: boolean;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const useMobileDetection = (): MobileDetectionState => {
  const [state, setState] = useState<MobileDetectionState>(() => {
    // Initial state with safe defaults
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        isIOS: false,
        isAndroid: false,
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape' as const,
        hasNotch: false,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Device detection
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Screen size based detection
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    
    // Orientation
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // iOS notch detection (approximate)
    const hasNotch = isIOS && (
      (width === 375 && height === 812) || // iPhone X/XS/11 Pro
      (width === 414 && height === 896) || // iPhone XR/XS Max/11/11 Pro Max
      (width === 390 && height === 844) || // iPhone 12/12 Pro
      (width === 428 && height === 926) || // iPhone 12 Pro Max
      (width === 393 && height === 852) || // iPhone 14 Pro
      (width === 430 && height === 932)    // iPhone 14 Pro Max
    );

    // Safe area insets detection
    const safeAreaInsets = {
      top: hasNotch ? 44 : 0,
      right: 0,
      bottom: hasNotch ? 34 : 0,
      left: 0,
    };

    // Try to get actual safe area values from CSS if available
    if (typeof window !== 'undefined' && window.CSS && window.CSS.supports) {
      try {
        const testElement = document.createElement('div');
        testElement.style.position = 'fixed';
        testElement.style.top = 'env(safe-area-inset-top)';
        testElement.style.left = 'env(safe-area-inset-left)';
        testElement.style.right = 'env(safe-area-inset-right)';
        testElement.style.bottom = 'env(safe-area-inset-bottom)';
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        const topInset = parseInt(computedStyle.top) || safeAreaInsets.top;
        const leftInset = parseInt(computedStyle.left) || safeAreaInsets.left;
        const rightInset = parseInt(computedStyle.right) || safeAreaInsets.right;
        const bottomInset = parseInt(computedStyle.bottom) || safeAreaInsets.bottom;
        
        document.body.removeChild(testElement);
        
        safeAreaInsets.top = topInset;
        safeAreaInsets.left = leftInset;
        safeAreaInsets.right = rightInset;
        safeAreaInsets.bottom = bottomInset;
      } catch (error) {
        // Fallback to default values if CSS env() is not supported
      }
    }

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      isIOS,
      isAndroid,
      screenWidth: width,
      screenHeight: height,
      orientation,
      hasNotch,
      safeAreaInsets,
    };
  });

  useEffect(() => {
    const updateState = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Device detection
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Screen size based detection
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      // Orientation
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // iOS notch detection (approximate)
      const hasNotch = isIOS && (
        (width === 375 && height === 812) || // iPhone X/XS/11 Pro
        (width === 414 && height === 896) || // iPhone XR/XS Max/11/11 Pro Max
        (width === 390 && height === 844) || // iPhone 12/12 Pro
        (width === 428 && height === 926) || // iPhone 12 Pro Max
        (width === 393 && height === 852) || // iPhone 14 Pro
        (width === 430 && height === 932)    // iPhone 14 Pro Max
      );

      // Safe area insets
      let safeAreaInsets = {
        top: hasNotch ? 44 : 0,
        right: 0,
        bottom: hasNotch ? 34 : 0,
        left: 0,
      };

      // Try to get CSS env() values
      if (typeof window !== 'undefined' && window.CSS && window.CSS.supports) {
        try {
          const style = document.documentElement.style;
          
          // Set CSS custom properties for safe area
          style.setProperty('--sat', 'env(safe-area-inset-top)');
          style.setProperty('--sar', 'env(safe-area-inset-right)');
          style.setProperty('--sab', 'env(safe-area-inset-bottom)');
          style.setProperty('--sal', 'env(safe-area-inset-left)');
          
          const computedStyle = window.getComputedStyle(document.documentElement);
          const topInset = parseInt(computedStyle.getPropertyValue('--sat')) || safeAreaInsets.top;
          const rightInset = parseInt(computedStyle.getPropertyValue('--sar')) || safeAreaInsets.right;
          const bottomInset = parseInt(computedStyle.getPropertyValue('--sab')) || safeAreaInsets.bottom;
          const leftInset = parseInt(computedStyle.getPropertyValue('--sal')) || safeAreaInsets.left;
          
          safeAreaInsets = {
            top: topInset,
            right: rightInset,
            bottom: bottomInset,
            left: leftInset,
          };
        } catch (error) {
          // Fallback to calculated values
        }
      }

      setState({
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        isIOS,
        isAndroid,
        screenWidth: width,
        screenHeight: height,
        orientation,
        hasNotch,
        safeAreaInsets,
      });
    };

    // Initial update
    updateState();

    // Listen for resize and orientation changes
    const handleResize = () => {
      updateState();
    };

    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(updateState, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return state;
};

export default useMobileDetection;