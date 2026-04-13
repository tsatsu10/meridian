/**
 * @fileoverview Mobile Overlay Component
 * @description Backdrop overlay for mobile interfaces with touch handling
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Touch-friendly backdrop
 * - Tap to close functionality
 * - Smooth animations
 * - Safe area aware
 */

import React from 'react';
import { cn } from '@/lib/cn';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MobileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function MobileOverlay({ 
  isOpen, 
  onClose, 
  className,
  children 
}: MobileOverlayProps) {
  const { isMobile, safeAreaInsets } = useMobileDetection();

  if (!isMobile || !isOpen) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        style={{
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
          paddingLeft: safeAreaInsets.left,
          paddingRight: safeAreaInsets.right,
        }}
      />
      
      {/* Content */}
      <div className={cn("relative z-40", className)}>
        {children}
      </div>
    </>
  );
}

export default MobileOverlay;