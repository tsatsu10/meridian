/**
 * Error Handling Tests
 * 
 * Comprehensive tests for error handling:
 * - Error types and codes
 * - Error formatting
 * - Error logging
 * - Stack traces
 * - User-friendly messages
 */

import { describe, it, expect } from 'vitest';

describe('Error Handling', () => {
  class AppError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number = 500,
      public isOperational: boolean = true
    ) {
      super(message);
      this.name = 'AppError';
      Error.captureStackTrace(this, this.constructor);
    }
  }

  describe('Error Types', () => {
    it('should create validation error', () => {
      const error = new AppError('Invalid input', 'VALIDATION_ERROR', 400);

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create authentication error', () => {
      const error = new AppError('Unauthorized', 'AUTH_ERROR', 401);

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_ERROR');
    });

    it('should create not found error', () => {
      const error = new AppError('Resource not found', 'NOT_FOUND', 404);

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create permission error', () => {
      const error = new AppError('Forbidden', 'PERMISSION_ERROR', 403);

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('PERMISSION_ERROR');
    });

    it('should create server error', () => {
      const error = new AppError('Internal server error', 'SERVER_ERROR', 500);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
    });
  });

  describe('Error Formatting', () => {
    const formatErrorForClient = (error: AppError, isProduction: boolean) => {
      if (isProduction && !error.isOperational) {
        return {
          error: 'Internal Server Error',
          code: 'SERVER_ERROR',
        };
      }

      return {
        error: error.message,
        code: error.code,
        ...(isProduction ? {} : { stack: error.stack }),
      };
    };

    it('should format operational errors for client', () => {
      const error = new AppError('Validation failed', 'VALIDATION_ERROR', 400);

      const formatted = formatErrorForClient(error, false);

      expect(formatted.error).toBe('Validation failed');
      expect(formatted.code).toBe('VALIDATION_ERROR');
      expect(formatted.stack).toBeDefined();
    });

    it('should hide sensitive info in production', () => {
      const error = new AppError('Database connection failed', 'DB_ERROR', 500, false);

      const formatted = formatErrorForClient(error, true);

      expect(formatted.error).toBe('Internal Server Error');
      expect(formatted.code).toBe('SERVER_ERROR');
      expect(formatted).not.toHaveProperty('stack');
    });

    it('should show operational errors in production', () => {
      const error = new AppError('Invalid email format', 'VALIDATION_ERROR', 400);

      const formatted = formatErrorForClient(error, true);

      expect(formatted.error).toBe('Invalid email format');
      expect(formatted.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Stack Traces', () => {
    it('should capture stack trace', () => {
      const error = new AppError('Test error', 'TEST_ERROR');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
      expect(error.stack).toContain('AppError');
    });

    it('should have error name', () => {
      const error = new AppError('Test', 'TEST');

      expect(error.name).toBe('AppError');
    });
  });

  describe('Error Handling Strategies', () => {
    const handleError = (error: any): { shouldRetry: boolean; delay: number } => {
      const retryableErrors = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
      
      if (retryableErrors.includes(error.code)) {
        return { shouldRetry: true, delay: 1000 };
      }

      return { shouldRetry: false, delay: 0 };
    };

    it('should retry on network errors', () => {
      const error = { code: 'ETIMEDOUT', message: 'Timeout' };
      const strategy = handleError(error);

      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.delay).toBe(1000);
    });

    it('should not retry on validation errors', () => {
      const error = { code: 'VALIDATION_ERROR', message: 'Invalid input' };
      const strategy = handleError(error);

      expect(strategy.shouldRetry).toBe(false);
    });

    it('should retry on connection refused', () => {
      const error = { code: 'ECONNREFUSED', message: 'Connection refused' };
      const strategy = handleError(error);

      expect(strategy.shouldRetry).toBe(true);
    });
  });

  describe('User-Friendly Messages', () => {
    const getUserFriendlyMessage = (errorCode: string): string => {
      const messages: Record<string, string> = {
        VALIDATION_ERROR: 'Please check your input and try again.',
        AUTH_ERROR: 'Please sign in to continue.',
        PERMISSION_ERROR: 'You don\'t have permission to perform this action.',
        NOT_FOUND: 'The requested resource was not found.',
        RATE_LIMIT: 'Too many requests. Please try again later.',
        SERVER_ERROR: 'Something went wrong. Please try again.',
      };

      return messages[errorCode] || 'An unexpected error occurred.';
    };

    it('should provide user-friendly validation message', () => {
      const message = getUserFriendlyMessage('VALIDATION_ERROR');
      expect(message).toBe('Please check your input and try again.');
    });

    it('should provide user-friendly auth message', () => {
      const message = getUserFriendlyMessage('AUTH_ERROR');
      expect(message).toBe('Please sign in to continue.');
    });

    it('should provide fallback message for unknown codes', () => {
      const message = getUserFriendlyMessage('UNKNOWN_ERROR');
      expect(message).toBe('An unexpected error occurred.');
    });
  });

  describe('Error Logging', () => {
    const logError = (error: Error, context?: any): void => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        context,
      };

      // In real implementation, would send to logging service
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.message).toBe(error.message);
    };

    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = { userId: 'user-123', action: 'create_project' };

      logError(error, context);
      // Should not throw
    });

    it('should log error without context', () => {
      const error = new Error('Test error');

      logError(error);
      // Should not throw
    });
  });
});

