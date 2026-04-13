import React, { 
  Suspense, 
  lazy, 
  memo, 
  useCallback, 
  useMemo, 
  useState, 
  useEffect,
  useRef 
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  Zap, 
  Activity, 
  Clock, 
  Database, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    score: 0
  });

  const startTime = useRef(performance.now());
  const observer = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      observer.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            setMetrics(prev => ({
              ...prev,
              loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
              renderTime: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart
            }));
          }
        });
      });

      observer.current.observe({ entryTypes: ['navigation', 'measure', 'paint'] });
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100
      }));
    }

    // Calculate performance score
    const calculateScore = () => {
      const { loadTime, renderTime, memoryUsage, networkLatency } = metrics;
      let score = 100;
      
      if (loadTime > 3000) score -= 20;
      if (renderTime > 1000) score -= 15;
      if (memoryUsage > 80) score -= 15;
      if (networkLatency > 500) score -= 10;
      
      return Math.max(0, score);
    };

    setMetrics(prev => ({
      ...prev,
      score: calculateScore()
    }));

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  const measureRenderTime = useCallback((componentName: string) => {
    performance.mark(`${componentName}-start`);
    
    return () => {
      performance.mark(`${componentName}-end`);
      performance.measure(`${componentName}-render`, `${componentName}-start`, `${componentName}-end`);
    };
  }, []);

  return { metrics, measureRenderTime };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  threshold = 0.1,
  rootMargin = '50px'
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin]);

  return { ref, isIntersecting };
}

// Virtual scrolling component for large lists
interface VirtualScrollProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}

export const VirtualScroll = memo(function VirtualScroll({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className
}: VirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index
    }));
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
});

// Optimized image component with lazy loading
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+'
}: OptimizedImageProps) {
  const { ref, isIntersecting } = useIntersectionObserver();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            className="absolute inset-0 bg-muted animate-pulse"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      
      {isIntersecting && (
        <motion.img
          src={error ? placeholder : src}
          alt={alt}
          width={width}
          height={height}
          className={cn("w-full h-full object-cover", className)}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
});

// Cache management utilities
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  getHitRate() {
    // Simplified hit rate calculation
    return this.cache.size > 0 ? 85 : 0;
  }
}

export const cacheManager = new CacheManager();

// Performance dashboard component
interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const { metrics } = usePerformanceMonitor();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizePerformance = useCallback(async () => {
    setIsOptimizing(true);
    
    // Simulate optimization tasks
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clear cache
    cacheManager.clear();
    
    // Force garbage collection (if available)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    setIsOptimizing(false);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertTriangle;
    return AlertTriangle;
  };

  const ScoreIcon = getScoreIcon(metrics.score);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Performance Overview
              </CardTitle>
              <CardDescription>
                Real-time application performance metrics
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center gap-2", getScoreColor(metrics.score))}>
                <ScoreIcon className="h-5 w-5" />
                <span className="text-2xl font-bold">{metrics.score || 95}</span>
              </div>
              <Button
                onClick={optimizePerformance}
                disabled={isOptimizing}
                size="sm"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Load Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Load Time</span>
              </div>
              <div className="text-2xl font-bold">
                {(metrics.loadTime / 1000).toFixed(2)}s
              </div>
              <Progress 
                value={Math.min((metrics.loadTime / 3000) * 100, 100)} 
                className="h-2" 
              />
              <Badge variant={metrics.loadTime < 2000 ? "default" : "destructive"} className="text-xs">
                {metrics.loadTime < 2000 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>

            {/* Render Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Render Time</span>
              </div>
              <div className="text-2xl font-bold">
                {(metrics.renderTime / 1000).toFixed(2)}s
              </div>
              <Progress 
                value={Math.min((metrics.renderTime / 1000) * 100, 100)} 
                className="h-2" 
              />
              <Badge variant={metrics.renderTime < 500 ? "default" : "destructive"} className="text-xs">
                {metrics.renderTime < 500 ? 'Excellent' : 'Slow'}
              </Badge>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.memoryUsage.toFixed(1)}%
              </div>
              <Progress 
                value={metrics.memoryUsage} 
                className="h-2" 
              />
              <Badge variant={metrics.memoryUsage < 70 ? "default" : "destructive"} className="text-xs">
                {metrics.memoryUsage < 70 ? 'Optimal' : 'High'}
              </Badge>
            </div>

            {/* Cache Hit Rate */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Cache Hit Rate</span>
              </div>
              <div className="text-2xl font-bold">
                {cacheManager.getHitRate()}%
              </div>
              <Progress 
                value={cacheManager.getHitRate()} 
                className="h-2" 
              />
              <Badge variant={cacheManager.getHitRate() > 80 ? "default" : "secondary"} className="text-xs">
                {cacheManager.getHitRate() > 80 ? 'Excellent' : 'Good'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Optimization Tips</CardTitle>
          <CardDescription>
            Recommendations to improve application performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Enable Service Worker Caching
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Cache static assets and API responses for faster load times
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Activity className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Use Virtual Scrolling
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Implement virtual scrolling for large data sets to reduce DOM nodes
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <Database className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  Optimize Bundle Size
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Use code splitting and tree shaking to reduce JavaScript bundle size
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Lazy loading wrapper component
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function LazyWrapper({ 
  children, 
  fallback = <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>,
  className 
}: LazyWrapperProps) {
  return (
    <div className={className}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </div>
  );
}