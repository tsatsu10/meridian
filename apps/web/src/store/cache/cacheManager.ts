// Intelligent caching strategy with multiple cache policies

// Types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  dependencies?: string[];
  version: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTTL: number; // Default TTL in milliseconds
  enableCompression: boolean;
  enablePersistence: boolean;
  enableMetrics: boolean;
  enableDebugLogging: boolean;
  cleanupInterval: number;
  compressionThreshold: number; // Compress entries larger than this size
  persistenceKey: string;
}

export interface CachePolicy {
  name: string;
  evict: (entries: Map<string, CacheEntry>, newEntry: CacheEntry) => string[];
  priority: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalSize: number;
  totalEntries: number;
  hitRate: number;
  avgAccessTime: number;
  compressionRatio: number;
  lastCleanup: number;
  policyUsage: Record<string, number>;
}

export interface CacheStrategy {
  name: string;
  shouldCache: (key: string, value: any, context?: any) => boolean;
  getTTL: (key: string, value: any, context?: any) => number;
  getPriority: (key: string, value: any, context?: any) => CacheEntry['priority'];
  getTags: (key: string, value: any, context?: any) => string[];
}

// Cache policies
export const CachePolicies: { [key: string]: CachePolicy } = {
  LRU: {
    name: 'Least Recently Used',
    priority: 1,
    evict: (entries, newEntry) => {
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      return [sortedEntries[0][0]];
    },
  },

  LFU: {
    name: 'Least Frequently Used',
    priority: 2,
    evict: (entries, newEntry) => {
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => a.accessCount - b.accessCount);
      return [sortedEntries[0][0]];
    },
  },

  FIFO: {
    name: 'First In First Out',
    priority: 3,
    evict: (entries, newEntry) => {
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      return [sortedEntries[0][0]];
    },
  },

  TTL: {
    name: 'Time To Live',
    priority: 4,
    evict: (entries, newEntry) => {
      const now = Date.now();
      const expiredEntries = Array.from(entries.entries())
        .filter(([, entry]) => now - entry.timestamp > entry.ttl)
        .map(([key]) => key);
      
      if (expiredEntries.length > 0) {
        return expiredEntries;
      }

      // If no expired entries, fall back to LRU
      return CachePolicies.LRU.evict(entries, newEntry);
    },
  },

  PRIORITY: {
    name: 'Priority Based',
    priority: 5,
    evict: (entries, newEntry) => {
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      
      // Find lowest priority entries
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => {
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          // If same priority, use LRU
          return a.lastAccessed - b.lastAccessed;
        });
      
      return [sortedEntries[0][0]];
    },
  },

  SIZE: {
    name: 'Size Based',
    priority: 6,
    evict: (entries, newEntry) => {
      // Evict largest entries first
      const sortedEntries = Array.from(entries.entries())
        .sort(([, a], [, b]) => b.size - a.size);
      return [sortedEntries[0][0]];
    },
  },

  ADAPTIVE: {
    name: 'Adaptive',
    priority: 0,
    evict: (entries, newEntry) => {
      const now = Date.now();
      const factors: Array<{ key: string; score: number }> = [];

      for (const [key, entry] of entries) {
        let score = 0;

        // Age factor (older = higher score to evict)
        const age = now - entry.timestamp;
        score += age / (24 * 60 * 60 * 1000); // Days

        // Access frequency factor
        const accessRate = entry.accessCount / Math.max(1, age / (60 * 60 * 1000)); // Per hour
        score -= accessRate * 10;

        // Recency factor
        const timeSinceLastAccess = now - entry.lastAccessed;
        score += timeSinceLastAccess / (60 * 60 * 1000); // Hours

        // Size factor
        score += entry.size / (1024 * 1024); // MB

        // Priority factor
        const priorityBonus = { low: 0, medium: -5, high: -10, critical: -20 };
        score += priorityBonus[entry.priority];

        factors.push({ key, score });
      }

      factors.sort((a, b) => b.score - a.score);
      return [factors[0].key];
    },
  },
};

