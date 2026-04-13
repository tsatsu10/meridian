import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createSecurityMiddleware, createRateLimitMiddleware, createInputValidationMiddleware } from '../security';
import { createValidationMiddleware } from '../validation';
import { userSchemas } from '../validation';
import { errorHandler } from '../errors';

describe('Security Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler());
    vi.clearAllMocks();
  });

  describe('createSecurityMiddleware', () => {
    it('adds security headers', async () => {
      app.use('*', createSecurityMiddleware());
      app.get('/test', (c) => c.text('OK'));

      const res = await app.request('/test');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Security-Policy')).toBeDefined();
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(res.headers.get('Strict-Transport-Security')).toBeDefined();
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('handles CORS preflight requests', async () => {
      app.use('*', createSecurityMiddleware());
      app.options('/test', (c) => c.text('OK'));

      const res = await app.request('/test', {
        method: 'OPTIONS',
        headers: {
          'origin': 'https://meridian.app',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'Content-Type',
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://meridian.app');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400'); // 24 hours
    });

    it('does not set CORS headers for disallowed origins', async () => {
      app.use('*', createSecurityMiddleware());
      app.get('/test', (c) => c.text('OK'));

      const res = await app.request('/test', {
        headers: {
          'origin': 'https://malicious.com',
        },
      });

      // Should not set Access-Control-Allow-Origin for disallowed origins
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(res.status).toBe(200); // Request still succeeds but CORS headers not set
    });
  });

  describe('createRateLimitMiddleware', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('allows requests within rate limit', async () => {
      app.use('*', createRateLimitMiddleware({ max: 2, windowMs: 1000 }));
      app.get('/test', (c) => c.text('OK'));

      const res1 = await app.request('/test');
      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Rate-Limit-Remaining')).toBe('1');

      const res2 = await app.request('/test');
      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-Rate-Limit-Remaining')).toBe('0');
    });

    it('blocks requests exceeding rate limit', async () => {
      app.use('*', createRateLimitMiddleware({ max: 2, windowMs: 1000 }));
      app.get('/test', (c) => c.text('OK'));

      await app.request('/test');
      await app.request('/test');
      
      const res = await app.request('/test');
      expect(res.status).toBe(429);
      expect(res.headers.get('X-Rate-Limit-Remaining')).toBe('0');
      const body = await res.json();
      expect(body.error.code).toBe('RATE_LIMITED');
    });

    it('resets rate limit after window expires', async () => {
      app.use('*', createRateLimitMiddleware({ max: 1, windowMs: 100 }));
      app.get('/test', (c) => c.text('OK'));

      const res1 = await app.request('/test');
      expect(res1.status).toBe(200);

      const res2 = await app.request('/test');
      expect(res2.status).toBe(429);

      vi.advanceTimersByTime(101);

      const res3 = await app.request('/test');
      expect(res3.status).toBe(200);
      expect(res3.headers.get('X-Rate-Limit-Remaining')).toBe('0');
    });
  });

  describe('createInputValidationMiddleware', () => {
    it('detects XSS attempts in URL', async () => {
      app.use('*', createInputValidationMiddleware());
      app.get('/test', (c) => c.text('OK'));

      const res = await app.request('/test?param=<script>alert("xss")</script>');
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('detects suspicious User-Agent patterns', async () => {
      app.use('*', createInputValidationMiddleware());
      app.get('/test', (c) => {
        const isBot = c.get('isBot');
        return c.json({ isBot: !!isBot });
      });

      const res = await app.request('/test', {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isBot).toBe(true); // Middleware sets isBot flag but doesn't block
    });

    it('allows normal requests', async () => {
      app.use('*', createInputValidationMiddleware());
      app.get('/test', (c) => c.text('OK'));

      const res = await app.request('/test?param=normal_value', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        },
      });
      expect(res.status).toBe(200);
    });
  });
});

describe('Validation Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler());
    vi.clearAllMocks();
  });

  describe('createValidationMiddleware', () => {
    it('validates request body successfully', async () => {
      app.use('/users', createValidationMiddleware('json', userSchemas.register));
      app.post('/users', (c) => {
        const user = c.req.valid('json');
        return c.json({ success: true, user });
      });

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });

      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.user.username).toBe('testuser');
    });

    it('rejects invalid request body', async () => {
      app.use('/users', createValidationMiddleware('json', userSchemas.register));
      app.post('/users', (c) => c.json({ success: true }));

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'tu',
          email: 'invalid-email',
          password: 'weak',
          confirmPassword: 'weak',
        }),
      });

      expect(res.status).toBe(400);
      const result = await res.json();
      expect(result.success).toBe(false);
      expect(result.error.details.errors).toBeDefined();
    });

    it('handles validation errors with field details', async () => {
      app.use('/users', createValidationMiddleware('json', userSchemas.register));
      app.post('/users', (c) => c.json({ success: true }));

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'tu',
          email: 'invalid-email',
          password: 'weak',
          confirmPassword: 'mismatch',
        }),
      });

      expect(res.status).toBe(400);
      const result = await res.json();
      expect(result.error.details.errors).toBeInstanceOf(Array);
      expect(result.error.details.errors.length).toBeGreaterThan(0);
      expect(result.error.details.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username' }),
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });
  });

  describe('Password Validation', () => {
    it('validates strong passwords', () => {
      const schema = userSchemas.register;
      const validPassword = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      };
      const parsed = schema.safeParse(validPassword);
      expect(parsed.success).toBe(true);
    });

    it('rejects weak passwords', async () => {
      app.use('/register', createValidationMiddleware('json', userSchemas.register));
      app.post('/register', (c) => c.json({ success: true }));

      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak',
          confirmPassword: 'weak',
        }),
      });

      expect(res.status).toBe(400);
      const result = await res.json();
      expect(result.error.details.errors).toBeDefined();
      expect(result.error.details.errors.length).toBeGreaterThan(0);
    });

    it('rejects mismatched password confirmation', async () => {
      app.use('/register', createValidationMiddleware('json', userSchemas.register));
      app.post('/register', (c) => c.json({ success: true }));

      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
        }),
      });

      expect(res.status).toBe(400);
      const result = await res.json();
      expect(result.error.details.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'confirmPassword' }),
        ])
      );
    });
  });
});
