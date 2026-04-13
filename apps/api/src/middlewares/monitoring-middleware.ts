/**
 * 📊 Monitoring Middleware
 * 
 * Integrates monitoring and logging into the request/response cycle:
 * - Request logging with correlation IDs
 * - Response time tracking
 * - Error rate monitoring
 * - Automatic metric collection
 */

import { Context, Next } from 'hono';
import { randomBytes } from 'crypto';
import { winstonLog } from '../utils/winston-logger';
import { monitoringService } from '../services/monitoring/monitoring-service';
import { getLoggingConfig } from '../config/logging';

// Generate correlation ID
function generateRequestId(): string {
  const randomPart = randomBytes(4).toString('hex');
  return `req_${Date.now()}_${randomPart}`;
}

/**
 * Request logging and monitoring middleware
 */
export const monitoringMiddleware = async (c: Context, next: Next) => {
  const config = getLoggingConfig();
  
  // Skip excluded paths
  const path = c.req.path;
  if (config.excludePaths.some(excluded => path.includes(excluded))) {
    await next();
    return;
  }

  // Generate request ID for correlation
  const requestId = generateRequestId();
  c.set('requestId' as any, requestId);

  const method = c.req.method;
  const url = c.req.url;
  const userEmail = c.get('userEmail');
  const userId = c.get('userId');
  const startTime = Date.now();

  // Log incoming request
  if (config.enableRequestLogging) {
    winstonLog.request(method, path, {
      requestId,
      userId,
      userEmail,
    });
  }

  try {
    await next();
  } catch (error) {
    // Error will be handled by error handler middleware
    // Just record metrics here
    monitoringService.increment('http.requests.errors', 1, {
      method,
      path,
      error: error instanceof Error ? error.name : 'Unknown',
    });

    throw error; // Re-throw for error handler
  } finally {
    const duration = Date.now() - startTime;
    const statusCode = c.res.status;

    // Log response
    if (config.enableRequestLogging) {
      winstonLog.response(method, path, statusCode, duration, {
        requestId,
        userId,
        userEmail,
      });
    }

    // Record metrics
    monitoringService.recordRequest(method, path, statusCode, duration, userId);

    // Log slow requests
    if (duration > config.slowRequestThreshold && config.enablePerformanceLogging) {
      winstonLog.warn('Slow request detected', {
        method,
        path,
        duration,
        threshold: config.slowRequestThreshold,
        requestId,
        userId,
      }, { category: 'PERFORMANCE' });
    }
  }
};

/**
 * Database query monitoring middleware
 */
export function monitorQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then((result) => {
      const duration = Date.now() - startTime;
      monitoringService.recordQuery(operation, table, duration, true);
      
      winstonLog.query(`${operation} ${table}`, duration);
      
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      monitoringService.recordQuery(operation, table, duration, false);
      
      winstonLog.error('Database query failed', {
        operation,
        table,
        duration,
        error: error instanceof Error ? error.message : String(error),
      }, { category: 'DATABASE' });
      
      throw error;
    });
}

/**
 * Cache operation monitoring
 */
export function monitorCacheOperation<T>(
  operation: 'get' | 'set' | 'delete',
  key: string,
  operationFn: () => Promise<T>
): Promise<T> {
  return operationFn()
    .then((result) => {
      if (operation === 'get') {
        if (result !== null && result !== undefined) {
          monitoringService.recordCacheHit(key);
        } else {
          monitoringService.recordCacheMiss(key);
        }
      } else if (operation === 'set') {
        monitoringService.recordCacheSet(key);
      } else if (operation === 'delete') {
        monitoringService.recordCacheDelete(key);
      }
      
      return result;
    })
    .catch((error) => {
      winstonLog.error('Cache operation failed', {
        operation,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    });
}

export default monitoringMiddleware;


