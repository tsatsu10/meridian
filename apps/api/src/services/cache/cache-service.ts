/**
 * Cache Service
 * High-level caching operations
 * Phase 1 - Performance Optimization
 */

import { getRedisClient } from './redis-client';
import { Logger } from '../logging/logger';

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  VERY_SHORT: 60,          // 1 minute
  SHORT: 300,              // 5 minutes
  MEDIUM: 900,             // 15 minutes
  LONG: 3600,              // 1 hour
  VERY_LONG: 86400,        // 24 hours
  WEEK: 604800,            // 7 days
} as const;

/**
 * Cache key builders
 */
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userSession: (sessionId: string) => `session:${sessionId}`,
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,
  project: (projectId: string) => `project:${projectId}`,
  task: (taskId: string) => `task:${taskId}`,
  taskList: (projectId: string) => `tasks:project:${projectId}`,
  searchResults: (query: string, filters?: string) => 
    `search:${query}:${filters || 'all'}`,
  analytics: (type: string, id: string, period: string) => 
    `analytics:${type}:${id}:${period}`,
  notification: (userId: string) => `notifications:${userId}`,
  file: (fileId: string) => `file:${fileId}`,
  thumbnail: (fileId: string) => `thumbnail:${fileId}`,
} as const;

/**
 * Cache Service Class
 */
