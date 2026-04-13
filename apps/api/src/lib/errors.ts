import { Context } from 'hono';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import logger from '../utils/logger';

// Standard error response interface
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
  success: false;
}

// Error codes enum
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Custom error class
export class AppError extends Error {
  public readonly code: ErrorCode | string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity | string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    codeOrMessage: ErrorCode | string,
    messageOrStatusCode?: string | number,
    statusCodeOrSeverity?: number | string,
    severityOrDetails?: ErrorSeverity | string | any,
    detailsOrIsOperational?: any | boolean,
    isOperational?: boolean
  ) {
    // Support both old signature (message first) and new signature (code first)
    let code: ErrorCode | string;
    let message: string;
    let statusCode: number;
    let severity: ErrorSeverity | string;
    let details: any;
    let operational: boolean;

    // Check if using new signature (code first) by checking if first arg is ErrorCode enum
    const isNewSignature = Object.values(ErrorCode).includes(codeOrMessage as ErrorCode);

    if (!isNewSignature && (messageOrStatusCode === undefined || typeof messageOrStatusCode === 'number')) {
      // Old signature: AppError(message, statusCode?, severity?, details?, isOperational?)
      message = codeOrMessage as string;
      statusCode = (messageOrStatusCode as number) || 500;
      severity = (statusCodeOrSeverity as string) || ErrorSeverity.MEDIUM;
      details = severityOrDetails;
      operational = typeof detailsOrIsOperational === 'boolean' ? detailsOrIsOperational : true;
      code = 'AppError';
    } else {
      // New signature: AppError(code, message, statusCode, severity, details, isOperational)
      code = codeOrMessage as ErrorCode;
      message = (messageOrStatusCode as string) || '';
      statusCode = (statusCodeOrSeverity as number) || 500;
      severity = (severityOrDetails as ErrorSeverity) || ErrorSeverity.MEDIUM;
      details = detailsOrIsOperational;
      operational = isOperational !== undefined ? isOperational : true;
    }

    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.details = details;
    this.isOperational = operational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error factory functions
export const createError = {
  unauthorized: (message: string = 'Unauthorized', details?: any) =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401, ErrorSeverity.MEDIUM, details),

  forbidden: (message: string = 'Forbidden', details?: any) =>
    new AppError(ErrorCode.FORBIDDEN, message, 403, ErrorSeverity.MEDIUM, details),

  notFound: (message: string = 'Resource not found', details?: any) =>
    new AppError(ErrorCode.NOT_FOUND, message, 404, ErrorSeverity.LOW, details),

  badRequest: (message: string = 'Bad request', details?: any) =>
    new AppError(ErrorCode.INVALID_INPUT, message, 400, ErrorSeverity.LOW, details),

  validationError: (message: string = 'Validation error', details?: any) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, ErrorSeverity.LOW, details),

  conflict: (message: string = 'Resource conflict', details?: any) =>
    new AppError(ErrorCode.CONFLICT, message, 409, ErrorSeverity.MEDIUM, details),

  databaseError: (message: string = 'Database error', details?: any) =>
    new AppError(ErrorCode.DATABASE_ERROR, message, 500, ErrorSeverity.HIGH, details),

  internalError: (message: string = 'Internal server error', details?: any) =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500, ErrorSeverity.CRITICAL, details),

  serverError: (message: string = 'Internal server error', details?: any) =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500, ErrorSeverity.CRITICAL, details, false),

  serviceUnavailable: (message: string = 'Service unavailable', details?: any) =>
    new AppError(ErrorCode.SERVICE_UNAVAILABLE, message, 503, ErrorSeverity.HIGH, details),

  rateLimited: (message: string = 'Rate limit exceeded', details?: any) =>
    new AppError(ErrorCode.RATE_LIMITED, message, 429, ErrorSeverity.MEDIUM, details),
};

