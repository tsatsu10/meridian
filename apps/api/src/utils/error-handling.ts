/**
 * Centralized Error Handling System
 * Provides consistent error handling patterns across the API
 */

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger } from './logger';

// Error Categories
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC'
}

// Error Severity Levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

function statusCode(value: number): ContentfulStatusCode {
  return value as unknown as ContentfulStatusCode;
}

// Standard Error Interface
export interface StandardError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  details?: Record<string, any>;
  cause?: Error;
  timestamp: string;
  requestId?: string;
  userId?: string;
}

// Error Code Registry
export const ERROR_CODES = {
  // Authentication Errors (1000-1099)
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_001',
    message: 'Invalid credentials provided',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_002',
    message: 'Authentication token has expired',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401
  },
  AUTH_USER_NOT_FOUND: {
    code: 'AUTH_003',
    message: 'User account not found',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401
  },
  AUTH_SESSION_INVALID: {
    code: 'AUTH_004',
    message: 'Invalid or expired session',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 401
  },

  // Authorization Errors (1100-1199)
  AUTHZ_INSUFFICIENT_PERMISSIONS: {
    code: 'AUTHZ_001',
    message: 'Insufficient permissions for this operation',
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 403
  },
  AUTHZ_WORKSPACE_ACCESS_DENIED: {
    code: 'AUTHZ_002',
    message: 'Access denied to workspace',
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 403
  },
  AUTHZ_PROJECT_ACCESS_DENIED: {
    code: 'AUTHZ_003',
    message: 'Access denied to project',
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 403
  },

  // Validation Errors (1200-1299)
  VALIDATION_MISSING_FIELD: {
    code: 'VAL_001',
    message: 'Required field is missing',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    statusCode: 400
  },
  VALIDATION_INVALID_FORMAT: {
    code: 'VAL_002',
    message: 'Invalid data format',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    statusCode: 400
  },
  VALIDATION_CONSTRAINT_VIOLATION: {
    code: 'VAL_003',
    message: 'Data constraint violation',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    statusCode: 400
  },

  // Not Found Errors (1300-1399)
  RESOURCE_NOT_FOUND: {
    code: 'NF_001',
    message: 'Requested resource not found',
    category: ErrorCategory.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    statusCode: 404
  },
  WORKSPACE_NOT_FOUND: {
    code: 'NF_002',
    message: 'Workspace not found',
    category: ErrorCategory.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    statusCode: 404
  },
  PROJECT_NOT_FOUND: {
    code: 'NF_003',
    message: 'Project not found',
    category: ErrorCategory.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    statusCode: 404
  },
  TASK_NOT_FOUND: {
    code: 'NF_004',
    message: 'Task not found',
    category: ErrorCategory.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    statusCode: 404
  },

  // Database Errors (1400-1499)
  DATABASE_CONNECTION_ERROR: {
    code: 'DB_001',
    message: 'Database connection failed',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    statusCode: 500
  },
  DATABASE_QUERY_ERROR: {
    code: 'DB_002',
    message: 'Database query failed',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    statusCode: 500
  },
  DATABASE_CONSTRAINT_ERROR: {
    code: 'DB_003',
    message: 'Database constraint violation',
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 409
  },

  // External Service Errors (1500-1599)
  EXTERNAL_SERVICE_UNAVAILABLE: {
    code: 'EXT_001',
    message: 'External service is unavailable',
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    statusCode: 503
  },
  EXTERNAL_SERVICE_TIMEOUT: {
    code: 'EXT_002',
    message: 'External service request timed out',
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 504
  },

  // Business Logic Errors (1600-1699)
  BUSINESS_RULE_VIOLATION: {
    code: 'BIZ_001',
    message: 'Business rule violation',
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 422
  },
  WORKSPACE_LIMIT_EXCEEDED: {
    code: 'BIZ_002',
    message: 'Workspace limit exceeded',
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 422
  },

  // Rate Limiting (1700-1799)
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_001',
    message: 'Rate limit exceeded',
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 429
  },

  // Internal Errors (1800-1899)
  INTERNAL_SERVER_ERROR: {
    code: 'INT_001',
    message: 'Internal server error',
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.CRITICAL,
    statusCode: 500
  }
} as const;