export class CacheService {
  /**
   * Get or compute value
   * If cache miss, compute and store the value
   */
  static async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM
  ): Promise<T> {
    const redis = getRedisClient();

    try {
      // Try to get from cache
      const cached = await redis.get<T>(key);
      
      if (cached !== null) {
        Logger.debug('Cache hit', { key });
        return cached;
      }

      // Cache miss - compute value
      Logger.debug('Cache miss', { key });
      const value = await computeFn();

      // Store in cache (fire and forget)
      redis.set(key, value, ttl).catch((error) => {
        Logger.error('Failed to cache value', error, { key });
      });

      return value;
    } catch (error) {
      Logger.error('Cache getOrCompute failed', error, { key });
      // Fall back to computing the value
      return await computeFn();
    }
  }

  /**
   * Invalidate cache by key
   */
  static async invalidate(...keys: string[]): Promise<void> {
    const redis = getRedisClient();

    try {
      await redis.del(...keys);
      Logger.debug('Cache invalidated', { keys });
    } catch (error) {
      Logger.error('Cache invalidation failed', error, { keys });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    const redis = getRedisClient();

    try {
      const deletedCount = await redis.delPattern(pattern);
      Logger.debug('Cache pattern invalidated', { pattern, deletedCount });
    } catch (error) {
      Logger.error('Cache pattern invalidation failed', error, { pattern });
    }
  }

  /**
   * Cache user data
   */
  static async cacheUser(userId: string, userData: any, ttl: number = CacheTTL.LONG): Promise<void> {
    const redis = getRedisClient();
    const key = CacheKeys.user(userId);

    try {
      await redis.set(key, userData, ttl);
    } catch (error) {
      Logger.error('Failed to cache user', error, { userId });
    }
  }

  /**
   * Get cached user
   */
  static async getCachedUser(userId: string): Promise<any | null> {
    const redis = getRedisClient();
    const key = CacheKeys.user(userId);

    try {
      return await redis.get(key);
    } catch (error) {
      Logger.error('Failed to get cached user', error, { userId });
      return null;
    }
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUser(userId: string): Promise<void> {
    const key = CacheKeys.user(userId);
    await this.invalidate(key);
  }

  /**
   * Cache workspace data
   */
  static async cacheWorkspace(workspaceId: string, data: any, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    const redis = getRedisClient();
    const key = CacheKeys.workspace(workspaceId);

    try {
      await redis.set(key, data, ttl);
    } catch (error) {
      Logger.error('Failed to cache workspace', error, { workspaceId });
    }
  }

  /**
   * Invalidate workspace and related caches
   */
  static async invalidateWorkspace(workspaceId: string): Promise<void> {
    await this.invalidatePattern(`workspace:${workspaceId}*`);
    await this.invalidatePattern(`project:*:workspace:${workspaceId}*`);
  }

  /**
   * Cache project data
   */
  static async cacheProject(projectId: string, data: any, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    const redis = getRedisClient();
    const key = CacheKeys.project(projectId);

    try {
      await redis.set(key, data, ttl);
    } catch (error) {
      Logger.error('Failed to cache project', error, { projectId });
    }
  }

  /**
   * Invalidate project and related caches
   */
  static async invalidateProject(projectId: string): Promise<void> {
    await this.invalidate(CacheKeys.project(projectId));
    await this.invalidate(CacheKeys.taskList(projectId));
    await this.invalidatePattern(`task:*:project:${projectId}*`);
  }

  /**
   * Cache task list
   */
  static async cacheTaskList(projectId: string, tasks: any[], ttl: number = CacheTTL.SHORT): Promise<void> {
    const redis = getRedisClient();
    const key = CacheKeys.taskList(projectId);

    try {
      await redis.set(key, tasks, ttl);
    } catch (error) {
      Logger.error('Failed to cache task list', error, { projectId });
    }
  }

  /**
   * Cache search results
   */
  static async cacheSearchResults(
    query: string,
    filters: string | undefined,
    results: any[],
    ttl: number = CacheTTL.MEDIUM
  ): Promise<void> {
    const redis = getRedisClient();
    const key = CacheKeys.searchResults(query, filters);

    try {
      await redis.set(key, results, ttl);
    } catch (error) {
      Logger.error('Failed to cache search results', error, { query, filters });
    }
  }

  /**
   * Cache analytics data
   */
  static async cacheAnalytics(
    type: string,
    id: string,
    period: string,
    data: any,
    ttl: number = CacheTTL.LONG
  ): Promise<void> {
    const redis = getRedisClient();
    const key = CacheKeys.analytics(type, id, period);

    try {
      await redis.set(key, data, ttl);
    } catch (error) {
      Logger.error('Failed to cache analytics', error, { type, id, period });
    }
  }

  /**
   * Cache file metadata
   */
  static async cacheFile(fileId: string, metadata: any, ttl: number = CacheTTL.VERY_LONG): Promise<void> {
    const redis = getRedisClient();
    const key = CacheKeys.file(fileId);

    try {
      await redis.set(key, metadata, ttl);
    } catch (error) {
      Logger.error('Failed to cache file', error, { fileId });
    }
  }

  /**
   * Increment counter
   */
  static async incrementCounter(key: string, ttl?: number): Promise<number> {
    const redis = getRedisClient();

    try {
      const value = await redis.incr(key);

      // Set TTL if provided and this is the first increment
      if (ttl && value === 1) {
        await redis.expire(key, ttl);
      }

      return value;
    } catch (error) {
      Logger.error('Failed to increment counter', error, { key });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    connected: boolean;
    keysCount?: number;
    memoryUsage?: string;
    uptime?: number;
  }> {
    const redis = getRedisClient();

    try {
      if (!redis.isReady()) {
        return { connected: false };
      }

      const info = await redis.info();
      const lines = info.split('\r\n');
      
      const stats: any = { connected: true };

      for (const line of lines) {
        if (line.startsWith('db0:')) {
          const match = line.match(/keys=(\d+)/);
          if (match) {
            stats.keysCount = parseInt(match[1]);
          }
        }
        if (line.startsWith('used_memory_human:')) {
          stats.memoryUsage = line.split(':')[1];
        }
        if (line.startsWith('uptime_in_seconds:')) {
          stats.uptime = parseInt(line.split(':')[1]);
        }
      }

      return stats;
    } catch (error) {
      Logger.error('Failed to get cache stats', error);
      return { connected: false };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmUp(data: { key: string; value: any; ttl: number }[]): Promise<void> {
    const redis = getRedisClient();

    try {
      const promises = data.map(({ key, value, ttl }) => 
        redis.set(key, value, ttl)
      );

      await Promise.all(promises);
      Logger.info('Cache warmed up', { count: data.length });
    } catch (error) {
      Logger.error('Cache warm up failed', error);
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  static async clearAll(): Promise<void> {
    const redis = getRedisClient();

    try {
      await redis.flushAll();
      Logger.warn('All cache cleared');
    } catch (error) {
      Logger.error('Failed to clear cache', error);
    }
  }
}

export default CacheService;


