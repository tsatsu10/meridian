import { useState, useCallback, useRef, useEffect } from 'react';

interface ErrorInstance {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'render' | 'security' | 'performance' | 'user' | 'system';
  context: {
    component?: string;
    action?: string;
    props?: Record<string, any>;
    state?: Record<string, any>;
    route?: string;
    version?: string;
  };
  fingerprint: string; // For grouping similar errors
  resolved: boolean;
  metadata: Record<string, any>;
}

interface ErrorGroup {
  fingerprint: string;
  message: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  instances: ErrorInstance[];
  trend: 'increasing' | 'decreasing' | 'stable';
  affectedUsers: Set<string>;
  resolved: boolean;
  tags: string[];
}

interface ErrorBreadcrumb {
  timestamp: Date;
  category: 'navigation' | 'user' | 'http' | 'console' | 'dom';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

interface ErrorContext {
  breadcrumbs: ErrorBreadcrumb[];
  userSession: {
    sessionId: string;
    userId?: string;
    startTime: Date;
    duration: number;
    pageViews: number;
    actions: number;
  };
  environment: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    connection?: string;
    memory?: number;
    language: string;
    timezone: string;
  };
  performance: {
    memory?: MemoryInfo;
    navigation?: PerformanceNavigationTiming;
    resources?: PerformanceResourceTiming[];
  };
}

interface ErrorTrackingConfig {
  enabled: boolean;
  maxBreadcrumbs: number;
  sampleRate: number; // 0-1
  allowUrls: string[];
  denyUrls: string[];
  ignoreErrors: (string | RegExp)[];
  beforeSend?: (error: ErrorInstance) => ErrorInstance | null;
  onError?: (error: ErrorInstance) => void;
  enablePerformanceTracking: boolean;
  enableUserInteractionTracking: boolean;
  enableNetworkTracking: boolean;
  autoSessionTracking: boolean;
}

interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  affectedUsers: number;
  topErrors: { fingerprint: string; count: number; message: string }[];
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  trends: {
    daily: { date: string; count: number }[];
    hourly: { hour: number; count: number }[];
  };
  performance: {
    averageResolutionTime: number;
    criticalErrors: number;
    newErrors: number;
    recurringErrors: number;
  };
}