// Error Factory
export class ErrorFactory {
  static create(
    errorType: keyof typeof ERROR_CODES,
    options: {
      details?: Record<string, any>;
      cause?: Error;
      requestId?: string;
      userId?: string;
      message?: string; // Override default message
    } = {}
  ): StandardError {
    const errorDef = ERROR_CODES[errorType];

    return {
      ...errorDef,
      message: options.message || errorDef.message,
      details: options.details,
      cause: options.cause,
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
      userId: options.userId
    };
  }

  static fromHTTPException(error: HTTPException, requestId?: string): StandardError {
    return {
      code: 'HTTP_' + error.status.toString().padStart(3, '0'),
      message: error.message,
      category: this.categorizeHTTPStatus(error.status),
      severity: this.getSeverityFromStatus(error.status),
      statusCode: error.status,
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  static fromError(error: Error, requestId?: string): StandardError {
    if (error instanceof HTTPException) {
      return this.fromHTTPException(error, requestId);
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      statusCode: 500,
      cause: error,
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  private static categorizeHTTPStatus(status: number): ErrorCategory {
    if (status === 401) return ErrorCategory.AUTHENTICATION;
    if (status === 403) return ErrorCategory.AUTHORIZATION;
    if (status >= 400 && status < 500) return ErrorCategory.VALIDATION;
    if (status === 404) return ErrorCategory.NOT_FOUND;
    if (status === 409) return ErrorCategory.CONFLICT;
    if (status === 429) return ErrorCategory.RATE_LIMIT;
    if (status >= 500) return ErrorCategory.INTERNAL;
    return ErrorCategory.INTERNAL;
  }

  private static getSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status === 429) return ErrorSeverity.MEDIUM;
    if (status >= 400) return ErrorSeverity.LOW;
    return ErrorSeverity.LOW;
  }
}

// Error Handler Middleware
export const errorHandler = async (error: Error, c: Context) => {
  const requestId = c.get('requestId') || generateRequestId();
  const userId = c.get('user')?.id;

  let standardError: StandardError;

  if (error instanceof HTTPException) {
    standardError = ErrorFactory.fromHTTPException(error, requestId);
  } else {
    standardError = ErrorFactory.fromError(error, requestId);
  }

  // Log error based on severity
  const logData = {
    error: standardError,
    request: {
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.header() as any),
      userAgent: c.req.header('user-agent')
    },
    user: userId ? { id: userId } : undefined
  };

  switch (standardError.severity) {
    case ErrorSeverity.CRITICAL:
      logger.error('🚨 CRITICAL ERROR:', logData);
      break;
    case ErrorSeverity.HIGH:
      logger.error('❌ HIGH SEVERITY ERROR:', logData);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn('⚠️ MEDIUM SEVERITY ERROR:', logData);
      break;
    case ErrorSeverity.LOW:
      logger.info('ℹ️ LOW SEVERITY ERROR:', logData);
      break;
  }

  // Return standardized error response
  return c.json(
    {
      error: {
        code: standardError.code,
        message: standardError.message,
        category: standardError.category,
        timestamp: standardError.timestamp,
        requestId: standardError.requestId,
        ...(process.env.NODE_ENV === 'development' && {
          details: standardError.details,
          stack: standardError.cause?.stack
        })
      }
    },
    statusCode(standardError.statusCode)
  );
};

// Utility Functions
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isExpectedError = (error: StandardError): boolean => {
  return error.category === ErrorCategory.NOT_FOUND ||
         error.category === ErrorCategory.VALIDATION ||
         error.category === ErrorCategory.AUTHORIZATION;
};

// Async wrapper for consistent error handling
export const asyncHandler = (fn: Function) => {
  return async (c: Context, next?: Function) => {
    try {
      return await fn(c, next);
    } catch (error) {
      return errorHandler(error as Error, c);
    }
  };
};

// Database error mapping
export const mapDatabaseError = (error: any): StandardError => {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
    return ErrorFactory.create('DATABASE_CONSTRAINT_ERROR', {
      details: { constraint: 'unique', field: error.message }
    });
  }

  if (error.code === 'SQLITE_CONSTRAINT_FOREIGN_KEY' || error.code === '23503') {
    return ErrorFactory.create('DATABASE_CONSTRAINT_ERROR', {
      details: { constraint: 'foreign_key', field: error.message }
    });
  }

  return ErrorFactory.create('DATABASE_QUERY_ERROR', {
    details: { originalError: error.message },
    cause: error
  });
};

