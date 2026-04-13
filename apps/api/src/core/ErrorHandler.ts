/**
 * @epic-5.1-api-standardization - Centralized error handling
 * @persona-all - Consistent error experience for all users
 */

import { APIResponseBuilder, ErrorCodes, ErrorCode } from './APIResponse';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public code: ErrorCode;
  public statusCode: number;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400, details);
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(message, ErrorCodes.NOT_FOUND, 404);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized access') {
    super(message, ErrorCodes.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Access forbidden') {
    super(message, ErrorCodes.FORBIDDEN, 403);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.RESOURCE_CONFLICT, 409, details);
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.DATABASE_ERROR, 500, details);
  }
}

export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string, details?: any) {
    super(
      `External service error: ${service} - ${message}`,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      502,
      details
    );
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, ErrorCodes.RATE_LIMIT_EXCEEDED, 429);
  }
}

export class ServiceUnavailableError extends CustomError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, ErrorCodes.SERVICE_UNAVAILABLE, 503);
  }
}

export class WebSocketError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.WEBSOCKET_ERROR, 500, details);
  }
}

export class ErrorHandler {
  static handle(error: Error | AppError): APIResponse {
    // Log the error
    this.logError(error);

    // Handle known custom errors
    if (error instanceof CustomError) {
      return APIResponseBuilder.error(
        error.code,
        error.message,
        error.details
      );
    }

    // Handle validation errors (Zod, Joi, etc.)
    if (error.name === 'ValidationError' || error.name === 'ZodError') {
      return APIResponseBuilder.error(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        error.message
      );
    }

    // Handle database errors
    if (error.name === 'PrismaClientKnownRequestError' || 
        error.name === 'PrismaClientUnknownRequestError' ||
        error.name === 'PrismaClientValidationError') {
      return APIResponseBuilder.error(
        ErrorCodes.DATABASE_ERROR,
        'Database operation failed',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      );
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return APIResponseBuilder.error(
        ErrorCodes.INVALID_TOKEN,
        'Invalid token provided'
      );
    }

    if (error.name === 'TokenExpiredError') {
      return APIResponseBuilder.error(
        ErrorCodes.TOKEN_EXPIRED,
        'Token has expired'
      );
    }

    // Handle network errors
    if (error.name === 'NetworkError' || (error.message && error.message.includes('ECONNREFUSED'))) {
      return APIResponseBuilder.error(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Network connection failed'
      );
    }

    // Default internal error
    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred';

    return APIResponseBuilder.error(
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : errorMessage,
      process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    );
  }

  static async handleAsync<T>(
    promise: Promise<T>,
    fallbackMessage: string = 'An unexpected error occurred'
  ): Promise<APIResponse<T>> {
    try {
      const result = await promise;
      return APIResponseBuilder.success(result);
    } catch (error) {
      // If error is not an Error instance or CustomError, use fallback message
      if (!(error instanceof Error)) {
        return APIResponseBuilder.error(
          ErrorCodes.INTERNAL_ERROR,
          fallbackMessage
        );
      }
      return this.handle(error as Error);
    }
  }

  private static logError(error: Error | AppError): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...(error instanceof CustomError && {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        isOperational: error.isOperational,
      }),
    };

    if (error instanceof CustomError && error.isOperational) {
      logger.warn('Operational error occurred', errorInfo);
    } else {
      logger.error('Unexpected error occurred', errorInfo);
    }
  }

  static isOperationalError(error: Error | AppError): boolean {
    if (error instanceof CustomError) {
      return error.isOperational;
    }
    return false;
  }

  static getStatusCode(error: Error | AppError): number {
    if (error instanceof CustomError) {
      return error.statusCode;
    }
    return 500;
  }
}

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 

