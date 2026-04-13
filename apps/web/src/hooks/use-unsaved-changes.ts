import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';

/**
 * Hook to warn users about unsaved changes when navigating away
 * @param hasUnsavedChanges - Boolean indicating if there are unsaved changes
 * @param message - Custom warning message (optional)
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  message = 'You have unsaved changes. Are you sure you want to leave?'
) {
  const router = useRouter();
  const isBlocking = useRef(false);

  // Warn on browser/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers ignore custom messages and show their own
        e.returnValue = message;
        return message;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  // Warn on route navigation (TanStack Router specific)
  useEffect(() => {
    if (!hasUnsavedChanges || isBlocking.current) return;

    const handleRouteChange = () => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(message);
        return confirmLeave;
      }
      return true;
    };

    // For TanStack Router, we can use history API
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      if (hasUnsavedChanges && !window.confirm(message)) {
        return;
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function(...args) {
      if (hasUnsavedChanges && !window.confirm(message)) {
        return;
      }
      return originalReplaceState.apply(this, args);
    };

    isBlocking.current = true;

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      isBlocking.current = false;
    };
  }, [hasUnsavedChanges, message]);
}

/**
 * Hook to track form changes and detect unsaved state
 * @param initialValues - Initial form values
 * @param currentValues - Current form values
 * @returns Boolean indicating if there are unsaved changes
 */
export function useFormChanges<T extends Record<string, any>>(
  initialValues: T,
  currentValues: T
): boolean {
  return JSON.stringify(initialValues) !== JSON.stringify(currentValues);
}

export default useUnsavedChanges;
