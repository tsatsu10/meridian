/**
 * @fileoverview Safe Area Provider Component
 * @description Context provider for managing iOS safe area insets and notch handling
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - iOS safe area detection and management
 * - Dynamic CSS custom properties
 * - Notch and home indicator handling
 * - Orientation change support
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface SafeAreaContextValue {
  top: number;
  right: number;
  bottom: number;
  left: number;
  hasNotch: boolean;
  isIOS: boolean;
}

const SafeAreaContext = createContext<SafeAreaContextValue>({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  hasNotch: false,
  isIOS: false,
});

interface SafeAreaProviderProps {
  children: React.ReactNode;
}

export function SafeAreaProvider({ children }: SafeAreaProviderProps) {
  const { safeAreaInsets, hasNotch, isIOS } = useMobileDetection();

  // Set CSS custom properties for safe area
  useEffect(() => {
    const root = document.documentElement;
    
    // Set safe area inset custom properties
    root.style.setProperty('--safe-area-inset-top', `${safeAreaInsets.top}px`);
    root.style.setProperty('--safe-area-inset-right', `${safeAreaInsets.right}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${safeAreaInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${safeAreaInsets.left}px`);
    
    // Additional helper properties
    root.style.setProperty('--has-notch', hasNotch ? '1' : '0');
    root.style.setProperty('--is-ios', isIOS ? '1' : '0');
    
    // Combined padding properties for convenience
    root.style.setProperty('--safe-area-padding-top', `max(${safeAreaInsets.top}px, env(safe-area-inset-top))`);
    root.style.setProperty('--safe-area-padding-right', `max(${safeAreaInsets.right}px, env(safe-area-inset-right))`);
    root.style.setProperty('--safe-area-padding-bottom', `max(${safeAreaInsets.bottom}px, env(safe-area-inset-bottom))`);
    root.style.setProperty('--safe-area-padding-left', `max(${safeAreaInsets.left}px, env(safe-area-inset-left))`);
    
    return () => {
      root.style.removeProperty('--safe-area-inset-top');
      root.style.removeProperty('--safe-area-inset-right');
      root.style.removeProperty('--safe-area-inset-bottom');
      root.style.removeProperty('--safe-area-inset-left');
      root.style.removeProperty('--has-notch');
      root.style.removeProperty('--is-ios');
      root.style.removeProperty('--safe-area-padding-top');
      root.style.removeProperty('--safe-area-padding-right');
      root.style.removeProperty('--safe-area-padding-bottom');
      root.style.removeProperty('--safe-area-padding-left');
    };
  }, [safeAreaInsets, hasNotch, isIOS]);

  // Add iOS-specific body classes
  useEffect(() => {
    if (isIOS) {
      document.body.classList.add('ios-device');
      if (hasNotch) {
        document.body.classList.add('has-notch');
      }
    }

    return () => {
      document.body.classList.remove('ios-device', 'has-notch');
    };
  }, [isIOS, hasNotch]);

  const contextValue: SafeAreaContextValue = {
    top: safeAreaInsets.top,
    right: safeAreaInsets.right,
    bottom: safeAreaInsets.bottom,
    left: safeAreaInsets.left,
    hasNotch,
    isIOS,
  };

  return (
    <SafeAreaContext.Provider value={contextValue}>
      {children}
    </SafeAreaContext.Provider>
  );
}

export const useSafeArea = () => {
  const context = useContext(SafeAreaContext);
  if (!context) {
    throw new Error('useSafeArea must be used within a SafeAreaProvider');
  }
  return context;
};

export default SafeAreaProvider;