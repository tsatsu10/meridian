/**
 * @fileoverview Safe Area View Component
 * @description Container component that respects safe area insets on iOS devices
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Automatic safe area padding
 * - Configurable edges
 * - iOS notch and home indicator support
 * - Responsive design integration
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { useSafeArea } from './safe-area-provider';

interface SafeAreaViewProps extends React.HTMLAttributes<HTMLDivElement> {
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  mode?: 'padding' | 'margin';
  className?: string;
  children?: React.ReactNode;
}

export const SafeAreaView = forwardRef<HTMLDivElement, SafeAreaViewProps>(
  ({ 
    edges = ['top', 'right', 'bottom', 'left'], 
    mode = 'padding',
    className,
    children,
    style,
    ...props 
  }, ref) => {
    const { top, right, bottom, left, isIOS } = useSafeArea();

    // Only apply safe area on iOS devices
    if (!isIOS) {
      return (
        <div ref={ref} className={className} style={style} {...props}>
          {children}
        </div>
      );
    }

    const safeAreaStyle: React.CSSProperties = {
      ...style,
    };

    // Apply safe area insets based on selected edges and mode
    if (edges.includes('top')) {
      safeAreaStyle[mode === 'padding' ? 'paddingTop' : 'marginTop'] = top;
    }
    if (edges.includes('right')) {
      safeAreaStyle[mode === 'padding' ? 'paddingRight' : 'marginRight'] = right;
    }
    if (edges.includes('bottom')) {
      safeAreaStyle[mode === 'padding' ? 'paddingBottom' : 'marginBottom'] = bottom;
    }
    if (edges.includes('left')) {
      safeAreaStyle[mode === 'padding' ? 'paddingLeft' : 'marginLeft'] = left;
    }

    return (
      <div 
        ref={ref} 
        className={cn(
          'safe-area-view',
          className
        )} 
        style={safeAreaStyle} 
        {...props}
      >
        {children}
      </div>
    );
  }
);

SafeAreaView.displayName = 'SafeAreaView';

export default SafeAreaView;