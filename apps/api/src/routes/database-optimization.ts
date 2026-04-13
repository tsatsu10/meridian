/**
 * Database Optimization API Routes
 * 
 * Endpoints for monitoring and optimizing database performance:
 * - Query performance analysis
 * - Cache management and statistics  
 * - Connection pool monitoring
 * - Optimization recommendations
 */

import { Hono } from 'hono'
import { getQueryOptimizer } from '../services/query-optimizer'
import { getAdvancedCache } from '../services/advanced-cache'
import { getDatabaseService } from '../middlewares/database-optimization'
import { getLogAggregationService } from '../services/log-aggregation'
import { requireAuth, requireRole } from '../middlewares/redis-session'
import logger from '../utils/logger'

const app = new Hono()

/**
 * Get comprehensive database performance metrics
 */
app.get('/metrics', requireAuth(), requireRole(['admin', 'workspace-manager']), async (c) => {
  try {
    const queryOptimizer = getQueryOptimizer()
    const advancedCache = getAdvancedCache()
    const dbService = getDatabaseService()
    const logService = getLogAggregationService()

    // Gather all metrics
    const [
      queryStats,
      cacheStats,
      dbHealth,
      logAnalytics
    ] = await Promise.all([
      Promise.resolve(queryOptimizer.getPerformanceStats()),
      Promise.resolve(advancedCache.getStats()),
      dbService.healthCheck(),
      Promise.resolve(logService.getAnalytics(3600000)) // Last hour
    ])

    const optimizationReport = queryOptimizer.generateOptimizationReport()
    const cacheHealth = advancedCache.getHealth()

    return c.json({
      timestamp: Date.now(),
      database: {
        health: dbHealth,
        connectionPool: {
          status: dbHealth.status,
          active: dbHealth.connectionPool.active,
          total: dbHealth.connectionPool.total,
          failed: dbHealth.connectionPool.failed,
          avgResponseTime: dbHealth.connectionPool.avgResponseTime
        }
      },
      queries: {
        performance: queryStats,
        optimization: optimizationReport
      },
      cache: {
        statistics: cacheStats,
        health: cacheHealth
      },
      logs: {
        analytics: {
          totalLogs: logAnalytics.totalLogs,
          errorRate: logAnalytics.errorRate,
          averageResponseTime: logAnalytics.averageResponseTime,
          topErrors: logAnalytics.topErrors.slice(0, 5)
        }
      },
      recommendations: {
        immediate: [
          ...optimizationReport.performanceIssues,
          ...(cacheHealth.status !== 'healthy' ? ['Cache performance issues detected'] : []),
          ...(dbHealth.status !== 'healthy' ? ['Database connection issues detected'] : [])
        ],
        optimization: optimizationReport.indexRecommendations.slice(0, 10),
        caching: optimizationReport.cacheOpportunities.slice(0, 5)
      }
    })

  } catch (error) {
    logger.error('❌ Database metrics request failed:', error)
    return c.json({
      error: 'Failed to retrieve database metrics',
      code: 'METRICS_FAILED'
    }, 500)
  }
})

/**
 * Get detailed query performance analysis
 */
app.get('/queries', requireAuth(), requireRole(['admin', 'workspace-manager']), async (c) => {
  try {
    const queryOptimizer = getQueryOptimizer()
    const stats = queryOptimizer.getPerformanceStats()

    return c.json({
      performance: {
        totalQueries: stats.totalQueries,
        averageExecutionTime: stats.averageExecutionTime,
        cacheHitRate: stats.cacheHitRate,
        errorRate: stats.errorRate
      },
      slowQueries: stats.slowQueries.map(query => ({
        query: query.query.length > 200 ? query.query.substring(0, 200) + '...' : query.query,
        executionTime: query.executionTime,
        timestamp: query.timestamp,
        error: query.error
      })),
      topQueries: stats.topQueries,
      optimization: queryOptimizer.generateOptimizationReport()
    })

  } catch (error) {
    logger.error('❌ Query analysis request failed:', error)
    return c.json({
      error: 'Failed to analyze queries',
      code: 'QUERY_ANALYSIS_FAILED'
    }, 500)
  }
})

/**
 * Get cache performance and management
 */
app.get('/cache', requireAuth(), requireRole(['admin', 'workspace-manager']), async (c) => {
  try {
    const advancedCache = getAdvancedCache()
    const stats = advancedCache.getStats()
    const health = advancedCache.getHealth()

    return c.json({
      statistics: stats,
      health,
      performance: {
        hitRatio: health.performance.hitRatio,
        averageResponseTime: health.performance.avgResponseTime,
        memoryUsage: health.memory.percentage
      },
      recommendations: health.status !== 'healthy' ? [
        'Cache performance is degraded',
        'Consider increasing cache size or TTL',
        'Review cache invalidation patterns'
      ] : [
        'Cache performance is optimal'
      ]
    })

  } catch (error) {
    logger.error('❌ Cache analysis request failed:', error)
    return c.json({
      error: 'Failed to analyze cache',
      code: 'CACHE_ANALYSIS_FAILED'
    }, 500)
  }
})

