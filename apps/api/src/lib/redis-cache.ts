/**
 * 🚀 Redis Caching Layer
 * 
 * Implements caching for frequently accessed database queries
 * to reduce database load and improve API response times.
 * 
 * @epic-infrastructure: Performance optimization
 */

import { Redis } from 'ioredis';
import logger from '../utils/logger';

class RedisCache {
  private client: Redis | null = null;
  private enabled: boolean = false;
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  private initialize() {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('REDIS_URL not configured - caching disabled');
      this.enabled = false;
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 retries');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000); // Exponential backoff
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        logger.info('✅ Redis connected successfully');
        this.enabled = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis error:', error);
        this.enabled = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.enabled = false;
      });

      // Attempt connection
      this.client.connect().catch((error) => {
        logger.error('Failed to connect to Redis:', error);
        this.enabled = false;
      });

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.enabled = false;
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;

    try {
      const cached = await this.client.get(key);
      if (!cached) return null;

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<boolean> {
    if (!this.enabled || !this.client) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled || !this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.client) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(...keys);
      logger.debug(`Invalidated ${keys.length} keys matching ${pattern}`);
      return keys.length;
    } catch (error) {
      logger.error(`Redis invalidate error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      logger.debug(`Cache HIT for key: ${key}`);
      return cached;
    }

    // Cache miss - fetch from database
    logger.debug(`Cache MISS for key: ${key}`);
    const fresh = await fetchFn();

    // Store in cache for next time
    await this.set(key, fresh, ttlSeconds);

    return fresh;
  }

  /**
   * Check if Redis is enabled and connected
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null && this.client.status === 'ready';
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.enabled || !this.client) {
      return { enabled: false };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbsize();

      return {
        enabled: true,
        connected: this.client.status === 'ready',
        dbSize,
        info,
      };
    } catch (error) {
      return { enabled: false, error: String(error) };
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    if (!this.enabled || !this.client) return false;

    try {
      await this.client.flushdb();
      logger.info('Redis cache cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear Redis cache:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.enabled = false;
      logger.info('Redis connection closed');
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();

/**
 * Helper: Generate cache key
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * Cache key patterns for different resources
 */
export const CacheKeys = {
  // Projects
  project: (id: string) => cacheKey('project', id),
  projectList: (workspaceId: string) => cacheKey('projects', workspaceId),
  projectTasks: (projectId: string) => cacheKey('project', projectId, 'tasks'),

  // Tasks
  task: (id: string) => cacheKey('task', id),
  taskList: (projectId: string) => cacheKey('tasks', projectId),

  // Users
  user: (id: string) => cacheKey('user', id),
  userByEmail: (email: string) => cacheKey('user', 'email', email),
  workspaceUsers: (workspaceId: string) => cacheKey('workspace', workspaceId, 'users'),

  // Workspaces
  workspace: (id: string) => cacheKey('workspace', id),
  userWorkspaces: (userId: string) => cacheKey('user', userId, 'workspaces'),

  // Analytics
  projectAnalytics: (projectId: string) => cacheKey('analytics', 'project', projectId),
  workspaceAnalytics: (workspaceId: string) => cacheKey('analytics', 'workspace', workspaceId),
};

/**
 * Cache TTLs for different data types
 */
export const CacheTTL = {
  SHORT: 60,          // 1 minute - frequently changing data
  MEDIUM: 300,        // 5 minutes - moderate updates
  LONG: 1800,         // 30 minutes - rarely changing
  EXTENDED: 3600,     // 1 hour - static data
};

export default redisCache;



