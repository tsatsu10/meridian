/**
 * Global Rate Limiting Middleware
 * Protects API from abuse and DDoS attacks
 * Phase 0 - Security Hardening Implementation
 */

import { MiddlewareHandler } from 'hono';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import logger from '../utils/logger';

interface RateLimitConfig {
  points: number; // Number of requests
  duration: number; // Time window in seconds
  blockDuration?: number; // How long to block after limit (seconds)
  keyGenerator?: (c: any) => string; // Custom key generator
}

interface RateLimitOptions {
  global?: RateLimitConfig;
  perIP?: RateLimitConfig;
  perUser?: RateLimitConfig;
  perEndpoint?: Record<string, RateLimitConfig>;
  useRedis?: boolean;
  redisClient?: any;
}

/**
 * Create rate limiter instance
 */
function createRateLimiter(config: RateLimitConfig, useRedis: boolean = false, redisClient?: any) {
  const options = {
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration || config.duration,
  };

  if (useRedis && redisClient) {
    return new RateLimiterRedis({
      ...options,
      storeClient: redisClient,
    });
  }

  return new RateLimiterMemory(options);
}

/**
 * Default rate limit configurations
 */
const DEFAULT_CONFIGS = {
  global: {
    points: 1000, // 1000 requests
    duration: 60, // per minute
    blockDuration: 60, // block for 1 minute
  },
  perIP: {
    points: 100, // 100 requests
    duration: 60, // per minute
    blockDuration: 300, // block for 5 minutes
  },
  perUser: {
    points: 200, // 200 requests
    duration: 60, // per minute
    blockDuration: 60, // block for 1 minute
  },
  strict: {
    // For sensitive endpoints (login, register, etc.)
    points: 5,
    duration: 60,
    blockDuration: 900, // 15 minutes
  },
  moderate: {
    // For regular API endpoints
    points: 50,
    duration: 60,
    blockDuration: 300, // 5 minutes
  },
  lenient: {
    // For public/read-only endpoints
    points: 200,
    duration: 60,
    blockDuration: 60,
  },
};

/**
 * Get client identifier
 */
function getClientIP(c: any): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}

/**
 * Global rate limiting middleware
 */
