import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from "../lib/logger";

/**
 * Collection of performance-optimized React hooks
 * @epic-2.4-performance: Prevents excessive re-renders and improves UX
 */

/**
 * Native debounce implementation to replace lodash
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

/**
 * Debounced value hook - prevents excessive state updates
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced callback hook - prevents excessive function calls
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback);
  
  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  const debouncedCallback = useMemo(
    () => debounce((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }, delay),
    [delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback as T;
}

/**
 * Throttled callback hook - limits function execution frequency
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback);
  const lastCallRef = useRef<number>(0);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      return callbackRef.current(...args);
    }
  }, [delay]) as T;

  return throttledCallback;
}

/**
 * Optimized state hook with automatic debouncing
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  const updateValue = useDebouncedCallback((value: T) => {
    setDebouncedValue(value);
  }, delay, []);

  const setValue = useCallback((value: T) => {
    setImmediateValue(value);
    updateValue(value);
  }, [updateValue]);

  return [immediateValue, debouncedValue, setValue];
}

/**
 * Hook for managing form state with debounced validation
 */
export function useDebouncedForm<T extends Record<string, any>>(
  initialValues: T,
  validationFn?: (values: T) => Record<string, string>,
  delay: number = 500
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const debouncedValidate = useDebouncedCallback(async (vals: T) => {
    if (!validationFn) return;
    
    setIsValidating(true);
    try {
      const validationErrors = validationFn(vals);
      setErrors(validationErrors);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, delay, [validationFn]);

  const updateField = useCallback((field: keyof T, value: any) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    debouncedValidate(newValues);
  }, [values, debouncedValidate]);

  const updateMultiple = useCallback((updates: Partial<T>) => {
    const newValues = { ...values, ...updates };
    setValues(newValues);
    debouncedValidate(newValues);
  }, [values, debouncedValidate]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsValidating(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isValidating,
    updateField,
    updateMultiple,
    resetForm,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Hook for preventing excessive API calls with request deduplication
 */
export function useRequestDeduplication() {
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());

  const makeRequest = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // If request is already pending, return the existing promise
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key)!;
    }

    // Make new request
    const promise = requestFn().finally(() => {
      // Clean up after request completes
      pendingRequests.current.delete(key);
    });

    pendingRequests.current.set(key, promise);
    return promise;
  }, []);

  const clearPendingRequests = useCallback(() => {
    pendingRequests.current.clear();
  }, []);

  return { makeRequest, clearPendingRequests };
}

/**
 * Hook for batch updates to prevent multiple re-renders
 */
export function useBatchedUpdates<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const batchRef = useRef<Partial<T>>({});
  const timeoutRef = useRef<NodeJS.Timeout>();

  const commitBatch = useCallback(() => {
    if (Object.keys(batchRef.current).length > 0) {
      setState(prevState => ({ ...prevState, ...batchRef.current }));
      batchRef.current = {};
    }
  }, []);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    batchRef.current = { ...batchRef.current, ...updates };
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(commitBatch, 16); // Next frame
  }, [commitBatch]);

  const immediateBatch = useCallback((updates: Partial<T>) => {
    batchRef.current = { ...batchRef.current, ...updates };
    commitBatch();
  }, [commitBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate, immediateBatch] as const;
}

/**
 * Hook for optimized event handlers with automatic cleanup
 */
export function useOptimizedCallbacks<T extends Record<string, (...args: any[]) => any>>(
  callbacks: T,
  deps: React.DependencyList = []
): T {
  const memoizedCallbacks = useMemo(() => {
    const optimized = {} as T;
    
    Object.entries(callbacks).forEach(([key, callback]) => {
      optimized[key as keyof T] = useCallback(callback, deps) as T[keyof T];
    });
    
    return optimized;
  }, deps);

  return memoizedCallbacks;
}

/**
 * Hook for preventing component updates when props haven't meaningfully changed
 */
export function useShallowCompare<T extends Record<string, any>>(obj: T): T {
  const ref = useRef<T>();
  
  if (!ref.current || !shallowEqual(ref.current, obj)) {
    ref.current = obj;
  }
  
  return ref.current;
}

function shallowEqual<T extends Record<string, any>>(objA: T, objB: T): boolean {
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (objA[key] !== objB[key]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Hook for measuring component render performance
 */
export function useRenderProfiler(componentName: string, enabled: boolean = false) {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;
    
    renderCountRef.current++;
    const renderTime = startTimeRef.current ? performance.now() - startTimeRef.current : 0;
    
    logger.info("🎯 ${componentName} - Render #${renderCountRef.current} (${renderTime.toFixed(2)}ms)");
  });

  useEffect(() => {
    if (enabled) {
      startTimeRef.current = performance.now();
    }
  });

  return {
    renderCount: renderCountRef.current,
    logRender: (customMessage?: string) => {
      if (enabled) {
        logger.info("🎯 ${componentName}: ${customMessage || ");
      }
    }
  };
}

/**
 * Hook for lazy loading heavy computations
 */
export function useLazyComputation<T>(
  computeFn: () => T,
  deps: React.DependencyList,
  delay: number = 100
): T | undefined {
  const [result, setResult] = useState<T | undefined>();
  const [isComputing, setIsComputing] = useState(false);

  const debouncedCompute = useDebouncedCallback(() => {
    setIsComputing(true);
    setTimeout(() => {
      try {
        const computed = computeFn();
        setResult(computed);
      } catch (error) {
        console.error('Lazy computation error:', error);
      } finally {
        setIsComputing(false);
      }
    }, 0);
  }, delay, deps);

  useEffect(() => {
    debouncedCompute();
  }, deps);

  return result;
}