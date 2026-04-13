/**
 * @fileoverview Touch Gestures Hook
 * @description React hook for handling touch gestures like swipe, pinch, and touch interactions
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Swipe detection (horizontal and vertical)
 * - Touch-friendly interactions
 * - Mobile-optimized gesture handling
 * - Configurable sensitivity and thresholds
 */

import { useRef, useEffect, useCallback } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  duration: number;
  velocity: number;
}

interface TouchGestureOptions {
  // Swipe detection
  swipeThreshold?: number; // Minimum distance for swipe
  swipeVelocityThreshold?: number; // Minimum velocity for swipe
  maxSwipeTime?: number; // Maximum time for swipe gesture
  
  // Touch sensitivity
  touchSensitivity?: number;
  preventScroll?: boolean;
  
  // Callbacks
  onSwipe?: (gesture: SwipeGesture) => void;
  onSwipeLeft?: (gesture: SwipeGesture) => void;
  onSwipeRight?: (gesture: SwipeGesture) => void;
  onSwipeUp?: (gesture: SwipeGesture) => void;
  onSwipeDown?: (gesture: SwipeGesture) => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchMove?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
}

export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const {
    swipeThreshold = 50,
    swipeVelocityThreshold = 0.3,
    maxSwipeTime = 1000,
    touchSensitivity = 10,
    preventScroll = false,
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchMoveRef = useRef<TouchPoint | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const calculateDistance = useCallback((start: TouchPoint, end: TouchPoint): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const calculateVelocity = useCallback((start: TouchPoint, end: TouchPoint): number => {
    const distance = calculateDistance(start, end);
    const time = end.timestamp - start.timestamp;
    return time > 0 ? distance / time : 0;
  }, [calculateDistance]);

  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): 'left' | 'right' | 'up' | 'down' => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    onTouchStart?.(event);

    if (preventScroll) {
      event.preventDefault();
    }
  }, [onTouchStart, preventScroll]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch || !touchStartRef.current) return;

    touchMoveRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    onTouchMove?.(event);

    if (preventScroll) {
      event.preventDefault();
    }
  }, [onTouchMove, preventScroll]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touchEnd: TouchPoint = {
      x: event.changedTouches[0]?.clientX || touchMoveRef.current?.x || touchStartRef.current.x,
      y: event.changedTouches[0]?.clientY || touchMoveRef.current?.y || touchStartRef.current.y,
      timestamp: Date.now(),
    };

    const distance = calculateDistance(touchStartRef.current, touchEnd);
    const duration = touchEnd.timestamp - touchStartRef.current.timestamp;
    const velocity = calculateVelocity(touchStartRef.current, touchEnd);

    // Check if gesture qualifies as swipe
    if (
      distance >= swipeThreshold &&
      duration <= maxSwipeTime &&
      velocity >= swipeVelocityThreshold
    ) {
      const direction = getSwipeDirection(touchStartRef.current, touchEnd);
      
      const gesture: SwipeGesture = {
        direction,
        distance,
        duration,
        velocity,
      };

      // Call general swipe callback
      onSwipe?.(gesture);

      // Call direction-specific callbacks
      switch (direction) {
        case 'left':
          onSwipeLeft?.(gesture);
          break;
        case 'right':
          onSwipeRight?.(gesture);
          break;
        case 'up':
          onSwipeUp?.(gesture);
          break;
        case 'down':
          onSwipeDown?.(gesture);
          break;
      }
    }

    onTouchEnd?.(event);

    // Reset touch tracking
    touchStartRef.current = null;
    touchMoveRef.current = null;
  }, [
    calculateDistance,
    calculateVelocity,
    getSwipeDirection,
    swipeThreshold,
    maxSwipeTime,
    swipeVelocityThreshold,
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTouchEnd,
  ]);

  // Bind touch events to element
  const bindTouchEvents = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      // Remove existing listeners
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }

    elementRef.current = element;

    if (element) {
      // Add new listeners
      element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
      element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart);
        elementRef.current.removeEventListener('touchmove', handleTouchMove);
        elementRef.current.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    bindTouchEvents,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

export default useTouchGestures;