/**
 * React Performance Optimization Utilities
 * Collection of optimized patterns for high-performance React components
 */

import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';

// Optimized memo with deep comparison for complex props
export const deepMemo = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  areEqual?: (prevProps: T, nextProps: T) => boolean
) => {
  const defaultCompare = (prevProps: T, nextProps: T): boolean => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);

    if (prevKeys.length !== nextKeys.length) return false;

    return prevKeys.every(key => {
      const prevVal = prevProps[key];
      const nextVal = nextProps[key];

      // Handle functions
      if (typeof prevVal === 'function' && typeof nextVal === 'function') {
        return prevVal.toString() === nextVal.toString();
      }

      // Handle arrays
      if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
        return prevVal.length === nextVal.length &&
               prevVal.every((item, index) => item === nextVal[index]);
      }

      // Handle objects
      if (typeof prevVal === 'object' && typeof nextVal === 'object' && prevVal !== null && nextVal !== null) {
        return JSON.stringify(prevVal) === JSON.stringify(nextVal);
      }

      return prevVal === nextVal;
    });
  };

  return memo(Component, areEqual || defaultCompare);
};

// Optimized list renderer for large datasets
export const VirtualizedList = memo<{
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  overscan?: number;
}>(({ items, itemHeight, containerHeight, renderItem, overscan = 5 }) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${visibleRange.startIndex * itemHeight}px)`,
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, visibleRange.startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
});

// Optimized component for handling frequent re-renders
export const StableComponent = <T extends Record<string, any>>(
  Component: React.ComponentType<T>
) => {
  return memo((props: T) => {
    const stableProps = useRef(props);
    const hasChanged = useRef(false);

    // Only update stable props if they actually changed
    const propsChanged = useMemo(() => {
      const changed = Object.keys(props).some(key => props[key] !== stableProps.current[key]);
      if (changed) {
        stableProps.current = props;
        hasChanged.current = true;
      }
      return changed;
    }, [props]);

    return <Component {...stableProps.current} />;
  });
};

// Optimized event handler wrapper
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = []
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, deps) as T;
};

// Debounced state hook
export const useDebouncedState = <T>(
  initialValue: T,
  delay: number = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = React.useState(initialValue);
  const [debouncedValue, setDebouncedValue] = React.useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return [value, debouncedValue, setValue];
};

// Optimized selector hook for complex state objects
export const useOptimizedSelector = <T, R>(
  state: T,
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) => {
  const selectedValueRef = useRef<R>();

  return useMemo(() => {
    const newValue = selector(state);

    if (equalityFn) {
      if (!selectedValueRef.current || !equalityFn(selectedValueRef.current, newValue)) {
        selectedValueRef.current = newValue;
      }
    } else {
      if (selectedValueRef.current !== newValue) {
        selectedValueRef.current = newValue;
      }
    }

    return selectedValueRef.current!;
  }, [state, selector, equalityFn]);
};

// Intersection observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { ref: elementRef, isIntersecting, entry };
};

// Optimized context provider wrapper
export const createOptimizedContext = <T,>(defaultValue: T) => {
  const Context = React.createContext<T>(defaultValue);

  const Provider: React.FC<{ value: T; children: React.ReactNode }> = ({ value, children }) => {
    const memoizedValue = useMemo(() => value, [JSON.stringify(value)]);

    return (
      <Context.Provider value={memoizedValue}>
        {children}
      </Context.Provider>
    );
  };

  const useContext = () => {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error('useContext must be used within Provider');
    }
    return context;
  };

  return { Provider: memo(Provider), useContext };
};

// Performance monitoring HOC
export const withPerformanceMonitoring = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName?: string
) => {
  const MonitoredComponent = (props: T) => {
    const renderCountRef = useRef(0);
    const name = componentName || Component.displayName || Component.name || 'Component';

    useEffect(() => {
      renderCountRef.current += 1;

      if (process.env.NODE_ENV === 'development') {}
    });

    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        const start = performance.now();

        return () => {
          const end = performance.now();};
      }
    }, [name]);

    return <Component {...props} />;
  };

  MonitoredComponent.displayName = `withPerformanceMonitoring(${name})`;
  return memo(MonitoredComponent);
};

// Batch state updates to prevent multiple re-renders
export const useBatchedState = <T extends Record<string, any>>(
  initialState: T
) => {
  const [state, setState] = React.useState(initialState);
  const batchedUpdatesRef = useRef<Partial<T>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    batchedUpdatesRef.current = { ...batchedUpdatesRef.current, ...updates };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...batchedUpdatesRef.current }));
      batchedUpdatesRef.current = {};
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate] as const;
};

// Export performance utilities
export {
  memo,
  useMemo,
  useCallback,
  React
};