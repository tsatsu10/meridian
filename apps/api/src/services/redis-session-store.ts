/**
 * Redis Session Storage Service
 * 
 * Provides scalable session management using Redis:
 * - High performance with in-memory storage
 * - Horizontal scalability across multiple servers
 * - Automatic session expiration
 * - Session data compression
 * - Connection pooling and failover
 */

import Redis, { RedisOptions } from 'ioredis'
import { nanoid } from 'nanoid'
import logger from '../utils/logger'

export interface SessionData {
  userId: string
  email: string
  role: string
  workspaceId: string
  permissions?: string[]
  lastActivity: number
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface SessionStoreOptions {
  host?: string
  port?: number
  password?: string
  db?: number
  keyPrefix?: string
  ttl?: number // Time to live in seconds
  maxRetries?: number
  retryDelayOnFailover?: number
  enableOfflineQueue?: boolean
  lazyConnect?: boolean
}

class RedisSessionStore {
  private redis: Redis
  private options: Required<SessionStoreOptions>
  private connected: boolean = false

  constructor(options: SessionStoreOptions = {}) {
    this.options = {
      host: options.host || process.env.REDIS_HOST || 'localhost',
      port: options.port || Number(process.env.REDIS_PORT) || 6379,
      password: options.password || process.env.REDIS_PASSWORD || undefined,
      db: options.db || Number(process.env.REDIS_DB) || 0,
      keyPrefix: options.keyPrefix || 'meridian:session:',
      ttl: options.ttl || 86400, // 24 hours default
      maxRetries: options.maxRetries || 3,
      retryDelayOnFailover: options.retryDelayOnFailover || 100,
      enableOfflineQueue: options.enableOfflineQueue ?? true,
      lazyConnect: options.lazyConnect ?? true,
    }

    this.initializeRedis()
  }

  private initializeRedis(): void {
    const redisOptions: RedisOptions = {
      host: this.options.host,
      port: this.options.port,
      password: this.options.password,
      db: this.options.db,
      keyPrefix: this.options.keyPrefix,
      maxRetriesPerRequest: this.options.maxRetries || 3,
      retryDelayOnFailover: this.options.retryDelayOnFailover,
      enableOfflineQueue: this.options.enableOfflineQueue,
      lazyConnect: this.options.lazyConnect,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Connection pool settings
      family: 4,
      keepAlive: true,
      // Reconnection settings
      retryDelayOnClusterDown: 300,
      enableReadyCheck: true,
      maxLoadingTimeout: 5000,
    }

    this.redis = new Redis(redisOptions)

    // Event handlers
    this.redis.on('connect', () => {
      this.connected = true
      logger.info('✅ Redis session store connected')
    })

    this.redis.on('ready', () => {
      logger.info('🚀 Redis session store ready')
    })

    this.redis.on('error', (error) => {
      this.connected = false
      logger.error('❌ Redis session store error:', error)
    })

    this.redis.on('close', () => {
      this.connected = false
      logger.warn('⚠️ Redis session store connection closed')
    })

    this.redis.on('reconnecting', () => {
      logger.info('🔄 Redis session store reconnecting...')
    })

    this.redis.on('end', () => {
      this.connected = false
      logger.info('📴 Redis session store connection ended')
    })
  }

  /**
   * Create a new session
   */
  async createSession(sessionData: Omit<SessionData, 'lastActivity'>): Promise<string> {
    try {
      const sessionId = nanoid(32) // Generate secure session ID
      const sessionKey = this.getSessionKey(sessionId)

      const fullSessionData: SessionData = {
        ...sessionData,
        lastActivity: Date.now(),
      }

      const serializedData = JSON.stringify(fullSessionData)
      
      // Store session with expiration
      await this.redis.setex(sessionKey, this.options.ttl, serializedData)

      // Create user session index for easy lookup
      const userSessionKey = this.getUserSessionKey(sessionData.userId)
      await this.redis.sadd(userSessionKey, sessionId)
      await this.redis.expire(userSessionKey, this.options.ttl)

      logger.info(`📝 Created session for user ${sessionData.userId}`, {
        sessionId,
        userId: sessionData.userId,
        ttl: this.options.ttl,
      })

      return sessionId
    } catch (error) {
      logger.error('❌ Failed to create session:', error)
      throw new Error('Failed to create session')
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      const data = await this.redis.get(sessionKey)

      if (!data) {
        return null
      }

      const sessionData: SessionData = JSON.parse(data)

      // Update last activity
      sessionData.lastActivity = Date.now()
      await this.redis.setex(sessionKey, this.options.ttl, JSON.stringify(sessionData))

      return sessionData
    } catch (error) {
      logger.error('❌ Failed to get session:', error)
      return null
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      const existingData = await this.redis.get(sessionKey)

      if (!existingData) {
        return false
      }

      const sessionData: SessionData = JSON.parse(existingData)
      const updatedData: SessionData = {
        ...sessionData,
        ...updates,
        lastActivity: Date.now(),
      }

      await this.redis.setex(sessionKey, this.options.ttl, JSON.stringify(updatedData))

      logger.info(`🔄 Updated session ${sessionId}`, {
        updates: Object.keys(updates),
      })

      return true
    } catch (error) {
      logger.error('❌ Failed to update session:', error)
      return false
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      
      // Get session data to remove from user index
      const sessionData = await this.getSession(sessionId)
      if (sessionData) {
        const userSessionKey = this.getUserSessionKey(sessionData.userId)
        await this.redis.srem(userSessionKey, sessionId)
      }

      const deleted = await this.redis.del(sessionKey)

      if (deleted > 0) {
        logger.info(`🗑️ Deleted session ${sessionId}`)
        return true
      }

      return false
    } catch (error) {
      logger.error('❌ Failed to delete session:', error)
      return false
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const userSessionKey = this.getUserSessionKey(userId)
      const sessionIds = await this.redis.smembers(userSessionKey)

      let deletedCount = 0
      
      if (sessionIds.length > 0) {
        // Delete all session data
        const sessionKeys = sessionIds.map(id => this.getSessionKey(id))
        deletedCount = await this.redis.del(...sessionKeys)

        // Delete user session index
        await this.redis.del(userSessionKey)
      }

      logger.info(`🗑️ Deleted ${deletedCount} sessions for user ${userId}`)
      return deletedCount
    } catch (error) {
      logger.error('❌ Failed to delete user sessions:', error)
      return 0
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Array<{ sessionId: string; data: SessionData }>> {
    try {
      const userSessionKey = this.getUserSessionKey(userId)
      const sessionIds = await this.redis.smembers(userSessionKey)

      const sessions: Array<{ sessionId: string; data: SessionData }> = []

      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId)
        if (sessionData) {
          sessions.push({ sessionId, data: sessionData })
        }
      }

      return sessions
    } catch (error) {
      logger.error('❌ Failed to get user sessions:', error)
      return []
    }
  }