// Error handler middleware
export function errorHandler() {
  return async (err: Error, c: Context) => {
    logger.error('Error caught by middleware:', err);

    let errorResponse: any;
    let statusCode = 500;

    if (err instanceof AppError) {
      // Handle our custom application errors
      // Use the actual ErrorCode if it's an enum value, otherwise use 'AppError'
      const code = typeof err.code === 'string' && err.code in ErrorCode
        ? err.code
        : 'AppError';

      errorResponse = {
        error: {
          code,
          message: err.message,
          statusCode: err.statusCode,
          severity: err.severity,
          details: err.details,
        },
        success: false,
      };
      statusCode = err.statusCode;

      // Log based on severity
      if (err.severity === ErrorSeverity.CRITICAL || err.severity === ErrorSeverity.HIGH || err.severity === 'critical' || err.severity === 'high') {
        logger.error('High severity error:', err);
        // Send to monitoring service
        await reportError(err, c);
      }
    } else if (err instanceof HTTPException) {
      // Handle Hono HTTP exceptions
      errorResponse = {
        error: {
          code: 'HTTP_EXCEPTION',
          message: err.message,
          statusCode: err.status,
          severity: 'medium',
        },
        success: false,
      };
      statusCode = err.status;
    } else {
      // Handle unexpected errors
      errorResponse = {
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred.',
          statusCode: 500,
          severity: 'critical',
        },
        success: false,
      };

      // Log unexpected errors
      logger.error('Unexpected error:', err);
      await reportError(err, c);
    }

    return c.json(errorResponse, statusCode);
  };
}

// Error reporting function
async function reportError(error: Error, c: Context) {
  try {
    // Send to external monitoring service (Sentry, DataDog, etc.)
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        url: c.req.url,
        method: c.req.method,
        userAgent: c.req.header('user-agent'),
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        requestId: c.get('requestId'),
        userId: c.get('userId'),
        workspaceId: c.get('workspaceId'),
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };

    // In a real application, you would send this to your monitoring service
    logger.debug('Error report:', errorReport);
  } catch (reportingError) {
    logger.error('Failed to report error:', reportingError);
  }
}

// Retry utility with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryCondition?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = () => true,
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if condition is not met
      if (!retryCondition(lastError)) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );
      
      logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Database retry wrapper
export function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return withRetry(operation, {
    maxRetries,
    retryCondition: (error) => {
      // Retry on connection errors, timeouts, and temporary failures
      return (
        error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')
      );
    },
  });
}

// Validation error helper
export function createValidationError(field: string, message: string, value?: any) {
  return createError.validationError(`Validation failed for field '${field}': ${message}`, {
    field,
    value,
  });
}

// Success response helper
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    data,
    message,
    success: true,
    timestamp: new Date().toISOString(),
  };
}

// Error reporting schema
const errorReportSchema = z.object({
  message: z.string({ required_error: 'Error message is required' }).trim().min(1, 'Error message is required'),
  level: z.enum(['info', 'warning', 'error', 'critical']).optional().default('error'),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  userAgent: z.string().optional(),
  url: z.string().url().optional(),
  timestamp: z.string().datetime({ message: 'Invalid date string' }).optional(),
  metadata: z.record(z.any()).optional(),
});

// Error reporting route
export const errorsRoute = new Hono()
  .post(
    '/report',
    async (c, next) => {
      // Check Content-Type header
      const contentType = c.req.header('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return c.json({
          success: false,
          error: { message: 'Invalid request data' },
        }, 400);
      }

      // Try to parse JSON
      try {
        await c.req.json();
      } catch (error) {
        return c.json({
          success: false,
          error: { message: 'Invalid request data' },
        }, 400);
      }

      await next();
    },
    zValidator('json', errorReportSchema, (result, c) => {
      if (!result.success) {
        const errors = result.error.issues.map(issue => {
          let message = issue.message;

          // Simplify Zod's enum error message
          if (message.startsWith('Invalid enum value.')) {
            message = 'Invalid enum value';
          }

          return {
            path: issue.path.join('.'),
            message,
          };
        });
        return c.json({
          success: false,
          error: { errors },
        }, 400);
      }
    }),
    async (c) => {
      try {
        const report = c.req.valid('json');

        // Log the error report
        logger.error('Client-side error reported:', report);

        // In a real application, you would send this to your monitoring service
        // (Sentry, DataDog, etc.)

        return c.json({
          success: true,
          message: 'Error report received',
        });
      } catch (error) {
        // Even if error reporting fails, return success to not block the client
        logger.error('Failed to process error report:', error);
        return c.json({
          success: true,
          message: 'Error report received',
        });
      }
    }
  );

