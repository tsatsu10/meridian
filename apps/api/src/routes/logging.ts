/**
 * Logging Management API Routes
 * 
 * Provides endpoints for log management and monitoring:
 * - Get log analytics and metrics
 * - Export logs in different formats
 * - Manage log levels and configuration
 * - Real-time log streaming
 * - Log search and filtering
 */

import { Hono } from 'hono'
import { getLogAggregationService } from '../services/log-aggregation'
import { logger } from '../utils/logger'
import { getLoggingConfig, getSecurityLoggingConfig, getPerformanceLoggingConfig } from '../config/logging'

const app = new Hono()

/**
 * Get comprehensive log analytics
 */
app.get('/analytics', async (c) => {
  try {
    const timeWindow = parseInt(c.req.query('timeWindow') || '3600000') // Default 1 hour
    const logAggregationService = getLogAggregationService()
    
    const analytics = logAggregationService.getAnalytics(timeWindow)
    const health = logAggregationService.getHealth()
    
    return c.json({
      analytics,
      health,
      timestamp: Date.now(),
      timeWindow
    })
  } catch (error) {
    logger.error('❌ Log analytics request failed:', error)
    return c.json({
      error: 'Failed to retrieve log analytics',
      code: 'LOG_ANALYTICS_FAILED'
    }, 500)
  }
})

/**
 * Export logs in different formats
 */
app.get('/export', async (c) => {
  try {
    const format = c.req.query('format') || 'json' // json or csv
    const timeWindow = parseInt(c.req.query('timeWindow') || '3600000') // 1 hour
    const level = c.req.query('level')?.split(',')
    const category = c.req.query('category')?.split(',')
    const userId = c.req.query('userId')
    const endpoint = c.req.query('endpoint')
    
    if (!['json', 'csv'].includes(format)) {
      return c.json({ error: 'Invalid format. Use json or csv' }, 400)
    }
    
    const logAggregationService = getLogAggregationService()
    
    const exportData = logAggregationService.exportLogs({
      format: format as 'json' | 'csv',
      timeWindowMs: timeWindow,
      filters: {
        level,
        category,
        userId,
        endpoint
      }
    })
    
    const filename = `logs-${Date.now()}.${format}`
    
    // Set appropriate headers for file download
    c.header('Content-Type', format === 'json' ? 'application/json' : 'text/csv')
    c.header('Content-Disposition', `attachment; filename="${filename}"`)
    
    await logger.businessEvent('log_export', {
      format,
      timeWindow,
      filters: { level, category, userId, endpoint },
      filename
    })
    
    return c.text(exportData)
    
  } catch (error) {
    logger.error('❌ Log export request failed:', error)
    return c.json({
      error: 'Failed to export logs',
      code: 'LOG_EXPORT_FAILED'
    }, 500)
  }
})

/**
 * Get current logging configuration
 */
app.get('/config', async (c) => {
  try {
    const loggingConfig = getLoggingConfig()
    const securityConfig = getSecurityLoggingConfig()
    const performanceConfig = getPerformanceLoggingConfig()
    const loggerConfig = logger.getConfig()
    
    return c.json({
      logging: loggingConfig,
      security: securityConfig,
      performance: performanceConfig,
      runtime: loggerConfig
    })
    
  } catch (error) {
    logger.error('❌ Get logging config failed:', error)
    return c.json({
      error: 'Failed to get logging configuration',
      code: 'LOG_CONFIG_FAILED'
    }, 500)
  }
})

/**
 * Update log level at runtime
 */
app.post('/level', async (c) => {
  try {
    const { level } = await c.req.json()
    
    if (!['silent', 'error', 'warn', 'info', 'debug', 'verbose'].includes(level)) {
      return c.json({ error: 'Invalid log level' }, 400)
    }
    
    logger.setLevel(level)
    
    await logger.info(`Log level changed to: ${level}`)
    
    return c.json({
      success: true,
      level,
      message: `Log level updated to ${level}`
    })
    
  } catch (error) {
    logger.error('❌ Update log level failed:', error)
    return c.json({
      error: 'Failed to update log level',
      code: 'LOG_LEVEL_UPDATE_FAILED'
    }, 500)
  }
})

/**
 * Toggle quiet mode
 */
app.post('/quiet', async (c) => {
  try {
    const { quiet } = await c.req.json()
    
    logger.setQuietMode(Boolean(quiet))
    
    await logger.info(`Quiet mode ${quiet ? 'enabled' : 'disabled'}`)
    
    return c.json({
      success: true,
      quietMode: Boolean(quiet),
      message: `Quiet mode ${quiet ? 'enabled' : 'disabled'}`
    })
    
  } catch (error) {
    logger.error('❌ Toggle quiet mode failed:', error)
    return c.json({
      error: 'Failed to toggle quiet mode',
      code: 'QUIET_MODE_TOGGLE_FAILED'
    }, 500)
  }
})

