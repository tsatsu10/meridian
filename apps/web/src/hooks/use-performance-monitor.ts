import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// @epic-3.2-time: Mike needs performance insights to optimize workflows
// @role-member @role-senior: Members and Senior users need performance tracking for efficient work

interface PerformanceMetrics {
  // React Query metrics
  queryCount: number;
  cacheHitRate: number;
  avgQueryTime: number;
  
  // Page performance
  loadTime: number;
  renderTime: number;
  
  // Memory usage
  memoryUsage?: number;
  
  // User interactions
  clickLatency: number;
  interactionCount: number;
}

interface PerformanceConfig {
  enableQueryTracking?: boolean;
  enableInteractionTracking?: boolean;
  enableMemoryTracking?: boolean;
  sampleRate?: number; // 0-1, percentage of events to track
}

export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const {
    enableQueryTracking = true,
    enableInteractionTracking = false, // Disabled to reduce memory usage
    enableMemoryTracking = true, // Enable by default to monitor high memory usage
    sampleRate = 0.01 // Reduced to 1% to save memory (was 5%)
  } = config;

  const queryClient = useQueryClient();
  const metricsRef = useRef<PerformanceMetrics>({
    queryCount: 0,
    cacheHitRate: 0,
    avgQueryTime: 0,
    loadTime: 0,
    renderTime: 0,
    clickLatency: 0,
    interactionCount: 0,
  });

  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>(metricsRef.current);
  const startTimeRef = useRef<number>(performance.now());
  
  // Reduce memory usage by limiting array sizes
  const queryTimesRef = useRef<number[]>([]);
  const interactionTimesRef = useRef<number[]>([]);
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMemoryCleanupRef = useRef<number>(Date.now());
  const lastMemoryWarning = useRef<number>(0);

  // Memory cleanup function to prevent leaks
  const performMemoryCleanup = useCallback(() => {
    // Limit array sizes more aggressively to prevent memory buildup
    if (queryTimesRef.current.length > 10) {
      queryTimesRef.current = queryTimesRef.current.slice(-5); // Keep only last 5
    }
    if (interactionTimesRef.current.length > 10) {
      interactionTimesRef.current = interactionTimesRef.current.slice(-5); // Keep only last 5
    }

    // Clear React Query cache if memory is high
    const cache = queryClient.getQueryCache();
    const allQueries = cache.getAll();
    
    // More aggressive cache cleanup - remove queries older than 2 minutes
    if (allQueries.length > 30) { // Reduced from 50
      const now = Date.now();
      const staleQueries = allQueries.filter(query => {
        const dataUpdatedAt = query.state.dataUpdatedAt || 0;
        const age = now - dataUpdatedAt;
        return age > 120000 && !(query as any).isFetching; // 2 minutes
      });
      
      staleQueries.forEach(query => {
        cache.remove(query);
      });
      
      console.log(`🧹 Cleaned up ${staleQueries.length} stale queries`);
    }

    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch (e) {
        // Ignore errors - gc might not be available
      }
    }

    lastMemoryCleanupRef.current = Date.now();
  }, [queryClient]);

  // Track page load performance
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    metricsRef.current.loadTime = loadTime;
    setCurrentMetrics(prev => ({ ...prev, loadTime }));
  }, []);

  // Track React Query performance with memory optimization
  useEffect(() => {
    if (!enableQueryTracking) return;

    const queryCache = queryClient.getQueryCache();
    let queryStartTimes = new Map<string, number>();

    const handleQueryStart = (query: any) => {
      const queryKey = JSON.stringify(query.queryKey);
      queryStartTimes.set(queryKey, performance.now());
      
      // Prevent map from growing too large
      if (queryStartTimes.size > 100) {
        const firstKey = queryStartTimes.keys().next().value;
        if (firstKey !== undefined) {
          queryStartTimes.delete(firstKey);
        }
      }
    };

    const handleQuerySuccess = (query: any) => {
      const queryKey = JSON.stringify(query.queryKey);
      const startTime = queryStartTimes.get(queryKey);
      
      if (startTime && Math.random() < sampleRate) {
        const queryTime = performance.now() - startTime;
        queryTimesRef.current.push(queryTime);
        
        // Keep only last 10 query times (reduced from 20)
        if (queryTimesRef.current.length > 10) {
          queryTimesRef.current = queryTimesRef.current.slice(-5);
        }
        
        metricsRef.current.queryCount++;
        metricsRef.current.avgQueryTime = queryTimesRef.current.reduce((a, b) => a + b, 0) / queryTimesRef.current.length;
        
        setCurrentMetrics(prev => ({
          ...prev,
          queryCount: metricsRef.current.queryCount,
          avgQueryTime: metricsRef.current.avgQueryTime,
        }));
      }
      
      queryStartTimes.delete(queryKey);
    };

    const unsubscribe = queryCache.subscribe((event: any) => {
      if (event.type === 'started') {
        handleQueryStart(event.query);
      } else if (event.type === 'success') {
        handleQuerySuccess(event.query);
      }
    });

    return () => {
      unsubscribe();
      queryStartTimes.clear();
    };
  }, [queryClient, enableQueryTracking, sampleRate]);

  // Track user interaction latency with memory optimization
  const trackInteraction = useCallback((type: 'click' | 'input' | 'scroll') => {
    if (!enableInteractionTracking || Math.random() >= sampleRate) return;

    const startTime = performance.now();
    
    const measureLatency = () => {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      interactionTimesRef.current.push(latency);
      
      // Keep only last 20 interaction times (reduced from 50)
      if (interactionTimesRef.current.length > 20) {
        interactionTimesRef.current = interactionTimesRef.current.slice(-10);
      }
      
      metricsRef.current.interactionCount++;
      metricsRef.current.clickLatency = interactionTimesRef.current.reduce((a, b) => a + b, 0) / interactionTimesRef.current.length;
      
      setCurrentMetrics(prev => ({
        ...prev,
        interactionCount: metricsRef.current.interactionCount,
        clickLatency: metricsRef.current.clickLatency,
      }));
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(measureLatency);
    } else {
      setTimeout(measureLatency, 0);
    }
  }, [enableInteractionTracking, sampleRate]);

  // Track memory usage with aggressive monitoring and cleanup
  useEffect(() => {
    if (!enableMemoryTracking || !('memory' in performance)) return;

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        metricsRef.current.memoryUsage = memoryUsage;
        setCurrentMetrics(prev => ({ ...prev, memoryUsage }));

        // Only log high memory usage (don't trigger cleanup - handled by MemoryCleanupProvider)
        if (memoryUsage > 0.95) {
          const timeSinceLastLog = Date.now() - lastMemoryCleanupRef.current;
          if (timeSinceLastLog > 60000) { // Log at most once per minute
            console.warn('🧠 Critical memory usage detected:', Math.round(memoryUsage * 100) + '%');
            lastMemoryCleanupRef.current = Date.now();
          }
        }
      }
    };

    updateMemoryUsage();
    // Check memory less frequently to reduce overhead
    memoryCheckIntervalRef.current = setInterval(updateMemoryUsage, 10000); // Check every 10 seconds (reduced from 3s)

    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
    };
  }, [enableMemoryTracking, performMemoryCleanup]);

  // Calculate cache hit rate with cleanup
  useEffect(() => {
    if (!enableQueryTracking) return;

    const updateCacheHitRate = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      if (queries.length === 0) return;
      
      const cachedQueries = queries.filter(query => 
        query.state.data !== undefined && 
        query.state.dataUpdatedAt > 0
      );
      
      const hitRate = cachedQueries.length / queries.length;
      metricsRef.current.cacheHitRate = hitRate;
      setCurrentMetrics(prev => ({ ...prev, cacheHitRate: hitRate }));
    };

    updateCacheHitRate();
    const interval = setInterval(updateCacheHitRate, 15000); // Reduce frequency to 15 seconds

    return () => clearInterval(interval);
  }, [queryClient, enableQueryTracking]);

  // Export performance data (for debugging or analytics)
  const exportMetrics = useCallback(() => {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      ...currentMetrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      
      // Browser performance API data
      domContentLoaded: navigationTiming?.domContentLoadedEventEnd - navigationTiming?.domContentLoadedEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      
      // React Query cache info
      queryCount: queryClient.getQueryCache().getAll().length,
      
      // Runtime info
      isOnline: navigator.onLine,
      connection: (navigator as any).connection?.effectiveType,
      
      // Memory info
      memoryInfo: ('memory' in performance) ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : undefined,
    };
  }, [currentMetrics, queryClient]);

  // Log performance warnings with actions
  useEffect(() => {
    if (currentMetrics.avgQueryTime > 1000) {
      console.warn('🐌 Slow query performance detected:', currentMetrics.avgQueryTime + 'ms average');
    }
    
    if (currentMetrics.clickLatency > 100) {
      console.warn('🐌 High interaction latency detected:', currentMetrics.clickLatency + 'ms average');
    }
    
    // More aggressive memory management
    if (currentMetrics.memoryUsage && currentMetrics.memoryUsage > 0.90) { // Reduced from 0.95 to 0.90
      // Only log and cleanup once per minute for critical memory
      const now = Date.now();
      if (!lastMemoryWarning.current || now - lastMemoryWarning.current > 60000) { // Reduced from 120s to 60s
        console.error('🧠 High memory usage detected:', Math.round(currentMetrics.memoryUsage * 100) + '%');
        lastMemoryWarning.current = now;
        // Trigger immediate cleanup for high memory usage
        performMemoryCleanup();
      }
    }
    
    // Periodic automatic cleanup every 30 seconds regardless of memory usage
    const now = Date.now();
    if (now - lastMemoryCleanupRef.current > 30000) { // 30 seconds
      performMemoryCleanup();
    }
  }, [currentMetrics, performMemoryCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
      // Clear arrays to free memory
      queryTimesRef.current = [];
      interactionTimesRef.current = [];
    };
  }, []);

  return {
    metrics: currentMetrics,
    trackInteraction,
    exportMetrics,
    performMemoryCleanup, // Expose for manual cleanup
    
    // Convenience methods
    isPerformanceGood: currentMetrics.avgQueryTime < 500 && currentMetrics.clickLatency < 50,
    getPerformanceGrade: () => {
      const score = (
        (currentMetrics.avgQueryTime < 500 ? 25 : 0) +
        (currentMetrics.clickLatency < 50 ? 25 : 0) +
        (currentMetrics.cacheHitRate > 0.8 ? 25 : 0) +
        (currentMetrics.loadTime < 2000 ? 25 : 0)
      );
      
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    },
    
    // Memory status
    getMemoryStatus: () => {
      if (!currentMetrics.memoryUsage) return 'unknown';
      if (currentMetrics.memoryUsage > 0.9) return 'critical';
      if (currentMetrics.memoryUsage > 0.8) return 'high';
      if (currentMetrics.memoryUsage > 0.6) return 'medium';
      return 'normal';
    }
  };
}

export default usePerformanceMonitor; 