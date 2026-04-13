/**
 * Cache Middleware
 * HTTP caching and Redis-based response caching
 * Phase 1 - Performance Optimization
 */

import { MiddlewareHandler } from 'hono';
import { CacheService, CacheTTL } from '../services/cache/cache-service';
import { Logger } from '../services/logging/logger';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  varyBy?: string[];           // Vary cache by headers (e.g., ['user-id'])
  skipIf?: (c: any) => boolean; // Skip caching condition
  keyPrefix?: string;
}

/**
 * Response caching middleware
 */
export function cacheMiddleware(options: CacheOptions = {}): MiddlewareHandler {
  const {
    ttl = CacheTTL.MEDIUM,
    varyBy = [],
    skipIf,
    keyPrefix = 'route',
  } = options;

  return async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return next();
    }

    // Skip if condition is met
    if (skipIf && skipIf(c)) {
      return next();
    }

    try {
      // Build cache key
      const cacheKey = buildCacheKey(c, keyPrefix, varyBy);

      // Try to get from cache
      const cached = await CacheService.getOrCompute(
        cacheKey,
        async () => {
          // Execute route handler
          await next();

          // Get response
          const status = c.res.status;
          const headers: Record<string, string> = {};
          c.res.headers.forEach((value, key) => {
            headers[key] = value;
          });

          const body = await c.res.text();

          return {
            status,
            headers,
            body,
            timestamp: Date.now(),
          };
        },
        ttl
      );

      // Return cached response
      const age = Math.floor((Date.now() - cached.timestamp) / 1000);
      
      return c.body(cached.body, cached.status, {
        ...cached.headers,
        'X-Cache': 'HIT',
        'X-Cache-Age': age.toString(),
      });
    } catch (error) {
      Logger.error('Cache middleware error', error);
      // Fall through to normal request
      return next();
    }
  };
}

/**
 * Build cache key from request
 */
function buildCacheKey(c: any, prefix: string, varyBy: string[]): string {
  const parts = [prefix, c.req.path];
  
  // Add query params
    const query = c.req.query();
  if (Object.keys(query).length > 0) {
    const sortedQuery = Object.keys(query)
      .sort()
      .map(key => `${key}=${query[key]}`)
      .join('&');
      parts.push(sortedQuery);
  }

  // Add vary headers
  for (const header of varyBy) {
    const value = c.req.header(header);
    if (value) {
      parts.push(`${header}:${value}`);
    }
  }

  // Hash the key to keep it short
  const fullKey = parts.join('|');
  const hash = crypto.createHash('md5').update(fullKey).digest('hex');
  
  return `cache:${hash}`;
}

/**
 * HTTP cache headers middleware
 */
export function httpCacheHeaders(maxAge: number = 300): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Only cache successful GET requests
    if (c.req.method === 'GET' && c.res.status === 200) {
      c.header('Cache-Control', `public, max-age=${maxAge}`);
      c.header('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    }
  };
}

/**
 * ETag-based caching
 */
export function etagCache(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Only for GET requests
    if (c.req.method !== 'GET' || c.res.status !== 200) {
      return;
    }

    try {
      // Get response body
      const body = await c.res.text();

      // Generate ETag
      const etag = `"${crypto.createHash('md5').update(body).digest('hex')}"`;

      // Check if client has cached version
      const clientEtag = c.req.header('if-none-match');

      if (clientEtag === etag) {
        // Client has latest version
        return c.body(null, 304, {
          'ETag': etag,
        });
      }

      // Return with ETag
      return c.body(body, 200, {
        'ETag': etag,
      });
    } catch (error) {
      Logger.error('ETag cache error', error);
    }
  };
}

/**
 * Cache control for static assets
 */
export function staticAssetCache(maxAge: number = 31536000): MiddlewareHandler {
  return async (c, next) => {
    await next();

    const path = c.req.path;

    // Check if it's a static asset
    const isStatic = /\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|ico)$/.test(path);

    if (isStatic && c.res.status === 200) {
      c.header('Cache-Control', `public, max-age=${maxAge}, immutable`);
      c.header('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    }
  };
}

/**
 * No cache for authenticated/sensitive routes
 */
export function noCache(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
  };
}

/**
 * Cache invalidation helper
 */
export class CacheInvalidation {
  /**
   * Invalidate route cache
   */
  static async invalidateRoute(path: string): Promise<void> {
    const pattern = `cache:route:${path}*`;
    await CacheService.invalidatePattern(pattern);
    Logger.info('Route cache invalidated', { path });
  }

  /**
   * Invalidate user-specific cache
   */
  static async invalidateUser(userId: string): Promise<void> {
    await CacheService.invalidateUser(userId);
    await CacheService.invalidatePattern(`cache:*user-id:${userId}*`);
    Logger.info('User cache invalidated', { userId });
  }

  /**
   * Invalidate workspace cache
   */
  static async invalidateWorkspace(workspaceId: string): Promise<void> {
    await CacheService.invalidateWorkspace(workspaceId);
    Logger.info('Workspace cache invalidated', { workspaceId });
  }

  /**
   * Invalidate project cache
   */
  static async invalidateProject(projectId: string): Promise<void> {
    await CacheService.invalidateProject(projectId);
    Logger.info('Project cache invalidated', { projectId });
  }
}

/**
 * Cache presets for common use cases
 */
export class CachePresets {
  /**
   * Short cache - 1 minute (fast-changing data)
   */
  static short(): CacheOptions {
    return {
      ttl: CacheTTL.SHORT,
      keyPrefix: 'short',
    };
  }

  /**
   * Medium cache - 5 minutes (moderate-changing data)
   */
  static medium(): CacheOptions {
    return {
      ttl: CacheTTL.MEDIUM,
      keyPrefix: 'medium',
    };
  }

  /**
   * Long cache - 1 hour (slow-changing data)
   */
  static long(): CacheOptions {
    return {
      ttl: CacheTTL.LONG,
      keyPrefix: 'long',
    };
  }

  /**
   * Project overview cache - 5 minutes
   */
  static projectOverview(): CacheOptions {
    return {
      ttl: 300, // 5 minutes
      keyPrefix: 'project-overview',
      varyBy: ['user-id'],
    };
  }

  /**
   * Dashboard cache - 2 minutes
   */
  static dashboard(): CacheOptions {
    return {
      ttl: 120, // 2 minutes
      keyPrefix: 'dashboard',
      varyBy: ['user-id', 'workspace-id'],
    };
  }

  /**
   * Analytics cache - 10 minutes
   */
  static analytics(): CacheOptions {
    return {
      ttl: 600, // 10 minutes
      keyPrefix: 'analytics',
      varyBy: ['workspace-id'],
    };
  }

  /**
   * User profile cache - 5 minutes
   */
  static userProfile(): CacheOptions {
    return {
      ttl: 300, // 5 minutes
      keyPrefix: 'user-profile',
      varyBy: ['user-id'],
    };
  }

  /**
   * Workspace settings cache - 15 minutes
   */
  static workspaceSettings(): CacheOptions {
    return {
      ttl: 900, // 15 minutes
      keyPrefix: 'workspace-settings',
      varyBy: ['workspace-id'],
    };
  }

  /**
   * Static data cache - 1 hour
   */
  static staticData(): CacheOptions {
    return {
      ttl: 3600, // 1 hour
      keyPrefix: 'static',
    };
  }
}

export default {
  cacheMiddleware,
  httpCacheHeaders,
  etagCache,
  staticAssetCache,
  noCache,
  CacheInvalidation,
  CachePresets,
};

