/**
 * Database Optimization Middleware
 * 
 * Integrates query optimization with Drizzle ORM:
 * - Automatic query profiling and caching
 * - Connection pooling and load balancing
 * - Real-time performance monitoring
 * - Query execution planning
 * - Database health monitoring
 */

import { Context, Next } from 'hono'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getQueryOptimizer } from '../services/query-optimizer'
import logger from '../utils/logger'

export interface DatabaseConfig {
  type: 'postgresql'
  url?: string
  poolSize?: number
  idleTimeout?: number
  connectionTimeout?: number
  enableQueryLogging?: boolean
  enableOptimization?: boolean
  enableCaching?: boolean
  cacheTTL?: number
}

export interface ConnectionPool {
  connections: any[]
  activeConnections: number
  maxConnections: number
  idleConnections: number
  waitingRequests: number
}

class DatabaseOptimizationService {
  private db: any
  private sql: any
  private config: DatabaseConfig
  private queryOptimizer = getQueryOptimizer()
  private connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    connectionErrors: [] as string[],
    lastHealthCheck: 0,
    avgResponseTime: 0
  }

  constructor(config: DatabaseConfig) {
    this.config = {
      poolSize: 10,
      idleTimeout: 30000,
      connectionTimeout: 10000,
      enableQueryLogging: false,
      enableOptimization: true,
      enableCaching: true,
      cacheTTL: 300,
      ...config
    }

    this.initializeDatabase()
  }

  private initializeDatabase(): void {
    try {
      this.sql = postgres(this.config.url!, {
        max: this.config.poolSize,
        idle_timeout: this.config.idleTimeout! / 1000,
        connect_timeout: this.config.connectionTimeout! / 1000,
        onnotice: this.config.enableQueryLogging ? (notice) => {
          logger.debug('PostgreSQL Notice:', notice)
        } : undefined,
        transform: {
          column: {
            from: postgres.fromCamel,
            to: postgres.toCamel
          }
        }
      })

      this.db = drizzle(this.sql, {
        logger: this.config.enableQueryLogging ? {
          logQuery: (query, params) => {
            logger.debug('🗃️ DB Query:', { query, params })
          }
        } : undefined
      })

      logger.info('✅ Database initialized', {
        type: this.config.type,
        poolSize: this.config.poolSize,
        optimization: this.config.enableOptimization,
        caching: this.config.enableCaching
      })

    } catch (error) {
      logger.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  /**
   * Execute optimized query
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = [],
    options: {
      skipCache?: boolean
      skipOptimization?: boolean
      ttl?: number
      tag?: string
    } = {}
  ): Promise<T[]> {
    const startTime = performance.now()

    try {
      this.connectionMetrics.totalConnections++
      this.connectionMetrics.activeConnections++

      let result: T[]

      if (this.config.enableOptimization || this.config.enableCaching) {
        const { data, metrics } = await this.queryOptimizer.executeOptimized<T>(
          query,
          params,
          {
            ttl: options.ttl || this.config.cacheTTL,
            skipCache: options.skipCache || !this.config.enableCaching,
            skipOptimization: options.skipOptimization || !this.config.enableOptimization,
            tag: options.tag
          }
        )

        result = data

        // Log optimization results
        if (metrics.cached) {
          logger.debug('💾 Query served from cache', {
            executionTime: metrics.executionTime,
            rows: metrics.rows
          })
        }

      } else {
        // Direct execution without optimization
        if (this.config.type === 'postgresql') {
          result = await this.sql.unsafe(query, params)
        } else {
          const stmt = this.sql.prepare(query)
          result = params.length > 0 ? stmt.all(...params) : stmt.all()
        }
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      this.updateConnectionMetrics(duration, false)
      return result

    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime

      this.updateConnectionMetrics(duration, true)
      logger.error('❌ Query execution failed:', error)
      throw error

    } finally {
      this.connectionMetrics.activeConnections--
    }
  }

  /**
   * Get Drizzle database instance
   */
  getDB() {
    return this.db
  }

  /**
   * Get raw SQL connection
   */
  getSQL() {
    return this.sql
  }

  /**
   * Database health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    connectionPool: {
      active: number
      total: number
      failed: number
      avgResponseTime: number
    }
    queryOptimizer: {
      cacheHitRate: number
      totalQueries: number
      avgExecutionTime: number
    }
    lastError?: string
  }> {
    try {
      const startTime = performance.now()

      // Simple connectivity test
      if (this.config.type === 'postgresql') {
        await this.sql`SELECT 1 as test`
      } else {
        this.sql.prepare('SELECT 1 as test').get()
      }

      const responseTime = performance.now() - startTime
      this.connectionMetrics.lastHealthCheck = Date.now()

      // Get optimizer stats
      const optimizerStats = this.queryOptimizer.getPerformanceStats()

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

      // Determine health status
      if (responseTime > 1000) {
        status = 'degraded'
      }
      if (this.connectionMetrics.failedConnections > 10) {
        status = 'unhealthy'
      }
      if (optimizerStats.errorRate > 10) {
        status = 'degraded'
      }

      return {
        status,
        connectionPool: {
          active: this.connectionMetrics.activeConnections,
          total: this.connectionMetrics.totalConnections,
          failed: this.connectionMetrics.failedConnections,
          avgResponseTime: this.connectionMetrics.avgResponseTime
        },
        queryOptimizer: {
          cacheHitRate: optimizerStats.cacheHitRate,
          totalQueries: optimizerStats.totalQueries,
          avgExecutionTime: optimizerStats.averageExecutionTime
        }
      }

    } catch (error) {
      logger.error('❌ Database health check failed:', error)

      return {
        status: 'unhealthy',
        connectionPool: {
          active: this.connectionMetrics.activeConnections,
          total: this.connectionMetrics.totalConnections,
          failed: this.connectionMetrics.failedConnections,
          avgResponseTime: this.connectionMetrics.avgResponseTime
        },
        queryOptimizer: {
          cacheHitRate: 0,
          totalQueries: 0,
          avgExecutionTime: 0
        },
        lastError: error.message
      }
    }
  }

  /**
   * Get database performance metrics
   */
  getMetrics() {
    const optimizerStats = this.queryOptimizer.getPerformanceStats()
    const cacheStats = this.queryOptimizer.getCacheStats()

    return {
      connection: this.connectionMetrics,
      queries: optimizerStats,
      cache: cacheStats,
      optimization: this.queryOptimizer.generateOptimizationReport()
    }
  }

  /**
   * Clear query cache
   */
  clearCache(pattern?: string): number {
    return this.queryOptimizer.clearCache(pattern)
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    try {
      if (this.config.type === 'postgresql') {
        await this.sql.end()
      } else {
        this.sql.close()
      }

      logger.info('📴 Database connections closed')

    } catch (error) {
      logger.error('❌ Error closing database:', error)
    }
  }

  private updateConnectionMetrics(duration: number, failed: boolean): void {
    if (failed) {
      this.connectionMetrics.failedConnections++
    } else {
      // Update rolling average response time
      const currentAvg = this.connectionMetrics.avgResponseTime
      const totalSuccessful = this.connectionMetrics.totalConnections - this.connectionMetrics.failedConnections
      
      this.connectionMetrics.avgResponseTime = totalSuccessful === 1 
        ? duration 
        : (currentAvg * (totalSuccessful - 1) + duration) / totalSuccessful
    }
  }
}

// Singleton instance
let dbService: DatabaseOptimizationService | null = null

/**
 * Initialize database optimization service
 */
export function initializeDatabaseOptimization(config: DatabaseConfig): DatabaseOptimizationService {
  dbService = new DatabaseOptimizationService(config)
  return dbService
}

/**
 * Get database optimization service instance
 */
export function getDatabaseService(): DatabaseOptimizationService {
  if (!dbService) {
    throw new Error('Database optimization service not initialized')
  }
  return dbService
}

/**
 * Database middleware for Hono
 */
export const databaseMiddleware = () => {
  return async (c: Context, next: Next) => {
    const db = getDatabaseService()
    
    // Add database service to context
    c.set('db', db.getDB())
    c.set('sql', db.getSQL())
    c.set('dbService', db)

    // Add performance tracking
    const startTime = performance.now()

    try {
      await next()
    } finally {
      const duration = performance.now() - startTime
      
      // Log slow requests
      if (duration > 1000) {
        logger.warn('🐌 Slow request detected', {
          path: c.req.path,
          method: c.req.method,
          duration: Math.round(duration),
          user: c.get('user')?.id
        })
      }

      // Add performance headers
      c.header('X-Response-Time', `${Math.round(duration)}ms`)
    }
  }
}

/**
 * Database performance monitoring endpoint
 */
export const databaseMetricsEndpoint = () => {
  return async (c: Context) => {
    const user = c.get('user')

    // Require admin access
    if (!user || !['admin', 'workspace-manager'].includes(user.role)) {
      return c.json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, 403)
    }

    try {
      const db = getDatabaseService()
      const health = await db.healthCheck()
      const metrics = db.getMetrics()

      return c.json({
        health,
        metrics,
        timestamp: Date.now()
      })

    } catch (error) {
      logger.error('❌ Database metrics request failed:', error)
      
      return c.json({
        error: 'Failed to get database metrics',
        code: 'METRICS_FAILED'
      }, 500)
    }
  }
}

/**
 * Database optimization report endpoint
 */
export const databaseOptimizationEndpoint = () => {
  return async (c: Context) => {
    const user = c.get('user')

    // Require admin access
    if (!user || !['admin', 'workspace-manager'].includes(user.role)) {
      return c.json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, 403)
    }

    try {
      const db = getDatabaseService()
      const optimizer = getQueryOptimizer()
      
      const report = optimizer.generateOptimizationReport()
      const stats = optimizer.getPerformanceStats()
      const cacheStats = optimizer.getCacheStats()

      return c.json({
        report,
        statistics: {
          performance: stats,
          cache: cacheStats
        },
        recommendations: {
          immediate: report.performanceIssues,
          shortTerm: report.cacheOpportunities,
          longTerm: report.indexRecommendations
        },
        timestamp: Date.now()
      })

    } catch (error) {
      logger.error('❌ Database optimization report failed:', error)
      
      return c.json({
        error: 'Failed to generate optimization report',
        code: 'OPTIMIZATION_REPORT_FAILED'
      }, 500)
    }
  }
}

export default DatabaseOptimizationService

