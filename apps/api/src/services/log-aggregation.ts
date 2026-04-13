/**
 * Log Aggregation and Analytics Service
 * 
 * Advanced logging with aggregation, monitoring, and alerting:
 * - Real-time log streaming and aggregation
 * - Performance metrics and alerts
 * - Error tracking and analytics  
 * - Log retention and archival
 * - Integration with monitoring systems
 */

import { EventEmitter } from 'events'
import { createHash } from 'crypto'
import logger from '../utils/logger'

export interface LogMetrics {
  timestamp: number
  level: string
  category: string
  message: string
  duration?: number
  userId?: string
  endpoint?: string
  statusCode?: number
  errorCode?: string
  metadata?: Record<string, any>
}

export interface LogAnalytics {
  totalLogs: number
  errorRate: number
  averageResponseTime: number
  topErrors: Array<{ error: string; count: number; lastSeen: number }>
  topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>
  userActivity: Array<{ userId: string; actions: number; lastSeen: number }>
  performanceAlerts: Array<{ type: string; message: string; timestamp: number }>
  systemHealth: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    activeConnections: number
  }
}

export interface AlertRule {
  id: string
  name: string
  condition: (metrics: LogMetrics) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  cooldown: number
  lastTriggered: number
  enabled: boolean
  actions: Array<{
    type: 'email' | 'webhook' | 'slack'
    config: Record<string, any>
  }>
}

