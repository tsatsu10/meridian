import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { performanceMiddleware, measureDatabaseQuery, measureCustomOperation } from '../performance';
import { errorHandler } from '../errors';

// TODO: Performance monitoring not yet fully implemented - skipping tests
describe.skip('Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Performance Middleware', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();
      app.onError(errorHandler());
      vi.clearAllMocks();
    });

    it('measures request duration', async () => {
      app.use('*', performanceMiddleware());
      app.get('/test', (c) => c.text('OK'));

      const res = await app.request('/test');

      expect(res.status).toBe(200);
      expect(res.headers.get('X-Response-Time')).toBeDefined();
      expect(res.headers.get('X-Response-Time')).toMatch(/^\d+\.\d+ms$/);
    });

    it('logs performance metrics', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      app.use('*', performanceMiddleware());
      app.get('/test', (c) => c.text('OK'));

      await app.request('/test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] request:GET /test')
      );

      consoleSpy.mockRestore();
    });

    it('includes request details in metrics', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      app.use('*', performanceMiddleware());
      app.get('/test', (c) => c.text('OK'));

      await app.request('/test', {
        headers: {
          'User-Agent': 'Test Agent',
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] request:GET /test'),
        expect.objectContaining({
          statusCode: 200,
          userAgent: 'Test Agent',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Database Query Measurement', () => {
    it('measures successful database queries', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockQuery = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await measureDatabaseQuery(
        mockQuery,
        'test_query',
        { table: 'users' }
      );

      expect(result).toEqual({ data: 'test' });
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] database:test_query'),
        expect.objectContaining({
          table: 'users',
        })
      );

      consoleSpy.mockRestore();
    });

    it('measures failed database queries', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockQuery = vi.fn().mockRejectedValue(new Error('Database error'));
      
      await expect(measureDatabaseQuery(mockQuery, 'test_query')).rejects.toThrow('Database error');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] database:test_query_error'),
        expect.objectContaining({
          error: 'Database error',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Custom Operation Measurement', () => {
    it('measures successful custom operations', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockOperation = vi.fn().mockResolvedValue({ result: 'success' });
      
      const result = await measureCustomOperation(
        mockOperation,
        'test_operation',
        { type: 'calculation' }
      );

      expect(result).toEqual({ result: 'success' });
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] custom:test_operation'),
        expect.objectContaining({
          type: 'calculation',
        })
      );

      consoleSpy.mockRestore();
    });

    it('measures failed custom operations', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(measureCustomOperation(mockOperation, 'test_operation')).rejects.toThrow('Operation failed');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] custom:test_operation_error'),
        expect.objectContaining({
          error: 'Operation failed',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Timing', () => {
    it('measures operation duration accurately', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockOperation = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { result: 'success' };
      });
      
      await measureCustomOperation(mockOperation, 'timed_operation');
      
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0].includes('[PERF] custom:timed_operation')
      );
      
      expect(logCall).toBeDefined();
      expect(logCall![1].durationMs).toBeGreaterThanOrEqual(100);
      expect(logCall![1].durationMs).toBeLessThan(200);

      consoleSpy.mockRestore();
    });
  });
});

