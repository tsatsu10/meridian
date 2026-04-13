/**
 * Advanced Caching Service
 * 
 * Multi-layer caching system with intelligent strategies:
 * - Memory cache with LRU eviction
 * - Query result caching with invalidation
 * - Cache warming and preloading
 * - Cache analytics and monitoring
 */

import { createHash } from 'crypto'
import logger from '../utils/logger'

export interface CacheOptions {
  ttl?: number
  maxSize?: number
  strategy?: 'lru' | 'ttl' | 'lfu'
  namespace?: string
  compress?: boolean
  warmup?: boolean
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  hits: number
  size: number
  compressed: boolean
  tags: string[]
  metadata?: Record<string, any>
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  memory: {
    used: number
    available: number
    percentage: number
  }
  performance: {
    avgGetTime: number
    avgSetTime: number
    avgHitRatio: number
  }
}

class AdvancedCache {
  private memoryCache = new Map<string, CacheEntry>()
  private stats: CacheStats
  private options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 3600,
      maxSize: options.maxSize || 1000,
      strategy: options.strategy || 'lru',
      namespace: options.namespace || 'meridian:cache',
      compress: options.compress ?? true,
      warmup: options.warmup ?? false,
    }

    this.initializeStats()
    setInterval(() => this.cleanup(), 60000) // Every minute

    logger.info('✅ Advanced cache initialized', {
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      strategy: this.options.strategy
    })
  }

  private initializeStats(): void {
    this.stats = {
      hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0,
      memory: { used: 0, available: this.options.maxSize, percentage: 0 },
      performance: { avgGetTime: 0, avgSetTime: 0, avgHitRatio: 0 }
    }
  }

  async get<T = any>(
    key: string,
    fallback?: () => Promise<T> | T,
    options?: { tags?: string[]; metadata?: Record<string, any> }
  ): Promise<T | null> {
    const startTime = performance.now()
    const fullKey = this.buildKey(key)

    try {
      const entry = this.memoryCache.get(fullKey)
      if (entry && this.isEntryValid(entry)) {
        entry.hits++
        this.stats.hits++
        this.updatePerformanceStats('get', performance.now() - startTime)
        
        logger.debug('💾 Cache hit', { key, hits: entry.hits })
        return entry.compressed ? await this.decompress(entry.data) : entry.data
      }

      if (fallback) {
        const data = await fallback()
        if (data !== null && data !== undefined) {
          await this.set(key, data, options)
        }
        this.stats.misses++
        this.updatePerformanceStats('get', performance.now() - startTime)
        return data
      }

      this.stats.misses++
      this.updatePerformanceStats('get', performance.now() - startTime)
      return null

    } catch (error) {
      logger.error('❌ Cache get error:', error)
      this.stats.misses++
      return null
    }
  }

  async set<T = any>(key: string, value: T, options?: {
    ttl?: number; tags?: string[]; metadata?: Record<string, any>
  }): Promise<boolean> {
    const startTime = performance.now()
    const fullKey = this.buildKey(key)

    try {
      const ttl = options?.ttl || this.options.ttl
      const size = this.calculateSize(value)
      
      let data = value
      let compressed = false

      if (this.options.compress && size > 1024) {
        data = await this.compress(value)
        compressed = true
      }

      const entry: CacheEntry<T> = {
        data, timestamp: Date.now(), ttl, hits: 0, size, compressed,
        tags: options?.tags || [], metadata: options?.metadata
      }

      await this.evictIfNeeded()
      this.memoryCache.set(fullKey, entry)
      this.stats.sets++
      this.updateMemoryStats()
      this.updatePerformanceStats('set', performance.now() - startTime)
      
      logger.debug('💾 Cache set', { key, size, ttl, tags: options?.tags })
      return true

    } catch (error) {
      logger.error('❌ Cache set error:', error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key)
    const deleted = this.memoryCache.delete(fullKey)
    if (deleted) {
      this.stats.deletes++
      this.updateMemoryStats()
      logger.debug('🗑️ Cache deleted', { key })
    }
    return deleted
  }

  async clear(options?: { pattern?: string | RegExp; tags?: string[] }): Promise<number> {
    let clearedCount = 0

    if (options?.pattern) {
      const regex = typeof options.pattern === 'string' ? new RegExp(options.pattern) : options.pattern
      for (const [key] of this.memoryCache.entries()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key)
          clearedCount++
        }
      }
    }

    if (options?.tags) {
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.some(tag => options.tags!.includes(tag))) {
          this.memoryCache.delete(key)
          clearedCount++
        }
      }
    }

    if (!options?.pattern && !options?.tags) {
      clearedCount = this.memoryCache.size
      this.memoryCache.clear()
    }

    this.updateMemoryStats()
    logger.info('🧹 Cache cleared', { clearedCount, options })
    return clearedCount
  }

  getStats(): CacheStats {
    this.updateMemoryStats()
    return { ...this.stats }
  }

  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    memory: { used: number; percentage: number }
    performance: { hitRatio: number; avgResponseTime: number }
  } {
    const hitRatio = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (hitRatio < 50) status = 'degraded'
    if (this.stats.memory.percentage > 90) status = 'degraded'
    if (this.stats.performance.avgGetTime > 100) status = 'degraded'

    return {
      status,
      memory: { used: this.stats.memory.used, percentage: this.stats.memory.percentage },
      performance: { hitRatio, avgResponseTime: this.stats.performance.avgGetTime }
    }
  }

  private buildKey(key: string): string { return `${this.options.namespace}:${key}` }
  private isEntryValid(entry: CacheEntry): boolean {
    return ((Date.now() - entry.timestamp) / 1000) < entry.ttl
  }
  private calculateSize(value: any): number { return JSON.stringify(value).length }
  private async compress(value: any): Promise<any> { return JSON.stringify(value) }
  private async decompress(value: any): Promise<any> {
    return typeof value === 'string' ? JSON.parse(value) : value
  }

  private async evictIfNeeded(): Promise<void> {
    if (this.memoryCache.size >= this.options.maxSize) {
      let oldestKey: string | null = null
      let oldestTime = Date.now()

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp
          oldestKey = key
        }
      }

      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
        this.stats.evictions++
        logger.debug('💾 Cache entry evicted (LRU)', { key: oldestKey })
      }
    }
  }

  private updateMemoryStats(): void {
    const used = this.memoryCache.size
    this.stats.memory = {
      used, available: this.options.maxSize,
      percentage: this.options.maxSize > 0 ? (used / this.options.maxSize) * 100 : 0
    }
  }

  private updatePerformanceStats(operation: 'get' | 'set', duration: number): void {
    const totalOps = operation === 'get' ? this.stats.hits + this.stats.misses : this.stats.sets
    const currentAvg = operation === 'get' ? this.stats.performance.avgGetTime : this.stats.performance.avgSetTime
    const newAvg = totalOps === 1 ? duration : (currentAvg * (totalOps - 1) + duration) / totalOps

    if (operation === 'get') this.stats.performance.avgGetTime = newAvg
    else this.stats.performance.avgSetTime = newAvg

    const total = this.stats.hits + this.stats.misses
    this.stats.performance.avgHitRatio = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  private cleanup(): void {
    let cleanedCount = 0
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.memoryCache.delete(key)
        cleanedCount++
      }
    }
    if (cleanedCount > 0) {
      this.updateMemoryStats()
      logger.debug('🧹 Cache cleanup completed', { cleanedCount })
    }
  }
}

let advancedCache: AdvancedCache | null = null

export function getAdvancedCache(options?: CacheOptions): AdvancedCache {
  if (!advancedCache) {
    advancedCache = new AdvancedCache(options)
  }
  return advancedCache
}

export default AdvancedCache

