import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  isActive: boolean
  initialFocus?: HTMLElement | null
  restoreFocus?: boolean
}

export function useFocusTrap({ isActive, initialFocus, restoreFocus = true }: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ')

      return Array.from(
        container.querySelectorAll(focusableSelectors)
      ) as HTMLElement[]
    }

    // Focus the initial element or first focusable element
    const focusableElements = getFocusableElements()
    const elementToFocus = initialFocus || focusableElements[0]
    if (elementToFocus) {
      elementToFocus.focus()
    }

    // Handle tab navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: focus previous element
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: focus next element
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Allow parent components to handle escape
        container.dispatchEvent(new CustomEvent('focustrap:escape'))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleEscape)

      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, initialFocus, restoreFocus])

  return containerRef
}