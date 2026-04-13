import { useEffect, useRef, useState } from 'react';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  componentMountTime?: number;
  dataLoadTime?: number;
  renderTime?: number;
  
  // Resource timing
  jsLoadTime?: number;
  cssLoadTime?: number;
  imageLoadTime?: number;
}

export interface PerformanceObserverOptions {
  enableCoreWebVitals?: boolean;
  enableCustomMetrics?: boolean;
  enableResourceTiming?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitoring(options: PerformanceObserverOptions = {}) {
  const {
    enableCoreWebVitals = true,
    enableCustomMetrics = true,
    enableResourceTiming = true,
    onMetricsUpdate,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const observerRef = useRef<PerformanceObserver | null>(null);
  const componentMountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    const updateMetrics = (newMetrics: Partial<PerformanceMetrics>) => {
      setMetrics(prev => {
        const updated = { ...prev, ...newMetrics };
        onMetricsUpdate?.(updated);
        return updated;
      });
    };

    // Core Web Vitals monitoring
    if (enableCoreWebVitals) {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          updateMetrics({ lcp: lastEntry.startTime });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            updateMetrics({ fid: entry.processingStart - entry.startTime });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          updateMetrics({ cls: clsValue });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // First Contentful Paint
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              updateMetrics({ fcp: entry.startTime });
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('FCP observer not supported');
      }
    }

    // Resource timing monitoring
    if (enableResourceTiming) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            const loadTime = entry.responseEnd - entry.requestStart;
            
            if (entry.name.endsWith('.js')) {
              updateMetrics({ jsLoadTime: loadTime });
            } else if (entry.name.endsWith('.css')) {
              updateMetrics({ cssLoadTime: loadTime });
            } else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
              updateMetrics({ imageLoadTime: loadTime });
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource observer not supported');
      }
    }

    // Custom metrics
    if (enableCustomMetrics) {
      // Component mount time
      const mountTime = Date.now() - componentMountTimeRef.current;
      updateMetrics({ componentMountTime: mountTime });

      // Navigation timing
      if (performance.navigation) {
        const navTiming = performance.getEntriesByType('navigation')[0] as any;
        if (navTiming) {
          updateMetrics({
            ttfb: navTiming.responseStart - navTiming.requestStart,
          });
        }
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enableCoreWebVitals, enableCustomMetrics, enableResourceTiming, onMetricsUpdate]);

  // Function to manually record custom metrics
  const recordMetric = (name: keyof PerformanceMetrics, value: number) => {
    setMetrics(prev => {
      const updated = { ...prev, [name]: value };
      onMetricsUpdate?.(updated);
      return updated;
    });
  };

  // Function to measure async operation performance
  const measureAsync = async <T>(
    operation: () => Promise<T>,
    metricName: keyof PerformanceMetrics
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await operation();
      const endTime = performance.now();
      recordMetric(metricName, endTime - startTime);
      return result;
    } catch (error) {
      const endTime = performance.now();
      recordMetric(metricName, endTime - startTime);
      throw error;
    }
  };

  // Function to measure render performance
  const measureRender = (renderFn: () => void, metricName: keyof PerformanceMetrics = 'renderTime') => {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    recordMetric(metricName, endTime - startTime);
  };

  // Function to get performance score
  const getPerformanceScore = (): number => {
    let score = 100;
    
    // LCP scoring (0-100)
    if (metrics.lcp) {
      if (metrics.lcp > 4000) score -= 30;
      else if (metrics.lcp > 2500) score -= 20;
      else if (metrics.lcp > 1500) score -= 10;
    }
    
    // FID scoring (0-100)
    if (metrics.fid) {
      if (metrics.fid > 300) score -= 30;
      else if (metrics.fid > 100) score -= 20;
      else if (metrics.fid > 50) score -= 10;
    }
    
    // CLS scoring (0-100)
    if (metrics.cls) {
      if (metrics.cls > 0.25) score -= 30;
      else if (metrics.cls > 0.1) score -= 20;
      else if (metrics.cls > 0.05) score -= 10;
    }
    
    return Math.max(0, score);
  };

  // Function to send metrics to analytics
  const sendMetricsToAnalytics = async (customData?: Record<string, any>) => {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics,
          score: getPerformanceScore(),
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...customData,
        }),
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  };

  return {
    metrics,
    recordMetric,
    measureAsync,
    measureRender,
    getPerformanceScore,
    sendMetricsToAnalytics,
  };
}

// Hook for measuring component performance
export function useComponentPerformance(componentName: string) {
  const { recordMetric, measureRender } = usePerformanceMonitoring({
    enableCoreWebVitals: false,
    enableResourceTiming: false,
  });

  const measureComponentRender = (renderFn: () => void) => {
    measureRender(renderFn, `${componentName}RenderTime` as keyof PerformanceMetrics);
  };

  const measureComponentMount = () => {
    const mountTime = performance.now();
    recordMetric(`${componentName}MountTime` as keyof PerformanceMetrics, mountTime);
  };

  useEffect(() => {
    measureComponentMount();
  }, []);

  return {
    measureComponentRender,
    measureComponentMount,
  };
}

// Hook for measuring API call performance
export function useApiPerformance() {
  const { measureAsync, recordMetric } = usePerformanceMonitoring({
    enableCoreWebVitals: false,
    enableResourceTiming: false,
  });

  const measureApiCall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    return measureAsync(apiCall, `${endpoint}LoadTime` as keyof PerformanceMetrics);
  };

  const recordApiError = (endpoint: string, error: Error) => {
    recordMetric(`${endpoint}ErrorCount` as keyof PerformanceMetrics, 1);
  };

  return {
    measureApiCall,
    recordApiError,
  };
}