export function useErrorTracking(config?: Partial<ErrorTrackingConfig>) {
  const [errorGroups, setErrorGroups] = useState<Map<string, ErrorGroup>>(new Map());
  const [recentErrors, setRecentErrors] = useState<ErrorInstance[]>([]);
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  const trackingConfig = useRef<ErrorTrackingConfig>({
    enabled: true,
    maxBreadcrumbs: 100,
    sampleRate: 1.0,
    allowUrls: [],
    denyUrls: [],
    ignoreErrors: [
      /Script error/,
      /Non-Error promise rejection captured/,
      /ResizeObserver loop limit exceeded/,
      /ChunkLoadError/
    ],
    enablePerformanceTracking: true,
    enableUserInteractionTracking: true,
    enableNetworkTracking: true,
    autoSessionTracking: true,
    ...config
  });

  const breadcrumbs = useRef<ErrorBreadcrumb[]>([]);
  const sessionId = useRef(generateSessionId());
  const errorBuffer = useRef<ErrorInstance[]>([]);
  const networkRequests = useRef<Map<string, any>>(new Map());

  // Initialize error tracking
  useEffect(() => {
    if (!isEnabled || !trackingConfig.current.enabled) return;

    setupErrorHandlers();
    setupPerformanceTracking();
    setupUserInteractionTracking();
    setupNetworkTracking();

    return () => {
      cleanup();
    };
  }, [isEnabled]);

  // Setup global error handlers
  const setupErrorHandlers = () => {
    // JavaScript errors
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // React error boundary integration
    if (typeof window !== 'undefined') {
      (window as any).__MERIDIAN_ERROR_TRACKER__ = {
        captureError: captureError,
        addBreadcrumb: addBreadcrumb
      };
    }
  };

  // Handle global JavaScript errors
  const handleGlobalError = (event: ErrorEvent) => {
    const error: Partial<ErrorInstance> = {
      message: event.message,
      stack: event.error?.stack,
      url: event.filename,
      category: 'javascript',
      context: {
        line: event.lineno,
        column: event.colno
      }
    };

    captureError(error);
  };

  // Handle unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error: Partial<ErrorInstance> = {
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      category: 'javascript',
      context: {
        reason: event.reason
      }
    };

    captureError(error);
  };

  // Setup performance tracking
  const setupPerformanceTracking = () => {
    if (!trackingConfig.current.enablePerformanceTracking) return;

    // Track long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold
              addBreadcrumb({
                category: 'performance',
                message: `Long task detected: ${entry.duration}ms`,
                level: 'warning',
                data: {
                  duration: entry.duration,
                  startTime: entry.startTime
                }
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported for longtask');
      }
    }

    // Track navigation performance
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        addBreadcrumb({
          category: 'navigation',
          message: 'Page loaded',
          level: 'info',
          data: {
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime
          }
        });
      }
    }, 0);
  };

  // Setup user interaction tracking
  const setupUserInteractionTracking = () => {
    if (!trackingConfig.current.enableUserInteractionTracking) return;

    const trackInteraction = (event: Event) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      
      if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
        addBreadcrumb({
          category: 'user',
          message: `User ${event.type} on ${tagName}`,
          level: 'info',
          data: {
            element: tagName,
            id: target.id,
            className: target.className,
            text: target.textContent?.slice(0, 50)
          }
        });
      }
    };

    document.addEventListener('click', trackInteraction);
    document.addEventListener('keydown', trackInteraction);
    document.addEventListener('submit', trackInteraction);
  };

  // Setup network tracking
  const setupNetworkTracking = () => {
    if (!trackingConfig.current.enableNetworkTracking) return;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const requestId = generateId();
      const startTime = Date.now();
      const url = args[0] instanceof Request ? args[0].url : args[0].toString();

      networkRequests.current.set(requestId, {
        url,
        startTime,
        method: args[0] instanceof Request ? args[0].method : 'GET'
      });

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        addBreadcrumb({
          category: 'http',
          message: `${response.status} ${url}`,
          level: response.ok ? 'info' : 'error',
          data: {
            url,
            method: args[0] instanceof Request ? args[0].method : 'GET',
            status: response.status,
            duration
          }
        });

        if (!response.ok) {
          captureError({
            message: `HTTP ${response.status}: ${url}`,
            category: 'network',
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              url,
              status: response.status,
              method: args[0] instanceof Request ? args[0].method : 'GET'
            }
          });
        }

        networkRequests.current.delete(requestId);
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        addBreadcrumb({
          category: 'http',
          message: `Network error: ${url}`,
          level: 'error',
          data: {
            url,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration
          }
        });

        captureError({
          message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          category: 'network',
          severity: 'high',
          context: {
            url,
            method: args[0] instanceof Request ? args[0].method : 'GET'
          }
        });

        networkRequests.current.delete(requestId);
        throw error;
      }
    };
  };

  // Capture error
  const captureError = useCallback((error: Partial<ErrorInstance>) => {
    if (!isEnabled || !trackingConfig.current.enabled) return;

    // Check sampling rate
    if (Math.random() > trackingConfig.current.sampleRate) return;

    // Check ignore patterns
    const message = error.message || '';
    if (trackingConfig.current.ignoreErrors.some(pattern => 
      pattern instanceof RegExp ? pattern.test(message) : message.includes(pattern)
    )) {
      return;
    }

    // Create full error instance
    const errorInstance: ErrorInstance = {
      id: generateId(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date(),
      url: error.url || window.location.href,
      userAgent: navigator.userAgent,
      sessionId: sessionId.current,
      severity: error.severity || determineSeverity(error),
      category: error.category || 'javascript',
      context: {
        ...error.context,
        route: window.location.pathname,
        version: process.env.REACT_APP_VERSION
      },
      fingerprint: generateFingerprint(error),
      resolved: false,
      metadata: error.metadata || {}
    };

    // Apply beforeSend hook
    const processedError = trackingConfig.current.beforeSend 
      ? trackingConfig.current.beforeSend(errorInstance)
      : errorInstance;

    if (!processedError) return;

    // Add to buffer and process
    errorBuffer.current.push(processedError);
    processErrorBuffer();

    // Call onError hook
    trackingConfig.current.onError?.(processedError);
  }, [isEnabled]);

  // Process error buffer
  const processErrorBuffer = () => {
    const errors = errorBuffer.current.splice(0);
    
    errors.forEach(error => {
      // Add to recent errors
      setRecentErrors(prev => [error, ...prev.slice(0, 99)]);

      // Group errors
      setErrorGroups(prev => {
        const updated = new Map(prev);
        const existing = updated.get(error.fingerprint);

        if (existing) {
          existing.instances.push(error);
          existing.count++;
          existing.lastSeen = error.timestamp;
          existing.affectedUsers.add(error.userId || 'anonymous');
          
          // Update severity to highest
          if (getSeverityWeight(error.severity) > getSeverityWeight(existing.severity)) {
            existing.severity = error.severity;
          }
        } else {
          const newGroup: ErrorGroup = {
            fingerprint: error.fingerprint,
            message: error.message,
            category: error.category,
            severity: error.severity,
            count: 1,
            firstSeen: error.timestamp,
            lastSeen: error.timestamp,
            instances: [error],
            trend: 'stable',
            affectedUsers: new Set([error.userId || 'anonymous']),
            resolved: false,
            tags: generateTags(error)
          };
          updated.set(error.fingerprint, newGroup);
        }

        return updated;
      });
    });

    // Update metrics
    updateMetrics();
  };

  // Add breadcrumb
  const addBreadcrumb = useCallback((breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>) => {
    const fullBreadcrumb: ErrorBreadcrumb = {
      ...breadcrumb,
      timestamp: new Date()
    };

    breadcrumbs.current.push(fullBreadcrumb);
    
    // Keep only the most recent breadcrumbs
    if (breadcrumbs.current.length > trackingConfig.current.maxBreadcrumbs) {
      breadcrumbs.current = breadcrumbs.current.slice(-trackingConfig.current.maxBreadcrumbs);
    }
  }, []);

  // Get error context
  const getErrorContext = useCallback((): ErrorContext => {
    return {
      breadcrumbs: [...breadcrumbs.current],
      userSession: {
        sessionId: sessionId.current,
        startTime: new Date(sessionId.current.split('-')[1] ? parseInt(sessionId.current.split('-')[1]) : Date.now()),
        duration: Date.now() - (sessionId.current.split('-')[1] ? parseInt(sessionId.current.split('-')[1]) : Date.now()),
        pageViews: breadcrumbs.current.filter(b => b.category === 'navigation').length,
        actions: breadcrumbs.current.filter(b => b.category === 'user').length
      },
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        connection: (navigator as any).connection?.effectiveType,
        memory: (performance as any).memory?.totalJSHeapSize,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      performance: {
        memory: (performance as any).memory,
        navigation: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,
        resources: performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      }
    };
  }, []);

  // Update metrics
  const updateMetrics = useCallback(() => {
    const groups = Array.from(errorGroups.values());
    const totalErrors = groups.reduce((sum, group) => sum + group.count, 0);
    const affectedUsers = new Set(groups.flatMap(g => Array.from(g.affectedUsers))).size;

    const now = new Date();
    const today = now.toDateString();
    const currentHour = now.getHours();

    // Calculate trends
    const dailyTrends = groups.reduce((acc, group) => {
      group.instances.forEach(instance => {
        const date = instance.timestamp.toDateString();
        acc[date] = (acc[date] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const hourlyTrends = groups.reduce((acc, group) => {
      group.instances.forEach(instance => {
        const hour = instance.timestamp.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
      });
      return acc;
    }, {} as Record<number, number>);

    setMetrics({
      totalErrors,
      errorRate: totalErrors / Math.max(breadcrumbs.current.filter(b => b.category === 'user').length, 1) * 100,
      affectedUsers,
      topErrors: groups
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(g => ({
          fingerprint: g.fingerprint,
          count: g.count,
          message: g.message
        })),
      errorsByCategory: groups.reduce((acc, group) => {
        acc[group.category] = (acc[group.category] || 0) + group.count;
        return acc;
      }, {} as Record<string, number>),
      errorsBySeverity: groups.reduce((acc, group) => {
        acc[group.severity] = (acc[group.severity] || 0) + group.count;
        return acc;
      }, {} as Record<string, number>),
      trends: {
        daily: Object.entries(dailyTrends).map(([date, count]) => ({ date, count })),
        hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hourlyTrends[hour] || 0 }))
      },
      performance: {
        averageResolutionTime: 0, // Would need resolution tracking
        criticalErrors: groups.filter(g => g.severity === 'critical').length,
        newErrors: groups.filter(g => g.firstSeen.toDateString() === today).length,
        recurringErrors: groups.filter(g => g.count > 1).length
      }
    });
  }, [errorGroups]);

  // Utility functions
  const generateSessionId = (): string => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const generateFingerprint = (error: Partial<ErrorInstance>): string => {
    const key = `${error.message || ''}-${error.category || ''}-${error.context?.component || ''}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  };

  const determineSeverity = (error: Partial<ErrorInstance>): ErrorInstance['severity'] => {
    if (error.category === 'security') return 'critical';
    if (error.category === 'network' && error.message?.includes('500')) return 'high';
    if (error.message?.toLowerCase().includes('critical')) return 'critical';
    if (error.message?.toLowerCase().includes('error')) return 'medium';
    return 'low';
  };

  const getSeverityWeight = (severity: string): number => {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[severity as keyof typeof weights] || 0;
  };

  const generateTags = (error: ErrorInstance): string[] => {
    const tags: string[] = [];
    
    if (error.context?.component) tags.push(`component:${error.context.component}`);
    if (error.context?.route) tags.push(`route:${error.context.route}`);
    if (error.category) tags.push(`category:${error.category}`);
    if (error.severity) tags.push(`severity:${error.severity}`);
    
    return tags;
  };

  const cleanup = () => {
    // Restore original fetch
    if (window.fetch !== originalFetch) {
      window.fetch = originalFetch;
    }
    
    // Remove event listeners
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };

  // Export error data
  const exportErrorData = useCallback(async (
    format: 'json' | 'csv',
    options?: {
      dateRange?: { start: Date; end: Date };
      severity?: string[];
      categories?: string[];
      includeContext?: boolean;
    }
  ) => {
    let groups = Array.from(errorGroups.values());
    
    // Apply filters
    if (options?.dateRange) {
      groups = groups.filter(g => 
        g.firstSeen >= options.dateRange!.start && 
        g.lastSeen <= options.dateRange!.end
      );
    }
    
    if (options?.severity) {
      groups = groups.filter(g => options.severity!.includes(g.severity));
    }
    
    if (options?.categories) {
      groups = groups.filter(g => options.categories!.includes(g.category));
    }

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        format,
        filters: options,
        totalGroups: groups.length,
        totalErrors: groups.reduce((sum, g) => sum + g.count, 0)
      },
      errorGroups: groups.map(group => ({
        ...group,
        affectedUsers: Array.from(group.affectedUsers),
        instances: options?.includeContext ? group.instances : group.instances.length
      })),
      metrics
    };

    const filename = `error-report-${Date.now()}.${format}`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: format === 'json' ? 'application/json' : 'text/csv'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [errorGroups, metrics]);

  // Mark error as resolved
  const resolveError = useCallback((fingerprint: string) => {
    setErrorGroups(prev => {
      const updated = new Map(prev);
      const group = updated.get(fingerprint);
      if (group) {
        group.resolved = true;
        group.instances.forEach(instance => instance.resolved = true);
      }
      return updated;
    });
  }, []);

  return {
    // State
    errorGroups: Array.from(errorGroups.values()),
    recentErrors,
    metrics,
    isEnabled,
    
    // Actions
    captureError,
    addBreadcrumb,
    resolveError,
    exportErrorData,
    
    // Context
    getErrorContext,
    getBreadcrumbs: () => [...breadcrumbs.current],
    
    // Configuration
    updateConfig: (newConfig: Partial<ErrorTrackingConfig>) => {
      trackingConfig.current = { ...trackingConfig.current, ...newConfig };
    },
    
    // Controls
    enable: () => setIsEnabled(true),
    disable: () => setIsEnabled(false),
    clearErrors: () => {
      setErrorGroups(new Map());
      setRecentErrors([]);
      breadcrumbs.current = [];
    },
    
    // Computed values
    criticalErrors: Array.from(errorGroups.values()).filter(g => g.severity === 'critical'),
    unresolvedErrors: Array.from(errorGroups.values()).filter(g => !g.resolved),
    sessionId: sessionId.current
  };
}

// Store original fetch for cleanup
const originalFetch = window.fetch;