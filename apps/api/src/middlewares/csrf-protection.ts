/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * Phase 0 - Security Hardening Implementation
 */

import { MiddlewareHandler } from 'hono';
import crypto from 'crypto';
import logger from '../utils/logger';

interface CSRFOptions {
  tokenLength?: number;
  cookieName?: string;
  headerName?: string;
  excludePaths?: string[];
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Generate secure CSRF token
 */
function generateCSRFToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtection(options: CSRFOptions = {}): MiddlewareHandler {
  const {
    tokenLength = 32,
    cookieName = 'csrf_token',
    headerName = 'x-csrf-token',
    excludePaths = ['/api/auth/login', '/api/auth/register'],
    sameSite = 'lax',
  } = options;

  return async (c, next) => {
    const path = c.req.path;
    const method = c.req.method.toUpperCase();

    // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      // Generate new token for safe requests if none exists
      let token = c.req.header('cookie')?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1];
      
      if (!token) {
        token = generateCSRFToken(tokenLength);
        c.header('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} Max-Age=86400`);
      }

      // Pass token to response for client-side use
      c.set('csrfToken', token);
      return next();
    }

    // Check if path is excluded
    if (excludePaths.some(excluded => path.startsWith(excluded))) {
      return next();
    }

    // For state-changing methods, verify CSRF token
    const cookieToken = c.req.header('cookie')?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1];
    const headerToken = c.req.header(headerName);

    if (!cookieToken) {
      logger.warn('⚠️  CSRF: No token in cookie');
      return c.json({ error: 'CSRF token missing in cookie' }, 403);
    }

    if (!headerToken) {
      logger.warn('⚠️  CSRF: No token in header');
      return c.json({ error: 'CSRF token missing in header' }, 403);
    }

    // Use constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
      logger.warn('⚠️  CSRF: Token mismatch');
      return c.json({ error: 'Invalid CSRF token' }, 403);
    }

    // Token is valid, proceed
    await next();
  };
}

/**
 * Get CSRF token from context
 */
export function getCSRFToken(c: any): string | undefined {
  return c.get('csrfToken');
}

/**
 * CSRF token endpoint for client-side apps
 */
export const csrfTokenHandler: MiddlewareHandler = async (c) => {
  const token = c.get('csrfToken') || generateCSRFToken();
  return c.json({ csrfToken: token });
};

