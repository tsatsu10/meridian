/**
 * Rate Limiting Middleware for Meridian API
 *
 * Provides rate limiting functionality for various endpoints,
 * with special handling for AI-powered features.
 */

import { createMiddleware } from 'hono/factory';
import logger from '../utils/logger';

// Simple in-memory rate limiting store
// In production, this should use Redis or another shared store
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (c: any) => string; // Custom key generator
}

/**
 * Generic rate limiting middleware
 */
function createRateLimiter(config: RateLimitConfig) {
  return createMiddleware(async (c, next) => {
    try {
      const now = Date.now();

      // Generate rate limit key
      const key = config.keyGenerator
        ? config.keyGenerator(c)
        : `${c.req.header('x-forwarded-for') || 'unknown'}:${c.req.path}`;

      // Clean up expired entries
      for (const [entryKey, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
          rateLimitStore.delete(entryKey);
        }
      }

      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + config.windowMs
        };
        rateLimitStore.set(key, entry);
      }

      // Check rate limit
      if (entry.count >= config.maxRequests) {
        logger.warn(`Rate limit exceeded for key: ${key}`);
        return c.json(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
            retryAfter: Math.ceil((entry.resetTime - now) / 1000)
          },
          429
        );
      }

      // Increment counter
      entry.count++;
      rateLimitStore.set(key, entry);

      // Add rate limit headers
      c.header('X-RateLimit-Limit', config.maxRequests.toString());
      c.header('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
      c.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());

      await next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue on rate limiting errors to avoid breaking the API
      await next();
    }
  });
}

/**
 * AI-specific rate limiter with tighter limits
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for AI endpoints
  keyGenerator: (c) => {
    const userEmail = c.get('userEmail');
    const workspaceId = c.get('workspaceId') || c.req.query('workspaceId');
    return `ai:${userEmail || 'anonymous'}:${workspaceId || 'unknown'}`;
  }
});

/**
 * General API rate limiter
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  keyGenerator: (c) => {
    const userEmail = c.get('userEmail');
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    return `api:${userEmail || ip}`;
  }
});

/**
 * Upload rate limiter for file operations
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 uploads per minute
  keyGenerator: (c) => {
    const userEmail = c.get('userEmail');
    return `upload:${userEmail || 'anonymous'}`;
  }
});

/**
 * Authentication rate limiter for login attempts
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (c) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    return `auth:${ip}`;
  }
});

export default {
  createRateLimiter,
  aiRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  authRateLimiter
};

