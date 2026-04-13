import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from "../lib/logger";

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'web_vitals' | 'network' | 'memory' | 'cpu' | 'rendering' | 'custom';
  severity: 'good' | 'needs_improvement' | 'poor';
  threshold: {
    good: number;
    poor: number;
  };
  source: 'browser' | 'server' | 'synthetic';
  metadata: Record<string, any>;
}

interface ErrorMetric {
  id: string;
  error: Error;
  message: string;
  stack?: string;
  timestamp: Date;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'security' | 'validation' | 'api' | 'ui';
  resolved: boolean;
  frequency: number;
  affectedUsers: number;
  context: Record<string, any>;
  breadcrumbs: { timestamp: Date; message: string; category: string }[];
}

interface SystemHealth {
  overall: number; // 0-100
  components: {
    frontend: number;
    backend: number;
    database: number;
    websocket: number;
    cdn: number;
    external_apis: number;
  };
  uptime: number; // percentage
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  throughput: number; // requests per second
  lastChecked: Date;
}

interface PerformanceBudget {
  metric: string;
  budget: number;
  current: number;
  status: 'within_budget' | 'approaching_limit' | 'over_budget';
  trend: 'improving' | 'stable' | 'degrading';
}

interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'availability' | 'security';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  affectedFeatures: string[];
  recommendedActions: string[];
}

interface RealTimeMetrics {
  activeUsers: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  renderTime: number;
  jsHeapSize: number;
  timestamp: Date;
}

interface PerformanceReport {
  id: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    keyIssues: string[];
    improvements: string[];
  };
  webVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
  };
  performance: {
    metrics: PerformanceMetric[];
    budgets: PerformanceBudget[];
    trends: { metric: string; trend: number; change: string }[];
  };
  errors: {
    total: number;
    byCategory: Record<string, number>;
    topErrors: ErrorMetric[];
    resolved: number;
    newErrors: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }[];
}

interface MonitoringConfig {
  enabled: boolean;
  enableRealTime: boolean;
  enableWebVitals: boolean;
  enableErrorTracking: boolean;
  enableAlerts: boolean;
  samplingRate: number; // 0-1
  reportingInterval: number; // milliseconds
  alertThresholds: Record<string, number>;
  budgets: Record<string, number>;
  excludeErrors: string[]; // Error messages to ignore
  excludeUrls: string[]; // URLs to exclude from monitoring
}

