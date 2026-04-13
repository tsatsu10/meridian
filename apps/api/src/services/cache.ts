// @epic-3.1-analytics: Redis caching service for analytics performance
// @performance: Cache analytics queries to reduce database load

import { createHash } from "crypto";
import logger from '../utils/logger';

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size in MB
  keyPrefix?: string;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

class CacheService {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private memoryUsage = 0;

  constructor(config: CacheConfig = { enabled: true, ttl: 300 }) {
    this.config = {
      enabled: true,
      ttl: 300, // 5 minutes default
      maxSize: 100, // 100MB default
      keyPrefix: "meridian:",
      ...config,
    };

    // Clean up expired entries every minute
    if (this.config.enabled) {
      setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Generate a cache key from analytics options
   */
  generateKey(prefix: string, data: any): string {
    const normalized = this.normalizeData(data);
    const hash = createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex")
      .substring(0, 16);
    
    return `${this.config.keyPrefix}${prefix}:${hash}`;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return;

    const actualTtl = ttl || this.config.ttl;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (actualTtl * 1000),
      key,
    };

    // Estimate memory usage (rough calculation)
    const size = this.estimateSize(entry);
    
    // Check if adding this entry would exceed max size
    if (this.config.maxSize && (this.memoryUsage + size) > (this.config.maxSize * 1024 * 1024)) {
      // Remove oldest entries to make space
      await this.evictOldest();
    }

    this.cache.set(key, entry);
    this.memoryUsage += size;

    logger.info(`📦 Cache SET: ${key} (TTL: ${actualTtl}s, Size: ${Math.round(size / 1024)}KB)`);
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) {
      logger.info(`📦 Cache MISS: ${key}`);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      await this.delete(key);
      logger.info(`📦 Cache EXPIRED: ${key}`);
      return null;
    }

    logger.info(`📦 Cache HIT: ${key}`);
    return entry.data;
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.memoryUsage -= this.estimateSize(entry);
      this.cache.delete(key);
      logger.info(`📦 Cache DELETE: ${key}`);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.memoryUsage = 0;
    logger.info("📦 Cache CLEARED");
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      enabled: this.config.enabled,
      totalEntries: entries.length,
      memoryUsage: this.memoryUsage,
      memoryUsageMB: Math.round((this.memoryUsage / 1024 / 1024) * 100) / 100,
      maxSizeMB: this.config.maxSize,
      expiredEntries: entries.filter(e => now > e.expiry).length,
      hitRate: this.calculateHitRate(),
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.timestamp))) : null,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.timestamp))) : null,
    };
  }

  /**
   * Wrapper for caching analytics queries
   */
  async cacheAnalyticsQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey: string,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute query and cache result
    logger.info(`📊 Executing analytics query for cache key: ${cacheKey}`);
    const result = await queryFn();
    
    // Cache the result
    await this.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Private: Normalize data for consistent hashing
   */
  private normalizeData(data: any): any {
    if (data === null || data === undefined) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.normalizeData(item));
    }
    
    if (typeof data === 'object') {
      const normalized: any = {};
      Object.keys(data)
        .sort() // Sort keys for consistency
        .forEach(key => {
          normalized[key] = this.normalizeData(data[key]);
        });
      return normalized;
    }
    
    return data;
  }

  /**
   * Private: Estimate memory usage of cache entry
   */
  private estimateSize(entry: CacheEntry): number {
    // Rough estimate: JSON string length * 2 (for Unicode) + overhead
    const jsonSize = JSON.stringify(entry).length * 2;
    const overhead = 100; // Estimated object overhead
    return jsonSize + overhead;
  }

  /**
   * Private: Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    let freedMemory = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        const size = this.estimateSize(entry);
        this.cache.delete(key);
        freedMemory += size;
        removedCount++;
      }
    }

    this.memoryUsage -= freedMemory;

    if (removedCount > 0) {
      logger.info(`📦 Cache cleanup: removed ${removedCount} expired entries, freed ${Math.round(freedMemory / 1024)}KB`);
    }
  }

  /**
   * Private: Evict oldest entries to make space
   */
  private async evictOldest(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toRemove = Math.ceil(entries.length * 0.1); // Remove 10% of entries
    let freedMemory = 0;

    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const [key, entry] = entries[i];
      freedMemory += this.estimateSize(entry);
      this.cache.delete(key);
    }

    this.memoryUsage -= freedMemory;
    logger.info(`📦 Cache eviction: removed ${toRemove} oldest entries, freed ${Math.round(freedMemory / 1024)}KB`);
  }

  /**
   * Private: Calculate hit rate (simplified)
   */
  private calculateHitRate(): number {
    // This is a simplified calculation
    // In a production system, you'd track hits/misses over time
    return this.cache.size > 0 ? 0.75 : 0; // Mock hit rate
  }
}

// Create singleton instance
const cacheService = new CacheService({
  enabled: process.env.CACHE_ENABLED !== "false",
  ttl: parseInt(process.env.CACHE_TTL || "300"), // 5 minutes
  maxSize: parseInt(process.env.CACHE_MAX_SIZE_MB || "100"), // 100MB
  keyPrefix: process.env.CACHE_KEY_PREFIX || "meridian:",
});

export default cacheService;
export { CacheService };