// Cache strategies
export const CacheStrategies: { [key: string]: CacheStrategy } = {
  USER_DATA: {
    name: 'User Data Strategy',
    shouldCache: (key, value) => {
      return key.includes('user:') || key.includes('profile:') || key.includes('preference:');
    },
    getTTL: () => 30 * 60 * 1000, // 30 minutes
    getPriority: () => 'high',
    getTags: (key) => ['user', key.split(':')[0]],
  },

  API_RESPONSE: {
    name: 'API Response Strategy',
    shouldCache: (key, value, context) => {
      return context?.type === 'api_response' && value && typeof value === 'object';
    },
    getTTL: (key, value, context) => {
      if (key.includes('real-time') || key.includes('live')) return 30 * 1000; // 30 seconds
      if (key.includes('static') || key.includes('config')) return 60 * 60 * 1000; // 1 hour
      return 5 * 60 * 1000; // 5 minutes default
    },
    getPriority: (key) => {
      if (key.includes('critical')) return 'critical';
      if (key.includes('important')) return 'high';
      return 'medium';
    },
    getTags: (key, value, context) => ['api', context?.endpoint || 'unknown'],
  },

  COMPUTED_DATA: {
    name: 'Computed Data Strategy',
    shouldCache: (key, value, context) => {
      return context?.type === 'computed' || key.includes('computed:');
    },
    getTTL: () => 15 * 60 * 1000, // 15 minutes
    getPriority: () => 'low',
    getTags: (key) => ['computed', 'derived'],
  },

  STATIC_ASSETS: {
    name: 'Static Assets Strategy',
    shouldCache: (key, value) => {
      return key.includes('asset:') || key.includes('image:') || key.includes('file:');
    },
    getTTL: () => 24 * 60 * 60 * 1000, // 24 hours
    getPriority: () => 'low',
    getTags: (key) => ['static', 'asset'],
  },
};