export function usePerformanceMonitoring(config?: Partial<MonitoringConfig>) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [errors, setErrors] = useState<ErrorMetric[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const monitoringConfig = useRef<MonitoringConfig>({
    enabled: true,
    enableRealTime: true,
    enableWebVitals: true,
    enableErrorTracking: true,
    enableAlerts: true,
    samplingRate: 0.1, // 10% sampling
    reportingInterval: 30000, // 30 seconds
    alertThresholds: {
      lcp: 2500, // 2.5s
      fid: 100, // 100ms
      cls: 0.1,
      errorRate: 5, // 5%
      responseTime: 3000, // 3s
      memoryUsage: 80 // 80%
    },
    budgets: {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      bundleSize: 250000, // 250KB
      imageSize: 500000 // 500KB
    },
    excludeErrors: [
      'ResizeObserver loop limit exceeded',
      'Script error.',
      'Non-Error promise rejection captured'
    ],
    excludeUrls: [
      '/health',
      '/ping',
      '/metrics'
    ],
    ...config
  });

  const performanceObserver = useRef<PerformanceObserver | null>(null);
  const errorBoundaryCount = useRef(0);
  const sessionId = useRef(Math.random().toString(36).substr(2, 9));
  const breadcrumbs = useRef<{ timestamp: Date; message: string; category: string }[]>([]);

  // Initialize monitoring
  useEffect(() => {
    if (monitoringConfig.current.enabled) {
      initializeMonitoring();
    }
    
    return () => cleanup();
  }, []);

  const initializeMonitoring = () => {
    setIsMonitoring(true);
    
    // Setup Web Vitals monitoring
    if (monitoringConfig.current.enableWebVitals) {
      setupWebVitalsMonitoring();
    }
    
    // Setup error tracking
    if (monitoringConfig.current.enableErrorTracking) {
      setupErrorTracking();
    }
    
    // Setup performance observer
    setupPerformanceObserver();
    
    // Setup real-time monitoring
    if (monitoringConfig.current.enableRealTime) {
      setupRealTimeMonitoring();
    }
    
    // Setup periodic health checks
    setupHealthChecks();
    
    // Setup resource monitoring
    setupResourceMonitoring();
    
    logger.info("Performance monitoring initialized");
  };

  const setupWebVitalsMonitoring = () => {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      recordMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        unit: 'ms',
        category: 'web_vitals',
        threshold: { good: 1500, poor: 2500 },
        source: 'browser',
        metadata: { element: (lastEntry as any).element?.tagName }
      });
    });
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        recordMetric({
          name: 'FID',
          value: (entry as any).processingStart - entry.startTime,
          unit: 'ms',
          category: 'web_vitals',
          threshold: { good: 100, poor: 300 },
          source: 'browser',
          metadata: { eventType: (entry as any).name }
        });
      });
    });
    
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      
      recordMetric({
        name: 'CLS',
        value: clsValue,
        unit: 'score',
        category: 'web_vitals',
        threshold: { good: 0.1, poor: 0.25 },
        source: 'browser',
        metadata: { cumulativeScore: clsValue }
      });
    });
    
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // First Contentful Paint (FCP)
    const navigationObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          recordMetric({
            name: 'FCP',
            value: entry.startTime,
            unit: 'ms',
            category: 'web_vitals',
            threshold: { good: 1000, poor: 2000 },
            source: 'browser',
            metadata: { paintType: entry.name }
          });
        }
      });
    });
    
    navigationObserver.observe({ entryTypes: ['paint'] });
  };

  const setupErrorTracking = () => {
    // Global error handler
    window.addEventListener('error', (event) => {
      if (shouldIgnoreError(event.error?.message || event.message)) return;
      
      recordError({
        error: event.error || new Error(event.message),
        message: event.error?.message || event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        severity: 'medium',
        category: 'javascript',
        context: {
          lineno: event.lineno,
          colno: event.colno,
          source: event.filename
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (shouldIgnoreError(event.reason?.message || String(event.reason))) return;
      
      recordError({
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        severity: 'high',
        category: 'javascript',
        context: {
          type: 'unhandledrejection',
          reason: event.reason
        }
      });
    });

    // Network error tracking
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        // Record network timing
        recordMetric({
          name: 'NetworkRequestTime',
          value: duration,
          unit: 'ms',
          category: 'network',
          threshold: { good: 1000, poor: 3000 },
          source: 'browser',
          metadata: {
            url: typeof args[0] === 'string' ? args[0] : args[0].url,
            status: response.status,
            method: args[1]?.method || 'GET'
          }
        });

        // Record network errors
        if (!response.ok) {
          recordError({
            error: new Error(`Network request failed: ${response.status}`),
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: window.location.href,
            userAgent: navigator.userAgent,
            severity: response.status >= 500 ? 'high' : 'medium',
            category: 'network',
            context: {
              requestUrl: typeof args[0] === 'string' ? args[0] : args[0].url,
              status: response.status,
              statusText: response.statusText,
              method: args[1]?.method || 'GET'
            }
          });
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        
        recordError({
          error: error as Error,
          message: (error as Error).message,
          stack: (error as Error).stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          severity: 'high',
          category: 'network',
          context: {
            requestUrl: typeof args[0] === 'string' ? args[0] : args[0].url,
            duration,
            method: args[1]?.method || 'GET'
          }
        });
        
        throw error;
      }
    };
  };

  const setupPerformanceObserver = () => {
    if (!('PerformanceObserver' in window)) return;

    performanceObserver.current = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        // Navigation timing
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          recordMetric({
            name: 'TTFB',
            value: navEntry.responseStart - navEntry.requestStart,
            unit: 'ms',
            category: 'network',
            threshold: { good: 600, poor: 1500 },
            source: 'browser',
            metadata: { type: 'navigation' }
          });
          
          recordMetric({
            name: 'DOMContentLoaded',
            value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            unit: 'ms',
            category: 'rendering',
            threshold: { good: 1000, poor: 2000 },
            source: 'browser',
            metadata: { type: 'navigation' }
          });
        }
        
        // Resource timing
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          recordMetric({
            name: 'ResourceLoadTime',
            value: resourceEntry.duration,
            unit: 'ms',
            category: 'network',
            threshold: { good: 500, poor: 2000 },
            source: 'browser',
            metadata: {
              resource: resourceEntry.name,
              type: resourceEntry.initiatorType,
              size: resourceEntry.transferSize
            }
          });
        }
        
        // Measure timing
        if (entry.entryType === 'measure') {
          recordMetric({
            name: entry.name,
            value: entry.duration,
            unit: 'ms',
            category: 'custom',
            threshold: { good: 100, poor: 500 },
            source: 'browser',
            metadata: { type: 'measure' }
          });
        }
      });
    });

    performanceObserver.current.observe({
      entryTypes: ['navigation', 'resource', 'measure']
    });
  };

  const setupRealTimeMonitoring = () => {
    const updateRealTimeMetrics = () => {
      const memoryInfo = (performance as any).memory;
      const now = Date.now();
      
      setRealTimeMetrics({
        activeUsers: Math.floor(Math.random() * 50) + 10, // Mock data
        requestsPerSecond: Math.floor(Math.random() * 100) + 20,
        averageResponseTime: Math.floor(Math.random() * 1000) + 200,
        errorRate: Math.random() * 5,
        memoryUsage: memoryInfo ? (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100 : 0,
        cpuUsage: Math.random() * 60 + 20, // Mock CPU usage
        networkLatency: Math.floor(Math.random() * 200) + 50,
        renderTime: performance.now() % 100,
        jsHeapSize: memoryInfo?.usedJSHeapSize || 0,
        timestamp: new Date()
      });
    };

    // Update immediately and then every interval
    updateRealTimeMetrics();
    setInterval(updateRealTimeMetrics, monitoringConfig.current.reportingInterval);
  };

  const setupHealthChecks = () => {
    const checkSystemHealth = async () => {
      try {
        // Mock health check - in real implementation, this would check various endpoints
        const components = {
          frontend: Math.random() * 10 + 90, // 90-100%
          backend: Math.random() * 5 + 95, // 95-100%
          database: Math.random() * 8 + 92, // 92-100%
          websocket: Math.random() * 15 + 85, // 85-100%
          cdn: Math.random() * 5 + 95, // 95-100%
          external_apis: Math.random() * 20 + 80 // 80-100%
        };
        
        const overall = Object.values(components).reduce((sum, val) => sum + val, 0) / Object.keys(components).length;
        
        const health: SystemHealth = {
          overall,
          components,
          uptime: Math.random() * 2 + 98, // 98-100%
          responseTime: Math.random() * 500 + 200, // 200-700ms
          errorRate: Math.random() * 2, // 0-2%
          throughput: Math.random() * 50 + 100, // 100-150 rps
          lastChecked: new Date()
        };
        
        setSystemHealth(health);
        
        // Check for alerts
        checkAlertConditions(health);
        
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    // Initial check and periodic updates
    checkSystemHealth();
    setInterval(checkSystemHealth, 60000); // Every minute
  };

  const setupResourceMonitoring = () => {
    // Memory monitoring
    if ('memory' in performance) {
      const memoryObserver = setInterval(() => {
        const memInfo = (performance as any).memory;
        
        recordMetric({
          name: 'JSHeapSize',
          value: memInfo.usedJSHeapSize,
          unit: 'bytes',
          category: 'memory',
          threshold: { good: memInfo.jsHeapSizeLimit * 0.7, poor: memInfo.jsHeapSizeLimit * 0.9 },
          source: 'browser',
          metadata: {
            totalHeapSize: memInfo.totalJSHeapSize,
            heapSizeLimit: memInfo.jsHeapSizeLimit
          }
        });
      }, 30000);
    }

    // Connection monitoring
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      recordMetric({
        name: 'ConnectionSpeed',
        value: connection.downlink,
        unit: 'mbps',
        category: 'network',
        threshold: { good: 10, poor: 1 },
        source: 'browser',
        metadata: {
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          saveData: connection.saveData
        }
      });
    }
  };

  const recordMetric = (metricData: Omit<PerformanceMetric, 'id' | 'timestamp' | 'severity'>) => {
    if (Math.random() > monitoringConfig.current.samplingRate) return;

    const metric: PerformanceMetric = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      severity: getSeverity(metricData.value, metricData.threshold),
      ...metricData
    };

    setMetrics(prev => {
      const updated = [...prev, metric];
      // Keep only recent metrics (last 1000)
      return updated.slice(-1000);
    });

    // Check for alerts
    if (monitoringConfig.current.enableAlerts) {
      checkMetricAlert(metric);
    }

    // Add breadcrumb
    addBreadcrumb(`Performance metric: ${metric.name} = ${metric.value}${metric.unit}`, 'performance');
  };

  const recordError = (errorData: Omit<ErrorMetric, 'id' | 'timestamp' | 'sessionId' | 'resolved' | 'frequency' | 'affectedUsers' | 'breadcrumbs'>) => {
    if (shouldIgnoreError(errorData.message)) return;

    const error: ErrorMetric = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      sessionId: sessionId.current,
      resolved: false,
      frequency: 1,
      affectedUsers: 1,
      breadcrumbs: [...breadcrumbs.current],
      ...errorData
    };

    setErrors(prev => {
      // Check for duplicate errors
      const existing = prev.find(e => 
        e.message === error.message && 
        e.url === error.url && 
        e.category === error.category
      );

      if (existing) {
        existing.frequency++;
        existing.timestamp = new Date();
        return [...prev];
      }

      const updated = [...prev, error];
      // Keep only recent errors (last 500)
      return updated.slice(-500);
    });

    // Create alert for critical errors
    if (error.severity === 'critical' && monitoringConfig.current.enableAlerts) {
      createAlert({
        type: 'error',
        severity: 'critical',
        title: 'Critical Error Detected',
        message: error.message,
        metric: 'error_rate',
        value: 1,
        threshold: 0,
        affectedFeatures: [error.category],
        recommendedActions: [
          'Investigate error immediately',
          'Check recent deployments',
          'Monitor error frequency'
        ]
      });
    }

    // Add breadcrumb
    addBreadcrumb(`Error: ${error.message}`, 'error');

    console.error('Performance monitoring captured error:', error);
  };

  const getSeverity = (value: number, threshold: { good: number; poor: number }): PerformanceMetric['severity'] => {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs_improvement';
    return 'poor';
  };

  const shouldIgnoreError = (message: string): boolean => {
    return monitoringConfig.current.excludeErrors.some(pattern => 
      message.includes(pattern)
    );
  };

  const checkMetricAlert = (metric: PerformanceMetric) => {
    const threshold = monitoringConfig.current.alertThresholds[metric.name.toLowerCase()];
    if (!threshold) return;

    if (metric.value > threshold) {
      createAlert({
        type: 'performance',
        severity: metric.severity === 'poor' ? 'critical' : 'warning',
        title: `${metric.name} Alert`,
        message: `${metric.name} is ${metric.value}${metric.unit}, exceeding threshold of ${threshold}${metric.unit}`,
        metric: metric.name,
        value: metric.value,
        threshold,
        affectedFeatures: [metric.category],
        recommendedActions: getRecommendedActions(metric.name)
      });
    }
  };

  const checkAlertConditions = (health: SystemHealth) => {
    // Check overall health
    if (health.overall < 90) {
      createAlert({
        type: 'availability',
        severity: health.overall < 80 ? 'critical' : 'warning',
        title: 'System Health Alert',
        message: `Overall system health is ${health.overall.toFixed(1)}%`,
        metric: 'system_health',
        value: health.overall,
        threshold: 90,
        affectedFeatures: ['system'],
        recommendedActions: [
          'Check component health',
          'Review recent changes',
          'Scale resources if needed'
        ]
      });
    }

    // Check error rate
    if (health.errorRate > 5) {
      createAlert({
        type: 'error',
        severity: 'warning',
        title: 'High Error Rate',
        message: `Error rate is ${health.errorRate.toFixed(2)}%`,
        metric: 'error_rate',
        value: health.errorRate,
        threshold: 5,
        affectedFeatures: ['system'],
        recommendedActions: [
          'Investigate recent errors',
          'Check deployment status',
          'Review error logs'
        ]
      });
    }
  };

  const createAlert = (alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>) => {
    const alert: PerformanceAlert = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      ...alertData
    };

    setAlerts(prev => {
      // Check for duplicate alerts
      const existing = prev.find(a => 
        a.metric === alert.metric && 
        a.type === alert.type && 
        !a.resolved
      );

      if (existing) {
        existing.timestamp = new Date();
        return [...prev];
      }

      return [...prev, alert];
    });

    console.warn('Performance alert created:', alert);
  };

  const getRecommendedActions = (metricName: string): string[] => {
    const actions: Record<string, string[]> = {
      'LCP': [
        'Optimize images and media',
        'Implement lazy loading',
        'Use CDN for faster delivery',
        'Minimize render-blocking resources'
      ],
      'FID': [
        'Reduce JavaScript execution time',
        'Split large tasks',
        'Use web workers for heavy computation',
        'Defer non-essential JavaScript'
      ],
      'CLS': [
        'Set size attributes for images and videos',
        'Reserve space for ad slots',
        'Avoid inserting content above existing content',
        'Use CSS transform instead of changing layout properties'
      ],
      'TTFB': [
        'Optimize server response time',
        'Use CDN',
        'Enable caching',
        'Optimize database queries'
      ]
    };

    return actions[metricName] || [
      'Monitor metric trends',
      'Investigate root cause',
      'Consider performance optimizations'
    ];
  };

  const addBreadcrumb = (message: string, category: string) => {
    const breadcrumb = {
      timestamp: new Date(),
      message,
      category
    };

    breadcrumbs.current.push(breadcrumb);
    
    // Keep only last 50 breadcrumbs
    if (breadcrumbs.current.length > 50) {
      breadcrumbs.current.shift();
    }
  };

  // Public API
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  }, []);

  const generateReport = useCallback((period: { start: Date; end: Date }): PerformanceReport => {
    const filteredMetrics = metrics.filter(m => 
      m.timestamp >= period.start && m.timestamp <= period.end
    );
    
    const filteredErrors = errors.filter(e => 
      e.timestamp >= period.start && e.timestamp <= period.end
    );

    // Calculate Web Vitals averages
    const webVitals = {
      lcp: getAverageMetric(filteredMetrics, 'LCP'),
      fid: getAverageMetric(filteredMetrics, 'FID'),
      cls: getAverageMetric(filteredMetrics, 'CLS'),
      fcp: getAverageMetric(filteredMetrics, 'FCP'),
      ttfb: getAverageMetric(filteredMetrics, 'TTFB')
    };

    // Calculate overall score
    const overallScore = calculatePerformanceScore(webVitals);

    const report: PerformanceReport = {
      id: Math.random().toString(36).substr(2, 9),
      generatedAt: new Date(),
      period,
      summary: {
        overallScore,
        grade: getGrade(overallScore),
        keyIssues: getKeyIssues(filteredMetrics, filteredErrors),
        improvements: getImprovementSuggestions(webVitals)
      },
      webVitals,
      performance: {
        metrics: filteredMetrics,
        budgets: generatePerformanceBudgets(),
        trends: calculateTrends(filteredMetrics)
      },
      errors: {
        total: filteredErrors.length,
        byCategory: getCategoryBreakdown(filteredErrors),
        topErrors: getTopErrors(filteredErrors),
        resolved: filteredErrors.filter(e => e.resolved).length,
        newErrors: filteredErrors.filter(e => 
          Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000
        ).length
      },
      recommendations: generateRecommendations(webVitals, filteredErrors)
    };

    return report;
  }, [metrics, errors]);

  const getAverageMetric = (metrics: PerformanceMetric[], name: string): number => {
    const relevant = metrics.filter(m => m.name === name);
    if (relevant.length === 0) return 0;
    return relevant.reduce((sum, m) => sum + m.value, 0) / relevant.length;
  };

  const calculatePerformanceScore = (webVitals: PerformanceReport['webVitals']): number => {
    // Simplified scoring based on Web Vitals
    let score = 100;
    
    if (webVitals.lcp > 2500) score -= 20;
    if (webVitals.fid > 100) score -= 20;
    if (webVitals.cls > 0.1) score -= 20;
    if (webVitals.fcp > 1800) score -= 15;
    if (webVitals.ttfb > 600) score -= 15;
    
    return Math.max(0, score);
  };

  const getGrade = (score: number): PerformanceReport['summary']['grade'] => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getKeyIssues = (metrics: PerformanceMetric[], errors: ErrorMetric[]): string[] => {
    const issues: string[] = [];
    
    const poorMetrics = metrics.filter(m => m.severity === 'poor');
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    
    if (poorMetrics.length > 0) {
      issues.push(`${poorMetrics.length} performance metrics need attention`);
    }
    
    if (criticalErrors.length > 0) {
      issues.push(`${criticalErrors.length} critical errors detected`);
    }
    
    return issues;
  };

  const getImprovementSuggestions = (webVitals: PerformanceReport['webVitals']): string[] => {
    const suggestions: string[] = [];
    
    if (webVitals.lcp > 2500) {
      suggestions.push('Optimize Largest Contentful Paint');
    }
    
    if (webVitals.fid > 100) {
      suggestions.push('Reduce First Input Delay');
    }
    
    if (webVitals.cls > 0.1) {
      suggestions.push('Minimize Cumulative Layout Shift');
    }
    
    return suggestions;
  };

  const generatePerformanceBudgets = (): PerformanceBudget[] => {
    return Object.entries(monitoringConfig.current.budgets).map(([metric, budget]) => {
      const current = getAverageMetric(metrics, metric.toUpperCase());
      const percentage = (current / budget) * 100;
      
      return {
        metric,
        budget,
        current,
        status: percentage <= 80 ? 'within_budget' : 
                percentage <= 100 ? 'approaching_limit' : 'over_budget',
        trend: 'stable' // Simplified
      };
    });
  };

  const calculateTrends = (metrics: PerformanceMetric[]): { metric: string; trend: number; change: string }[] => {
    // Simplified trend calculation
    return ['LCP', 'FID', 'CLS'].map(metric => ({
      metric,
      trend: Math.random() * 20 - 10, // -10 to +10
      change: Math.random() > 0.5 ? 'improving' : 'degrading'
    }));
  };

  const getCategoryBreakdown = (errors: ErrorMetric[]): Record<string, number> => {
    return errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getTopErrors = (errors: ErrorMetric[]): ErrorMetric[] => {
    return errors
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  };

  const generateRecommendations = (
    webVitals: PerformanceReport['webVitals'], 
    errors: ErrorMetric[]
  ): PerformanceReport['recommendations'] => {
    const recommendations: PerformanceReport['recommendations'] = [];
    
    if (webVitals.lcp > 2500) {
      recommendations.push({
        priority: 'high',
        category: 'Performance',
        title: 'Optimize Largest Contentful Paint',
        description: 'LCP is above the recommended threshold',
        impact: 'High impact on user experience',
        effort: 'medium'
      });
    }
    
    if (errors.filter(e => e.severity === 'critical').length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Reliability',
        title: 'Fix Critical Errors',
        description: 'Critical errors are affecting user experience',
        impact: 'High impact on reliability',
        effort: 'high'
      });
    }
    
    return recommendations;
  };

  const cleanup = () => {
    if (performanceObserver.current) {
      performanceObserver.current.disconnect();
    }
    
    setIsMonitoring(false);
  };

  const exportMetrics = useCallback((format: 'json' | 'csv') => {
    const data = {
      metrics,
      errors,
      systemHealth,
      realTimeMetrics,
      alerts,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [metrics, errors, systemHealth, realTimeMetrics, alerts]);

  return {
    // Data
    metrics,
    errors,
    systemHealth,
    realTimeMetrics,
    alerts,
    isMonitoring,
    
    // Actions
    acknowledgeAlert,
    resolveAlert,
    generateReport,
    exportMetrics,
    
    // Utilities
    recordCustomMetric: (name: string, value: number, unit: string = 'ms') => {
      recordMetric({
        name,
        value,
        unit,
        category: 'custom',
        threshold: { good: 100, poor: 500 },
        source: 'browser',
        metadata: { custom: true }
      });
    },
    
    addBreadcrumb,
    
    // Configuration
    updateConfig: (newConfig: Partial<MonitoringConfig>) => {
      monitoringConfig.current = { ...monitoringConfig.current, ...newConfig };
    },
    
    // Computed values
    activeAlerts: alerts.filter(a => !a.resolved),
    criticalAlerts: alerts.filter(a => a.severity === 'critical' && !a.resolved),
    recentErrors: errors.filter(e => Date.now() - e.timestamp.getTime() < 3600000), // Last hour
    performanceScore: systemHealth?.overall || 0
  };
}