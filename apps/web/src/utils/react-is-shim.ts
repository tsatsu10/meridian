/**
 * React compatibility shim for Recharts
 * Fixes "isFragment is not a function" error in React 18.3+
 */

import * as React from 'react';
import { Fragment } from 'react';
import { logger } from "../lib/logger";

/**
 * Enhanced isFragment implementation with fallbacks
 */
export function isFragment(object: any): boolean {
  try {
    if (object && typeof object === 'object') {
      if (object.type === Fragment) {
        return true;
      }
      
      if (object.$$typeof && object.type === Fragment) {
        return true;
      }
      
      const fragmentSymbol = Symbol.for('react.fragment');
      if (object.$$typeof === fragmentSymbol || object.type?.$$typeof === fragmentSymbol) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('isFragment shim error:', error);
    return false;
  }
}

/**
 * Monkey patch React utilities for Recharts compatibility
 */
export function patchReactUtilsForRecharts(): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Only patch the global React object, don't modify imports
    const globalReact = (window as any).React;
    if (globalReact && !globalReact.isFragment) {
      logger.info("🔧 Patching React.isFragment for Recharts compatibility");
      globalReact.isFragment = isFragment;
    }
    
    // Make React available globally if it isn't already
    if (!globalReact && React) {
      (window as any).React = { ...React, isFragment };
    }
    
  } catch (error) {
    console.warn('Failed to patch React utilities for Recharts:', error);
  }
}

/**
 * Safe wrapper for Recharts components
 */
export function withRechartsCompatibility<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>
): React.ComponentType<T> {
  return function RechartsCompatibleComponent(props: T) {
    try {
      patchReactUtilsForRecharts();
      return React.createElement(WrappedComponent, props);
    } catch (error) {
      console.error('Recharts compatibility error:', error);
      
      return React.createElement('div', {
        className: "flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
      }, React.createElement('div', {
        className: "text-center"
      }, [
        React.createElement('div', { 
          key: 'icon',
          className: "text-gray-400 mb-2" 
        }, '📊'),
        React.createElement('div', { 
          key: 'message',
          className: "text-sm text-gray-500" 
        }, 'Chart temporarily unavailable')
      ]));
    }
  };
}

// Auto-patch on module load
if (typeof window !== 'undefined') {
  patchReactUtilsForRecharts();
}