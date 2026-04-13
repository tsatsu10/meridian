/**
 * Request Logging Middleware
 * Automatic request/response logging
 * Phase 1 - Monitoring & Observability
 */

import { MiddlewareHandler } from 'hono';
import { Logger } from '../services/logging/logger';

interface RequestLogOptions {
  excludePaths?: string[];
  logBody?: boolean;
  logHeaders?: boolean;
  sensitiveHeaders?: string[];
}

/**
 * Request logging middleware
 */
export function requestLogger(options: RequestLogOptions = {}): MiddlewareHandler {
  const {
    excludePaths = ['/api/health', '/api/health/live', '/api/health/ready'],
    logBody = false,
    logHeaders = false,
    sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'],
  } = options;

  return async (c, next) => {
    const path = c.req.path;

    // Skip logging for excluded paths
    if (excludePaths.some(excluded => path.startsWith(excluded))) {
      return next();
    }

    const startTime = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    const userAgent = c.req.header('user-agent') || 'unknown';
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               'unknown';

    // Get request ID if available
    const requestId = c.req.header('x-request-id') || 
                      `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Build metadata
    const meta: Record<string, any> = {
      requestId,
      method,
      path,
      userAgent,
      ip,
    };

    // Add headers if enabled
    if (logHeaders) {
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((value, key) => {
        // Filter sensitive headers
        if (!sensitiveHeaders.includes(key.toLowerCase())) {
          headers[key] = value;
        }
      });
      meta.headers = headers;
    }

    // Add body if enabled (for POST/PUT/PATCH)
    if (logBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        // Clone request to read body without consuming it
        const body = await c.req.json().catch(() => null);
        if (body) {
          // Filter sensitive fields
          const sanitizedBody = { ...body };
          delete sanitizedBody.password;
          delete sanitizedBody.token;
          delete sanitizedBody.secret;
          meta.body = sanitizedBody;
        }
      } catch (error) {
        // Body might not be JSON
      }
    }

    // Log request
    Logger.http('→ Request', meta);

    try {
      // Process request
      await next();

      // Calculate duration
      const duration = Date.now() - startTime;
      const statusCode = c.res.status;

      // Log response
      Logger.request(method, path, statusCode, duration, {
        requestId,
        ip,
        userAgent,
      });

      // Log slow requests
      if (duration > 1000) {
        Logger.warn('Slow request detected', {
          requestId,
          method,
          path,
          duration,
          statusCode,
        });
      }
    } catch (error: any) {
      // Calculate duration even on error
      const duration = Date.now() - startTime;

      // Log error
      Logger.error('Request error', error, {
        requestId,
        method,
        path,
        duration,
        ip,
        userAgent,
      });

      // Re-throw to be handled by error handler
      throw error;
    }
  };
}

/**
 * Error logging middleware
 */
export function errorLogger(): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch (error: any) {
      const requestId = c.req.header('x-request-id') || 'unknown';
      const method = c.req.method;
      const path = c.req.path;

      Logger.error('Unhandled error in request', error, {
        requestId,
        method,
        path,
        statusCode: error.status || 500,
      });

      // Return error response
      return c.json(
        {
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'An unexpected error occurred',
          requestId,
        },
        error.status || 500
      );
    }
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    await next();

    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;

    // Log performance metrics for slow or memory-intensive requests
    if (duration > 500 || memoryDelta > 10 * 1024 * 1024) {
      Logger.performance(
        `${c.req.method} ${c.req.path}`,
        duration,
        'ms',
        {
          memoryDelta: Math.round(memoryDelta / 1024 / 1024), // MB
          statusCode: c.res.status,
        }
      );
    }
  };
}

/**
 * Rate limit logging middleware
 */
export function rateLimitLogger(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Log rate limit headers if present
    const remaining = c.res.headers.get('X-RateLimit-Remaining');
    const limit = c.res.headers.get('X-RateLimit-Limit');

    if (remaining && limit && parseInt(remaining) < 10) {
      Logger.warn('Rate limit approaching', {
        path: c.req.path,
        remaining: parseInt(remaining),
        limit: parseInt(limit),
        ip: c.req.header('x-forwarded-for') || 'unknown',
      });
    }
  };
}

/**
 * User activity logging middleware
 */
export function activityLogger(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    const user = c.get('user');
    if (user) {
      const method = c.req.method;
      const path = c.req.path;
      const statusCode = c.res.status;

      // Log user activity for state-changing operations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && statusCode < 400) {
        Logger.business('User activity', {
          userId: user.id,
          userEmail: user.email,
          action: `${method} ${path}`,
          statusCode,
        });
      }
    }

    return next();
  };
}