// Compression utilities
class CompressionUtils {
  static compress(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      
      // Simple compression using repeated character reduction
      let compressed = jsonString;
      
      // Replace common patterns
      const patterns = [
        [/":"/g, ':"'],
        [/","([^"]+"):/g, ',$1:'],
        [/,"/g, ',"'],
        [/"}/g, '"}'],
        [/{"([^"]+"):/g, '{$1:'],
      ];
      
      patterns.forEach(([pattern, replacement]) => {
        compressed = compressed.replace(pattern, replacement);
      });
      
      return btoa(compressed);
    } catch (error) {
      console.error('Compression failed:', error);
      return JSON.stringify(data);
    }
  }

  static decompress(compressed: string): any {
    try {
      const decompressed = atob(compressed);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression failed:', error);
      return null;
    }
  }

  static getCompressionRatio(original: string, compressed: string): number {
    return compressed.length / original.length;
  }
}

// Main cache manager
export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private policies: CachePolicy[];
  private strategies: CacheStrategy[];
  private cleanupInterval: NodeJS.Timeout | null = null;
  private accessTimes: number[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      enableCompression: true,
      enablePersistence: true,
      enableMetrics: true,
      enableDebugLogging: false,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      compressionThreshold: 1024, // 1KB
      persistenceKey: 'meridian_cache',
      ...config,
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
      totalEntries: 0,
      hitRate: 0,
      avgAccessTime: 0,
      compressionRatio: 1,
      lastCleanup: Date.now(),
      policyUsage: {},
    };

    this.policies = Object.values(CachePolicies).sort((a, b) => a.priority - b.priority);
    this.strategies = Object.values(CacheStrategies);

    // Load persisted cache
    if (this.config.enablePersistence) {
      this.loadFromPersistence();
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  // Core cache operations
  get<T = any>(key: string): T | null {
    const startTime = performance.now();

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }

      // Check TTL
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }

      // Update access stats
      entry.lastAccessed = now;
      entry.accessCount++;

      this.metrics.hits++;
      
      // Decompress if needed
      let value = entry.value;
      if (this.config.enableCompression && entry.metadata?.compressed) {
        value = CompressionUtils.decompress(entry.value);
      }

      if (this.config.enableDebugLogging) {
        logger.info("Cache hit: ${key}");
      }

      return value;

    } finally {
      const accessTime = performance.now() - startTime;
      this.accessTimes.push(accessTime);
      if (this.accessTimes.length > 1000) {
        this.accessTimes = this.accessTimes.slice(-1000);
      }
      this.updateMetrics();
    }
  }

  set<T = any>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      priority?: CacheEntry['priority'];
      tags?: string[];
      context?: any;
      dependencies?: string[];
    } = {}
  ): boolean {
    try {
      // Find applicable strategy
      const strategy = this.strategies.find(s => s.shouldCache(key, value, options.context));
      
      if (!strategy && !options.ttl) {
        // No strategy found and no explicit TTL
        return false;
      }

      const now = Date.now();
      const ttl = options.ttl || strategy?.getTTL(key, value, options.context) || this.config.defaultTTL;
      const priority = options.priority || strategy?.getPriority(key, value, options.context) || 'medium';
      const tags = options.tags || strategy?.getTags(key, value, options.context) || [];

      let processedValue = value;
      let compressed = false;
      let size = this.calculateSize(value);

      // Compress if enabled and value is large enough
      if (this.config.enableCompression && size > this.config.compressionThreshold) {
        const compressedValue = CompressionUtils.compress(value);
        const compressedSize = this.calculateSize(compressedValue);
        
        if (compressedSize < size) {
          processedValue = compressedValue;
          compressed = true;
          size = compressedSize;
        }
      }

      const entry: CacheEntry<T> = {
        key,
        value: processedValue,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now,
        size,
        tags,
        priority,
        metadata: {
          compressed,
          strategy: strategy?.name,
          ...options.context,
        },
        dependencies: options.dependencies,
        version: 1,
      };

      // Check if we need to evict entries
      if (this.needsEviction(entry)) {
        this.evictEntries(entry);
      }

      // Set the entry
      this.cache.set(key, entry);
      this.metrics.sets++;
      this.metrics.totalEntries = this.cache.size;
      this.metrics.totalSize += size;

      if (this.config.enableDebugLogging) {
        logger.info("Cache set: ${key} (${size} bytes, TTL: ${ttl}ms)");
      }

      // Persist if enabled
      if (this.config.enablePersistence) {
        this.saveToPersistence();
      }

      this.updateMetrics();
      return true;

    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.metrics.deletes++;
    this.metrics.totalEntries = this.cache.size;
    this.metrics.totalSize -= entry.size;

    if (this.config.enableDebugLogging) {
      logger.info("Cache delete: ${key}");
    }

    // Update persistence
    if (this.config.enablePersistence) {
      this.saveToPersistence();
    }

    this.updateMetrics();
    return true;
  }

  // Advanced operations
  invalidateByTag(tag: string): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        this.delete(key);
        invalidated++;
      }
    }

    if (this.config.enableDebugLogging) {
      logger.info("Invalidated ${invalidated} entries with tag: ${tag}");
    }

    return invalidated;
  }

  invalidateByDependency(dependencyKey: string): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.dependencies?.includes(dependencyKey)) {
        this.delete(key);
        invalidated++;
      }
    }

    if (this.config.enableDebugLogging) {
      logger.info("Invalidated ${invalidated} entries dependent on: ${dependencyKey}");
    }

    return invalidated;
  }

  invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  keys(): string[] {
    const validKeys: string[] = [];
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp <= entry.ttl) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.metrics.totalEntries = 0;
    this.metrics.totalSize = 0;
    
    if (this.config.enablePersistence) {
      this.clearPersistence();
    }

    this.updateMetrics();
  }

  // Cache management
  private needsEviction(newEntry: CacheEntry): boolean {
    const wouldExceedEntries = this.cache.size >= this.config.maxEntries;
    const wouldExceedSize = this.metrics.totalSize + newEntry.size > this.config.maxSize;
    
    return wouldExceedEntries || wouldExceedSize;
  }

  private evictEntries(newEntry: CacheEntry): void {
    let evicted = 0;
    
    // Try each policy in order of priority
    for (const policy of this.policies) {
      if (this.cache.size < this.config.maxEntries && 
          this.metrics.totalSize + newEntry.size <= this.config.maxSize) {
        break;
      }

      try {
        const keysToEvict = policy.evict(this.cache, newEntry);
        
        for (const key of keysToEvict) {
          if (this.delete(key)) {
            evicted++;
            this.metrics.evictions++;
            this.metrics.policyUsage[policy.name] = (this.metrics.policyUsage[policy.name] || 0) + 1;
          }
        }

        if (this.config.enableDebugLogging) {
          logger.info("Evicted ${keysToEvict.length} entries using ${policy.name} policy");
        }

      } catch (error) {
        console.error(`Error in ${policy.name} eviction policy:`, error);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    // Delete expired entries
    keysToDelete.forEach(key => this.delete(key));

    this.metrics.lastCleanup = now;

    if (this.config.enableDebugLogging && keysToDelete.length > 0) {
      logger.info("Cleaned up ${keysToDelete.length} expired cache entries");
    }
  }

  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // Persistence
  private saveToPersistence(): void {
    try {
      const data = Array.from(this.cache.entries()).map(([key, entry]) => [key, entry]);
      localStorage.setItem(this.config.persistenceKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to persistence:', error);
    }
  }

  private loadFromPersistence(): void {
    try {
      const data = localStorage.getItem(this.config.persistenceKey);
      if (data) {
        const entries = JSON.parse(data);
        const now = Date.now();

        for (const [key, entry] of entries) {
          // Only load non-expired entries
          if (now - entry.timestamp <= entry.ttl) {
            this.cache.set(key, entry);
            this.metrics.totalSize += entry.size;
          }
        }

        this.metrics.totalEntries = this.cache.size;
      }
    } catch (error) {
      console.error('Failed to load cache from persistence:', error);
    }
  }

  private clearPersistence(): void {
    try {
      localStorage.removeItem(this.config.persistenceKey);
    } catch (error) {
      console.error('Failed to clear cache persistence:', error);
    }
  }

  // Utilities
  private calculateSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return JSON.stringify(value).length * 2; // Rough estimate
    }
  }

  private updateMetrics(): void {
    this.metrics.totalEntries = this.cache.size;
    this.metrics.hitRate = this.metrics.hits / Math.max(1, this.metrics.hits + this.metrics.misses);
    
    if (this.accessTimes.length > 0) {
      this.metrics.avgAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
    }
  }

  // Public API
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  getStats(): {
    entries: number;
    size: string;
    hitRate: string;
    avgAccessTime: string;
    compression: string;
  } {
    return {
      entries: this.cache.size,
      size: `${(this.metrics.totalSize / 1024 / 1024).toFixed(2)} MB`,
      hitRate: `${(this.metrics.hitRate * 100).toFixed(2)}%`,
      avgAccessTime: `${this.metrics.avgAccessTime.toFixed(2)}ms`,
      compression: `${((1 - this.metrics.compressionRatio) * 100).toFixed(2)}%`,
    };
  }

  // Strategy management
  addStrategy(strategy: CacheStrategy): void {
    this.strategies.push(strategy);
  }

  removeStrategy(strategyName: string): boolean {
    const index = this.strategies.findIndex(s => s.name === strategyName);
    if (index !== -1) {
      this.strategies.splice(index, 1);
      return true;
    }
    return false;
  }

  // Lifecycle
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.config.enablePersistence) {
      this.saveToPersistence();
    }

    this.cache.clear();
  }
}

// Global cache instance
export const cacheManager = new CacheManager({
  enableDebugLogging: process.env.NODE_ENV === 'development',
});

// Convenience functions
export const cache = {
  get: cacheManager.get.bind(cacheManager),
  set: cacheManager.set.bind(cacheManager),
  delete: cacheManager.delete.bind(cacheManager),
  has: cacheManager.has.bind(cacheManager),
  clear: cacheManager.clear.bind(cacheManager),
  invalidateByTag: cacheManager.invalidateByTag.bind(cacheManager),
  invalidateByPattern: cacheManager.invalidateByPattern.bind(cacheManager),
  stats: cacheManager.getStats.bind(cacheManager),
};

// Default export
export default CacheManager;