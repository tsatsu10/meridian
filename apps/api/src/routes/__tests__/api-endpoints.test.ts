/**
 * API Endpoints Tests
 * 
 * Tests API endpoint responses and error handling:
 * - Health checks
 * - Error responses
 * - Not found handling
 * - CORS headers
 * - Response formats
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

describe('API Endpoints', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();

    // Setup basic CORS
    app.use('*', cors({
      origin: 'http://localhost:5173',
      credentials: true,
    }));

    // Setup test routes
    app.get('/api/health', (c) => {
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    app.get('/api/test', (c) => {
      return c.json({
        message: 'Test endpoint',
      });
    });

    app.post('/api/test', async (c) => {
      const body = await c.req.json();
      return c.json({
        received: body,
      });
    });

    app.get('/api/error', (c) => {
      throw new Error('Test error');
    });

    // Error handler
    app.onError((err, c) => {
      return c.json({
        error: 'Internal Server Error',
        message: err.message,
      }, 500);
    });

    // 404 handler
    app.notFound((c) => {
      return c.json({
        error: 'Not Found',
        path: c.req.path,
      }, 404);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const res = await app.request('/api/health');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });

    it('should have correct content type', async () => {
      const res = await app.request('/api/health');
      
      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET Requests', () => {
    it('should handle GET request', async () => {
      const res = await app.request('/api/test');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Test endpoint');
    });

    it('should include CORS headers', async () => {
      const res = await app.request('/api/test', {
        headers: {
          'Origin': 'http://localhost:5173',
        },
      });

      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    });
  });

  describe('POST Requests', () => {
    it('should handle POST with JSON body', async () => {
      const testData = { name: 'Test', value: 123 };

      const res = await app.request('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toEqual(testData);
    });

    it('should handle empty POST body', async () => {
      const res = await app.request('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle errors with 500 status', async () => {
      const res = await app.request('/api/error');
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Test error');
    });

    it('should return JSON error responses', async () => {
      const res = await app.request('/api/error');
      
      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Not Found Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await app.request('/api/non-existent');
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Not Found');
    });

    it('should include requested path in 404 response', async () => {
      const res = await app.request('/api/missing/endpoint');
      const data = await res.json();

      expect(data.path).toBe('/api/missing/endpoint');
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      app.put('/api/resource/:id', async (c) => {
        const id = c.req.param('id');
        const body = await c.req.json();
        return c.json({ id, updated: body });
      });

      app.delete('/api/resource/:id', (c) => {
        const id = c.req.param('id');
        return c.json({ id, deleted: true });
      });

      app.patch('/api/resource/:id', async (c) => {
        const id = c.req.param('id');
        const body = await c.req.json();
        return c.json({ id, patched: body });
      });
    });

    it('should handle PUT requests', async () => {
      const res = await app.request('/api/resource/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('123');
      expect(data.updated.name).toBe('Updated');
    });

    it('should handle DELETE requests', async () => {
      const res = await app.request('/api/resource/456', {
        method: 'DELETE',
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('456');
      expect(data.deleted).toBe(true);
    });

    it('should handle PATCH requests', async () => {
      const res = await app.request('/api/resource/789', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('789');
      expect(data.patched.status).toBe('active');
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      app.get('/api/search', (c) => {
        const query = c.req.query('q');
        const limit = c.req.query('limit');
        
        return c.json({
          query,
          limit: limit ? parseInt(limit) : 10,
        });
      });
    });

    it('should parse query parameters', async () => {
      const res = await app.request('/api/search?q=test&limit=20');
      const data = await res.json();

      expect(data.query).toBe('test');
      expect(data.limit).toBe(20);
    });

    it('should handle missing query parameters', async () => {
      const res = await app.request('/api/search');
      const data = await res.json();

      expect(data.query).toBeUndefined();
      expect(data.limit).toBe(10); // Default
    });
  });

  describe('Path Parameters', () => {
    beforeEach(() => {
      app.get('/api/users/:userId/projects/:projectId', (c) => {
        const userId = c.req.param('userId');
        const projectId = c.req.param('projectId');
        
        return c.json({ userId, projectId });
      });
    });

    it('should parse path parameters', async () => {
      const res = await app.request('/api/users/user-123/projects/project-456');
      const data = await res.json();

      expect(data.userId).toBe('user-123');
      expect(data.projectId).toBe('project-456');
    });
  });

  describe('Response Headers', () => {
    beforeEach(() => {
      app.get('/api/headers', (c) => {
        c.header('X-Custom-Header', 'custom-value');
        c.header('Cache-Control', 'no-cache');
        return c.json({ success: true });
      });
    });

    it('should set custom headers', async () => {
      const res = await app.request('/api/headers');

      expect(res.headers.get('x-custom-header')).toBe('custom-value');
      expect(res.headers.get('cache-control')).toBe('no-cache');
    });
  });

  describe('Status Codes', () => {
    beforeEach(() => {
      app.post('/api/create', (c) => c.json({ created: true }, 201));
      app.delete('/api/delete', (c) => c.body(null, 204));
      app.get('/api/unauthorized', (c) => c.json({ error: 'Unauthorized' }, 401));
      app.get('/api/forbidden', (c) => c.json({ error: 'Forbidden' }, 403));
    });

    it('should return 201 for creation', async () => {
      const res = await app.request('/api/create', { method: 'POST' });
      expect(res.status).toBe(201);
    });

    it('should return 204 for no content', async () => {
      const res = await app.request('/api/delete', { method: 'DELETE' });
      expect(res.status).toBe(204);
    });

    it('should return 401 for unauthorized', async () => {
      const res = await app.request('/api/unauthorized');
      expect(res.status).toBe(401);
    });

    it('should return 403 for forbidden', async () => {
      const res = await app.request('/api/forbidden');
      expect(res.status).toBe(403);
    });
  });
});

