/**
 * Performance Optimization Utilities
 * Provides utilities to fix common performance issues and memory leaks
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to safely manage intervals with automatic cleanup
 */
export function useSafeInterval(callback: () => void, delay: number | null) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      intervalRef.current = setInterval(tick, delay);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [delay]);

  // Manual control functions
  const start = useCallback(() => {
    if (delay !== null && !intervalRef.current) {
      intervalRef.current = setInterval(() => savedCallback.current(), delay);
    }
  }, [delay]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { start, stop };
}

/**
 * Custom hook to safely manage timeouts with automatic cleanup
 */
export function useSafeTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const set = useCallback((callback: () => void, delay: number) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
      timeoutRef.current = null;
    }, delay);
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { set, clear };
}

/**
 * Custom hook to safely manage event listeners with automatic cleanup
 */
export function useSafeEventListener<T extends keyof WindowEventMap>(
  eventName: T,
  handler: (event: WindowEventMap[T]) => void,
  element: Window | Element = window
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (event: WindowEventMap[T]) => savedHandler.current(event);

    element.addEventListener(eventName, eventListener as EventListener);

    return () => {
      element.removeEventListener(eventName, eventListener as EventListener);
    };
  }, [eventName, element]);
}

/**
 * Custom hook to safely manage WebSocket connections
 */
export function useSafeWebSocket(url: string, options?: {
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    attemptCountRef.current = 0;
  }, []);

  const connect = useCallback(() => {
    cleanup();

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        attemptCountRef.current = 0;
        options?.onOpen?.();
      };

      wsRef.current.onmessage = (event) => {
        options?.onMessage?.(event);
      };

      wsRef.current.onclose = () => {
        options?.onClose?.();

        // Auto-reconnect logic
        const maxAttempts = options?.reconnectAttempts ?? 5;
        const delay = options?.reconnectDelay ?? 1000;

        if (attemptCountRef.current < maxAttempts) {
          attemptCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay * Math.pow(2, attemptCountRef.current - 1)); // Exponential backoff
        }
      };

      wsRef.current.onerror = (event) => {
        options?.onError?.(event);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      options?.onError?.(error as Event);
    }
  }, [url, options, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    send,
    disconnect,
    reconnect: connect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static metrics: Map<string, number> = new Map();
  private static observers: PerformanceObserver[] = [];

  static startTiming(label: string) {
    this.metrics.set(label, performance.now());
  }

  static endTiming(label: string): number {
    const start = this.metrics.get(label);
    if (start === undefined) {
      console.warn(`Performance timing '${label}' was not started`);
      return 0;
    }

    const duration = performance.now() - start;
    this.metrics.delete(label);

    if (process.env.NODE_ENV === 'development') {}

    return duration;
  }

  static measureComponent(Component: React.ComponentType<any>, displayName?: string) {
    return React.memo(React.forwardRef((props: any, ref: any) => {
      const label = displayName || Component.displayName || Component.name || 'Component';

      React.useLayoutEffect(() => {
        PerformanceMonitor.startTiming(`${label}-render`);
      });

      React.useEffect(() => {
        PerformanceMonitor.endTiming(`${label}-render`);
      });

      return React.createElement(Component, { ...props, ref });
    }));
  }

  static init() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Observe paint events
      try {
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (process.env.NODE_ENV === 'development') {}
          });
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (e) {
        console.warn('Paint observer not supported');
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (process.env.NODE_ENV === 'development') {}
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }
    }
  }

  static cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

/**
 * Bundle size optimization utilities
 */
export const BundleOptimizer = {
  // Lazy load heavy components
  lazyLoad: <T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ) => {
    return React.lazy(async () => {
      const start = performance.now();
      const module = await importFunc();
      const end = performance.now();

      if (process.env.NODE_ENV === 'development') {}

      return module;
    });
  },

  // Preload critical resources
  preloadResource: (href: string, as: string = 'script') => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      document.head.appendChild(link);
    }
  },

  // Check if component should render (viewport optimization)
  useIntersectionObserver: (
    ref: React.RefObject<Element>,
    options: IntersectionObserverInit = {}
  ) => {
    const [isIntersecting, setIsIntersecting] = React.useState(false);

    React.useEffect(() => {
      if (!ref.current) return;

      const observer = new IntersectionObserver(([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      }, options);

      observer.observe(ref.current);

      return () => observer.disconnect();
    }, [ref, options]);

    return isIntersecting;
  }
};

// Export performance initialization
export function initializePerformanceMonitoring() {
  if (process.env.NODE_ENV === 'development') {
    PerformanceMonitor.init();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      PerformanceMonitor.cleanup();
    });
  }
}