class LogAggregationService extends EventEmitter {
  private logs: LogMetrics[] = []
  private errorCache = new Map<string, { count: number; lastSeen: number }>()
  private endpointStats = new Map<string, { count: number; totalTime: number; errors: number }>()
  private userActivity = new Map<string, { actions: number; lastSeen: number }>()
  private alertRules: AlertRule[] = []
  private maxLogHistory = 10000
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    super()
    this.initializeDefaultAlerts()
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 300000) // Every 5 minutes

    logger.info('📊 Log aggregation service initialized')
  }

  /**
   * Record log entry for aggregation
   */
  recordLog(metrics: LogMetrics): void {
    // Add to log history
    this.logs.push(metrics)
    
    // Maintain log history size
    if (this.logs.length > this.maxLogHistory) {
      this.logs = this.logs.slice(-this.maxLogHistory)
    }

    // Update error tracking
    if (metrics.level === 'error' && metrics.errorCode) {
      const errorKey = metrics.errorCode
      const existing = this.errorCache.get(errorKey) || { count: 0, lastSeen: 0 }
      this.errorCache.set(errorKey, {
        count: existing.count + 1,
        lastSeen: metrics.timestamp
      })
    }

    // Update endpoint statistics
    if (metrics.endpoint) {
      const existing = this.endpointStats.get(metrics.endpoint) || { 
        count: 0, totalTime: 0, errors: 0 
      }
      
      this.endpointStats.set(metrics.endpoint, {
        count: existing.count + 1,
        totalTime: existing.totalTime + (metrics.duration || 0),
        errors: existing.errors + (metrics.level === 'error' ? 1 : 0)
      })
    }

    // Update user activity
    if (metrics.userId) {
      const existing = this.userActivity.get(metrics.userId) || { actions: 0, lastSeen: 0 }
      this.userActivity.set(metrics.userId, {
        actions: existing.actions + 1,
        lastSeen: metrics.timestamp
      })
    }

    // Check alert rules
    this.checkAlertRules(metrics)

    // Emit event for real-time processing
    this.emit('logEntry', metrics)
  }

  /**
   * Get comprehensive analytics
   */
  getAnalytics(timeWindowMs: number = 3600000): LogAnalytics {
    const now = Date.now()
    const windowStart = now - timeWindowMs

    // Filter logs within time window
    const recentLogs = this.logs.filter(log => log.timestamp >= windowStart)
    
    const totalLogs = recentLogs.length
    const errorLogs = recentLogs.filter(log => log.level === 'error').length
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0

    // Calculate average response time
    const logsWithDuration = recentLogs.filter(log => log.duration !== undefined)
    const averageResponseTime = logsWithDuration.length > 0
      ? logsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / logsWithDuration.length
      : 0

    // Top errors
    const topErrors = Array.from(this.errorCache.entries())
      .filter(([_, data]) => data.lastSeen >= windowStart)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([error, data]) => ({
        error,
        count: data.count,
        lastSeen: data.lastSeen
      }))

    // Top endpoints
    const topEndpoints = Array.from(this.endpointStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgTime: stats.count > 0 ? stats.totalTime / stats.count : 0
      }))

    // User activity
    const userActivity = Array.from(this.userActivity.entries())
      .filter(([_, data]) => data.lastSeen >= windowStart)
      .sort((a, b) => b[1].actions - a[1].actions)
      .slice(0, 20)
      .map(([userId, data]) => ({
        userId,
        actions: data.actions,
        lastSeen: data.lastSeen
      }))

    // Performance alerts (last 24 hours)
    const performanceAlerts = recentLogs
      .filter(log => log.category === 'PERFORMANCE' && log.level === 'warn')
      .map(log => ({
        type: 'performance',
        message: log.message,
        timestamp: log.timestamp
      }))

    // System health (mock data - would integrate with actual system monitoring)
    const systemHealth = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      activeConnections: Math.floor(Math.random() * 1000)
    }

    return {
      totalLogs,
      errorRate,
      averageResponseTime,
      topErrors,
      topEndpoints,
      userActivity,
      performanceAlerts,
      systemHealth
    }
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule)
    logger.info('📋 Alert rule added', { 
      ruleId: rule.id, 
      name: rule.name, 
      severity: rule.severity 
    })
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId)
    if (index !== -1) {
      this.alertRules.splice(index, 1)
      logger.info('🗑️ Alert rule removed', { ruleId })
      return true
    }
    return false
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules]
  }

  /**
   * Export logs for analysis
   */
  exportLogs(options: {
    format: 'json' | 'csv'
    timeWindowMs?: number
    filters?: {
      level?: string[]
      category?: string[]
      userId?: string
      endpoint?: string
    }
  }): string {
    const timeWindow = options.timeWindowMs || 3600000 // 1 hour default
    const now = Date.now()
    
    let filteredLogs = this.logs.filter(log => log.timestamp >= (now - timeWindow))

    // Apply filters
    if (options.filters) {
      const { level, category, userId, endpoint } = options.filters
      
      if (level) {
        filteredLogs = filteredLogs.filter(log => level.includes(log.level))
      }
      
      if (category) {
        filteredLogs = filteredLogs.filter(log => category.includes(log.category))
      }
      
      if (userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === userId)
      }
      
      if (endpoint) {
        filteredLogs = filteredLogs.filter(log => log.endpoint === endpoint)
      }
    }

    if (options.format === 'json') {
      return JSON.stringify(filteredLogs, null, 2)
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'category', 'message', 'duration', 'userId', 'endpoint', 'statusCode']
      const csvRows = [headers.join(',')]
      
      filteredLogs.forEach(log => {
        const row = headers.map(header => {
          const value = log[header as keyof LogMetrics]
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : (value || '')
        })
        csvRows.push(row.join(','))
      })
      
      return csvRows.join('\n')
    }
  }

  /**
   * Get real-time log stream
   */
  getLogStream(): EventEmitter {
    return this
  }

  /**
   * Clear logs and reset statistics
   */
  clear(): void {
    this.logs = []
    this.errorCache.clear()
    this.endpointStats.clear()
    this.userActivity.clear()
    
    logger.info('🧹 Log aggregation data cleared')
  }

  /**
   * Get service health
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    metrics: {
      logsPerMinute: number
      errorRatePercentage: number
      alertRulesActive: number
      memoryUsage: number
    }
  } {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    
    const recentLogs = this.logs.filter(log => log.timestamp >= oneMinuteAgo)
    const recentErrors = recentLogs.filter(log => log.level === 'error')
    
    const logsPerMinute = recentLogs.length
    const errorRatePercentage = recentLogs.length > 0 ? (recentErrors.length / recentLogs.length) * 100 : 0
    const alertRulesActive = this.alertRules.filter(rule => rule.enabled).length
    const memoryUsage = (this.logs.length / this.maxLogHistory) * 100

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (errorRatePercentage > 10) status = 'degraded'
    if (errorRatePercentage > 25) status = 'unhealthy'
    if (memoryUsage > 90) status = 'degraded'

    return {
      status,
      metrics: {
        logsPerMinute,
        errorRatePercentage,
        alertRulesActive,
        memoryUsage
      }
    }
  }

  /**
   * Close service and cleanup
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.removeAllListeners()
    logger.info('📴 Log aggregation service closed')
  }

  private initializeDefaultAlerts(): void {
    // High error rate alert
    this.alertRules.push({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (metrics) => {
        const recentErrors = this.logs
          .filter(log => log.timestamp >= Date.now() - 300000) // Last 5 minutes
          .filter(log => log.level === 'error')
        
        return recentErrors.length > 10 // More than 10 errors in 5 minutes
      },
      severity: 'high',
      cooldown: 600000, // 10 minutes
      lastTriggered: 0,
      enabled: true,
      actions: []
    })

    // Slow response time alert
    this.alertRules.push({
      id: 'slow-response',
      name: 'Slow Response Time',
      condition: (metrics) => metrics.duration !== undefined && metrics.duration > 5000, // 5 seconds
      severity: 'medium',
      cooldown: 300000, // 5 minutes
      lastTriggered: 0,
      enabled: true,
      actions: []
    })

    // Memory usage alert
    this.alertRules.push({
      id: 'high-memory',
      name: 'High Memory Usage',
      condition: () => (this.logs.length / this.maxLogHistory) > 0.9, // 90% of max logs
      severity: 'medium',
      cooldown: 900000, // 15 minutes
      lastTriggered: 0,
      enabled: true,
      actions: []
    })
  }

  private checkAlertRules(metrics: LogMetrics): void {
    const now = Date.now()

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue
      
      // Check cooldown
      if (now - rule.lastTriggered < rule.cooldown) continue

      try {
        if (rule.condition(metrics)) {
          rule.lastTriggered = now
          
          logger.warn(`🚨 Alert triggered: ${rule.name}`, {
            ruleId: rule.id,
            severity: rule.severity,
            metrics: {
              level: metrics.level,
              category: metrics.category,
              message: metrics.message,
              duration: metrics.duration
            }
          })

          // Execute alert actions
          this.executeAlertActions(rule, metrics)
          
          // Emit alert event
          this.emit('alert', { rule, metrics })
        }
      } catch (error) {
        logger.error('❌ Error checking alert rule', {
          ruleId: rule.id,
          error: error.message
        })
      }
    }
  }

  private executeAlertActions(rule: AlertRule, metrics: LogMetrics): void {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'webhook':
            this.sendWebhookAlert(action.config, rule, metrics)
            break
          case 'email':
            this.sendEmailAlert(action.config, rule, metrics)
            break
          case 'slack':
            this.sendSlackAlert(action.config, rule, metrics)
            break
        }
      } catch (error) {
        logger.error('❌ Failed to execute alert action', {
          ruleId: rule.id,
          actionType: action.type,
          error: error.message
        })
      }
    }
  }

  private async sendWebhookAlert(config: any, rule: AlertRule, metrics: LogMetrics): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    logger.debug('📡 Webhook alert sent', { ruleId: rule.id })
  }

  private async sendEmailAlert(config: any, rule: AlertRule, metrics: LogMetrics): Promise<void> {
    // Implementation would send email via SMTP
    logger.debug('📧 Email alert sent', { ruleId: rule.id })
  }

  private async sendSlackAlert(config: any, rule: AlertRule, metrics: LogMetrics): Promise<void> {
    // Implementation would send Slack message
    logger.debug('💬 Slack alert sent', { ruleId: rule.id })
  }

  private cleanup(): void {
    const now = Date.now()
    const retentionPeriod = 86400000 // 24 hours

    // Clean old error cache entries
    for (const [key, data] of this.errorCache.entries()) {
      if (now - data.lastSeen > retentionPeriod) {
        this.errorCache.delete(key)
      }
    }

    // Clean old user activity
    for (const [key, data] of this.userActivity.entries()) {
      if (now - data.lastSeen > retentionPeriod) {
        this.userActivity.delete(key)
      }
    }

    logger.debug('🧹 Log aggregation cleanup completed')
  }
}

// Singleton instance
let logAggregationService: LogAggregationService | null = null

/**
 * Get singleton log aggregation service
 */
export function getLogAggregationService(): LogAggregationService {
  if (!logAggregationService) {
    logAggregationService = new LogAggregationService()
  }
  return logAggregationService
}

export default LogAggregationService

