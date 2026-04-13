import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { errorsRoute } from '../errors';
import { errorHandler } from '../errors';

describe('Error Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler());
    app.route('/errors', errorsRoute);
    vi.clearAllMocks();
  });

  describe('Error Reporting Endpoint', () => {
    it('reports client-side error successfully', async () => {
      const errorReport = {
        message: 'Test error message',
        stack: 'Error stack trace',
        componentStack: 'Component stack trace',
        level: 'error',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        url: 'https://meridian.app/dashboard',
        timestamp: '2023-01-01T00:00:00Z',
        metadata: { userId: '123', component: 'Dashboard' }
      };

      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Error report received');
    });

    it('validates error report schema', async () => {
      const invalidReport = {
        message: '', // Empty message should fail validation
        level: 'invalid_level', // Invalid level
        url: 'not-a-url', // Invalid URL
      };

      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidReport),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.errors).toBeDefined();
      expect(body.error.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'message', message: 'Error message is required' }),
          expect.objectContaining({ path: 'level', message: 'Invalid enum value' }),
          expect.objectContaining({ path: 'url', message: 'Invalid url' })
        ])
      );
    });

    it('handles missing required fields', async () => {
      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.errors).toBeDefined();
      expect(body.error.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'message', message: 'Error message is required' })
        ])
      );
    });

    it('uses default level when not provided', async () => {
      const errorReport = {
        message: 'Test error message',
      };

      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Error report received');
    });

    it('handles optional fields', async () => {
      const errorReport = {
        message: 'Test error message',
        stack: 'Error stack trace',
        componentStack: 'Component stack trace',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        url: 'https://meridian.app/dashboard',
        timestamp: '2023-01-01T00:00:00Z',
        metadata: { userId: '123', component: 'Dashboard' }
      };

      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Error report received');
    });

    it('validates different error levels', async () => {
      const levels = ['info', 'warning', 'error', 'critical'];
      
      for (const level of levels) {
        const errorReport = {
          message: `Test ${level} error`,
          level: level,
        };

        const res = await app.request('/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport),
        });

        expect(res.status).toBe(200);
        
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.message).toBe('Error report received');
      }
    });

    it('validates metadata as record', async () => {
      const errorReport = {
        message: 'Test error message',
        metadata: {
          userId: '123',
          component: 'Dashboard',
          action: 'click',
          timestamp: '2023-01-01T00:00:00Z',
          customField: 'customValue'
        }
      };

      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Error report received');
    });

    it('handles invalid JSON', async () => {
      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid request data');
    });

    it('handles missing Content-Type header', async () => {
      const res = await app.request('/errors/report', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test error' }),
      });

      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid request data');
    });
  });

  describe('Error Report Processing', () => {
    it.skip('logs error reports to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorReport = {
        message: 'Test error message',
        stack: 'Error stack trace',
        level: 'error',
      };

      await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Client-side error reported:',
        expect.objectContaining({
          message: 'Test error message',
          stack: 'Error stack trace',
          level: 'error',
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('responds with 200 even if error reporting fails', async () => {
      // This test ensures the endpoint always responds with 200
      // to avoid cascading issues in the client
      const errorReport = {
        message: 'Test error message',
      };

      const res = await app.request('/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      });

      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Error report received');
    });
  });

  describe('Error Report Schema Validation', () => {
    it('validates message field', async () => {
      const testCases = [
        { message: '', expected: 'Error message is required' },
        { message: '   ', expected: 'Error message is required' },
        { message: 'Valid message', expected: null },
      ];

      for (const testCase of testCases) {
        const res = await app.request('/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: testCase.message }),
        });

        if (testCase.expected) {
          expect(res.status).toBe(400);
          const body = await res.json();
          expect(body.error.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: 'message', message: testCase.expected })
            ])
          );
        } else {
          expect(res.status).toBe(200);
        }
      }
    });

    it('validates level field', async () => {
      const testCases = [
        { level: 'info', expected: null },
        { level: 'warning', expected: null },
        { level: 'error', expected: null },
        { level: 'critical', expected: null },
        { level: 'invalid', expected: 'Invalid enum value' },
        { level: '', expected: 'Invalid enum value' },
      ];

      for (const testCase of testCases) {
        const res = await app.request('/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Test error',
            level: testCase.level 
          }),
        });

        if (testCase.expected) {
          expect(res.status).toBe(400);
          const body = await res.json();
          expect(body.error.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: 'level', message: testCase.expected })
            ])
          );
        } else {
          expect(res.status).toBe(200);
        }
      }
    });

    it('validates URL field', async () => {
      const testCases = [
        { url: 'https://meridian.app', expected: null },
        { url: 'http://localhost:3000', expected: null },
        { url: 'not-a-url', expected: 'Invalid url' },
        { url: '', expected: 'Invalid url' },
      ];

      for (const testCase of testCases) {
        const res = await app.request('/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Test error',
            url: testCase.url 
          }),
        });

        if (testCase.expected) {
          expect(res.status).toBe(400);
          const body = await res.json();
          expect(body.error.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: 'url', message: testCase.expected })
            ])
          );
        } else {
          expect(res.status).toBe(200);
        }
      }
    });

    it('validates timestamp field', async () => {
      const testCases = [
        { timestamp: '2023-01-01T00:00:00Z', expected: null },
        { timestamp: '2023-01-01T00:00:00.000Z', expected: null },
        { timestamp: 'invalid-timestamp', expected: 'Invalid date string' },
        { timestamp: '', expected: 'Invalid date string' },
      ];

      for (const testCase of testCases) {
        const res = await app.request('/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Test error',
            timestamp: testCase.timestamp 
          }),
        });

        if (testCase.expected) {
          expect(res.status).toBe(400);
          const body = await res.json();
          expect(body.error.errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: 'timestamp', message: testCase.expected })
            ])
          );
        } else {
          expect(res.status).toBe(200);
        }
      }
    });
  });
});