/**
 * Search logs with advanced filtering
 */
app.get('/search', async (c) => {
  try {
    const query = c.req.query('q') || ''
    const level = c.req.query('level')?.split(',')
    const category = c.req.query('category')?.split(',')
    const userId = c.req.query('userId')
    const timeWindow = parseInt(c.req.query('timeWindow') || '3600000') // 1 hour
    const limit = parseInt(c.req.query('limit') || '100')
    
    const logAggregationService = getLogAggregationService()
    
    // Export all logs and filter them (in a real implementation, this would be more efficient)
    const allLogs = logAggregationService.exportLogs({
      format: 'json',
      timeWindowMs: timeWindow,
      filters: { level, category, userId }
    })
    
    const logs = JSON.parse(allLogs)
    
    // Simple text search in message field
    const filteredLogs = logs
      .filter((log: any) => !query || log.message.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
    
    return c.json({
      logs: filteredLogs,
      total: filteredLogs.length,
      query,
      filters: { level, category, userId },
      timeWindow,
      limit
    })
    
  } catch (error) {
    logger.error('❌ Log search failed:', error)
    return c.json({
      error: 'Failed to search logs',
      code: 'LOG_SEARCH_FAILED'
    }, 500)
  }
})

/**
 * Get log statistics and trends
 */
app.get('/stats', async (c) => {
  try {
    const timeWindow = parseInt(c.req.query('timeWindow') || '3600000') // 1 hour
    const logAggregationService = getLogAggregationService()
    
    const analytics = logAggregationService.getAnalytics(timeWindow)
    
    // Calculate additional statistics
    const stats = {
      overview: {
        totalLogs: analytics.totalLogs,
        errorRate: analytics.errorRate,
        averageResponseTime: analytics.averageResponseTime,
        systemHealth: analytics.systemHealth
      },
      breakdown: {
        byLevel: {
          error: analytics.topErrors.reduce((sum, error) => sum + error.count, 0),
          warn: 0, // Would need to implement level counting in log aggregation
          info: 0,
          debug: 0
        },
        byEndpoint: analytics.topEndpoints.map(endpoint => ({
          endpoint: endpoint.endpoint,
          count: endpoint.count,
          averageTime: endpoint.avgTime
        })),
        byUser: analytics.userActivity.slice(0, 10)
      },
      trends: {
        performanceAlerts: analytics.performanceAlerts.length,
        topErrors: analytics.topErrors.slice(0, 5),
        busyEndpoints: analytics.topEndpoints
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      },
      health: logAggregationService.getHealth()
    }
    
    return c.json(stats)
    
  } catch (error) {
    logger.error('❌ Log stats request failed:', error)
    return c.json({
      error: 'Failed to get log statistics',
      code: 'LOG_STATS_FAILED'
    }, 500)
  }
})

/**
 * Clear aggregated logs
 */
app.delete('/clear', async (c) => {
  try {
    const logAggregationService = getLogAggregationService()
    logAggregationService.clear()
    
    await logger.info('Log aggregation data cleared via API')
    
    return c.json({
      success: true,
      message: 'Aggregated logs cleared successfully'
    })
    
  } catch (error) {
    logger.error('❌ Clear logs failed:', error)
    return c.json({
      error: 'Failed to clear logs',
      code: 'LOG_CLEAR_FAILED'
    }, 500)
  }
})

/**
 * Test logging endpoint (for development/testing)
 */
app.post('/test', async (c) => {
  try {
    const { level = 'info', message = 'Test log message', category = 'SYSTEM', data } = await c.req.json()
    
    // Generate test log entry
    switch (level) {
      case 'error':
        await logger.error(message, data, category as any)
        break
      case 'warn':
        await logger.warn(message, data, category as any)
        break
      case 'info':
        await logger.info(message, data, category as any)
        break
      case 'debug':
        await logger.debug(message, data, category as any)
        break
      default:
        await logger.info(message, data, category as any)
    }
    
    return c.json({
      success: true,
      message: 'Test log entry created',
      details: { level, message, category, data }
    })
    
  } catch (error) {
    logger.error('❌ Test log creation failed:', error)
    return c.json({
      error: 'Failed to create test log',
      code: 'TEST_LOG_FAILED'
    }, 500)
  }
})

export default app

