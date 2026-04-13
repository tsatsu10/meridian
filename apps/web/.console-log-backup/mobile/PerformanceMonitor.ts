// Performance Monitoring System for Phase 7
import { API_URL } from '../constants/urls';
import { logger } from "../lib/logger";

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context: {
    component: string;
    action: string;
    networkType?: string;
    deviceType?: string;
    userAgent?: string;
    memoryInfo?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  action: 'log' | 'notify' | 'optimize' | 'preload' | 'cleanup';
}

export interface CachePerformance {
  hitRate: number;
  missRate: number;
  size: number;
  efficiency: number;
  lastAccessed: Date;
  accessCount: number;
}

export interface ResourcePreloadStrategy {
  type: 'critical' | 'important' | 'normal' | 'low';
  priority: number;
  resources: string[];
  conditions: {
    networkType?: string;
    deviceType?: string;
    userBehavior?: string;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private cacheStats: Map<string, CachePerformance> = new Map();
  private preloadStrategies: ResourcePreloadStrategy[] = [];
  private optimizationQueue: Array<() => void> = [];
  private isOptimizing = false;
  private requestLimiter: Map<string, number> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 10;

  // CRITICAL: Store interval for cleanup
  private periodicOptimizationInterval: NodeJS.Timeout | null = null;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeThresholds();
    this.setupObservers();
    this.initializePreloadStrategies();
    
    // Only start periodic optimization in production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' || 
        process.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
      this.startPeriodicOptimization();
    } else {}
  }

  // Initialize performance thresholds with more granular metrics
  private initializeThresholds(): void {
    this.thresholds = [
      {
        metric: 'app-startup',
        warning: 2000, // Reduced from 3000
        critical: 4000, // Reduced from 5000
        action: 'optimize'
      },
      {
        metric: 'sync-duration',
        warning: 3000, // Reduced from 5000
        critical: 7000, // Reduced from 10000
        action: 'notify'
      },
      {
        metric: 'cache-hit-rate',
        warning: 0.8, // Increased from 0.7
        critical: 0.6, // Increased from 0.5
        action: 'optimize'
      },
      {
        metric: 'memory-usage',
        warning: 80 * 1024 * 1024, // Reduced from 100MB
        critical: 150 * 1024 * 1024, // Reduced from 200MB
        action: 'cleanup'
      },
      {
        metric: 'first-contentful-paint',
        warning: 1500,
        critical: 2500,
        action: 'preload'
      },
      {
        metric: 'largest-contentful-paint',
        warning: 2500,
        critical: 4000,
        action: 'optimize'
      },
      {
        metric: 'cumulative-layout-shift',
        warning: 0.1,
        critical: 0.25,
        action: 'optimize'
      },
      {
        metric: 'first-input-delay',
        warning: 100,
        critical: 300,
        action: 'optimize'
      }
    ];
  }

  // Initialize intelligent preload strategies
  private initializePreloadStrategies(): void {
    // Preload strategies with proper resource management
    this.preloadStrategies = [
      {
        type: 'critical',
        priority: 1,
        resources: [
          '/api/users/me',
          '/api/workspace'
        ],
        conditions: {
          networkType: 'fast',
          deviceType: 'desktop'
        }
      },
      {
        type: 'important',
        priority: 2,
        resources: [
          '/api/dashboard/analytics',
          '/api/notifications'
        ],
        conditions: {
          networkType: 'fast'
        }
      },
      {
        type: 'normal',
        priority: 3,
        resources: [
          '/api/tasks',
          '/api/projects'
        ],
        conditions: {
          networkType: 'fast'
        }
      },
      {
        type: 'low',
        priority: 4,
        resources: [],
        conditions: {
          networkType: 'fast',
          userBehavior: 'power-user'
        }
      }
    ];
  }

  // Setup enhanced performance observers
  private setupObservers(): void {
    // Monitor navigation timing with more granular metrics
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // Record multiple navigation metrics
            this.recordMetric('app-startup', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms', {
              component: 'app',
              action: 'startup',
              networkType: this.getNetworkType(),
              deviceType: this.getDeviceType(),
              userAgent: navigator.userAgent,
              memoryInfo: this.getMemoryInfo()
            });

            this.recordMetric('first-contentful-paint', navEntry.firstContentfulPaint || 0, 'ms', {
              component: 'app',
              action: 'paint',
              networkType: this.getNetworkType(),
              deviceType: this.getDeviceType()
            });

            this.recordMetric('dom-content-loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'ms', {
              component: 'app',
              action: 'dom-ready',
              networkType: this.getNetworkType(),
              deviceType: this.getDeviceType()
            });
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    }

    // Monitor resource loading with enhanced tracking
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Track resource loading performance
            this.recordMetric('resource-load-time', resourceEntry.duration, 'ms', {
              component: 'resource',
              action: 'load',
              networkType: this.getNetworkType(),
              deviceType: this.getDeviceType()
            });

            // Track resource size
            if (resourceEntry.transferSize > 0) {
              this.recordMetric('resource-size', resourceEntry.transferSize, 'bytes', {
                component: 'resource',
                action: 'transfer',
                networkType: this.getNetworkType(),
                deviceType: this.getDeviceType()
              });
            }
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    }

    // Monitor layout shifts for CLS
    if ('PerformanceObserver' in window) {
      const layoutObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            const layoutEntry = entry as any;
            this.recordMetric('layout-shift', layoutEntry.value, 'score', {
              component: 'layout',
              action: 'shift',
              networkType: this.getNetworkType(),
              deviceType: this.getDeviceType()
            });
          }
        }
      });
      layoutObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout', layoutObserver);
    }

    // Monitor first input delay
    if ('PerformanceObserver' in window) {
      const firstInputObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const firstInputEntry = entry as any;
            this.recordMetric('first-input-delay', firstInputEntry.processingStart - firstInputEntry.startTime, 'ms', {
              component: 'interaction',
              action: 'first-input',
              networkType: this.getNetworkType(),
              deviceType: this.getDeviceType()
            });
          }
        }
      });
      firstInputObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('first-input', firstInputObserver);
    }

    // Monitor largest contentful paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            const lcpEntry = entry as any;
            this.recordMetric('largest-contentful-paint', lcpEntry.startTime, 'ms', {
              component: 'paint',
              action: 'largest-contentful',
              networkType: this.getNetworkType(),
              deviceType: this.getDeviceType()
            });
          }
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    }
  }

  // Enhanced metric recording with memory info
  recordMetric(
    name: string, 
    value: number, 
    unit: string, 
    context: { component: string; action: string; networkType?: string; deviceType?: string; userAgent?: string; memoryInfo?: any }
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      context: {
        ...context,
        memoryInfo: context.memoryInfo || this.getMemoryInfo()
      }
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check thresholds and trigger actions
    this.checkThresholds(metric);

    // Trigger intelligent preloading based on metrics
    this.triggerIntelligentPreloading(metric);
  }

  // Enhanced sync operation monitoring with more granular tracking
  async monitorSyncOperation<T>(
    operation: () => Promise<T>,
    context: { component: string; action: string }
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryInfo();

    try {
      const result = await operation();
      
      const endTime = performance.now();
      const endMemory = this.getMemoryInfo();
      const duration = endTime - startTime;
      const memoryDelta = endMemory.usedJSHeapSize - startMemory.usedJSHeapSize;

      this.recordMetric('sync-duration', duration, 'ms', {
        ...context,
        networkType: this.getNetworkType(),
        deviceType: this.getDeviceType()
      });

      this.recordMetric('sync-memory-delta', memoryDelta, 'bytes', {
        ...context,
        networkType: this.getNetworkType(),
        deviceType: this.getDeviceType()
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric('sync-error-duration', duration, 'ms', {
        ...context,
        networkType: this.getNetworkType(),
        deviceType: this.getDeviceType()
      });

      throw error;
    }
  }

  // Enhanced cache operation tracking
  recordCacheOperation(
    cacheName: string,
    operation: 'hit' | 'miss' | 'set' | 'delete',
    size?: number
  ): void {
    const now = new Date();
    const existing = this.cacheStats.get(cacheName) || {
      hitRate: 0,
      missRate: 0,
      size: 0,
      efficiency: 0,
      lastAccessed: now,
      accessCount: 0
    };

    existing.accessCount++;
    existing.lastAccessed = now;

    if (operation === 'hit') {
      existing.hitRate = (existing.hitRate * (existing.accessCount - 1) + 1) / existing.accessCount;
      existing.missRate = (existing.missRate * (existing.accessCount - 1)) / existing.accessCount;
    } else if (operation === 'miss') {
      existing.missRate = (existing.missRate * (existing.accessCount - 1) + 1) / existing.accessCount;
      existing.hitRate = (existing.hitRate * (existing.accessCount - 1)) / existing.accessCount;
    }

    if (size !== undefined) {
      existing.size = size;
    }

    existing.efficiency = existing.hitRate / (existing.hitRate + existing.missRate);

    this.cacheStats.set(cacheName, existing);

    // Record cache performance metric
    this.recordMetric('cache-efficiency', existing.efficiency, 'ratio', {
      component: 'cache',
      action: operation,
      networkType: this.getNetworkType(),
      deviceType: this.getDeviceType()
    });
  }

  // Enhanced offline operation monitoring
  async monitorOfflineOperation<T>(
    operation: () => Promise<T>,
    context: { component: string; action: string }
  ): Promise<T> {
    const startTime = performance.now();
    const isOnline = navigator.onLine;

    try {
      const result = await operation();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric('offline-operation-duration', duration, 'ms', {
        ...context,
        networkType: isOnline ? 'online' : 'offline',
        deviceType: this.getDeviceType()
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric('offline-operation-error', duration, 'ms', {
        ...context,
        networkType: isOnline ? 'online' : 'offline',
        deviceType: this.getDeviceType()
      });

      throw error;
    }
  }

  // Enhanced threshold checking with resource-aware actions
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.find(t => t.metric === metric.name);
    if (!threshold) return;

    // Only process if we have sufficient resources
    if (this.optimizationQueue.length > 10) {
      console.debug('Optimization queue full, skipping threshold processing');
      return;
    }

    if (metric.value >= threshold.critical) {
      this.handleThresholdViolation(metric, threshold, 'critical');
    } else if (metric.value >= threshold.warning) {
      this.handleThresholdViolation(metric, threshold, 'warning');
    }
  }

  // Enhanced threshold violation handling
  private handleThresholdViolation(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold,
    level: 'warning' | 'critical'
  ): void {
    console.warn(`Performance ${level}: ${metric.name} = ${metric.value}${metric.unit}`);

    switch (threshold.action) {
      case 'log':
        logger.info("Performance metric logged: ${metric.name}");
        break;
      case 'notify':
        this.notifyPerformanceIssue(metric, level);
        break;
      case 'optimize':
        this.queueOptimization(metric);
        break;
      case 'preload':
        this.triggerIntelligentPreloading(metric);
        break;
      case 'cleanup':
        this.triggerMemoryCleanup();
        break;
    }
  }

  // Queue optimization operations to prevent blocking
  private queueOptimization(metric: PerformanceMetric): void {
    this.optimizationQueue.push(() => this.triggerOptimization(metric));
    
    if (!this.isOptimizing) {
      this.processOptimizationQueue();
    }
  }

  // Process optimization queue asynchronously
  private async processOptimizationQueue(): Promise<void> {
    this.isOptimizing = true;
    
    while (this.optimizationQueue.length > 0) {
      const optimization = this.optimizationQueue.shift();
      if (optimization) {
        try {
          optimization();
        } catch (error) {
          console.error('Optimization failed:', error);
        }
      }
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isOptimizing = false;
  }

  // Enhanced optimization triggers
  private triggerOptimization(metric: PerformanceMetric): void {
    switch (metric.name) {
      case 'app-startup':
        this.optimizeAppStartup();
        break;
      case 'cache-hit-rate':
        this.optimizeCache();
        break;
      case 'memory-usage':
        this.optimizeMemory();
        break;
      case 'largest-contentful-paint':
        this.optimizeContentLoading();
        break;
      case 'cumulative-layout-shift':
        this.optimizeLayout();
        break;
      default:
        this.optimizeGeneral();
        break;
    }
  }

  // Enhanced app startup optimization
  private optimizeAppStartup(): void {
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Optimize bundle loading
    this.optimizeBundleLoading();
    
    // Clear unnecessary caches
    this.clearOldCaches();
  }

  // Enhanced cache optimization
  private optimizeCache(): void {
    // Adjust cache sizes based on performance
    this.adjustCacheSize();
    
    // Preload frequently accessed resources
    this.preloadFrequentlyAccessed();
    
    // Clean up expired cache entries
    this.cleanupExpiredCache();
  }

  // Enhanced memory optimization
  private optimizeMemory(): void {
    // Clear old metrics
    this.clearOldMetrics();
    
    // Trigger garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // Clear unused caches
    this.clearUnusedCaches();
  }

  // New optimization methods
  private optimizeContentLoading(): void {
    // Implement lazy loading for non-critical content
    this.implementLazyLoading();
    
    // Optimize image loading
    this.optimizeImageLoading();
  }

  private optimizeLayout(): void {
    // Prevent layout shifts
    this.preventLayoutShifts();
    
    // Optimize CSS loading
    this.optimizeCSSLoading();
  }

  private optimizeGeneral(): void {
    // General performance optimizations
    this.optimizeRendering();
    this.optimizeEventHandling();
  }

  // Intelligent preloading based on user behavior and metrics
  private triggerIntelligentPreloading(metric: PerformanceMetric): void {
    const networkType = this.getNetworkType();
    const deviceType = this.getDeviceType();
    
    // Find applicable preload strategies
    const applicableStrategies = this.preloadStrategies.filter(strategy => {
      const conditions = strategy.conditions;
      return (!conditions.networkType || conditions.networkType === networkType) &&
             (!conditions.deviceType || conditions.deviceType === deviceType);
    });

    // Sort by priority and execute
    applicableStrategies
      .sort((a, b) => a.priority - b.priority)
      .forEach(strategy => {
        this.executePreloadStrategy(strategy);
      });
  }

  // Execute preload strategy
  private executePreloadStrategy(strategy: ResourcePreloadStrategy): void {
    strategy.resources.forEach(resource => {
      // Use different preloading methods based on resource type
      if (resource.startsWith('/api/')) {
        this.preloadAPIResource(resource);
      } else if (resource.match(/\.(js|css|png|jpg|svg)$/)) {
        this.preloadStaticResource(resource);
      }
    });
  }

  // Preload API resources with rate limiting
  private preloadAPIResource(resource: string): void {
    // Check rate limiting
    if (!this.canMakeRequest(resource)) {
      console.debug(`Rate limit exceeded for ${resource}, skipping preload`);
      return;
    }

    // Check if the resource needs the API base URL
    const fullUrl = resource.startsWith('/api/') ? `${API_URL}${resource}` : resource;
    
    // Use fetch with low priority and better error handling
    fetch(fullUrl, { 
      method: 'HEAD',
      priority: 'low' as any,
      signal: AbortSignal.timeout(3000), // Reduced to 3 second timeout
      mode: 'cors'}).catch((error) => {
      // Log but don't throw - these are preload attempts
      if (error.name !== 'AbortError') {
        console.debug(`Preload failed for ${fullUrl}:`, error.message);
      }
    });
  }

  // Check if we can make a request (rate limiting)
  private canMakeRequest(resource: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old entries
    this.requestLimiter.forEach((timestamp, key) => {
      if (timestamp < oneMinuteAgo) {
        this.requestLimiter.delete(key);
      }
    });
    
    // Check current requests for this resource
    const resourceKey = `preload:${resource}`;
    const lastRequest = this.requestLimiter.get(resourceKey) || 0;
    
    // Allow one request per resource per minute
    if (now - lastRequest < 60000) {
      return false;
    }
    
    // Count total requests in the last minute
    const recentRequests = Array.from(this.requestLimiter.values()).filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    if (recentRequests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    // Record this request
    this.requestLimiter.set(resourceKey, now);
    return true;
  }

  // Preload static resources
  private preloadStaticResource(resource: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = this.getResourceType(resource);
    document.head.appendChild(link);
  }

  // Get resource type for preloading
  private getResourceType(resource: string): string {
    if (resource.endsWith('.js')) return 'script';
    if (resource.endsWith('.css')) return 'style';
    if (resource.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    return 'fetch';
  }

  // Enhanced memory info retrieval
  private getMemoryInfo(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };
  }

  // Enhanced network type detection
  private getNetworkType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType) {
        return connection.effectiveType;
      }
    }
    return 'unknown';
  }

  // Enhanced device type detection
  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile';
    }
    if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  // Enhanced performance report with more detailed metrics
  getPerformanceReport(): {
    metrics: PerformanceMetric[];
    cacheStats: Map<string, CachePerformance>;
    averages: Record<string, number>;
    recommendations: string[];
    preloadStrategies: ResourcePreloadStrategy[];
    optimizationQueue: number;
  } {
    const averages: Record<string, number> = {};
    const recommendations: string[] = [];

    // Calculate averages for each metric type
    const metricGroups = this.metrics.reduce((groups, metric) => {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric.value);
      return groups;
    }, {} as Record<string, number[]>);

    Object.entries(metricGroups).forEach(([name, values]) => {
      averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    // Generate recommendations based on metrics
    if (averages['app-startup'] > 3000) {
      recommendations.push('Consider implementing code splitting to reduce startup time');
    }
    if (averages['cache-hit-rate'] < 0.7) {
      recommendations.push('Optimize cache strategies to improve hit rates');
    }
    if (averages['memory-usage'] > 100 * 1024 * 1024) {
      recommendations.push('Implement memory cleanup strategies');
    }

    return {
      metrics: this.metrics,
      cacheStats: this.cacheStats,
      averages,
      recommendations,
      preloadStrategies: this.preloadStrategies,
      optimizationQueue: this.optimizationQueue.length
    };
  }

  // Start periodic optimization with resource throttling
  private startPeriodicOptimization(): void {
    // CRITICAL: Clear any existing interval first
    if (this.periodicOptimizationInterval) {
      clearInterval(this.periodicOptimizationInterval);
    }

    // Reduce frequency to prevent resource exhaustion
    this.periodicOptimizationInterval = setInterval(() => {
      this.performPeriodicOptimization();
    }, 60000); // Every 60 seconds instead of 30
  }

  // Perform periodic optimization tasks
  private performPeriodicOptimization(): void {
    // Clear old metrics
    this.clearOldMetrics();
    
    // Clean up expired caches
    this.cleanupExpiredCache();
    
    // Adjust cache sizes
    this.adjustCacheSize();
    
    // Preload critical resources
    this.preloadCriticalResources();
  }

  // Enhanced cleanup methods
  private clearOldMetrics(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter(metric => 
      metric.timestamp.getTime() > oneHourAgo
    );
  }

  private clearOldCaches(): void {
    // Clear old caches based on access patterns
    this.cacheStats.forEach((stats, cacheName) => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (stats.lastAccessed.getTime() < oneDayAgo && stats.accessCount < 10) {
        this.cacheStats.delete(cacheName);
      }
    });
  }

  private clearUnusedCaches(): void {
    // Clear caches with low efficiency
    this.cacheStats.forEach((stats, cacheName) => {
      if (stats.efficiency < 0.3) {
        this.cacheStats.delete(cacheName);
      }
    });
  }

  private cleanupExpiredCache(): void {
    // Implementation for cleaning expired cache entries
    logger.info("Cleaning expired cache entries...");
  }

  private adjustCacheSize(): void {
    // Implementation for adjusting cache sizes based on performance
    logger.info("Adjusting cache sizes...");
  }

  private preloadCriticalResources(): void {
    // Implementation for preloading critical resources
    logger.info("Preloading critical resources...");
  }

  private preloadFrequentlyAccessed(): void {
    // Implementation for preloading frequently accessed resources
    logger.info("Preloading frequently accessed resources...");
  }

  private optimizeBundleLoading(): void {
    // Implementation for optimizing bundle loading
    logger.info("Optimizing bundle loading...");
  }

  private implementLazyLoading(): void {
    // Implementation for lazy loading
    logger.info("Implementing lazy loading...");
  }

  private optimizeImageLoading(): void {
    // Implementation for optimizing image loading
    logger.info("Optimizing image loading...");
  }

  private preventLayoutShifts(): void {
    // Implementation for preventing layout shifts
    logger.info("Preventing layout shifts...");
  }

  private optimizeCSSLoading(): void {
    // Implementation for optimizing CSS loading
    logger.info("Optimizing CSS loading...");
  }

  private optimizeRendering(): void {
    // Implementation for optimizing rendering
    logger.info("Optimizing rendering...");
  }

  private optimizeEventHandling(): void {
    // Implementation for optimizing event handling
    logger.info("Optimizing event handling...");
  }

  private notifyPerformanceIssue(metric: PerformanceMetric, level: string): void {
    // Implementation for notifying about performance issues
    console.warn(`Performance ${level}: ${metric.name} = ${metric.value}${metric.unit}`);
  }

  private triggerMemoryCleanup(): void {
    // Implementation for triggering memory cleanup
    logger.info("Triggering memory cleanup...");
  }

  // Enhanced disposal method
  dispose(): void {
    // CRITICAL: Clear periodic optimization interval
    if (this.periodicOptimizationInterval) {
      clearInterval(this.periodicOptimizationInterval);
      this.periodicOptimizationInterval = null;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = [];
    this.cacheStats.clear();
    this.optimizationQueue = [];
    this.requestLimiter.clear();
  }
}

// Only create instance in production or when explicitly enabled
export const performanceMonitor = 
  (import.meta.env.PROD || 
   import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') 
    ? PerformanceMonitor.getInstance() 
    : null; 