  /**
   * Get session count for a user
   */
  async getUserSessionCount(userId: string): Promise<number> {
    try {
      const userSessionKey = this.getUserSessionKey(userId)
      return await this.redis.scard(userSessionKey)
    } catch (error) {
      logger.error('❌ Failed to get user session count:', error)
      return 0
    }
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      const ttl = await this.redis.expire(sessionKey, this.options.ttl)
      return ttl === 1
    } catch (error) {
      logger.error('❌ Failed to refresh session:', error)
      return false
    }
  }

  /**
   * Get session TTL (time remaining)
   */
  async getSessionTTL(sessionId: string): Promise<number> {
    try {
      const sessionKey = this.getSessionKey(sessionId)
      return await this.redis.ttl(sessionKey)
    } catch (error) {
      logger.error('❌ Failed to get session TTL:', error)
      return -1
    }
  }

  /**
   * Get total session count
   */
  async getTotalSessionCount(): Promise<number> {
    try {
      const pattern = `${this.options.keyPrefix}*`
      const keys = await this.redis.keys(pattern)
      return keys.filter(key => !key.includes(':user:')).length
    } catch (error) {
      logger.error('❌ Failed to get total session count:', error)
      return 0
    }
  }

  /**
   * Clean up expired sessions (manual cleanup)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pattern = `${this.options.keyPrefix}*`
      const keys = await this.redis.keys(pattern)
      
      let cleanedCount = 0
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key)
        if (ttl === -2) { // Key expired
          await this.redis.del(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        logger.info(`🧹 Cleaned up ${cleanedCount} expired sessions`)
      }

      return cleanedCount
    } catch (error) {
      logger.error('❌ Failed to cleanup expired sessions:', error)
      return 0
    }
  }

  /**
   * Get Redis connection status
   */
  isConnected(): boolean {
    return this.connected && this.redis.status === 'ready'
  }

  /**
   * Get Redis connection info
   */
  async getConnectionInfo(): Promise<{
    status: string
    host: string
    port: number
    db: number
    memory: { used: string; peak: string } | null
  }> {
    try {
      const info = await this.redis.info('memory')
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/)?.[1]
      const peakMatch = info.match(/used_memory_peak_human:([^\r\n]+)/)?.[1]

      return {
        status: this.redis.status,
        host: this.options.host,
        port: this.options.port,
        db: this.options.db,
        memory: memoryMatch && peakMatch ? {
          used: memoryMatch.trim(),
          peak: peakMatch.trim()
        } : null
      }
    } catch (error) {
      return {
        status: this.redis.status,
        host: this.options.host,
        port: this.options.port,
        db: this.options.db,
        memory: null
      }
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit()
      logger.info('📴 Redis session store connection closed')
    } catch (error) {
      logger.error('❌ Error closing Redis connection:', error)
      this.redis.disconnect()
    }
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`
  }

  private getUserSessionKey(userId: string): string {
    return `user:${userId}:sessions`
  }
}

// Singleton instance
let sessionStore: RedisSessionStore | null = null

/**
 * Get singleton Redis session store instance
 */
export function getSessionStore(options?: SessionStoreOptions): RedisSessionStore {
  if (!sessionStore) {
    sessionStore = new RedisSessionStore(options)
  }
  return sessionStore
}

/**
 * Initialize session store with custom options
 */
export function initializeSessionStore(options: SessionStoreOptions): RedisSessionStore {
  sessionStore = new RedisSessionStore(options)
  return sessionStore
}

export default RedisSessionStore

