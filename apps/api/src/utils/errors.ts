/**
 * 🛡️ Standardized Error Handling System
 * 
 * Provides typed error classes and consistent error responses across the API.
 * 
 * @epic-infrastructure: Foundation for all API error handling
 */

import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

type AppStatusCode = ContentfulStatusCode;

/**
 * Error codes for consistent error identification
 */
export enum ErrorCode {
  // Authentication & Authorization (1xxx)
  UNAUTHORIZED = 'AUTH_001',
  FORBIDDEN = 'AUTH_002',
  TOKEN_EXPIRED = 'AUTH_003',
  TOKEN_INVALID = 'AUTH_004',
  SESSION_EXPIRED = 'AUTH_005',
  
  // Validation (2xxx)
  VALIDATION_ERROR = 'VAL_001',
  INVALID_INPUT = 'VAL_002',
  MISSING_FIELD = 'VAL_003',
  INVALID_FORMAT = 'VAL_004',
  
  // Resource (3xxx)
  NOT_FOUND = 'RES_001',
  ALREADY_EXISTS = 'RES_002',
  CONFLICT = 'RES_003',
  GONE = 'RES_004',
  
  // Business Logic (4xxx)
  BUSINESS_RULE_VIOLATION = 'BIZ_001',
  INSUFFICIENT_PERMISSIONS = 'BIZ_002',
  QUOTA_EXCEEDED = 'BIZ_003',
  INVALID_STATE = 'BIZ_004',
  OPERATION_NOT_ALLOWED = 'BIZ_005',
  
  // External Services (5xxx)
  EXTERNAL_SERVICE_ERROR = 'EXT_001',
  INTEGRATION_ERROR = 'EXT_002',
  THIRD_PARTY_ERROR = 'EXT_003',
  
  // Database (6xxx)
  DATABASE_ERROR = 'DB_001',
  TRANSACTION_FAILED = 'DB_002',
  CONSTRAINT_VIOLATION = 'DB_003',
  CONNECTION_ERROR = 'DB_004',
  
  // Rate Limiting (7xxx)
  RATE_LIMIT_EXCEEDED = 'RATE_001',
  TOO_MANY_REQUESTS = 'RATE_002',
  
  // Internal (8xxx)
  INTERNAL_ERROR = 'INT_001',
  NOT_IMPLEMENTED = 'INT_002',
  SERVICE_UNAVAILABLE = 'INT_003',
  TIMEOUT = 'INT_004',
}

/**
 * Base application error class
 */
export class AppError extends HTTPException {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    statusCode: AppStatusCode,
    message: string,
    code: ErrorCode,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(statusCode, { message });
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.status,
        details: this.details,
      },
    };
  }
}

/**
 * Authentication errors (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(401 as AppStatusCode, message, ErrorCode.UNAUTHORIZED, details);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token has expired', details?: Record<string, any>) {
    super(401 as AppStatusCode, message, ErrorCode.TOKEN_EXPIRED, details);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid token', details?: Record<string, any>) {
    super(401 as AppStatusCode, message, ErrorCode.TOKEN_INVALID, details);
  }
}

/**
 * Authorization errors (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', details?: Record<string, any>) {
    super(403 as AppStatusCode, message, ErrorCode.FORBIDDEN, details);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super(403 as AppStatusCode, message, ErrorCode.INSUFFICIENT_PERMISSIONS, details);
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, any>) {
    super(400 as AppStatusCode, message, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string = 'Invalid input', details?: Record<string, any>) {
    super(400 as AppStatusCode, message, ErrorCode.INVALID_INPUT, details);
  }
}

export class MissingFieldError extends AppError {
  constructor(field: string, details?: Record<string, any>) {
    super(400 as AppStatusCode, `Missing required field: ${field}`, ErrorCode.MISSING_FIELD, {
      field,
      ...details,
    });
  }
}

/**
 * Resource errors (404, 409, 410)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: Record<string, any>) {
    super(404 as AppStatusCode, `${resource} not found`, ErrorCode.NOT_FOUND, details);
  }
}

export class AlreadyExistsError extends AppError {
  constructor(resource: string = 'Resource', details?: Record<string, any>) {
    super(409 as AppStatusCode, `${resource} already exists`, ErrorCode.ALREADY_EXISTS, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict detected', details?: Record<string, any>) {
    super(409 as AppStatusCode, message, ErrorCode.CONFLICT, details);
  }
}

export class GoneError extends AppError {
  constructor(message: string = 'Resource no longer available', details?: Record<string, any>) {
    super(410 as AppStatusCode, message, ErrorCode.GONE, details);
  }
}

/**
 * Business logic errors (422)
 */
