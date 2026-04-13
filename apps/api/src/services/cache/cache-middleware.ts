/**
 * ⚡ Cache Middleware
 * 
 * Provides easy-to-use caching for Hono routes.
 * 
 * @epic-infrastructure: Route-level caching
 */

import type { Context, Next } from 'hono';
import { cacheManager } from './cache-manager';
import { logger } from '../../utils/logger';

/**
 * Middleware options
 */
interface CacheMiddlewareOptions {
  ttl?: number;
  tags?: string[] | ((c: Context) => string[]);
  keyGenerator?: (c: Context) => string;
  condition?: (c: Context) => boolean | Promise<boolean>;
  varyBy?: ('user' | 'workspace' | 'query' | 'body')[];
}

/**
 * Cache middleware for GET requests
 * 
 * Automatically caches responses and serves from cache on subsequent requests
 */
export function cacheResponse(options: CacheMiddlewareOptions = {}) {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    
    // Only cache GET requests
    if (method !== 'GET') {
      await next();
      return;
    }
    
    // Check condition if provided
    if (options.condition) {
      const shouldCache = await options.condition(c);
      if (!shouldCache) {
        await next();
        return;
      }
    }
    
    // Generate cache key
    const cacheKey = options.keyGenerator
      ? options.keyGenerator(c)
      : generateCacheKey(c, options.varyBy);
    
    // Try to get from cache
    const cached = await cacheManager.get<string>(cacheKey);
    
    if (cached) {
      logger.debug('Cache hit', { key: cacheKey });
      
      // Set cache headers
      c.header('X-Cache', 'HIT');
      c.header('X-Cache-Key', cacheKey);
      
      return c.json(JSON.parse(cached));
    }
    
    // Cache miss - execute handler
    logger.debug('Cache miss', { key: cacheKey });
    
    await next();
    
    // Cache the response
    const response = c.res.clone();
    
    if (response.status === 200) {
      const body = await response.text();
      
      // Get tags
      const tags = typeof options.tags === 'function'
        ? options.tags(c)
        : options.tags || [];
      
      // Store in cache
      await cacheManager.set(cacheKey, body, {
        ttl: options.ttl || 300, // Default 5 minutes
        tags,
      });
      
      // Set cache headers
      c.header('X-Cache', 'MISS');
      c.header('X-Cache-Key', cacheKey);
    }
  };
}

/**
 * Generate cache key based on request context
 */
function generateCacheKey(
  c: Context,
  varyBy: ('user' | 'workspace' | 'query' | 'body')[] = ['user', 'query']
): string {
  const parts: string[] = [
    'route',
    c.req.path.replace(/[^a-zA-Z0-9]/g, ':'), // Normalize path
  ];
  
  // Vary by user
  if (varyBy.includes('user')) {
    const userId = c.get('userId') || 'anonymous';
    parts.push(`user:${userId}`);
  }
  
  // Vary by workspace
  if (varyBy.includes('workspace')) {
    const workspaceId = c.req.query('workspaceId') || c.req.param('workspaceId');
    if (workspaceId) {
      parts.push(`workspace:${workspaceId}`);
    }
  }
  
  // Vary by query params
  if (varyBy.includes('query')) {
    const query = c.req.query();
    const queryStr = Object.entries(query)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');
    
    if (queryStr) {
      parts.push(`query:${queryStr}`);
    }
  }
  
  // Vary by body (for POST requests that should be cached)
  if (varyBy.includes('body')) {
    // Not recommended - use cautiously
    const body = c.get('sanitizedBody') || {};
    const bodyHash = JSON.stringify(body).substring(0, 50);
    parts.push(`body:${bodyHash}`);
  }
  
  return parts.join(':');
}

/**
 * Cache with automatic invalidation on related data changes
 */
export function smartCache(options: {
  ttl?: number;
  resourceType: 'user' | 'workspace' | 'project' | 'task' | 'dashboard' | 'analytics';
  resourceIdExtractor: (c: Context) => string;
}) {
  return cacheResponse({
    ttl: options.ttl,
    keyGenerator: (c) => {
      const resourceId = options.resourceIdExtractor(c);
      const path = c.req.path.replace(/[^a-zA-Z0-9]/g, ':');
      return `${options.resourceType}:${resourceId}:${path}`;
    },
    tags: (c) => {
      const resourceId = options.resourceIdExtractor(c);
      return [`${options.resourceType}:${resourceId}`];
    },
  });
}

/**
 * Invalidate cache after mutation
 */
export function invalidateAfter(tags: string[] | ((c: Context) => string[])) {
  return async (c: Context, next: Next) => {
    await next();
    
    // Only invalidate on successful mutations
    const status = c.res.status;
    if (status >= 200 && status < 300) {
      const tagsToInvalidate = typeof tags === 'function' ? tags(c) : tags;
      
      await cacheManager.invalidateTags(tagsToInvalidate);
      
      logger.debug('Cache invalidated', { tags: tagsToInvalidate });
    }
  };
}

/**
 * Cache warmer - preload frequently accessed data
 */
export class CacheWarmer {
  /**
   * Warm cache for user dashboard
   */
  static async warmUserDashboard(userId: string, workspaceId: string): Promise<void> {
    logger.info('Warming cache for user dashboard', { userId, workspaceId });
    
    // TODO: Preload dashboard data
    // - User's assigned tasks
    // - Recent activity
    // - Unread notifications
    // - Project overviews
  }

  /**
   * Warm cache for project overview
   */
  static async warmProjectOverview(projectId: string): Promise<void> {
    logger.info('Warming cache for project', { projectId });
    
    // TODO: Preload project data
    // - Project details
    // - Task statistics
    // - Team members
    // - Recent activity
    // - Health metrics
  }

  /**
   * Warm cache for workspace
   */
  static async warmWorkspace(workspaceId: string): Promise<void> {
    logger.info('Warming cache for workspace', { workspaceId });
    
    // TODO: Preload workspace data
    // - Workspace settings
    // - Members list
    // - Projects list
    // - Analytics summary
  }
}

export default { cacheResponse, smartCache, invalidateAfter, CacheWarmer };


