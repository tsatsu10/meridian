/**
 * Consolidated Error Handling Utilities
 * Standardized error responses and handling across controllers
 */

import { Context } from 'hono';
import logger from './logger';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

function statusCode(value: number): ContentfulStatusCode {
  return value as unknown as ContentfulStatusCode;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export const CommonErrors = {
  NotFound: (resource: string) => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  Unauthorized: (message: string = 'Authentication required') => new AppError(message, 401, 'UNAUTHORIZED'),
  Forbidden: (message: string = 'Access denied') => new AppError(message, 403, 'FORBIDDEN'),
  BadRequest: (message: string, details?: any) => new AppError(message, 400, 'BAD_REQUEST', details),
  ValidationError: (message: string, details?: any) => new AppError(message, 422, 'VALIDATION_ERROR', details),
  InternalError: (message: string = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR'),
};

/**
 * Standard error response handler
 */
export function handleError(c: Context, error: unknown): Response {
  logger.error('API Error:', error);

  if (error instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    }, statusCode(error.statusCode));
  }

  // Handle database errors
  if (error instanceof Error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists',
        },
      }, statusCode(409));
    }

    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist',
        },
      }, statusCode(400));
    }
  }

  // Default error response
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  }, statusCode(500));
}

/**
 * Standard success response helper
 */
export function successResponse(c: Context, data: any, responseStatusCode: number = 200): Response {
  return c.json({
    success: true,
    data,
  }, statusCode(responseStatusCode));
}

/**
 * Async error wrapper for controllers
 */
export function asyncHandler(fn: Function) {
  return (c: Context) => {
    return Promise.resolve(fn(c)).catch(error => handleError(c, error));
  };
}

/**
 * Validation helper
 */
export function validateRequired(data: Record<string, any>, requiredFields: string[]): void {
  const missing = requiredFields.filter(field => !data[field] && data[field] !== 0);
  
  if (missing.length > 0) {
    throw CommonErrors.ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

