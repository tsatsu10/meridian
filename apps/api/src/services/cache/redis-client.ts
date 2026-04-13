/**
 * Redis Cache Client
 * Centralized Redis connection and operations
 * Phase 1 - Performance Optimization
 */

import Redis from 'ioredis';
import { Logger } from '../logging/logger';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
}

class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private readonly config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      keyPrefix: 'meridian:',
      ...config,
    };
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      Logger.info('Redis already connected');
      return;
    }

    try {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        enableReadyCheck: this.config.enableReadyCheck,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        Logger.info('✅ Redis connected', {
          host: this.config.host,
          port: this.config.port,
        });
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        Logger.error('❌ Redis error', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        Logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        Logger.info('Redis reconnecting...');
      });

      // Wait for connection
      await this.client.ping();
      
      Logger.info('✅ Redis initialized successfully');
    } catch (error) {
      Logger.error('❌ Failed to connect to Redis', error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get value by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isReady()) {
        Logger.warn('Redis not ready, skipping get', { key });
        return null;
      }

      const value = await this.client!.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      Logger.error('Redis get failed', error, { key });
      return null;
    }
  }

  /**
   * Set value with optional TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isReady()) {
        Logger.warn('Redis not ready, skipping set', { key });
        return false;
      }

      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, serialized);
      } else {
        await this.client!.set(key, serialized);
      }

      return true;
    } catch (error) {
      Logger.error('Redis set failed', error, { key });
      return false;
    }
  }

  /**
   * Delete key(s)
   */
  async del(...keys: string[]): Promise<number> {
    try {
      if (!this.isReady()) {
        Logger.warn('Redis not ready, skipping del', { keys });
        return 0;
      }

      return await this.client!.del(...keys);
    } catch (error) {
      Logger.error('Redis del failed', error, { keys });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(...keys: string[]): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      return await this.client!.exists(...keys);
    } catch (error) {
      Logger.error('Redis exists failed', error, { keys });
      return 0;
    }
  }

  /**
   * Set TTL on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }

      const result = await this.client!.expire(key, seconds);
      return result === 1;
    } catch (error) {
      Logger.error('Redis expire failed', error, { key });
      return false;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isReady()) {
        return [];
      }

      return await this.client!.keys(pattern);
    } catch (error) {
      Logger.error('Redis keys failed', error, { pattern });
      return [];
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      const keys = await this.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      return await this.del(...keys);
    } catch (error) {
      Logger.error('Redis delPattern failed', error, { pattern });
      return 0;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      return await this.client!.incr(key);
    } catch (error) {
      Logger.error('Redis incr failed', error, { key });
      return 0;
    }
  }

  /**
   * Increment by value
   */
  async incrby(key: string, increment: number): Promise<number> {
    try {
      if (!this.isReady()) {
        return 0;
      }

      return await this.client!.incrby(key, increment);
    } catch (error) {
      Logger.error('Redis incrby failed', error, { key });
      return 0;
    }
  }

  /**
   * Get time to live
   */
  async ttl(key: string): Promise<number> {
    try {
      if (!this.isReady()) {
        return -1;
      }

      return await this.client!.ttl(key);
    } catch (error) {
      Logger.error('Redis ttl failed', error, { key });
      return -1;
    }
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushAll(): Promise<void> {
    try {
      if (!this.isReady()) {
        return;
      }

      await this.client!.flushall();
      Logger.warn('Redis flushed all data');
    } catch (error) {
      Logger.error('Redis flushAll failed', error);
    }
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    try {
      if (!this.isReady()) {
        return '';
      }

      return await this.client!.info();
    } catch (error) {
      Logger.error('Redis info failed', error);
      return '';
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        Logger.info('Redis disconnected');
      }
    } catch (error) {
      Logger.error('Redis disconnect failed', error);
    }
  }
}

/**
 * Create and export Redis client instance
 */
export const createRedisClient = (config: RedisConfig): RedisClient => {
  return new RedisClient(config);
};

/**
 * Singleton Redis client for application-wide use
 */
let redisClient: RedisClient | null = null;

export const initializeRedis = async (config?: RedisConfig): Promise<RedisClient> => {
  if (redisClient) {
    return redisClient;
  }

  const redisConfig: RedisConfig = config || {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  };

  redisClient = createRedisClient(redisConfig);
  await redisClient.connect();

  return redisClient;
};

export const getRedisClient = (): RedisClient => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

export default RedisClient;


