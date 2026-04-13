/**
 * @epic-5.1-api-standardization - Error Handler unit tests
 * @persona-all - Testing centralized error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorHandler, CustomError, ValidationError, NotFoundError, ConflictError, DatabaseError, UnauthorizedError, ForbiddenError, RateLimitError, ServiceUnavailableError } from '../../core/ErrorHandler';
import { APIResponse } from '../../core/APIResponse';

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Reset environment for consistent testing
    process.env.API_VERSION = '1.0.0';
  });

  describe('CustomError', () => {
    it('should create a custom error with all properties', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400, { field: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('CustomError');
    });

    it('should create a custom error without details', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
      expect(error.isOperational).toBe(true);
    });

    it('should create a programming error when isOperational is false', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 500, undefined, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe('Specific Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.isOperational).toBe(true);
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe('User with id 123 not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create ConflictError with correct properties', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('RESOURCE_CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
    });

    it('should create DatabaseError with correct properties', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create UnauthorizedError with correct properties', () => {
      const error = new UnauthorizedError('Invalid credentials');

      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });

    it('should create ForbiddenError with correct properties', () => {
      const error = new ForbiddenError('Insufficient permissions');

      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
    });

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError('Too many requests');

      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.isOperational).toBe(true);
    });

    it('should create ServiceUnavailableError with correct properties', () => {
      const error = new ServiceUnavailableError('Service temporarily unavailable');

      expect(error.message).toBe('Service temporarily unavailable');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ErrorHandler.handle', () => {
    it('should handle CustomError correctly', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400, { field: 'test' });
      const response = ErrorHandler.handle(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('TEST_ERROR');
      expect(response.error?.message).toBe('Test error');
      expect(response.error?.details).toEqual({ field: 'test' });
      expect(response.meta).toBeDefined();
    });

    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const response = ErrorHandler.handle(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.error?.message).toBe('Invalid input');
      expect(response.error?.details).toEqual({ field: 'email' });
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User', '123');
      const response = ErrorHandler.handle(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('NOT_FOUND');
      expect(response.error?.message).toBe('User with id 123 not found');
    });

    it('should handle standard Error correctly', () => {
      const error = new Error('Standard error');
      const response = ErrorHandler.handle(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INTERNAL_ERROR');
      expect(response.error?.message).toBe('Standard error');
    });

    it('should handle unknown error types', () => {
      const error = 'String error';
      const response = ErrorHandler.handle(error as any);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INTERNAL_ERROR');
      expect(response.error?.message).toBe('An unexpected error occurred');
    });

    it('should include request ID in response', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400);
      const response = ErrorHandler.handle(error);

      expect(response.meta?.requestId).toBeDefined();
      expect(response.meta?.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should include timestamp in response', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400);
      const response = ErrorHandler.handle(error);

      expect(response.meta?.timestamp).toBeDefined();
      expect(new Date(response.meta!.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('ErrorHandler.handleAsync', () => {
    it('should handle successful async operations', async () => {
      const promise = Promise.resolve({ id: '123', name: 'Test' });
      const response = await ErrorHandler.handleAsync(promise);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: '123', name: 'Test' });
      expect(response.error).toBeUndefined();
    });

    it('should handle failed async operations', async () => {
      const promise = Promise.reject(new ValidationError('Invalid input'));
      const response = await ErrorHandler.handleAsync(promise);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.error?.message).toBe('Invalid input');
    });

    it('should use fallback message for unknown errors', async () => {
      const promise = Promise.reject('Unknown error');
      const response = await ErrorHandler.handleAsync(promise, 'Custom fallback message');

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Custom fallback message');
    });

    it('should use default message when no fallback provided', async () => {
      const promise = Promise.reject('Unknown error');
      const response = await ErrorHandler.handleAsync(promise);

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('An unexpected error occurred');
    });
  });

  describe('ErrorHandler.isOperationalError', () => {
    it('should return true for operational errors', () => {
      const error = new ValidationError('Invalid input');
      expect(ErrorHandler.isOperationalError(error)).toBe(true);
    });

    it('should return false for programming errors', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 500, undefined, false);
      expect(ErrorHandler.isOperationalError(error)).toBe(false);
    });

    it('should return false for standard errors', () => {
      const error = new Error('Standard error');
      expect(ErrorHandler.isOperationalError(error)).toBe(false);
    });
  });

  describe('ErrorHandler.getStatusCode', () => {
    it('should return correct status code for CustomError', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400);
      expect(ErrorHandler.getStatusCode(error)).toBe(400);
    });

    it('should return 500 for standard errors', () => {
      const error = new Error('Standard error');
      expect(ErrorHandler.getStatusCode(error)).toBe(500);
    });

    it('should return 500 for unknown error types', () => {
      const error = 'String error';
      expect(ErrorHandler.getStatusCode(error as any)).toBe(500);
    });
  });

  describe('Global Error Handlers', () => {
    it('should handle uncaught exceptions', async () => {
      // Import logger to spy on it
      const { logger } = await import('../../utils/logger');
      const loggerSpy = vi.spyOn(logger, 'error');

      // Mock process.exit to prevent test from actually exiting
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        return undefined as never;
      });

      const error = new Error('Uncaught error');
      process.emit('uncaughtException', error);

      expect(loggerSpy).toHaveBeenCalledWith('Uncaught Exception:', error);
      expect(mockExit).toHaveBeenCalledWith(1);

      loggerSpy.mockRestore();
      mockExit.mockRestore();
    });

    it('should handle unhandled promise rejections', async () => {
      // Import logger to spy on it
      const { logger } = await import('../../utils/logger');
      const loggerSpy = vi.spyOn(logger, 'error');

      // Mock process.exit to prevent test from actually exiting
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        return undefined as never;
      });

      const error = new Error('Unhandled rejection');
      const promise = Promise.resolve();
      process.emit('unhandledRejection', error, promise);

      expect(loggerSpy).toHaveBeenCalledWith('Unhandled Rejection at:', promise, 'reason:', error);
      expect(mockExit).toHaveBeenCalledWith(1);

      loggerSpy.mockRestore();
      mockExit.mockRestore();
    });
  });
}); 