/**
 * Clear cache with optional patterns
 */
app.delete('/cache', requireAuth(), requireRole(['admin']), async (c) => {
  try {
    const { pattern, tags } = c.req.query()
    const advancedCache = getAdvancedCache()

    const clearedCount = await advancedCache.clear({ 
      pattern: pattern ? new RegExp(pattern) : undefined,
      tags: tags ? tags.split(',') : undefined
    })

    logger.info('🧹 Cache cleared via API', {
      pattern,
      tags,
      clearedCount,
      user: c.get('user')?.id
    })

    return c.json({
      success: true,
      clearedCount,
      message: `Cleared ${clearedCount} cache entries`
    })

  } catch (error) {
    logger.error('❌ Cache clear request failed:', error)
    return c.json({
      error: 'Failed to clear cache',
      code: 'CACHE_CLEAR_FAILED'
    }, 500)
  }
})

/**
 * Get database connection pool status
 */
app.get('/connections', requireAuth(), requireRole(['admin', 'workspace-manager']), async (c) => {
  try {
    const dbService = getDatabaseService()
    const health = await dbService.healthCheck()

    return c.json({
      status: health.status,
      connectionPool: health.connectionPool,
      queryOptimizer: health.queryOptimizer,
      recommendations: health.status !== 'healthy' ? [
        'Database performance issues detected',
        'Check connection pool configuration',
        'Monitor query execution times',
        'Review database resource usage'
      ] : [
        'Database connections are healthy'
      ]
    })

  } catch (error) {
    logger.error('❌ Connection status request failed:', error)
    return c.json({
      error: 'Failed to get connection status',
      code: 'CONNECTION_STATUS_FAILED'
    }, 500)
  }
})

/**
 * Generate comprehensive optimization report
 */
app.get('/optimization-report', requireAuth(), requireRole(['admin']), async (c) => {
  try {
    const queryOptimizer = getQueryOptimizer()
    const advancedCache = getAdvancedCache()
    const dbService = getDatabaseService()
    
    const [
      optimizationReport,
      queryStats,
      cacheHealth,
      dbMetrics
    ] = await Promise.all([
      Promise.resolve(queryOptimizer.generateOptimizationReport()),
      Promise.resolve(queryOptimizer.getPerformanceStats()),
      Promise.resolve(advancedCache.getHealth()),
      dbService.getMetrics()
    ])

    // Calculate overall health score
    let healthScore = 100
    
    if (queryStats.errorRate > 5) healthScore -= 20
    if (queryStats.averageExecutionTime > 1000) healthScore -= 15
    if (queryStats.cacheHitRate < 50) healthScore -= 15
    if (cacheHealth.status === 'degraded') healthScore -= 10
    if (cacheHealth.status === 'unhealthy') healthScore -= 25
    if (dbMetrics.connection.failedConnections > 0) healthScore -= 10

    const report = {
      timestamp: Date.now(),
      overallHealthScore: Math.max(0, healthScore),
      executive_summary: {
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'unhealthy',
        totalQueries: queryStats.totalQueries,
        errorRate: queryStats.errorRate,
        averageResponseTime: queryStats.averageExecutionTime,
        cacheHitRate: queryStats.cacheHitRate
      },
      detailed_analysis: {
        query_performance: {
          statistics: queryStats,
          slow_queries: queryStats.slowQueries.slice(0, 10),
          optimization_opportunities: optimizationReport.queryOptimizations
        },
        caching: {
          health: cacheHealth,
          statistics: advancedCache.getStats(),
          opportunities: optimizationReport.cacheOpportunities
        },
        database: {
          health: await dbService.healthCheck(),
          connection_metrics: dbMetrics.connection,
          index_recommendations: optimizationReport.indexRecommendations
        }
      },
      recommendations: {
        immediate_actions: optimizationReport.performanceIssues,
        short_term: optimizationReport.cacheOpportunities,
        long_term: optimizationReport.indexRecommendations,
        monitoring: [
          'Set up automated performance monitoring',
          'Configure alerting for slow queries',
          'Implement query execution logging',
          'Monitor cache hit rates and performance'
        ]
      },
      action_plan: [
        {
          priority: 'high',
          category: 'performance',
          tasks: optimizationReport.performanceIssues.slice(0, 3)
        },
        {
          priority: 'medium', 
          category: 'caching',
          tasks: optimizationReport.cacheOpportunities.slice(0, 3)
        },
        {
          priority: 'low',
          category: 'optimization',
          tasks: optimizationReport.indexRecommendations.slice(0, 5)
        }
      ]
    }

    logger.info('📋 Optimization report generated', {
      healthScore,
      user: c.get('user')?.id,
      totalRecommendations: optimizationReport.performanceIssues.length + 
                           optimizationReport.cacheOpportunities.length + 
                           optimizationReport.indexRecommendations.length
    })

    return c.json(report)

  } catch (error) {
    logger.error('❌ Optimization report generation failed:', error)
    return c.json({
      error: 'Failed to generate optimization report',
      code: 'OPTIMIZATION_REPORT_FAILED'
    }, 500)
  }
})

export default app

