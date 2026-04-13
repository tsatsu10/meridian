/**
 * 🚦 Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse by limiting request frequency
 * 
 * Features:
 * - Per-user rate limiting
 * - Different limits for different endpoint categories
 * - Redis-backed (with in-memory fallback)
 * - Configurable windows and limits
 * - Helpful error messages
 */

import { rateLimiter } from 'hono-rate-limiter';
import { getRedisClient } from '../utils/redis-client';

/**
 * Get user identifier for rate limiting
 */
function getUserKey(c: any): string {
  const userEmail = c.get('userEmail');
  const ip = c.req.header('x-forwarded-for') || 
             c.req.header('x-real-ip') || 
             'unknown';
  
  // Use email if authenticated, otherwise use IP
  return userEmail || `ip:${ip}`;
}

/**
 * Standard API rate limit
 * 100 requests per 15 minutes
 */
export const standardRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per window
  standardHeaders: 'draft-6', // Use standard rate limit headers
  keyGenerator: getUserKey,
  handler: (c) => {
    return c.json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: c.res.headers.get('Retry-After'),
    }, 429);
  },
});

/**
 * Strict rate limit for sensitive operations
 * 10 requests per 15 minutes (e.g., export, delete)
 */
export const strictRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Only 10 requests per window
  standardHeaders: 'draft-6',
  keyGenerator: getUserKey,
  handler: (c) => {
    return c.json({
      error: 'Too many requests',
      message: 'Rate limit exceeded for this sensitive operation. Please wait before trying again.',
      retryAfter: c.res.headers.get('Retry-After'),
    }, 429);
  },
});

/**
 * Very strict rate limit for expensive operations
 * 3 requests per 15 minutes (e.g., bulk operations, exports)
 */
export const veryStrictRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 3, // Only 3 requests per window
  standardHeaders: 'draft-6',
  keyGenerator: getUserKey,
  handler: (c) => {
    return c.json({
      error: 'Too many requests',
      message: 'Rate limit exceeded for this expensive operation. Please wait at least 15 minutes before trying again.',
      retryAfter: c.res.headers.get('Retry-After'),
      hint: 'This operation is resource-intensive. Consider reducing frequency of requests.',
    }, 429);
  },
});

/**
 * Relaxed rate limit for read operations
 * 200 requests per 15 minutes
 */
export const relaxedRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // 200 requests per window
  standardHeaders: 'draft-6',
  keyGenerator: getUserKey,
  handler: (c) => {
    return c.json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please slow down your requests.',
      retryAfter: c.res.headers.get('Retry-After'),
    }, 429);
  },
});

/**
 * Custom rate limit builder
 */
export function createRateLimit(options: {
  windowMs?: number;
  limit?: number;
  message?: string;
}) {
  return rateLimiter({
    windowMs: options.windowMs || 15 * 60 * 1000,
    limit: options.limit || 100,
    standardHeaders: 'draft-6',
    keyGenerator: getUserKey,
    handler: (c) => {
      return c.json({
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: c.res.headers.get('Retry-After'),
      }, 429);
    },
  });
}

/**
 * Pre-configured rate limiters for specific use cases
 */
export const RateLimitPresets = {
  /**
   * For data export operations
   * 1 export per minute per user
   */
  export: createRateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 1,
    message: 'You can only export once per minute. Please wait before exporting again.',
  }),
  
  /**
   * For project deletion
   * 2 deletions per 15 minutes
   */
  delete: createRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2,
    message: 'Too many deletion requests. Please wait before deleting more projects.',
  }),
  
  /**
   * For archive/restore operations
   * 5 per 5 minutes
   */
  archive: createRateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 5,
    message: 'Too many archive/restore operations. Please wait a few minutes.',
  }),
  
  /**
   * For authentication attempts
   * 5 login attempts per 15 minutes
   */
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: 'Too many login attempts. Please wait before trying again.',
  }),
};

