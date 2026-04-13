import { Context } from 'hono';
import { cache } from 'hono/cache';
import logger from '../utils/logger';

// Cache configuration
export const cacheConfig = {
  // Short-term cache for frequently accessed data
  shortTerm: {
    cacheName: 'short-term',
    cacheControl: 'max-age=300', // 5 minutes
  },
  
  // Medium-term cache for moderately changing data
  mediumTerm: {
    cacheName: 'medium-term',
    cacheControl: 'max-age=3600', // 1 hour
  },
  
  // Long-term cache for stable data
  longTerm: {
    cacheName: 'long-term',
    cacheControl: 'max-age=86400', // 24 hours
  },
  
  // Static assets cache
  static: {
    cacheName: 'static-assets',
    cacheControl: 'max-age=31536000', // 1 year
  },
};

// Cache middleware factory
export function createCacheMiddleware(
  duration: number,
  cacheName: string = 'default'
) {
  return cache({
    cacheName,
    cacheControl: `max-age=${duration}`,
  });
}

// Specific cache middlewares
export const shortTermCache = createCacheMiddleware(300, 'short-term');
export const mediumTermCache = createCacheMiddleware(3600, 'medium-term');
export const longTermCache = createCacheMiddleware(86400, 'long-term');
export const staticCache = createCacheMiddleware(31536000, 'static-assets');

// Cache invalidation helper
export function invalidateCache(c: Context, cacheName: string) {
  // In a real implementation, you would invalidate the cache
  // This could involve clearing Redis cache, CDN cache, etc.
  logger.debug(`Invalidating cache: ${cacheName}`);
}

// Cache key generator
export function generateCacheKey(
  prefix: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
}

// Cache middleware with custom key generation
export function createCustomCacheMiddleware(
  keyGenerator: (c: Context) => string,
  duration: number = 300
) {
  return async (c: Context, next: () => Promise<void>) => {
    const cacheKey = keyGenerator(c);
    
    // Check if cached response exists
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      return c.json(cachedResponse);
    }
    
    // Execute the handler
    await next();
    
    // Cache the response
    const response = await c.res.clone().json();
    await setCachedResponse(cacheKey, response, duration);
  };
}

// Mock cache implementation (replace with Redis, Memcached, etc.)
const cacheStore = new Map<string, { data: any; expires: number }>();

async function getCachedResponse(key: string): Promise<any> {
  const cached = cacheStore.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cacheStore.delete(key);
  return null;
}

async function setCachedResponse(key: string, data: any, duration: number): Promise<void> {
  cacheStore.set(key, {
    data,
    expires: Date.now() + duration * 1000,
  });
}

// Cache warming utility
export async function warmCache(c: Context, endpoints: string[]) {
  for (const endpoint of endpoints) {
    try {
      await fetch(`${c.req.url.split('/api')[0]}/api${endpoint}`);
    } catch (error) {
      logger.error(`Failed to warm cache for ${endpoint}:`, error);
    }
  }
}

