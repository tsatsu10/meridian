/**
 * @fileoverview Mobile-Optimized Button Component
 * @description Button component with mobile-friendly touch targets and interactions
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Touch-optimized sizing (min 44px touch targets)
 * - Mobile-friendly ripple effects
 * - Haptic feedback (where supported)
 * - Enhanced accessibility for touch devices
 */

import React, { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MobileButtonProps extends ButtonProps {
  touchOptimized?: boolean;
  hapticFeedback?: boolean;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ 
    className, 
    touchOptimized = true, 
    hapticFeedback = true,
    onClick,
    children,
    ...props 
  }, ref) => {
    const { isMobile, isTouch } = useMobileDetection();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Provide haptic feedback on mobile devices
      if (hapticFeedback && isMobile && 'vibrate' in navigator) {
        try {
          navigator.vibrate(10); // Short 10ms vibration
        } catch (error) {
          // Haptic feedback not supported, ignore
        }
      }

      onClick?.(event);
    };

    return (
      <Button
        ref={ref}
        className={cn(
          // Mobile touch optimizations
          isMobile && touchOptimized && [
            "min-h-[44px] min-w-[44px]", // iOS HIG minimum touch target
            "touch-manipulation", // Disable double-tap zoom
            "select-none", // Prevent text selection
            "active:scale-95", // Visual feedback on touch
            "transition-transform duration-75"
          ],
          // Enhanced touch feedback
          isTouch && [
            "hover:scale-105 active:scale-95",
            "transition-all duration-150 ease-out"
          ],
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

MobileButton.displayName = "MobileButton";

export default MobileButton;