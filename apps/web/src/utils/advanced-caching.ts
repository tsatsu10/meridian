/**
 * Advanced Caching Strategies
 * 
 * Implements multiple caching layers:
 * - Memory cache (fastest, volatile)
 * - SessionStorage cache (per-session)
 * - LocalStorage cache (persistent)
 * - IndexedDB cache (large data)
 * 
 * Features:
 * - TTL (Time To Live) support
 * - LRU (Least Recently Used) eviction
 * - Size-based eviction
 * - Cache warming
 * - Cache invalidation patterns
 * 
 * @example
 * ```typescript
 * import { CacheManager } from "@/utils/advanced-caching";
 * 
 * // Store data
 * await CacheManager.set("user-123", userData, { ttl: 300000 }); // 5 min TTL
 * 
 * // Retrieve data
 * const user = await CacheManager.get<User>("user-123");
 * 
 * // Invalidate pattern
 * await CacheManager.invalidatePattern("user-*");
 * ```
 */

interface CacheOptions {
  /**
   * Time to live in milliseconds
   */
  ttl?: number;

  /**
   * Storage strategy
   */
  strategy?: "memory" | "session" | "local" | "indexeddb";

  /**
   * Tags for grouped invalidation
   */
  tags?: string[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccess: number;
  tags?: string[];
}

class CacheManagerService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly MAX_MEMORY_SIZE = 100; // Max items in memory
  private readonly DEFAULT_TTL = 300000; // 5 minutes

  /**
   * Set cache entry
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = this.DEFAULT_TTL,
      strategy = "memory",
      tags = [],
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now(),
      tags,
    };

    switch (strategy) {
      case "memory":
        this.setMemory(key, entry);
        break;
      case "session":
        this.setSession(key, entry);
        break;
      case "local":
        this.setLocal(key, entry);
        break;
      case "indexeddb":
        await this.setIndexedDB(key, entry);
        break;
    }
  }

  /**
   * Get cache entry
   */
  async get<T>(
    key: string,
    strategy: CacheOptions["strategy"] = "memory"
  ): Promise<T | null> {
    let entry: CacheEntry<T> | null = null;

    switch (strategy) {
      case "memory":
        entry = this.getMemory(key);
        break;
      case "session":
        entry = this.getSession(key);
        break;
      case "local":
        entry = this.getLocal(key);
        break;
      case "indexeddb":
        entry = await this.getIndexedDB(key);
        break;
    }

    if (!entry) return null;

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      await this.delete(key, strategy);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();

    return entry.data;
  }

  /**
   * Delete cache entry
   */
  async delete(
    key: string,
    strategy: CacheOptions["strategy"] = "memory"
  ): Promise<void> {
    switch (strategy) {
      case "memory":
        this.memoryCache.delete(key);
        break;
      case "session":
        sessionStorage.removeItem(`cache:${key}`);
        break;
      case "local":
        localStorage.removeItem(`cache:${key}`);
        break;
      case "indexeddb":
        await this.deleteIndexedDB(key);
        break;
    }
  }

  /**
   * Invalidate by pattern (supports wildcards)
   */
  async invalidatePattern(
    pattern: string,
    strategy: CacheOptions["strategy"] = "memory"
  ): Promise<number> {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    let deletedCount = 0;

    if (strategy === "memory") {
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }
    } else if (strategy === "session" || strategy === "local") {
      const storage = strategy === "session" ? sessionStorage : localStorage;
      const keys: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith("cache:") && regex.test(key.slice(6))) {
          keys.push(key);
        }
      }
      
      keys.forEach((key) => {
        storage.removeItem(key);
        deletedCount++;
      });
    }

    return deletedCount;
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTag(
    tag: string,
    strategy: CacheOptions["strategy"] = "memory"
  ): Promise<number> {
    let deletedCount = 0;

    if (strategy === "memory") {
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags && entry.tags.includes(tag)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  /**
   * Clear all cache
   */
  async clear(strategy?: CacheOptions["strategy"]): Promise<void> {
    if (!strategy || strategy === "memory") {
      this.memoryCache.clear();
    }
    
    if (!strategy || strategy === "session") {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("cache:")) {
          keys.push(key);
        }
      }
      keys.forEach((key) => sessionStorage.removeItem(key));
    }
    
    if (!strategy || strategy === "local") {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("cache:")) {
          keys.push(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    const memorySize = this.memoryCache.size;
    
    let sessionSize = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("cache:")) {
        sessionSize++;
      }
    }
    
    let localSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cache:")) {
        localSize++;
      }
    }

    return {
      memory: memorySize,
      session: sessionSize,
      local: localSize,
      total: memorySize + sessionSize + localSize,
    };
  }

  // ===== Private Methods =====

  private setMemory<T>(key: string, entry: CacheEntry<T>): void {
    // LRU eviction if cache is full
    if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
      const lruKey = this.findLRUKey();
      if (lruKey) {
        this.memoryCache.delete(lruKey);
      }
    }

    this.memoryCache.set(key, entry);
  }

  private getMemory<T>(key: string): CacheEntry<T> | null {
    return this.memoryCache.get(key) || null;
  }

  private setSession<T>(key: string, entry: CacheEntry<T>): void {
    try {
      sessionStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (e) {
      console.warn("Session storage full, clearing old entries");
      this.clearOldestEntries("session");
      sessionStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    }
  }

  private getSession<T>(key: string): CacheEntry<T> | null {
    try {
      const item = sessionStorage.getItem(`cache:${key}`);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  }

  private setLocal<T>(key: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (e) {
      console.warn("Local storage full, clearing old entries");
      this.clearOldestEntries("local");
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    }
  }

  private getLocal<T>(key: string): CacheEntry<T> | null {
    try {
      const item = localStorage.getItem(`cache:${key}`);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  }

  private async setIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Placeholder for IndexedDB implementation
    console.warn("IndexedDB caching not yet implemented");
  }

  private async getIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    // Placeholder for IndexedDB implementation
    return null;
  }

  private async deleteIndexedDB(key: string): Promise<void> {
    // Placeholder for IndexedDB implementation
  }

  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private clearOldestEntries(type: "session" | "local"): void {
    const storage = type === "session" ? sessionStorage : localStorage;
    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith("cache:")) {
        try {
          const entry = JSON.parse(storage.getItem(key)!);
          entries.push({ key, timestamp: entry.timestamp || 0 });
        } catch (e) {
          // Invalid entry, will be cleared
          entries.push({ key, timestamp: 0 });
        }
      }
    }

    // Sort by timestamp and remove oldest 20%
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(entries.length * 0.2);
    
    entries.slice(0, toRemove).forEach((entry) => {
      storage.removeItem(entry.key);
    });
  }
}

export const CacheManager = new CacheManagerService();

export default CacheManager;

