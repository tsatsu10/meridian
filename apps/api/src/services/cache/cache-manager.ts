/**
 * 🚀 Cache Manager Service
 * 
 * Provides Redis-based caching with:
 * - Tag-based invalidation
 * - TTL management
 * - Automatic serialization
 * - Fallback to memory cache
 * - Type-safe operations
 * 
 * @epic-infrastructure: Performance optimization layer
 */

import { logger } from '../../utils/logger';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  tags: string[];
  createdAt: number;
  expiresAt: number;
}

/**
 * Cache options
 */
interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for grouped invalidation
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

/**
 * Cache Manager Class
 * 
 * Supports both Redis (production) and in-memory (development) caching
 */
export class CacheManager {
  private redis: any = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> Set<key>
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };
  private isRedisAvailable: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis() {
    try {
      // Try to load Redis client
      const Redis = await import('ioredis').then(m => m.default).catch(() => null);
      
      if (!Redis) {
        logger.info('Redis not installed - using in-memory cache');
        return;
      }
      
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn('Redis connection failed - falling back to memory cache');
            this.isRedisAvailable = false;
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });
      
      this.redis.on('connect', () => {
        logger.info('✅ Redis connected');
        this.isRedisAvailable = true;
      });
      
      this.redis.on('error', (err: Error) => {
        logger.error('Redis error:', err);
        this.isRedisAvailable = false;
      });
      
      this.redis.on('ready', () => {
        logger.info('✅ Redis ready');
        this.isRedisAvailable = true;
      });
      
      // Test connection
      await this.redis.ping();
      this.isRedisAvailable = true;
      logger.info('✅ Redis cache manager initialized');
      
    } catch (error) {
      logger.warn('Redis initialization failed - using in-memory cache', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisAvailable && this.redis) {
        // Try Redis first
        const data = await this.redis.get(key);
        
        if (data) {
          this.stats.hits++;
          this.updateHitRate();
          
          const entry: CacheEntry<T> = JSON.parse(data);
          
          // Check expiration
          if (Date.now() > entry.expiresAt) {
            await this.delete(key);
            this.stats.misses++;
            return null;
          }
          
          return entry.value;
        }
      } else {
        // Fallback to memory cache
        const entry = this.memoryCache.get(key);
        
        if (entry) {
          // Check expiration
          if (Date.now() > entry.expiresAt) {
            this.memoryCache.delete(key);
            this.stats.misses++;
            return null;
          }
          
          this.stats.hits++;
          this.updateHitRate();
          return entry.value as T;
        }
      }
      
      this.stats.misses++;
      this.updateHitRate();
      return null;
      
    } catch (error) {
      logger.error('Cache get error', { key, error });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // Default 5 minutes
    const tags = options.tags || [];
    
    const entry: CacheEntry<T> = {
      value,
      tags,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttl * 1000),
    };
    
    try {
      if (this.isRedisAvailable && this.redis) {
        // Store in Redis with TTL
        await this.redis.setex(key, ttl, JSON.stringify(entry));
        
        // Index tags in Redis
        for (const tag of tags) {
          await this.redis.sadd(`tag:${tag}`, key);
          await this.redis.expire(`tag:${tag}`, ttl);
        }
      } else {
        // Store in memory
        this.memoryCache.set(key, entry);
        
        // Index tags in memory
        for (const tag of tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(key);
        }
      }
      
      this.stats.sets++;
      
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        // Get entry to find tags
        const data = await this.redis.get(key);
        
        if (data) {
          const entry: CacheEntry<any> = JSON.parse(data);
          
          // Remove from tag indexes
          for (const tag of entry.tags) {
            await this.redis.srem(`tag:${tag}`, key);
          }
        }
        
        await this.redis.del(key);
      } else {
        // Delete from memory
        const entry = this.memoryCache.get(key);
        
        if (entry) {
          // Remove from tag indexes
          for (const tag of entry.tags) {
            this.tagIndex.get(tag)?.delete(key);
          }
        }
        
        this.memoryCache.delete(key);
      }
      
      this.stats.deletes++;
      
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    
    try {
      if (this.isRedisAvailable && this.redis) {
        // Get all keys with this tag
        const keys = await this.redis.smembers(`tag:${tag}`);
        
        if (keys.length > 0) {
          // Delete all keys
          await this.redis.del(...keys);
          await this.redis.del(`tag:${tag}`);
          count = keys.length;
        }
      } else {
        // Invalidate from memory
        const keys = this.tagIndex.get(tag);
        
        if (keys) {
          for (const key of keys) {
            this.memoryCache.delete(key);
            count++;
          }
          this.tagIndex.delete(tag);
        }
      }
      
      if (count > 0) {
        logger.info(`Invalidated ${count} cache entries with tag: ${tag}`);
      }
      
      return count;
      
    } catch (error) {
      logger.error('Cache invalidation error', { tag, error });
      return 0;
    }
  }

  /**
   * Invalidate multiple tags at once
   */
  async invalidateTags(tags: string[]): Promise<number> {
    let totalCount = 0;
    
    for (const tag of tags) {
      const count = await this.invalidateByTag(tag);
      totalCount += count;
    }
    
    return totalCount;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushdb();
      } else {
        this.memoryCache.clear();
        this.tagIndex.clear();
      }
      
      logger.info('Cache cleared');
      
    } catch (error) {
      logger.error('Cache clear error', error);
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    // Cache miss - fetch fresh data
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Check if Redis is available
   */
  isReady(): boolean {
    return this.isRedisAvailable;
  }

  /**
   * Get cache backend type
   */
  getBackend(): 'redis' | 'memory' {
    return this.isRedisAvailable ? 'redis' : 'memory';
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Cleanup expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        
        // Remove from tag indexes
        for (const tag of entry.tags) {
          this.tagIndex.get(tag)?.delete(key);
        }
      }
    }
  }

  /**
   * Start periodic cleanup (for memory cache)
   */
  startCleanup(intervalMs: number = 60000): void {
    if (!this.isRedisAvailable) {
      setInterval(() => {
        this.cleanupMemoryCache();
      }, intervalMs);
      
      logger.info('Memory cache cleanup scheduled', { intervalMs });
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Start cleanup for memory cache
cacheManager.startCleanup();

export default cacheManager;


