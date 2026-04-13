/**
 * Global Error Handling Middleware
 * Provides consistent error handling across all API routes
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { errorHandler, generateRequestId, ErrorFactory } from '../utils/error-handling';
import logger from '../utils/logger';

// Request ID middleware - adds unique ID to each request
export const requestIdMiddleware = async (c: Context, next: Next) => {
  const requestId = generateRequestId();
  c.set('requestId', requestId);

  // Add request ID to response headers for debugging
  c.header('X-Request-ID', requestId);

  await next();
};

// Request logging middleware
export const requestLoggingMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const requestId = c.get('requestId');
  const method = c.req.method;
  const url = c.req.url;
  const userAgent = c.req.header('user-agent');
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  // Log incoming request
  logger.info('📥 Incoming request:', {
    requestId,
    method,
    url,
    userAgent,
    ip,
    timestamp: new Date().toISOString()
  });

  try {
    await next();

    const duration = Date.now() - startTime;
    const status = c.res.status;

    // Log successful response
    logger.info('📤 Request completed:', {
      requestId,
      method,
      url,
      status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error response
    logger.error('💥 Request failed:', {
      requestId,
      method,
      url,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    throw error; // Re-throw to be handled by error handler
  }
};

// Global error handling middleware
export const globalErrorHandler = async (error: Error, c: Context) => {
  const requestId = c.get('requestId');

  // Handle different types of errors
  try {
    return await errorHandler(error, c);
  } catch (handlerError) {
    // If our error handler fails, provide a basic fallback
    logger.error('🚨 Error handler failed:', {
      requestId,
      originalError: error.message,
      handlerError: handlerError instanceof Error ? handlerError.message : 'Unknown handler error'
    });

    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId,
          timestamp: new Date().toISOString()
        }
      },
      500
    );
  }
};

// Validation error middleware
export const validationErrorHandler = (validationError: any, c: Context) => {
  const requestId = c.get('requestId');

  // Extract validation details from error
  const validationDetails = {
    fields: validationError.issues || [],
    message: 'Validation failed'
  };

  const standardError = ErrorFactory.create('VALIDATION_MISSING_FIELD', {
    details: validationDetails,
    requestId,
    message: 'Request validation failed'
  });

  logger.warn('⚠️ Validation error:', standardError);

  return c.json(
    {
      error: {
        code: standardError.code,
        message: standardError.message,
        category: standardError.category,
        details: standardError.details,
        timestamp: standardError.timestamp,
        requestId
      }
    },
    400
  );
};

// Not found handler
export const notFoundHandler = (c: Context) => {
  const requestId = c.get('requestId');

  const standardError = ErrorFactory.create('RESOURCE_NOT_FOUND', {
    details: {
      method: c.req.method,
      path: c.req.path
    },
    requestId
  });

  logger.info('ℹ️ Resource not found:', standardError);

  return c.json(
    {
      error: {
        code: standardError.code,
        message: `Resource not found: ${c.req.method} ${c.req.path}`,
        category: standardError.category,
        timestamp: standardError.timestamp,
        requestId
      }
    },
    404
  );
};

// Rate limiting error handler
export const rateLimitErrorHandler = (c: Context) => {
  const requestId = c.get('requestId');

  const standardError = ErrorFactory.create('RATE_LIMIT_EXCEEDED', {
    details: {
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent')
    },
    requestId
  });

  logger.warn('⚠️ Rate limit exceeded:', standardError);

  return c.json(
    {
      error: {
        code: standardError.code,
        message: standardError.message,
        category: standardError.category,
        timestamp: standardError.timestamp,
        requestId,
        retryAfter: 60 // seconds
      }
    },
    429
  );
};

// Async route wrapper to ensure consistent error handling
export const asyncHandler = (fn: (c: Context, next?: Next) => Promise<any>) => {
  return async (c: Context, next?: Next) => {
    try {
      return await fn(c, next);
    } catch (error) {
      throw error; // Let global error handler catch it
    }
  };
};

// Database connection error handler
export const databaseErrorHandler = (error: any, c: Context) => {
  const requestId = c.get('requestId');

  let standardError;

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    standardError = ErrorFactory.create('DATABASE_CONNECTION_ERROR', {
      details: { originalError: error.message },
      requestId,
      cause: error
    });
  } else {
    standardError = ErrorFactory.create('DATABASE_QUERY_ERROR', {
      details: { originalError: error.message },
      requestId,
      cause: error
    });
  }

  logger.error('🗄️ Database error:', standardError);

  return c.json(
    {
      error: {
        code: standardError.code,
        message: 'Database operation failed',
        category: standardError.category,
        timestamp: standardError.timestamp,
        requestId
      }
    },
    standardError.statusCode
  );
};

// Health check middleware to verify system status
export const healthCheckMiddleware = async (c: Context, next: Next) => {
  // Add health metrics to context
  c.set('healthCheck', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage()
  });

  await next();
};

