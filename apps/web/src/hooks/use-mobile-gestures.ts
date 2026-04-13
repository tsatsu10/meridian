import { useEffect, useRef, useState } from 'react'

interface GestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinch?: (scale: number) => void
  onDoubleTap?: () => void
  onLongPress?: () => void
}

interface GestureOptions {
  swipeThreshold?: number // Minimum distance for swipe
  pinchThreshold?: number // Minimum scale change for pinch
  doubleTapDelay?: number // Max time between taps for double tap
  longPressDelay?: number // Time to hold for long press
  enableHapticFeedback?: boolean
}

const DEFAULT_OPTIONS: Required<GestureOptions> = {
  swipeThreshold: 50,
  pinchThreshold: 0.1,
  doubleTapDelay: 300,
  longPressDelay: 500,
  enableHapticFeedback: true,
}

export function useMobileGestures(
  handlers: GestureHandlers,
  options: GestureOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const ref = useRef<HTMLElement>(null)
  const [gestureState, setGestureState] = useState({
    isGesturing: false,
    currentGesture: null as string | null,
  })

  // Touch tracking
  const touchStart = useRef({ x: 0, y: 0, time: 0 })
  const touchEnd = useRef({ x: 0, y: 0, time: 0 })
  const lastTap = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout>()
  const pinchStart = useRef(0)

  // Haptic feedback helper
  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!opts.enableHapticFeedback) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: 50,
        medium: 100,
        heavy: 200,
      }
      navigator.vibrate(patterns[intensity])
    }
  }

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Handle touch start
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }

      setGestureState({ isGesturing: true, currentGesture: null })

      // Start long press timer
      if (handlers.onLongPress) {
        longPressTimer.current = setTimeout(() => {
          triggerHaptic('heavy')
          handlers.onLongPress?.()
          setGestureState(prev => ({ ...prev, currentGesture: 'longpress' }))
        }, opts.longPressDelay)
      }

      // Track pinch start
      if (e.touches.length === 2 && handlers.onPinch) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        pinchStart.current = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
      }
    }

    // Handle touch move
    const handleTouchMove = (e: TouchEvent) => {
      // Clear long press timer on move
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = undefined
      }

      // Handle pinch gesture
      if (e.touches.length === 2 && handlers.onPinch && pinchStart.current > 0) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
        
        const scale = currentDistance / pinchStart.current
        if (Math.abs(scale - 1) > opts.pinchThreshold) {
          handlers.onPinch(scale)
          setGestureState(prev => ({ ...prev, currentGesture: 'pinch' }))
        }
      }
    }

    // Handle touch end
    const handleTouchEnd = (e: TouchEvent) => {
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = undefined
      }

      const touch = e.changedTouches[0]
      touchEnd.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }

      const deltaX = touchEnd.current.x - touchStart.current.x
      const deltaY = touchEnd.current.y - touchStart.current.y
      const deltaTime = touchEnd.current.time - touchStart.current.time
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Handle double tap
      if (handlers.onDoubleTap && distance < 10 && deltaTime < 200) {
        const now = Date.now()
        if (now - lastTap.current < opts.doubleTapDelay) {
          triggerHaptic('medium')
          handlers.onDoubleTap()
          setGestureState(prev => ({ ...prev, currentGesture: 'doubletap' }))
        }
        lastTap.current = now
      }

      // Handle swipe gestures
      if (distance > opts.swipeThreshold && deltaTime < 500) {
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
        
        if (Math.abs(angle) < 45) {
          // Swipe right
          triggerHaptic('light')
          handlers.onSwipeRight?.()
          setGestureState(prev => ({ ...prev, currentGesture: 'swiperight' }))
        } else if (Math.abs(angle) > 135) {
          // Swipe left
          triggerHaptic('light')
          handlers.onSwipeLeft?.()
          setGestureState(prev => ({ ...prev, currentGesture: 'swipeleft' }))
        } else if (angle > 45 && angle < 135) {
          // Swipe down
          triggerHaptic('light')
          handlers.onSwipeDown?.()
          setGestureState(prev => ({ ...prev, currentGesture: 'swipedown' }))
        } else if (angle > -135 && angle < -45) {
          // Swipe up
          triggerHaptic('light')
          handlers.onSwipeUp?.()
          setGestureState(prev => ({ ...prev, currentGesture: 'swipeup' }))
        }
      }

      // Reset gesture state after a delay
      setTimeout(() => {
        setGestureState({ isGesturing: false, currentGesture: null })
      }, 100)
    }

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [handlers, opts])

  return {
    ref,
    gestureState,
    triggerHaptic,
  }
}