export function globalRateLimit(options: RateLimitOptions = {}): MiddlewareHandler {
  const {
    global = DEFAULT_CONFIGS.global,
    perIP = DEFAULT_CONFIGS.perIP,
    perUser = DEFAULT_CONFIGS.perUser,
    perEndpoint = {},
    useRedis = false,
    redisClient,
  } = options;

  // Create rate limiters
  const globalLimiter = createRateLimiter(global, useRedis, redisClient);
  const ipLimiter = createRateLimiter(perIP, useRedis, redisClient);
  const userLimiter = perUser ? createRateLimiter(perUser, useRedis, redisClient) : null;

  // Create endpoint-specific limiters
  const endpointLimiters = new Map<string, any>();
  for (const [endpoint, config] of Object.entries(perEndpoint)) {
    endpointLimiters.set(endpoint, createRateLimiter(config, useRedis, redisClient));
  }

  return async (c, next) => {
    const ip = getClientIP(c);
    const path = c.req.path;
    const user = c.get('user');

    try {
      // 1. Global rate limit (all requests)
      await globalLimiter.consume('global', 1);

      // 2. Per-IP rate limit
      await ipLimiter.consume(ip, 1);

      // 3. Per-user rate limit (if authenticated)
      if (user && userLimiter) {
        await userLimiter.consume(user.id, 1);
      }

      // 4. Endpoint-specific rate limit
      for (const [endpoint, limiter] of endpointLimiters.entries()) {
        if (path.startsWith(endpoint)) {
          await limiter.consume(`${endpoint}:${ip}`, 1);
        }
      }

      // Add rate limit headers
      c.header('X-RateLimit-Limit', perIP.points.toString());
      c.header('X-RateLimit-Remaining', 'OK');
      c.header('X-RateLimit-Reset', (Date.now() + perIP.duration * 1000).toString());

      await next();
    } catch (error: any) {
      if (error.remainingPoints !== undefined) {
        // Rate limit exceeded
        const retryAfter = Math.ceil(error.msBeforeNext / 1000);

        logger.warn('⚠️  Rate limit exceeded:', {
          ip,
          path,
          userId: user?.id,
          retryAfter,
        });

        c.header('Retry-After', retryAfter.toString());
        c.header('X-RateLimit-Limit', perIP.points.toString());
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', (Date.now() + error.msBeforeNext).toString());

        return c.json(
          {
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter,
          },
          429
        );
      }

      // Other error
      logger.error('❌ Rate limit error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

/**
 * Create endpoint-specific rate limiter
 */
export function endpointRateLimit(
  config: RateLimitConfig | keyof typeof DEFAULT_CONFIGS
): MiddlewareHandler {
  const rateLimitConfig = typeof config === 'string' ? DEFAULT_CONFIGS[config] : config;
  const limiter = createRateLimiter(rateLimitConfig);

  return async (c, next) => {
    const ip = getClientIP(c);
    const path = c.req.path;
    const key = `${path}:${ip}`;

    try {
      const result = await limiter.consume(key, 1);

      // Add rate limit headers
      c.header('X-RateLimit-Limit', rateLimitConfig.points.toString());
      c.header('X-RateLimit-Remaining', result.remainingPoints.toString());
      c.header('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());

      await next();
    } catch (error: any) {
      if (error.remainingPoints !== undefined) {
        const retryAfter = Math.ceil(error.msBeforeNext / 1000);

        logger.warn('⚠️  Endpoint rate limit exceeded:', { path, ip, retryAfter });

        c.header('Retry-After', retryAfter.toString());
        c.header('X-RateLimit-Limit', rateLimitConfig.points.toString());
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext).toISOString());

        return c.json(
          {
            error: 'Too many requests',
            message: 'You have exceeded the rate limit for this endpoint. Please try again later.',
            retryAfter,
          },
          429
        );
      }

      logger.error('❌ Rate limit error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

/**
 * Adaptive rate limiting based on user reputation
 */
export function adaptiveRateLimit(): MiddlewareHandler {
  const limiters = {
    trusted: createRateLimiter({ points: 500, duration: 60 }),
    normal: createRateLimiter({ points: 100, duration: 60 }),
    suspicious: createRateLimiter({ points: 20, duration: 60, blockDuration: 600 }),
  };

  return async (c, next) => {
    const ip = getClientIP(c);
    const user = c.get('user');

    // Determine user reputation (simplified)
    let reputation: 'trusted' | 'normal' | 'suspicious' = 'normal';
    
    if (user) {
      // Check user's account age, activity, etc.
      const accountAgeInDays = Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (accountAgeInDays > 30) {
        reputation = 'trusted';
      }
    } else {
      // Anonymous users are potentially suspicious
      // In production, you'd check against a blacklist/reputation database
      reputation = 'normal';
    }

    const limiter = limiters[reputation];

    try {
      await limiter.consume(user?.id || ip, 1);
      await next();
    } catch (error: any) {
      if (error.remainingPoints !== undefined) {
        const retryAfter = Math.ceil(error.msBeforeNext / 1000);
        return c.json(
          {
            error: 'Too many requests',
            retryAfter,
          },
          429
        );
      }

      logger.error('❌ Adaptive rate limit error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

/**
 * Cost-based rate limiting (different costs for different operations)
 */
export function costBasedRateLimit(costs: Record<string, number>): MiddlewareHandler {
  const limiter = createRateLimiter({
    points: 100, // Total "cost" points
    duration: 60,
  });

  return async (c, next) => {
    const ip = getClientIP(c);
    const path = c.req.path;
    
    // Determine cost for this endpoint
    let cost = 1; // Default cost
    for (const [endpoint, endpointCost] of Object.entries(costs)) {
      if (path.startsWith(endpoint)) {
        cost = endpointCost;
        break;
      }
    }

    try {
      await limiter.consume(ip, cost);
      await next();
    } catch (error: any) {
      if (error.remainingPoints !== undefined) {
        const retryAfter = Math.ceil(error.msBeforeNext / 1000);
        return c.json(
          {
            error: 'Rate limit exceeded',
            message: `This operation costs ${cost} points. You've exhausted your quota.`,
            retryAfter,
          },
          429
        );
      }

      logger.error('❌ Cost-based rate limit error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

/**
 * Export default configurations
 */
export { DEFAULT_CONFIGS as RATE_LIMIT_CONFIGS };


