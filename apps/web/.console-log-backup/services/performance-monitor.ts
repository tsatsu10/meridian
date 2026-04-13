import { API_URL } from '@/constants/urls';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = false; // Temporarily disabled - API endpoint not implemented
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds

  constructor() {
    // Temporarily disabled until /api/performance/metrics endpoint is implemented
    if (this.isEnabled) {
      this.initialize();
    }
  }

  private initialize() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Initialize Web Vitals
    this.initializeWebVitals();
    
    // Initialize Navigation Timing
    this.initializeNavigationTiming();
    
    // Initialize Resource Timing
    this.initializeResourceTiming();
    
    // Initialize Custom Metrics
    this.initializeCustomMetrics();
    
    // Start automatic flushing
    this.startAutoFlush();
  }

  private initializeWebVitals() {
    // Use dynamic import to load web-vitals
    import('web-vitals').then(({ getCLS, getFCP, getFID, getLCP, getTTFB }) => {
      getCLS(this.handleWebVital.bind(this));
      getFCP(this.handleWebVital.bind(this));
      getFID(this.handleWebVital.bind(this));
      getLCP(this.handleWebVital.bind(this));
      getTTFB(this.handleWebVital.bind(this));
    }).catch(() => {
      // Silently handle missing web-vitals library in development
      if (import.meta.env.DEV) {
        console.debug('Web Vitals library not available - performance metrics will be limited');
      }
    });
  }

  private handleWebVital(metric: WebVitalsMetric) {
    this.recordMetric({
      name: `web_vital_${metric.name.toLowerCase()}`,
      value: metric.value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: localStorage.getItem('userId') || undefined,
      metadata: {
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      },
    });
  }

  private initializeNavigationTiming() {
    // Navigation timing metrics
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // Key navigation metrics
            this.recordMetric({
              name: 'navigation_dns_lookup',
              value: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });

            this.recordMetric({
              name: 'navigation_tcp_connect',
              value: navEntry.connectEnd - navEntry.connectStart,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });

            this.recordMetric({
              name: 'navigation_request_response',
              value: navEntry.responseEnd - navEntry.requestStart,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });

            this.recordMetric({
              name: 'navigation_dom_interactive',
              value: navEntry.domInteractive - navEntry.navigationStart,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Navigation timing observer failed:', e);
      }
    }
  }

  private initializeResourceTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Only track significant resources
            if (resourceEntry.transferSize > 10000 || resourceEntry.duration > 100) {
              this.recordMetric({
                name: 'resource_load_time',
                value: resourceEntry.duration,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                metadata: {
                  resourceUrl: resourceEntry.name,
                  resourceType: this.getResourceType(resourceEntry.name),
                  transferSize: resourceEntry.transferSize,
                  encodedBodySize: resourceEntry.encodedBodySize,
                },
              });
            }
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
        this.observers.push(observer);
      } catch (e) {
        console.warn('Resource timing observer failed:', e);
      }
    }
  }

  private initializeCustomMetrics() {
    // React render metrics
    this.setupReactProfiler();
    
    // Memory usage metrics
    this.setupMemoryMonitoring();
    
    // Connection metrics
    this.setupConnectionMonitoring();
  }

  private setupReactProfiler() {
    // This would be integrated with React.Profiler in components
    (window as any).__REACT_PROFILER_CALLBACK__ = (id: string, phase: string, actualDuration: number) => {
      this.recordMetric({
        name: 'react_render_time',
        value: actualDuration,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          componentId: id,
          phase: phase,
        },
      });
    };
  }

  private setupMemoryMonitoring() {
    // Monitor memory usage periodically
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric({
          name: 'memory_used_heap_size',
          value: memory.usedJSHeapSize,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: {
            totalHeapSize: memory.totalJSHeapSize,
            heapSizeLimit: memory.jsHeapSizeLimit,
          },
        });
      }
    }, 60000); // Every minute
  }

  private setupConnectionMonitoring() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordMetric({
        name: 'connection_effective_type',
        value: this.connectionTypeToNumber(connection.effectiveType),
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        },
      });
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private connectionTypeToNumber(type: string): number {
    const types: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4,
      '5g': 5,
    };
    return types[type] || 0;
  }

  // Public API
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp' | 'url' | 'userAgent'>) {
    if (!this.isEnabled) return;

    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: localStorage.getItem('userId') || undefined,
    };

    this.metrics.push(fullMetric);

    // Auto-flush if batch is full
    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }
  }

  recordUserInteraction(action: string, duration?: number, metadata?: Record<string, any>) {
    this.recordMetric({
      name: 'user_interaction',
      value: duration || 0,
      metadata: {
        action,
        ...metadata,
      },
    });
  }

  recordAPICall(url: string, method: string, duration: number, status: number) {
    this.recordMetric({
      name: 'api_call_duration',
      value: duration,
      metadata: {
        url,
        method,
        status,
        success: status >= 200 && status < 400,
      },
    });
  }

  recordRouteChange(from: string, to: string, duration: number) {
    this.recordMetric({
      name: 'route_change_duration',
      value: duration,
      metadata: {
        from,
        to,
      },
    });
  }

  private startAutoFlush() {
    setInterval(() => {
      if (this.metrics.length > 0) {
        this.flush();
      }
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.metrics.length > 0) {
        this.flush();
      }
    });
  }

  private failedAttempts = 0;
  private maxRetries = 3;
  private backoffDelay = 5000; // 5 seconds initial backoff
  private isBackingOff = false;

  private async flush() {
    if (this.metrics.length === 0 || this.isBackingOff) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      // Send to API endpoint
      const response = await fetch(`${API_URL}/api/performance/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsToSend,
          sessionId: this.getSessionId(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Reset failure counter on success
      this.failedAttempts = 0;

      // Development logging
      if (import.meta.env.MODE === 'development') {
        console.group('📊 Performance Metrics Sent');
        console.table(metricsToSend.map(m => ({
          name: m.name,
          value: Math.round(m.value * 100) / 100,
          timestamp: new Date(m.timestamp).toLocaleTimeString(),
        })));
        console.groupEnd();
      }
    } catch (error) {
      this.failedAttempts++;

      // Don't retry if we've exceeded max retries
      if (this.failedAttempts >= this.maxRetries) {
        console.warn(`Failed to send performance metrics after ${this.maxRetries} attempts. Dropping metrics.`);
        this.failedAttempts = 0; // Reset for next batch

        // Apply exponential backoff before accepting new metrics
        this.isBackingOff = true;
        const backoff = this.backoffDelay * Math.pow(2, Math.min(this.failedAttempts, 5));
        setTimeout(() => {
          this.isBackingOff = false;
        }, backoff);
        return;
      }

      // Restore metrics only if under retry limit
      this.metrics.unshift(...metricsToSend);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('performance-session-id', sessionId);
    }
    return sessionId;
  }

  // Cleanup
  destroy() {
    this.isEnabled = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.flush(); // Final flush
  }

  // Configuration
  configure(options: {
    enabled?: boolean;
    batchSize?: number;
    flushInterval?: number;
  }) {
    if (options.enabled !== undefined) this.isEnabled = options.enabled;
    if (options.batchSize !== undefined) this.batchSize = options.batchSize;
    if (options.flushInterval !== undefined) this.flushInterval = options.flushInterval;
  }

  // Analytics
  getMetricsSummary() {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
    });

    return summary;
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for easy integration
export const usePerformanceMonitor = () => {
  return {
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    recordUserInteraction: performanceMonitor.recordUserInteraction.bind(performanceMonitor),
    recordAPICall: performanceMonitor.recordAPICall.bind(performanceMonitor),
    recordRouteChange: performanceMonitor.recordRouteChange.bind(performanceMonitor),
  };
};