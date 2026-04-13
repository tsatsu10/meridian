/**
 * 🔍 Error Monitoring Middleware
 * Automatic error tracking and context collection
 */

import type { Context, Next } from 'hono';
import { errorMonitor } from './error-monitor';
import { logger } from '../utils/logger';
import { recordResponseTime } from './performance-dashboard';

/**
 * Error tracking middleware - captures and tracks all errors
 */
export const errorTrackingMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    // Extract context information
    const context = {
      userId: c.get('userId'),
      workspaceId: c.get('workspaceId'),
      endpoint: c.req.path,
      requestId: c.get('requestId'),
      method: c.req.method,
      url: c.req.url,
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      timestamp: new Date()
    };

    // Try to get request body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      try {
        context.body = await c.req.json();
      } catch {
        // Body might not be JSON, ignore
      }
    }

    // Track the error
    const errorId = await errorMonitor.trackError(error as Error, context);

    // Log for immediate debugging
    logger.error('Request error tracked', { 
      errorId, 
      endpoint: context.endpoint,
      method: context.method,
      userId: context.userId,
      error: (error as Error).message
    });

    // Re-throw the error so it can be handled by other middleware
    throw error;
  }
};

/**
 * Performance monitoring middleware - tracks response times and resource usage
 */
export const performanceTrackingMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  try {
    await next();
  } finally {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Track slow requests
    if (duration > 1000) { // Slower than 1 second
      logger.warn('Slow request detected', {
        endpoint: c.req.path,
        method: c.req.method,
        duration,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024), // MB
        userId: c.get('userId'),
        requestId: c.get('requestId')
      });
    }

    // Track high memory requests
    if (memoryDelta > 10 * 1024 * 1024) { // More than 10MB
      logger.warn('High memory request detected', {
        endpoint: c.req.path,
        method: c.req.method,
        duration,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024),
        userId: c.get('userId'),
        requestId: c.get('requestId')
      });
    }

    // Record response time for performance dashboard
    recordResponseTime(duration);
    
    // Add performance headers
    c.header('x-response-time', `${duration}ms`);
    c.header('x-memory-delta', `${Math.round(memoryDelta / 1024)}kb`);
  }
};

/**
 * Request logging middleware with error context
 */
export const contextualLoggingMiddleware = async (c: Context, next: Next) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  c.set('requestId', requestId);

  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    userId: c.get('userId'),
    workspaceId: c.get('workspaceId')
  });

  let statusCode = 200;
  let error: Error | null = null;

  try {
    await next();
    statusCode = c.res.status;
  } catch (err) {
    error = err as Error;
    statusCode = 500; // Default error status
    throw err; // Re-throw to be handled by error middleware
  } finally {
    const duration = Date.now() - startTime;

    // Log response
    const logData = {
      requestId,
      method: c.req.method,
      path: c.req.path,
      statusCode,
      duration,
      userId: c.get('userId'),
      workspaceId: c.get('workspaceId')
    };

    if (error) {
      logger.error('Request completed with error', { ...logData, error: error.message });
    } else if (statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else if (duration > 1000) {
      logger.warn('Slow request completed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  }
};

/**
 * Health check middleware - tracks system health metrics
 */
export const healthCheckMiddleware = async (c: Context, next: Next) => {
  // Only apply to specific endpoints or sampling
  if (Math.random() < 0.1) { // 10% sampling
    const beforeCpuUsage = process.cpuUsage();
    const beforeMemory = process.memoryUsage();
    
    await next();
    
    const afterCpuUsage = process.cpuUsage(beforeCpuUsage);
    const afterMemory = process.memoryUsage();
    
    // Log resource usage for monitoring
    logger.debug('Resource usage sample', {
      endpoint: c.req.path,
      cpuUser: afterCpuUsage.user / 1000, // Convert to milliseconds
      cpuSystem: afterCpuUsage.system / 1000,
      memoryDelta: afterMemory.heapUsed - beforeMemory.heapUsed,
      heapUsed: afterMemory.heapUsed,
      heapTotal: afterMemory.heapTotal,
      external: afterMemory.external,
      requestId: c.get('requestId')
    });
  } else {
    await next();
  }
};

/**
 * Rate limit error tracking
 */
export const rateLimitErrorMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    // Check if it's a rate limit error
    if ((error as any).status === 429 || (error as Error).message.includes('rate limit')) {
      await errorMonitor.trackError(error as Error, {
        userId: c.get('userId'),
        workspaceId: c.get('workspaceId'),
        endpoint: c.req.path,
        requestId: c.get('requestId'),
        method: c.req.method,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        userAgent: c.req.header('user-agent')
      });
    }
    throw error;
  }
};

/**
 * Combine all monitoring middleware
 */
export const monitoringMiddleware = [
  contextualLoggingMiddleware,
  performanceTrackingMiddleware,
  errorTrackingMiddleware,
  healthCheckMiddleware,
  rateLimitErrorMiddleware
];

export default monitoringMiddleware;

