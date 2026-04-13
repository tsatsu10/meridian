/**
 * 🔴 Redis Cache Client
 * 
 * Provides Redis connection and caching utilities for:
 * - API response caching
 * - Session storage (future)
 * - Rate limiting (future)
 * 
 * Features:
 * - Auto-reconnect on failure
 * - Graceful degradation (works without Redis)
 * - JSON serialization
 * - TTL support
 * - Cache invalidation patterns
 */

import { createClient } from 'redis';
import logger from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let isRedisEnabled = false;

/**
 * Initialize Redis connection
 */
export async function initRedis() {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'; // Default to true

  if (!REDIS_ENABLED) {
    logger.debug('🔴 Redis is disabled via REDIS_ENABLED=false');
    return;
  }

  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('🔴 Redis: Max reconnection attempts reached');
            return new Error('Redis unavailable');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('🔴 Redis Client Error:', err);
      isRedisEnabled = false;
    });

    redisClient.on('connect', () => {
      logger.debug('🔴 Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      logger.debug('🔴 Redis: Connected and ready!');
      isRedisEnabled = true;
    });

    redisClient.on('reconnecting', () => {
      logger.debug('🔴 Redis: Reconnecting...');
    });

    await redisClient.connect();
    
    // Test connection
    await redisClient.ping();
    logger.debug('🔴 Redis: Connection test successful!');

  } catch (error) {
    logger.error('🔴 Redis: Failed to connect:', error.message);
    logger.debug('🔴 Redis: Application will continue without caching');
    isRedisEnabled = false;
    redisClient = null;
  }
}

/**
 * Get cached data
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisEnabled || !redisClient) {
    return null;
  }

  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error(`🔴 Redis GET error for key "${key}":`, error.message);
    return null;
  }
}

/**
 * Set cached data with TTL (time to live in seconds)
 */
export async function setCache(
  key: string,
  value: any,
  ttl: number = 300 // Default: 5 minutes
): Promise<boolean> {
  if (!isRedisEnabled || !redisClient) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    return true;
  } catch (error) {
    logger.error(`🔴 Redis SET error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete cached data
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!isRedisEnabled || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`🔴 Redis DEL error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 * 
 * Examples:
 * - deletePattern('project:*') - deletes all project caches
 * - deletePattern('project:123:*') - deletes all caches for project 123
 */
export async function deletePattern(pattern: string): Promise<number> {
  if (!isRedisEnabled || !redisClient) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;

    await redisClient.del(keys);
    logger.debug(`🔴 Redis: Deleted ${keys.length} keys matching "${pattern}"`);
    return keys.length;
  } catch (error) {
    logger.error(`🔴 Redis DEL pattern error for "${pattern}":`, error.message);
    return 0;
  }
}

/**
 * Check if key exists
 */
export async function hasCache(key: string): Promise<boolean> {
  if (!isRedisEnabled || !redisClient) {
    return false;
  }

  try {
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error(`🔴 Redis EXISTS error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Get time-to-live (TTL) for a key in seconds
 */
export async function getTTL(key: string): Promise<number> {
  if (!isRedisEnabled || !redisClient) {
    return -1;
  }

  try {
    return await redisClient.ttl(key);
  } catch (error) {
    logger.error(`🔴 Redis TTL error for key "${key}":`, error.message);
    return -1;
  }
}

/**
 * Flush all cached data (use with caution!)
 */
export async function flushAll(): Promise<boolean> {
  if (!isRedisEnabled || !redisClient) {
    return false;
  }

  try {
    await redisClient.flushAll();
    logger.debug('🔴 Redis: Flushed all data');
    return true;
  } catch (error) {
    logger.error('🔴 Redis FLUSHALL error:', error.message);
    return false;
  }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.debug('🔴 Redis: Connection closed');
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isRedisEnabled && redisClient !== null;
}

/**
 * Get Redis client (for advanced usage)
 */
export function getRedisClient(): RedisClient | null {
  return redisClient;
}

// Export cache key builders for consistency
export const CacheKeys = {
  projectOverview: (projectId: string, workspaceId: string) => 
    `project:${projectId}:workspace:${workspaceId}:overview`,
  
  projectTasks: (projectId: string) => 
    `project:${projectId}:tasks`,
  
  projectMilestones: (projectId: string) => 
    `project:${projectId}:milestones`,
  
  workspaceProjects: (workspaceId: string) => 
    `workspace:${workspaceId}:projects`,
  
  // Pattern matchers for invalidation
  allProjectCaches: (projectId: string) => 
    `project:${projectId}:*`,
  
  allWorkspaceCaches: (workspaceId: string) => 
    `workspace:${workspaceId}:*`,
};


