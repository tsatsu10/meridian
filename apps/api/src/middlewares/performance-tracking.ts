/**
 * ⚡ Performance Tracking Middleware
 * 
 * Automatically tracks:
 * - Request duration
 * - Response size
 * - Status codes
 * - Error rates
 * - User context
 */

import { Context, Next } from 'hono';
import logger from '../utils/logger';
import { 
  logRequestPerformance, 
  performanceMetrics,
  logError 
} from '../utils/performance-logger';

/**
 * Main performance tracking middleware
 */
export async function performanceTracker(c: Context, next: Next) {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  
  try {
    // Execute request
    await next();
    
    const duration = Date.now() - startTime;
    const statusCode = c.res.status;
    const userEmail = c.get('userEmail');
    const workspaceId = c.req.query('workspaceId');
    
    // Get response size
    const responseSize = c.res.headers.get('content-length') 
      ? parseInt(c.res.headers.get('content-length')!) 
      : undefined;
    
    // Log request performance
    logRequestPerformance({
      method,
      path,
      statusCode,
      duration,
      userEmail,
      workspaceId,
      responseSize,
    });
    
    // Record metrics for aggregation
    performanceMetrics.record(`${method} ${path}`, duration);
    performanceMetrics.record('all_requests', duration);
    
    // Track status code distribution
    performanceMetrics.record(`status_${statusCode}`, 1);
    
    // Add performance headers to response
    c.header('X-Response-Time', `${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error with context
    logError(error as Error, {
      method,
      path,
      duration,
      userEmail: c.get('userEmail'),
      workspaceId: c.req.query('workspaceId'),
    });
    
    // Record error metric
    performanceMetrics.record('errors', 1);
    
    // Re-throw to let error handler deal with it
    throw error;
  }
}

/**
 * Slow endpoint detector
 * Logs warning if request takes longer than threshold
 */
export function slowEndpointDetector(thresholdMs: number = 1000) {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    
    await next();
    
    const duration = Date.now() - startTime;
    
    if (duration > thresholdMs) {
      logger.warn(`⚠️ Slow endpoint detected: ${c.req.method} ${c.req.path} took ${duration}ms`);
    }
  };
}

/**
 * Error rate monitor
 * Tracks error percentage over time
 */
class ErrorRateMonitor {
  private totalRequests = 0;
  private errorCount = 0;
  private resetInterval: NodeJS.Timeout;
  
  constructor(windowMinutes: number = 5) {
    // Reset counters every X minutes
    this.resetInterval = setInterval(() => {
      if (this.totalRequests > 0) {
        const errorRate = (this.errorCount / this.totalRequests) * 100;
        logger.debug(`📊 Error Rate (${windowMinutes}min): ${errorRate.toFixed(2)}% (${this.errorCount}/${this.totalRequests})`);
      }
      this.reset();
    }, windowMinutes * 60 * 1000);
  }
  
  recordRequest(isError: boolean) {
    this.totalRequests++;
    if (isError) {
      this.errorCount++;
    }
  }
  
  getErrorRate(): number {
    return this.totalRequests > 0 
      ? (this.errorCount / this.totalRequests) * 100 
      : 0;
  }
  
  reset() {
    this.totalRequests = 0;
    this.errorCount = 0;
  }
  
  stop() {
    clearInterval(this.resetInterval);
  }
}

export const errorRateMonitor = new ErrorRateMonitor(5);

/**
 * Error rate tracking middleware
 */
export async function errorRateTracker(c: Context, next: Next) {
  try {
    await next();
    errorRateMonitor.recordRequest(false);
  } catch (error) {
    errorRateMonitor.recordRequest(true);
    
    // Check if error rate is too high
    const errorRate = errorRateMonitor.getErrorRate();
    if (errorRate > 10) { // > 10% error rate
      logger.error(`🚨 HIGH ERROR RATE: ${errorRate.toFixed(2)}%`);
    }
    
    throw error;
  }
}

/**
 * Response size tracker
 */
export async function responseSizeTracker(c: Context, next: Next) {
  await next();
  
  const contentLength = c.res.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength);
    performanceMetrics.record('response_size', size);
    
    // Warn on large responses (> 5MB)
    if (size > 5 * 1024 * 1024) {
      logger.warn(`⚠️ Large response: ${c.req.path} (${(size / 1024 / 1024).toFixed(2)}MB)`);
    }
  }
}

/**
 * Memory usage tracker
 */
export function logMemoryUsage() {
  const usage = process.memoryUsage();
  logger.debug('💾 Memory Usage:', {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)}MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`,
  });
}

// Log memory usage every 5 minutes
setInterval(logMemoryUsage, 5 * 60 * 1000);

