/**
 * 📊 APM Middleware for HTTP Request Monitoring
 * 
 * Integrates Application Performance Monitoring with HTTP requests:
 * - Automatic response time tracking
 * - Request throughput monitoring
 * - Error rate tracking
 * - User and IP tracking
 */

import { createMiddleware } from 'hono/factory';
import { v4 as uuidv4 } from 'uuid';
import apmMonitor from '../services/apm-monitor';
import logger from '../utils/logger';

export interface APMContext {
  requestId: string;
  startTime: number;
  endpoint: string;
  method: string;
}

/**
 * APM middleware for automatic performance monitoring
 */
export function apmMiddleware() {
  return createMiddleware(async (c, next) => {
    const requestId = uuidv4();
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    
    // Normalize endpoint for better grouping
    const endpoint = normalizeEndpoint(path);
    
    // Extract user info
    const userAgent = c.req.header('user-agent');
    const ip = getClientIP(c);
    const userId = getUserId(c);

    // Start tracking this request
    apmMonitor.startRequest(requestId, endpoint, method);

    // Add APM context to the request
    c.set('apmContext', {
      requestId,
      startTime,
      endpoint,
      method
    } as APMContext);

    // Log request start (debug level)
    await logger.api('debug', 'Request started', {
      requestId,
      method,
      endpoint: path,
      userAgent,
      ip,
      userId
    });

    try {
      // Process the request
      await next();

      // Get response status
      const statusCode = c.res.status || 200;
      const duration = Date.now() - startTime;

      // End tracking this request
      apmMonitor.endRequest(requestId, statusCode, userId, userAgent, ip);

      // Log request completion
      await logger.api('info', 'Request completed', {
        requestId,
        method,
        endpoint: path,
        statusCode,
        duration: `${duration}ms`,
        userId
      });

      // Add performance headers
      c.res.headers.set('X-Response-Time', `${duration}ms`);
      c.res.headers.set('X-Request-ID', requestId);

    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error.status || 500;

      // Track the error
      apmMonitor.endRequest(requestId, statusCode, userId, userAgent, ip);
      apmMonitor.trackError({
        endpoint,
        method,
        statusCode,
        errorType: getErrorType(error),
        errorMessage: error.message || 'Unknown error',
        stackTrace: error.stack,
        userId
      });

      // Log the error
      await logger.api('error', 'Request failed', {
        requestId,
        method,
        endpoint: path,
        statusCode,
        duration: `${duration}ms`,
        error: error.message,
        userId
      });

      // Re-throw the error
      throw error;
    }
  });
}

/**
 * Database APM middleware for query performance tracking
 */
export function createDatabaseAPM() {
  return {
    /**
     * Track database query performance
     */
    trackQuery: async <T>(
      queryFn: () => Promise<T>,
      query: string,
      operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
    ): Promise<T> => {
      const startTime = Date.now();
      
      try {
        const result = await queryFn();
        const duration = Date.now() - startTime;
        
        // Determine record count
        let recordCount = 0;
        if (Array.isArray(result)) {
          recordCount = result.length;
        } else if (result && typeof result === 'object' && 'changes' in result) {
          recordCount = (result as any).changes || 0;
        } else if (result) {
          recordCount = 1;
        }

        // Track the query
        apmMonitor.trackDatabaseQuery(query, duration, recordCount, operation);

        // Log slow queries
        if (duration > 1000) {
          await logger.database('warn', 'Slow database query', {
            query: query.substring(0, 100),
            duration: `${duration}ms`,
            recordCount,
            operation
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Track failed query
        apmMonitor.trackDatabaseQuery(query, duration, 0, operation);

        // Log query error
        await logger.database('error', 'Database query failed', {
          query: query.substring(0, 100),
          duration: `${duration}ms`,
          operation,
          error: error.message
        });

        throw error;
      }
    }
  };
}

/**
 * WebSocket APM integration
 */
export function createWebSocketAPM() {
  let connectionCount = 0;

  return {
    /**
     * Track WebSocket connection
     */
    trackConnection: () => {
      connectionCount++;
      apmMonitor.trackWebSocketEvent('connect', connectionCount);
      
      logger.websocket('info', 'WebSocket connection established', {
        connectionCount
      });
    },

    /**
     * Track WebSocket disconnection
     */
    trackDisconnection: () => {
      connectionCount = Math.max(0, connectionCount - 1);
      apmMonitor.trackWebSocketEvent('disconnect', connectionCount);
      
      logger.websocket('info', 'WebSocket connection closed', {
        connectionCount
      });
    },

    /**
     * Track WebSocket message
     */
    trackMessage: (messageType: string, processingTime?: number) => {
      apmMonitor.trackWebSocketEvent('message', connectionCount, processingTime, messageType);
      
      if (processingTime && processingTime > 100) {
        logger.websocket('warn', 'Slow WebSocket message processing', {
          messageType,
          processingTime: `${processingTime}ms`
        });
      }
    },

    /**
     * Track WebSocket error
     */
    trackError: (error: string) => {
      apmMonitor.trackWebSocketEvent('error', connectionCount);
      
      logger.websocket('error', 'WebSocket error', {
        error,
        connectionCount
      });
    }
  };
}

/**
 * Helper functions
 */

/**
 * Normalize endpoint for consistent grouping
 */
function normalizeEndpoint(path: string): string {
  return path
    // Replace numeric IDs with :id
    .replace(/\/\d+/g, '/:id')
    // Replace UUIDs with :id
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    // Replace other potential dynamic segments
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id')
    // Remove query parameters
    .split('?')[0]
    // Lowercase for consistency
    .toLowerCase();
}

/**
 * Extract client IP address
 */
function getClientIP(c: any): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
         c.req.header('x-real-ip') ||
         c.req.header('x-client-ip') ||
         c.env?.ip ||
         'unknown';
}

/**
 * Extract user ID from request context
 */
function getUserId(c: any): string | undefined {
  // Try to get user from auth context
  const user = c.get('user');
  if (user?.id) return user.id;
  if (user?.email) return user.email;

  // Try to get from JWT token
  const token = c.get('jwtPayload');
  if (token?.userId) return token.userId;
  if (token?.sub) return token.sub;

  return undefined;
}

/**
 * Determine error type from error object
 */
function getErrorType(error: any): string {
  if (error.name) {
    switch (error.name) {
      case 'ValidationError':
        return 'validation_error';
      case 'AuthenticationError':
        return 'authentication_error';
      case 'AuthorizationError':
        return 'authorization_error';
      case 'NotFoundError':
        return 'not_found_error';
      case 'DatabaseError':
        return 'database_error';
      case 'NetworkError':
        return 'network_error';
      default:
        return 'application_error';
    }
  }

  if (error.status) {
    if (error.status >= 500) return 'server_error';
    if (error.status >= 400) return 'client_error';
  }

  return 'unknown_error';
}

export const dbAPM = createDatabaseAPM();
export const wsAPM = createWebSocketAPM();