export class BusinessRuleViolationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(422 as AppStatusCode, message, ErrorCode.BUSINESS_RULE_VIOLATION, details);
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string = 'Invalid state for this operation', details?: Record<string, any>) {
    super(422 as AppStatusCode, message, ErrorCode.INVALID_STATE, details);
  }
}

export class OperationNotAllowedError extends AppError {
  constructor(message: string = 'Operation not allowed', details?: Record<string, any>) {
    super(422 as AppStatusCode, message, ErrorCode.OPERATION_NOT_ALLOWED, details);
  }
}

export class QuotaExceededError extends AppError {
  constructor(quota: string, details?: Record<string, any>) {
    super(422 as AppStatusCode, `Quota exceeded: ${quota}`, ErrorCode.QUOTA_EXCEEDED, {
      quota,
      ...details,
    });
  }
}

/**
 * Rate limiting errors (429)
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    details?: Record<string, any>
  ) {
    super(429 as AppStatusCode, message, ErrorCode.RATE_LIMIT_EXCEEDED, {
      retryAfter,
      ...details,
    });
  }
}

/**
 * External service errors (502, 503)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: Record<string, any>) {
    super(
      502 as AppStatusCode,
      message || `External service error: ${service}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      { service, ...details }
    );
  }
}

export class IntegrationError extends AppError {
  constructor(integration: string, message?: string, details?: Record<string, any>) {
    super(
      502 as AppStatusCode,
      message || `Integration error: ${integration}`,
      ErrorCode.INTEGRATION_ERROR,
      { integration, ...details }
    );
  }
}

/**
 * Database errors (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', details?: Record<string, any>) {
    super(500 as AppStatusCode, message, ErrorCode.DATABASE_ERROR, details, false);
  }
}

export class TransactionFailedError extends AppError {
  constructor(message: string = 'Transaction failed', details?: Record<string, any>) {
    super(500 as AppStatusCode, message, ErrorCode.TRANSACTION_FAILED, details, false);
  }
}

export class ConstraintViolationError extends AppError {
  constructor(constraint: string, details?: Record<string, any>) {
    super(500 as AppStatusCode, `Database constraint violation: ${constraint}`, ErrorCode.CONSTRAINT_VIOLATION, {
      constraint,
      ...details,
    }, false);
  }
}

/**
 * Internal server errors (500, 501, 503, 504)
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super(500 as AppStatusCode, message, ErrorCode.INTERNAL_ERROR, details, false);
  }
}

export class NotImplementedError extends AppError {
  constructor(message: string = 'Not implemented', details?: Record<string, any>) {
    super(501 as AppStatusCode, message, ErrorCode.NOT_IMPLEMENTED, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: Record<string, any>) {
    super(503 as AppStatusCode, message, ErrorCode.SERVICE_UNAVAILABLE, details);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', details?: Record<string, any>) {
    super(504 as AppStatusCode, message, ErrorCode.TIMEOUT, details);
  }
}

/**
 * Helper to determine if an error is operational (expected) or programmer error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper to extract error details from various error types
 */
export function getErrorDetails(error: unknown): {
  message: string;
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, any>;
  stack?: string;
} {
  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.status,
      details: error.details,
      stack: error.stack,
    };
  }

  // Handle HTTPException from Hono
  if (error instanceof HTTPException) {
    return {
      message: error.message,
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: error.status,
      stack: error.stack,
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: 500,
      stack: error.stack,
    };
  }

  // Handle unknown error types
  return {
    message: 'An unexpected error occurred',
    code: ErrorCode.INTERNAL_ERROR,
    statusCode: 500,
    details: { originalError: String(error) },
  };
}


