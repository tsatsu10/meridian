import { logger } from '../utils/logger';

/**
 * Production Rate Limiter
 * 
 * Implements request throttling to prevent resource exhaustion
 */

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private rule: RateLimitRule;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(rule: RateLimitRule) {
    this.rule = {
      windowMs: rule.windowMs,
      maxRequests: rule.maxRequests,
      skipSuccessfulRequests: rule.skipSuccessfulRequests ?? false,
      skipFailedRequests: rule.skipFailedRequests ?? false,
      keyGenerator: rule.keyGenerator || this.defaultKeyGenerator,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  private defaultKeyGenerator(req: any): string {
    // Use IP address as default key
    return req.headers?.['x-forwarded-for'] || 
           req.headers?.['x-real-ip'] || 
           req.connection?.remoteAddress || 
           'unknown';
  }

  async checkLimit(req: any, res?: any): Promise<{ allowed: boolean; resetTime: number; remaining: number }> {
    const key = this.rule.keyGenerator!(req);
    const now = Date.now();
    
    let record = this.requests.get(key);
    
    if (!record || now >= record.resetTime) {
      // Create new record or reset expired one
      record = {
        count: 0,
        resetTime: now + this.rule.windowMs,
        firstRequest: now,
      };
    }

    // Check if limit exceeded
    if (record.count >= this.rule.maxRequests) {
      return {
        allowed: false,
        resetTime: record.resetTime,
        remaining: 0,
      };
    }

    // Increment count
    record.count++;
    this.requests.set(key, record);

    return {
      allowed: true,
      resetTime: record.resetTime,
      remaining: Math.max(0, this.rule.maxRequests - record.count),
    };
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, Math.min(this.rule.windowMs, 60000)); // Cleanup at most every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, record] of this.requests) {
      if (now >= record.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.requests.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.info(`🧹 Rate limiter cleaned up ${keysToDelete.length} expired records`);
    }
  }

  getStats() {
    const now = Date.now();
    let activeKeys = 0;
    let totalRequests = 0;

    for (const [, record] of this.requests) {
      if (now < record.resetTime) {
        activeKeys++;
        totalRequests += record.count;
      }
    }

    return {
      activeKeys,
      totalRequests,
      averageRequestsPerKey: activeKeys > 0 ? Math.round(totalRequests / activeKeys) : 0,
      windowMs: this.rule.windowMs,
      maxRequests: this.rule.maxRequests,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Middleware factory
export function createRateLimitMiddleware(rule: RateLimitRule) {
  const limiter = new RateLimiter(rule);

  return async (c: any, next: any) => {
    try {
      const result = await limiter.checkLimit(c.req);

      // Set rate limit headers
      c.header('X-RateLimit-Limit', rule.maxRequests.toString());
      c.header('X-RateLimit-Remaining', result.remaining.toString());
      c.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

      if (!result.allowed) {
        c.header('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
        return c.json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        }, 429);
      }

      await next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Continue on error to avoid blocking requests
      await next();
    }
  };
}

// Pre-configured rate limiters
export const apiRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
});

export const authRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 auth attempts per 15 minutes
});

export const strictRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

export const automationRateLimiter = createRateLimitMiddleware({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 100, // 100 automation requests per 5 minutes
});

export default RateLimiter;

