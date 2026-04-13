/**
 * Touch Interaction Hooks
 * Gesture detection and touch-friendly interactions
 * Phase 2.4 - Mobile Optimization
 */

import { useState, useEffect, useRef, TouchEvent } from 'react';

interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

interface UseSwipeOptions {
  onSwipeLeft?: (event: SwipeEvent) => void;
  onSwipeRight?: (event: SwipeEvent) => void;
  onSwipeUp?: (event: SwipeEvent) => void;
  onSwipeDown?: (event: SwipeEvent) => void;
  minDistance?: number; // minimum distance for swipe detection
  minVelocity?: number; // minimum velocity for swipe detection
}

/**
 * Hook for swipe gesture detection
 */
export function useSwipe(options: UseSwipeOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minDistance = 50,
    minVelocity = 0.3,
  } = options;

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const duration = Date.now() - touchStart.current.time;
    
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const velocity = distance / duration;

    // Determine primary direction
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

    if (distance < minDistance || velocity < minVelocity) {
      touchStart.current = null;
      return;
    }

    const swipeEvent: SwipeEvent = {
      direction: isHorizontal
        ? deltaX > 0 ? 'right' : 'left'
        : deltaY > 0 ? 'down' : 'up',
      distance,
      velocity,
      duration,
    };

    // Call appropriate callback
    if (swipeEvent.direction === 'left' && onSwipeLeft) {
      onSwipeLeft(swipeEvent);
    } else if (swipeEvent.direction === 'right' && onSwipeRight) {
      onSwipeRight(swipeEvent);
    } else if (swipeEvent.direction === 'up' && onSwipeUp) {
      onSwipeUp(swipeEvent);
    } else if (swipeEvent.direction === 'down' && onSwipeDown) {
      onSwipeDown(swipeEvent);
    }

    touchStart.current = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook for long press detection
 */
export function useLongPress(
  callback: () => void,
  options: { delay?: number; moveThreshold?: number } = {}
) {
  const { delay = 500, moveThreshold = 10 } = options;
  
  const timerRef = useRef<NodeJS.Timeout>();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    
    timerRef.current = setTimeout(() => {
      callback();
      touchStart.current = null;
    }, delay);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.current.x);
    const deltaY = Math.abs(touch.clientY - touchStart.current.y);

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      touchStart.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    touchStart.current = null;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook for pinch-to-zoom detection
 */
export function usePinchZoom(
  callback: (scale: number) => void,
  options: { minScale?: number; maxScale?: number } = {}
) {
  const { minScale = 0.5, maxScale = 3 } = options;
  const initialDistance = useRef<number>(0);
  const currentScale = useRef<number>(1);

  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current > 0) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      let scale = currentDistance / initialDistance.current;
      
      // Apply scale limits
      scale = Math.max(minScale, Math.min(maxScale, scale));
      
      currentScale.current = scale;
      callback(scale);
    }
  };

  const handleTouchEnd = () => {
    initialDistance.current = 0;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook for pull-to-refresh
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: { threshold?: number; maxDistance?: number } = {}
) {
  const { threshold = 80, maxDistance = 120 } = options;
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef<number>(0);
  const scrollTop = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    scrollTop.current = window.pageYOffset || document.documentElement.scrollTop;
    touchStart.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (scrollTop.current > 0 || isRefreshing) return;

    const touchY = e.touches[0].clientY;
    const delta = touchY - touchStart.current;

    if (delta > 0) {
      setPullDistance(Math.min(delta, maxDistance));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return {
    isRefreshing,
    pullDistance,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook to detect tap vs hold
 */
export function useTapOrHold(
  onTap: () => void,
  onHold: () => void,
  holdDelay = 500
) {
  const timerRef = useRef<NodeJS.Timeout>();
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    timerRef.current = setTimeout(() => {
      onHold();
      touchStart.current = null;
    }, holdDelay);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (touchStart.current) {
      const duration = Date.now() - touchStart.current.time;
      if (duration < holdDelay) {
        onTap();
      }
    }

    touchStart.current = null;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook for haptic feedback (vibration)
 */
export function useHapticFeedback() {
  const vibrate = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const light = () => vibrate(10);
  const medium = () => vibrate(50);
  const heavy = () => vibrate(100);
  const success = () => vibrate([50, 50, 50]);
  const error = () => vibrate([100, 50, 100]);
  const warning = () => vibrate([50, 100, 50]);

  return {
    vibrate,
    light,
    medium,
    heavy,
    success,
    error,
    warning,
  };
}

export default useSwipe;

