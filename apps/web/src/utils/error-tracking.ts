/**
 * Error Tracking and Analytics Utility
 * 
 * Centralized error handling with:
 * - Error categorization
 * - User context attachment
 * - Performance monitoring
 * - Analytics integration
 * - Console logging in development
 * 
 * @example
 * ```typescript
 * import { ErrorTracker } from "@/utils/error-tracking";
 * 
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   ErrorTracker.captureException(error, {
 *     context: "Task Creation",
 *     severity: "error",
 *     tags: { feature: "tasks", action: "create" }
 *   });
 * }
 * ```
 */

export type ErrorSeverity = "fatal" | "error" | "warning" | "info" | "debug";

export interface ErrorContext {
  /**
   * Descriptive context about where/why error occurred
   */
  context?: string;

  /**
   * Severity level
   */
  severity?: ErrorSeverity;

  /**
   * Additional tags for categorization
   */
  tags?: Record<string, string | number | boolean>;

  /**
   * Extra data to attach
   */
  extra?: Record<string, any>;

  /**
   * User information
   */
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

class ErrorTrackingService {
  private isInitialized = false;
  private isDevelopment = import.meta.env.DEV;
  private performanceMetrics: PerformanceMetric[] = [];
  private errorCount = {
    fatal: 0,
    error: 0,
    warning: 0,
    info: 0,
    debug: 0,
  };

  /**
   * Initialize error tracking
   */
  initialize(config?: { dsn?: string; environment?: string }) {
    if (this.isInitialized) return;

    // In production, you would initialize Sentry or similar here
    // For now, we'll use console logging and local storage

    if (this.isDevelopment) {
      logger.debug("🔍 Error Tracking initialized (Development Mode)");
    }

    // Setup global error handlers
    this.setupGlobalHandlers();

    this.isInitialized = true;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.captureException(event.reason, {
        context: "Unhandled Promise Rejection",
        severity: "error",
        tags: { type: "promise-rejection" },
      });
    });

    // Catch global errors
    window.addEventListener("error", (event) => {
      this.captureException(event.error, {
        context: "Global Error Handler",
        severity: "error",
        tags: { 
          type: "window-error",
          filename: event.filename,
          lineno: event.lineno.toString(),
          colno: event.colno.toString(),
        },
      });
    });

    // Performance observer for long tasks
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold (50ms)
              this.captureMessage("Long Task Detected", {
                severity: "warning",
                tags: {
                  type: "performance",
                  duration: entry.duration.toString(),
                },
                extra: {
                  entryType: entry.entryType,
                  name: entry.name,
                  startTime: entry.startTime,
                },
              });
            }
          }
        });

        observer.observe({ entryTypes: ["longtask", "measure"] });
      } catch (e) {
        console.warn("PerformanceObserver not supported");
      }
    }
  }

  /**
   * Capture an exception
   */
  captureException(error: Error | unknown, context?: ErrorContext) {
    const severity = context?.severity || "error";
    this.errorCount[severity]++;

    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown Error",
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Log to console in development
    if (this.isDevelopment) {
      console.group(`🐛 ${severity.toUpperCase()}: ${errorData.message}`);
      console.error("Error:", error);
      if (context?.context) logger.info("Context:", context.context);
      if (context?.tags) logger.info("Tags:", context.tags);
      if (context?.extra) logger.info("Extra:", context.extra);
      console.groupEnd();
    }

    // Store in session storage for debugging
    this.storeError(errorData);

    // In production, send to error tracking service (e.g., Sentry)
    if (!this.isDevelopment && severity === "error" || severity === "fatal") {
      this.sendToErrorService(errorData);
    }
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(message: string, context?: ErrorContext) {
    const severity = context?.severity || "info";
    
    const messageData = {
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (this.isDevelopment && severity !== "debug") {
      logger.debug(`📝 ${severity.toUpperCase()}: ${message}`, context);
    }

    this.storeError(messageData);
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: Omit<PerformanceMetric, "timestamp">) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.performanceMetrics.push(fullMetric);

    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }

    if (this.isDevelopment && metric.duration > 100) {
      console.warn(`⚡ Slow operation: ${metric.name} (${metric.duration}ms)`);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      ...this.errorCount,
      total: Object.values(this.errorCount).reduce((a, b) => a + b, 0),
      performanceMetrics: this.performanceMetrics,
    };
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errorCount = {
      fatal: 0,
      error: 0,
      warning: 0,
      info: 0,
      debug: 0,
    };
    this.performanceMetrics = [];
    
    try {
      sessionStorage.removeItem("meridian_errors");
    } catch (e) {
      // Session storage not available
    }
  }

  /**
   * Store error in session storage
   */
  private storeError(errorData: any) {
    try {
      const stored = sessionStorage.getItem("meridian_errors");
      const errors = stored ? JSON.parse(stored) : [];
      
      errors.push(errorData);
      
      // Keep only last 50 errors
      const recentErrors = errors.slice(-50);
      
      sessionStorage.setItem("meridian_errors", JSON.stringify(recentErrors));
    } catch (e) {
      // Session storage full or not available
    }
  }

  /**
   * Send to error tracking service (placeholder for Sentry/etc)
   */
  private sendToErrorService(errorData: any) {
    // In production, this would send to Sentry, LogRocket, etc.
    // For now, we'll just log that it would be sent
    if (!this.isDevelopment) {
      logger.debug("Would send to error service:", errorData);
    }
  }
}

// Singleton instance
export const ErrorTracker = new ErrorTrackingService();

// Auto-initialize
ErrorTracker.initialize();

/**
 * React Error Boundary helper
 */
export function logReactError(error: Error, errorInfo: { componentStack: string }) {
  ErrorTracker.captureException(error, {
    context: "React Error Boundary",
    severity: "error",
    tags: { type: "react-error" },
    extra: {
      componentStack: errorInfo.componentStack,
    },
  });
}

/**
 * Async operation wrapper with error tracking
 */
export async function withErrorTracking<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    ErrorTracker.trackPerformance({
      name: context,
      duration,
      tags: { status: "success" },
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    ErrorTracker.captureException(error, {
      context,
      severity: "error",
      tags: { status: "failed" },
      extra: { duration },
    });
    
    throw error;
  }
}

export default ErrorTracker;

