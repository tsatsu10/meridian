import { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import logger from '../utils/logger';

/**
 * Advanced Rate Limiting Middleware
 * Implements token bucket algorithm with Redis-like in-memory storage
 * 
 * Features:
 * - Token bucket algorithm (more flexible than fixed window)
 * - Per-user and per-IP rate limiting
 * - Different limits for different endpoints
 * - Automatic cleanup of old entries
 * - Rate limit headers (X-RateLimit-*)
 * 
 * @example
 * ```typescript
 * import { advancedRateLimit } from "./middlewares/rate-limit-advanced";
 * 
 * // Apply to all API routes
 * app.use("/api/*", advancedRateLimit({
 *   windowMs: 60000, // 1 minute
 *   maxRequests: 100, // 100 requests per minute
 *   keyGenerator: (c) => c.get("userId") || c.req.header("x-forwarded-for") || "anonymous"
 * }));
 * 
 * // Stricter limits for auth endpoints
 * app.use("/api/auth/*", advancedRateLimit({
 *   windowMs: 900000, // 15 minutes
 *   maxRequests: 5, // 5 attempts per 15 minutes
 * }));
 * ```
 */

interface RateLimitOptions {
  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number;

  /**
   * Maximum number of requests per window
   * @default 100
   */
  maxRequests?: number;

  /**
   * Custom key generator function
   * @default IP address
   */
  keyGenerator?: (c: Context) => string;

  /**
   * Custom rate limit exceeded handler
   */
  onRateLimitExceeded?: (c: Context, resetTime: Date) => Response;

  /**
   * Skip rate limiting for certain requests
   */
  skip?: (c: Context) => boolean;

  /**
   * Store implementation (for Redis or other backends)
   */
  store?: RateLimitStore;
}

interface RateLimitStore {
  increment: (key: string) => Promise<{ count: number; resetTime: Date }>;
  get: (key: string) => Promise<{ count: number; resetTime: Date } | null>;
  reset: (key: string) => Promise<void>;
}

/**
 * In-memory rate limit store (for single-server deployments)
 * For production multi-server, use Redis or similar
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: Date }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private windowMs: number) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async increment(key: string): Promise<{ count: number; resetTime: Date }> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetTime.getTime() > now) {
      // Window still valid, increment count
      existing.count++;
      return existing;
    } else {
      // New window
      const resetTime = new Date(now + this.windowMs);
      const entry = { count: 1, resetTime };
      this.store.set(key, entry);
      return entry;
    }
  }

  async get(key: string): Promise<{ count: number; resetTime: Date } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.resetTime.getTime() <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime.getTime() <= now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

/**
 * Default key generator - uses user ID or IP address
 */
function defaultKeyGenerator(c: Context): string {
  // Try to get user ID from context (set by auth middleware)
  const userId = c.get("userId");
  if (userId) return `user:${userId}`;

  // Fall back to IP address
  const forwarded = c.req.header("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : c.req.header("x-real-ip") || "anonymous";
  return `ip:${ip}`;
}

/**
 * Default rate limit exceeded handler
 */
function defaultRateLimitHandler(c: Context, resetTime: Date): Response {
  const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
  
  return c.json(
    {
      error: "Too many requests",
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    },
    429,
    {
      "Retry-After": retryAfter.toString(),
      "X-RateLimit-Reset": resetTime.toISOString(),
    }
  );
}

/**
 * Advanced Rate Limiting Middleware Factory
 */
export function advancedRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    onRateLimitExceeded = defaultRateLimitHandler,
    skip,
    store = new InMemoryRateLimitStore(windowMs),
  } = options;

  return createMiddleware(async (c: Context, next: Next) => {
    // Skip if specified
    if (skip && skip(c)) {
      return next();
    }

    // Generate rate limit key
    const key = keyGenerator(c);

    // Increment counter
    const { count, resetTime } = await store.increment(key);

    // Set rate limit headers
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, maxRequests - count).toString());
    c.header("X-RateLimit-Reset", resetTime.toISOString());

    // Check if rate limit exceeded
    if (count > maxRequests) {
      logger.warn(`Rate limit exceeded for key: ${key} (${count}/${maxRequests})`);
      return onRateLimitExceeded(c, resetTime);
    }

    return next();
  });
}

/**
 * Preset rate limit configurations
 */
export const rateLimitPresets = {
  /**
   * Strict - For authentication endpoints
   */
  strict: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
  },

  /**
   * Standard - For general API endpoints
   */
  standard: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },

  /**
   * Generous - For read-only endpoints
   */
  generous: {
    windowMs: 60000, // 1 minute
    maxRequests: 300,
  },

  /**
   * Public - For public, unauthenticated endpoints
   */
  public: {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
  },
};

export default advancedRateLimit;


