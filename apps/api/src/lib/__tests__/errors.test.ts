import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { AppError, createError, errorHandler } from '../errors';
import { HTTPException } from 'hono/http-exception';

describe('Error Handling', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler());
    vi.clearAllMocks();
  });

  describe('AppError Class', () => {
    it('creates error with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe('medium');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('creates error with custom values', () => {
      const error = new AppError('Custom error', 400, 'high', { field: 'value' }, false);
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe('high');
      expect(error.details).toEqual({ field: 'value' });
      expect(error.isOperational).toBe(false);
    });

    it('maintains prototype chain', () => {
      const error = new AppError('Test error');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('captures stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('Error Factory Functions', () => {
    it('creates not found error', () => {
      const error = createError.notFound('Resource not found', { id: '123' });
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.severity).toBe('low');
      expect(error.details).toEqual({ id: '123' });
    });

    it('creates bad request error', () => {
      const error = createError.badRequest('Invalid input', { field: 'email' });
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe('low');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('creates unauthorized error', () => {
      const error = createError.unauthorized('Authentication required');
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.severity).toBe('medium');
    });

    it('creates forbidden error', () => {
      const error = createError.forbidden('Insufficient permissions');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.severity).toBe('medium');
    });

    it('creates validation error', () => {
      const error = createError.validationError('Validation failed', { errors: [] });
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe('low');
      expect(error.details).toEqual({ errors: [] });
    });

    it('creates server error', () => {
      const error = createError.serverError('Internal server error', { component: 'database' });
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe('critical');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual({ component: 'database' });
    });

    it('creates rate limited error', () => {
      const error = createError.rateLimited('Too many requests', { limit: 100 });
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.severity).toBe('medium');
      expect(error.details).toEqual({ limit: 100 });
    });
  });

  describe('Error Handler Middleware', () => {
    it('handles AppError correctly', async () => {
      app.get('/test', () => {
        throw createError.notFound('Resource not found');
      });

      const res = await app.request('/test');
      expect(res.status).toBe(404);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toEqual({
        message: 'Resource not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        severity: 'low',
        details: undefined,
      });
    });

    it('handles HTTPException correctly', async () => {
      app.get('/test', () => {
        throw new HTTPException(400, { message: 'Bad request' });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toEqual({
        message: 'Bad request',
        code: 'HTTP_EXCEPTION',
        statusCode: 400,
        severity: 'medium',
      });
    });

    it('handles generic errors', async () => {
      app.get('/test', () => {
        throw new Error('Unexpected error');
      });

      const res = await app.request('/test');
      expect(res.status).toBe(500);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toEqual({
        message: 'An unexpected error occurred.',
        code: 'UNEXPECTED_ERROR',
        statusCode: 500,
        severity: 'critical',
      });
    });

    it('includes error details in response', async () => {
      app.get('/test', () => {
        throw createError.validationError('Validation failed', { 
          errors: [
            { field: 'email', message: 'Invalid email' },
            { field: 'password', message: 'Too short' }
          ]
        });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.details).toEqual({
        errors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' }
        ]
      });
    });

    it.skip('logs errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      app.get('/test', () => {
        throw new Error('Test error');
      });

      await app.request('/test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error caught by middleware:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Scenarios', () => {
    it('handles async errors', async () => {
      app.get('/async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw createError.serverError('Async error');
      });

      const res = await app.request('/async-test');
      expect(res.status).toBe(500);
      
      const body = await res.json();
      expect(body.error.message).toBe('Async error');
    });

    it('handles errors in middleware', async () => {
      app.use('*', async (c, next) => {
        throw createError.unauthorized('Middleware error');
      });
      app.get('/test', (c) => c.text('OK'));

      const res = await app.request('/test');
      expect(res.status).toBe(401);
      
      const body = await res.json();
      expect(body.error.message).toBe('Middleware error');
    });

    it('handles errors in error handler', async () => {
      // This test ensures the error handler itself doesn't throw
      app.get('/test', () => {
        throw new Error('Test error');
      });

      const res = await app.request('/test');
      expect(res.status).toBe(500);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNEXPECTED_ERROR');
    });
  });

  describe('Error Response Format', () => {
    it('maintains consistent error response format', async () => {
      app.get('/test', () => {
        throw createError.badRequest('Test error', { field: 'test' });
      });

      const res = await app.request('/test');
      const body = await res.json();
      
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('statusCode');
      expect(body.error).toHaveProperty('severity');
    });

    it('includes all error properties', async () => {
      app.get('/test', () => {
        throw createError.serverError('Test error', { component: 'test' });
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error).toEqual({
        message: 'Test error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        severity: 'critical',
        details: { component: 'test' },
      });
    });
  });
});

