import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Optimized localStorage hook with debouncing to prevent excessive re-renders
 * @epic-2.4-performance: Prevents localStorage writes on every state change
 */

interface DebouncedStorageOptions {
  delay?: number; // Debounce delay in milliseconds
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
  defaultValue?: any;
}

export function useDebouncedLocalStorage<T>(
  key: string,
  options: DebouncedStorageOptions = {}
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const {
    delay = 500,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    defaultValue
  } = options;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const valueRef = useRef(storedValue);

  // Update ref when value changes
  useEffect(() => {
    valueRef.current = storedValue;
  }, [storedValue]);

  // Debounced save function
  const debouncedSave = useCallback((value: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);

    timeoutRef.current = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          if (value === undefined || value === null) {
            window.localStorage.removeItem(key);
          } else {
            window.localStorage.setItem(key, serialize(value));
          }
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      } finally {
        setIsLoading(false);
      }
    }, delay);
  }, [key, delay, serialize]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(valueRef.current) : value;
      
      // Save it to state immediately (for UI responsiveness)
      setStoredValue(valueToStore);
      
      // Debounce the localStorage write
      debouncedSave(valueToStore);
    } catch (error) {
      console.warn(`Error setting value for localStorage key "${key}":`, error);
    }
  }, [key, debouncedSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [storedValue, setValue, isLoading];
}

/**
 * Hook for managing multiple localStorage values with batched writes
 * Prevents multiple localStorage operations when updating related settings
 */
export function useBatchedLocalStorage<T extends Record<string, any>>(
  keyPrefix: string,
  initialValues: T,
  options: { delay?: number } = {}
): [T, (updates: Partial<T>) => void, boolean] {
  const { delay = 500 } = options;
  
  const [values, setValues] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValues;
    }

    const loadedValues = { ...initialValues };
    
    Object.keys(initialValues).forEach(key => {
      try {
        const stored = localStorage.getItem(`${keyPrefix}-${key}`);
        if (stored !== null) {
          loadedValues[key as keyof T] = JSON.parse(stored);
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${keyPrefix}-${key}":`, error);
      }
    });

    return loadedValues;
  });

  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdatesRef = useRef<Partial<T>>({});

  const batchedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);

    timeoutRef.current = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          Object.entries(pendingUpdatesRef.current).forEach(([key, value]) => {
            try {
              if (value === undefined || value === null) {
                localStorage.removeItem(`${keyPrefix}-${key}`);
              } else {
                localStorage.setItem(`${keyPrefix}-${key}`, JSON.stringify(value));
              }
            } catch (error) {
              console.warn(`Error setting localStorage key "${keyPrefix}-${key}":`, error);
            }
          });
        }
        pendingUpdatesRef.current = {};
      } finally {
        setIsLoading(false);
      }
    }, delay);
  }, [keyPrefix, delay]);

  const updateValues = useCallback((updates: Partial<T>) => {
    // Update state immediately
    setValues(prev => ({ ...prev, ...updates }));
    
    // Add to pending updates
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    
    // Trigger batched save
    batchedSave();
  }, [batchedSave]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [values, updateValues, isLoading];
}

/**
 * Hook for localStorage with React Query-like caching
 * Reduces unnecessary re-renders by using stale-while-revalidate pattern
 */
export function useCachedLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: { staleTime?: number; cacheTime?: number } = {}
): [T, (value: T) => void, { isStale: boolean; lastUpdated: Date | null }] {
  const { staleTime = 5 * 60 * 1000, cacheTime = 10 * 60 * 1000 } = options; // 5min stale, 10min cache
  
  const [data, setData] = useState<T>(defaultValue);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const lastReadRef = useRef<Date>(new Date());

  const isStale = lastUpdated 
    ? Date.now() - lastUpdated.getTime() > staleTime
    : true;

  // Load initial value
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData(parsed);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.warn(`Error reading cached localStorage key "${key}":`, error);
    }
  }, [key]);

  // Set value with immediate update + background sync
  const setValue = useCallback((value: T) => {
    // Update immediately for UI responsiveness
    setData(value);
    setLastUpdated(new Date());
    lastReadRef.current = new Date();

    // Background localStorage write
    setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error writing cached localStorage key "${key}":`, error);
      }
    }, 0);
  }, [key]);

  // Cleanup stale cache entries
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (lastUpdated && Date.now() - lastUpdated.getTime() > cacheTime) {
        try {
          localStorage.removeItem(key);
          setLastUpdated(null);
        } catch (error) {
          console.warn(`Error cleaning up localStorage key "${key}":`, error);
        }
      }
    }, cacheTime);

    return () => clearInterval(cleanupInterval);
  }, [key, cacheTime, lastUpdated]);

  return [data, setValue, { isStale, lastUpdated }];
}