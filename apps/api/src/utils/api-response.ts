/**
 * Standardized API Response Utilities
 * Provides consistent response formats across all API endpoints
 */

import { Context } from 'hono';
import logger from './logger';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string; // For validation errors
  };
  metadata: {
    timestamp: string;
    requestId?: string;
    path: string;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standard error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_SESSION: 'INVALID_SESSION',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Operations
  OPERATION_FAILED: 'OPERATION_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST'
} as const;

/**
 * Success response helper
 */
export function successResponse<T>(
  c: Context,
  data: T,
  options?: {
    message?: string;
    statusCode?: number;
    pagination?: ApiSuccessResponse<T>['metadata']['pagination'];
  }
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message: options?.message,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId'),
      pagination: options?.pagination
    }
  };

  return c.json(response, options?.statusCode || 200);
}

/**
 * Error response helper
 */
export function errorResponse(
  c: Context,
  error: {
    code: keyof typeof ERROR_CODES;
    message: string;
    details?: any;
    field?: string;
  },
  statusCode: number = 500
): Response {
  const url = new URL(c.req.url);

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      field: error.field
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: c.get('requestId'),
      path: url.pathname
    }
  };

  // Log error for monitoring
  logger.error('API Error Response', {
    code: error.code,
    message: error.message,
    statusCode,
    path: url.pathname,
    details: error.details
  });

  return c.json(response, statusCode);
}

/**
 * Validation error helper
 */
export function validationErrorResponse(
  c: Context,
  message: string,
  field?: string,
  details?: any
): Response {
  return errorResponse(c, {
    code: 'VALIDATION_ERROR',
    message,
    field,
    details
  }, 400);
}

/**
 * Authentication error helper
 */
export function authErrorResponse(
  c: Context,
  message: string = 'Authentication required'
): Response {
  return errorResponse(c, {
    code: 'AUTHENTICATION_REQUIRED',
    message
  }, 401);
}

/**
 * Not found error helper
 */
export function notFoundResponse(
  c: Context,
  resource: string = 'Resource'
): Response {
  return errorResponse(c, {
    code: 'RESOURCE_NOT_FOUND',
    message: `${resource} not found`
  }, 404);
}

/**
 * Internal server error helper
 */
export function internalErrorResponse(
  c: Context,
  message: string = 'Internal server error',
  details?: any
): Response {
  return errorResponse(c, {
    code: 'INTERNAL_SERVER_ERROR',
    message,
    details
  }, 500);
}

/**
 * Database error helper
 */
export function databaseErrorResponse(
  c: Context,
  operation: string,
  originalError?: any
): Response {
  return errorResponse(c, {
    code: 'DATABASE_ERROR',
    message: `Database operation failed: ${operation}`,
    details: process.env.NODE_ENV === 'development' ? originalError?.message : undefined
  }, 500);
}

