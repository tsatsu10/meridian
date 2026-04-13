/**
 * 🛡️ Global Error Handler Middleware
 * 
 * Catches all errors, formats them consistently, and logs appropriately.
 * 
 * @epic-infrastructure: Centralized error handling for all API routes
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { AppError, getErrorDetails, isOperationalError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit-logger';

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
    requestId?: string;
    timestamp: string;
    path?: string;
  };
}

/**
 * Global error handler middleware for Hono
 */
export async function errorHandler(err: Error, c: Context) {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  const path = c.req.path;
  const method = c.req.method;
  const userEmail = c.get('userEmail') || 'anonymous';
  const userId = c.get('userId');

  // Extract error details
  const errorDetails = getErrorDetails(err);
  const { message, code, statusCode, details, stack } = errorDetails;

  // Determine if this is an operational error or a programmer error
  const operational = isOperationalError(err);

  // Create standardized error response
  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      statusCode,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      requestId,
      timestamp: new Date().toISOString(),
      path,
    },
  };

  // Log based on severity
  const logContext = {
    requestId,
    method,
    path,
    userEmail,
    userId,
    statusCode,
    code,
    operational,
    duration: Date.now() - startTime,
    userAgent: c.req.header('user-agent'),
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
  };

  if (statusCode >= 500) {
    // Server errors - log with full stack trace
    logger.error('Server error occurred', {
      ...logContext,
      message,
      details,
      stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    });

    // Audit log for critical errors
    if (!operational) {
      await auditLogger.logEvent({
        eventType: 'security_violation',
        action: 'unexpected_error',
        userEmail,
        userId,
        ipAddress: logContext.ipAddress,
        userAgent: logContext.userAgent,
        outcome: 'failure',
        severity: 'critical',
        details: {
          message,
          code,
          path,
          method,
        },
        metadata: {
          stack: stack?.substring(0, 500), // Truncate stack trace
          timestamp: new Date(),
        },
      });
    }
  } else if (statusCode >= 400) {
    // Client errors - log as warnings
    if (statusCode === 401 || statusCode === 403) {
      // Auth errors - audit log
      await auditLogger.logEvent({
        eventType: 'authorization',
        action: statusCode === 401 ? 'unauthorized_access' : 'forbidden_access',
        userEmail,
        userId,
        ipAddress: logContext.ipAddress,
        userAgent: logContext.userAgent,
        outcome: 'blocked',
        severity: 'medium',
        details: {
          message,
          code,
          path,
          method,
        },
        metadata: {
          timestamp: new Date(),
        },
      });
    }

    logger.warn('Client error occurred', {
      ...logContext,
      message,
      details,
    });
  } else {
    // Other status codes
    logger.info('Request completed with error', logContext);
  }

  // Set response headers
  c.header('X-Request-ID', requestId);
  c.header('X-Content-Type-Options', 'nosniff');

  // Add rate limit headers if applicable
  if (statusCode === 429 && details?.retryAfter) {
    c.header('Retry-After', String(details.retryAfter));
    c.header('X-RateLimit-Reset', String(details.retryAfter));
  }

  // Return error response
  return c.json(errorResponse, statusCode as any);
}

/**
 * Wrapper to handle async errors in route handlers
 */
export function asyncHandler<T extends Context>(
  fn: (c: T) => Promise<Response | void>
) {
  return async (c: T) => {
    try {
      return await fn(c);
    } catch (error) {
      return errorHandler(error as Error, c);
    }
  };
}

/**
 * Not found (404) handler
 */
export function notFoundHandler(c: Context) {
  return c.json(
    {
      error: {
        message: 'Route not found',
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
        path: c.req.path,
        method: c.req.method,
        timestamp: new Date().toISOString(),
      },
    },
    404
  );
}

/**
 * Helper to validate required fields and throw MissingFieldError
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const { MissingFieldError } = require('../utils/errors');
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new MissingFieldError(field);
    }
  }
}

/**
 * Helper to handle database errors and convert to AppError
 */
export function handleDatabaseError(error: unknown, context?: string): never {
  const { DatabaseError, ConstraintViolationError } = require('../utils/errors');
  
  const err = error as any;
  
  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    throw new ConstraintViolationError('unique_constraint', {
      context,
      constraint: err.constraint,
    });
  }
  
  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    throw new ConstraintViolationError('foreign_key_constraint', {
      context,
      constraint: err.constraint,
    });
  }
  
  // PostgreSQL not null violation
  if (err.code === '23502') {
    throw new ConstraintViolationError('not_null_constraint', {
      context,
      column: err.column,
    });
  }
  
  // Generic database error
  throw new DatabaseError(
    context ? `Database error in ${context}` : 'Database error occurred',
    {
      code: err.code,
      detail: err.detail,
    }
  );
}

/**
 * Helper to safely handle external API errors
 */
export function handleExternalError(
  error: unknown,
  service: string,
  context?: string
): never {
  const { ExternalServiceError, TimeoutError } = require('../utils/errors');
  
  const err = error as any;
  
  // Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
    throw new TimeoutError(`${service} request timed out`, {
      service,
      context,
    });
  }
  
  // Handle generic external errors
  throw new ExternalServiceError(
    service,
    context ? `${service} error in ${context}` : undefined,
    {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode || err.status,
    }
  );
}


