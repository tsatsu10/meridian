import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import type { RootState, AppDispatch } from '../index';

// Basic typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Enhanced hooks with additional functionality
export function useTypedDispatch() {
  const dispatch = useDispatch<AppDispatch>();
  
  // Enhanced dispatch with error handling and loading states
  const enhancedDispatch = useCallback(async (action: any) => {
    try {
      const result = await dispatch(action);
      return result;
    } catch (error) {
      console.error('Action dispatch failed:', error);
      throw error;
    }
  }, [dispatch]);

  return enhancedDispatch;
}

// Selector hook with equality check optimization
export function useTypedSelector<TSelected>(
  selector: (state: RootState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
): TSelected {
  return useSelector(selector, equalityFn);
}

// Memoized selector hook
export function useMemoizedSelector<TSelected, TDeps extends readonly any[]>(
  selector: (state: RootState, ...deps: TDeps) => TSelected,
  deps: TDeps,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
): TSelected {
  const memoizedSelector = useMemo(
    () => (state: RootState) => selector(state, ...deps),
    deps
  );

  return useSelector(memoizedSelector, equalityFn);
}

// Shallow equality selector hook
export function useShallowSelector<TSelected>(
  selector: (state: RootState) => TSelected
): TSelected {
  return useSelector(selector, shallowEqual);
}

// Deep equality selector hook  
export function useDeepSelector<TSelected>(
  selector: (state: RootState) => TSelected
): TSelected {
  return useSelector(selector, deepEqual);
}

// Batched actions hook
export function useBatchedDispatch() {
  const dispatch = useAppDispatch();
  const batchRef = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchDispatch = useCallback((action: any) => {
    batchRef.current.push(action);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (batchRef.current.length > 0) {
        // Dispatch all batched actions
        batchRef.current.forEach(batchedAction => {
          dispatch(batchedAction);
        });
        batchRef.current = [];
      }
    }, 0);
  }, [dispatch]);

  return batchDispatch;
}

// Async action hook with loading and error states
export function useAsyncAction<T = any>() {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (action: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dispatch(action);
      setData(result.payload || result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, loading, error, data, reset };
}

// Optimistic updates hook
export function useOptimisticUpdate<T>() {
  const dispatch = useAppDispatch();

  const optimisticUpdate = useCallback(async (
    optimisticAction: any,
    asyncAction: any,
    rollbackAction?: any
  ) => {
    // Apply optimistic update immediately
    dispatch(optimisticAction);

    try {
      // Execute the async action
      const result = await dispatch(asyncAction);
      return result;
    } catch (error) {
      // Rollback on failure
      if (rollbackAction) {
        dispatch(rollbackAction);
      }
      throw error;
    }
  }, [dispatch]);

  return optimisticUpdate;
}

// Debounced dispatch hook
export function useDebouncedDispatch(delay: number = 300) {
  const dispatch = useAppDispatch();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedDispatch = useCallback((action: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      dispatch(action);
    }, delay);
  }, [dispatch, delay]);

  const cancelDispatch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { debouncedDispatch, cancelDispatch };
}

// Throttled dispatch hook
export function useThrottledDispatch(delay: number = 100) {
  const dispatch = useAppDispatch();
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledDispatch = useCallback((action: any) => {
    const now = Date.now();

    if (now - lastExecuted.current >= delay) {
      dispatch(action);
      lastExecuted.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        dispatch(action);
        lastExecuted.current = Date.now();
      }, delay - (now - lastExecuted.current));
    }
  }, [dispatch, delay]);

  return throttledDispatch;
}

// Conditional dispatch hook
export function useConditionalDispatch<T>(
  condition: (state: RootState) => boolean
) {
  const dispatch = useAppDispatch();
  const state = useAppSelector(state => state);

  const conditionalDispatch = useCallback((action: any) => {
    if (condition(state)) {
      dispatch(action);
    }
  }, [dispatch, state, condition]);

  return conditionalDispatch;
}

// State subscription hook with cleanup
export function useStateSubscription<T>(
  selector: (state: RootState) => T,
  callback: (value: T, previousValue: T | undefined) => void,
  equalityFn?: (left: T, right: T) => boolean
) {
  const previousValue = useRef<T | undefined>(undefined);
  const value = useSelector(selector, equalityFn);

  useEffect(() => {
    if (previousValue.current !== undefined && 
        (!equalityFn || !equalityFn(value, previousValue.current))) {
      callback(value, previousValue.current);
    }
    previousValue.current = value;
  }, [value, callback, equalityFn]);

  return value;
}

// Store hydration hook
export function useStoreHydration() {
  const dispatch = useAppDispatch();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        // Check if store needs to be hydrated from persistence
        const persistedState = localStorage.getItem('meridian_persisted_state');
        if (persistedState) {
          const parsed = JSON.parse(persistedState);
          // Dispatch hydration action
          dispatch({ type: 'HYDRATE_STORE', payload: parsed });
        }
        setIsHydrated(true);
      } catch (error) {
        console.error('Store hydration failed:', error);
        setIsHydrated(true); // Continue even if hydration fails
      }
    };

    hydrate();
  }, [dispatch]);

  return isHydrated;
}

// Performance monitoring hook
export function useActionPerformance() {
  const dispatch = useAppDispatch();
  const performanceData = useRef<Map<string, number[]>>(new Map());

  const monitoredDispatch = useCallback(async (action: any) => {
    const start = performance.now();
    
    try {
      const result = await dispatch(action);
      const duration = performance.now() - start;
      
      // Store performance data
      const actionType = action.type;
      const existing = performanceData.current.get(actionType) || [];
      existing.push(duration);
      
      // Keep only last 10 measurements
      if (existing.length > 10) {
        existing.shift();
      }
      
      performanceData.current.set(actionType, existing);
      
      // Log slow actions in development
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.warn(`Slow action detected: ${actionType} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Action ${action.type} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }, [dispatch]);

  const getPerformanceStats = useCallback((actionType: string) => {
    const measurements = performanceData.current.get(actionType);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }, []);

  return { monitoredDispatch, getPerformanceStats };
}

// Utility functions
function shallowEqual<T>(left: T, right: T): boolean {
  if (left === right) return true;
  
  if (typeof left !== 'object' || typeof right !== 'object' || 
      left === null || right === null) {
    return false;
  }

  const leftKeys = Object.keys(left as any);
  const rightKeys = Object.keys(right as any);

  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of leftKeys) {
    if (!rightKeys.includes(key) || (left as any)[key] !== (right as any)[key]) {
      return false;
    }
  }

  return true;
}

function deepEqual<T>(left: T, right: T): boolean {
  if (left === right) return true;
  
  if (typeof left !== 'object' || typeof right !== 'object' || 
      left === null || right === null) {
    return false;
  }

  const leftKeys = Object.keys(left as any);
  const rightKeys = Object.keys(right as any);

  if (leftKeys.length !== rightKeys.length) return false;

  for (const key of leftKeys) {
    if (!rightKeys.includes(key)) return false;
    
    const leftValue = (left as any)[key];
    const rightValue = (right as any)[key];
    
    if (!deepEqual(leftValue, rightValue)) return false;
  }

  return true;
}

// Import useState for useAsyncAction
import { useState } from 'react';

// Export all hook modules
export * from './useAuth';
export * from './useWorkspace';
export * from './useProject';
export * from './useTask';
export * from './useTeam';
export * from './useCommunication';
export * from './useUI';