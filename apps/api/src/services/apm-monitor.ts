/**
 * 📊 Application Performance Monitoring (APM) System
 * 
 * Comprehensive performance monitoring beyond basic memory usage:
 * - Response time tracking
 * - Throughput monitoring
 * - Error rate tracking
 * - Database query performance
 * - WebSocket connection metrics
 * - Resource utilization
 */

import { getPerformanceConfig, getApiConfig, getAPMConfig } from '../config/app-config';
import logger from '../utils/logger';

export interface ResponseTimeMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

export interface ThroughputMetric {
  endpoint: string;
  method: string;
  requestCount: number;
  timeWindow: number; // seconds
  timestamp: Date;
}

export interface ErrorMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  timestamp: Date;
  userId?: string;
}

export interface DatabaseMetric {
  query: string;
  queryHash: string;
  duration: number;
  recordCount: number;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: Date;
}

export interface WebSocketMetric {
  event: 'connect' | 'disconnect' | 'message' | 'error';
  duration?: number;
  messageType?: string;
  connectionCount: number;
  timestamp: Date;
}

export interface SystemMetric {
  cpuUsage: number;
  memoryUsage: number;
  heapUsed: number;
  heapTotal: number;
  eventLoopDelay: number;
  activeConnections: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  type: 'response_time' | 'error_rate' | 'throughput' | 'resource' | 'database';
  severity: 'warning' | 'critical';
  message: string;
  metric: any;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

export interface APMStatistics {
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    slowest: ResponseTimeMetric;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    totalRequests: number;
    peakRPS: number;
  };
  errorRate: {
    percentage: number;
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByEndpoint: Record<string, number>;
  };
  database: {
    averageQueryTime: number;
    slowQueries: DatabaseMetric[];
    queryCount: number;
    connectionPoolUsage: number;
  };
  websocket: {
    activeConnections: number;
    messagesPerSecond: number;
    connectionErrors: number;
    averageLatency: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    eventLoopDelay: number;
    uptime: number;
  };
}

class APMMonitor {
  private responseTimeMetrics: ResponseTimeMetric[] = [];
  private throughputMetrics: Map<string, number[]> = new Map(); // endpoint -> timestamps
  private errorMetrics: ErrorMetric[] = [];
  private databaseMetrics: DatabaseMetric[] = [];
  private websocketMetrics: WebSocketMetric[] = [];
  private systemMetrics: SystemMetric[] = [];
  
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private config = getPerformanceConfig();
  private apiConfig = getApiConfig();
  private apmConfig = getAPMConfig();
  
  // Thresholds (from centralized configuration)
  private readonly RESPONSE_TIME_WARNING = this.apmConfig.responseTimeWarning;
  private readonly RESPONSE_TIME_CRITICAL = this.apmConfig.responseTimeCritical;
  private readonly ERROR_RATE_WARNING = this.apmConfig.errorRateWarning;
  private readonly ERROR_RATE_CRITICAL = this.apmConfig.errorRateCritical;
  private readonly THROUGHPUT_WINDOW = 60; // 60 seconds
  private readonly MAX_METRICS_HISTORY = this.apmConfig.maxMetricsHistory;
  
  // Performance tracking
  private requestTimers: Map<string, { start: number; endpoint: string; method: string }> = new Map();
  private eventLoopMonitor: any = null;

  /**
   * Start APM monitoring
   */
  start(): void {
    if (!this.apmConfig.enabled) {
      logger.performance('info', 'APM monitoring is disabled');
      return;
    }

    if (this.isMonitoring) {
      logger.performance('info', 'APM monitor already running');
      return;
    }

    logger.performance('info', 'Starting APM monitor', {
      responseTimeWarning: this.RESPONSE_TIME_WARNING,
      responseTimeCritical: this.RESPONSE_TIME_CRITICAL,
      errorRateWarning: this.ERROR_RATE_WARNING,
      maxMetricsHistory: this.MAX_METRICS_HISTORY
    });
    this.isMonitoring = true;

    // Start system metrics collection (if enabled)
    if (this.apmConfig.collectSystemMetrics) {
      this.monitorInterval = setInterval(() => {
        this.collectSystemMetrics();
        this.analyzeMetrics();
        this.cleanupOldMetrics();
      }, this.apmConfig.monitoringInterval);
    }

    // Start event loop monitoring
    this.startEventLoopMonitoring();

    // Initial metrics collection
    if (this.apmConfig.collectSystemMetrics) {
      this.collectSystemMetrics();
    }
  }

  /**
   * Stop APM monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;

    logger.performance('info', 'Stopping APM monitor');
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    if (this.eventLoopMonitor) {
      clearInterval(this.eventLoopMonitor);
      this.eventLoopMonitor = null;
    }
  }

  /**
   * Track HTTP request start
   */
  startRequest(requestId: string, endpoint: string, method: string): void {
    this.requestTimers.set(requestId, {
      start: Date.now(),
      endpoint: endpoint.replace(/\/\d+/g, '/:id'), // Normalize IDs
      method
    });
  }

  /**
   * Track HTTP request completion
   */
  endRequest(
    requestId: string, 
    statusCode: number, 
    userId?: string, 
    userAgent?: string, 
    ip?: string
  ): void {
    const timer = this.requestTimers.get(requestId);
    if (!timer) return;

    const duration = Date.now() - timer.start;
    this.requestTimers.delete(requestId);

    const metric: ResponseTimeMetric = {
      endpoint: timer.endpoint,
      method: timer.method,
      duration,
      statusCode,
      timestamp: new Date(),
      userId,
      userAgent,
      ip
    };

    this.responseTimeMetrics.push(metric);
    this.trackThroughput(timer.endpoint, timer.method);

    // Track errors
    if (statusCode >= 400) {
      this.trackError({
        endpoint: timer.endpoint,
        method: timer.method,
        statusCode,
        errorType: this.getErrorType(statusCode),
        errorMessage: `HTTP ${statusCode}`,
        timestamp: new Date(),
        userId
      });
    }

    // Check for performance alerts
    this.checkResponseTimeAlert(metric);
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(
    query: string,
    duration: number,
    recordCount: number,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  ): void {
    const metric: DatabaseMetric = {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      queryHash: this.hashQuery(query),
      duration,
      recordCount,
      operation,
      timestamp: new Date()
    };

    this.databaseMetrics.push(metric);

    // Alert on slow queries
    if (duration > this.apiConfig.slowQueryThreshold) {
      this.triggerAlert({
        type: 'database',
        severity: duration > this.apiConfig.slowQueryThreshold * 2 ? 'critical' : 'warning',
        message: `Slow database query: ${duration}ms`,
        metric,
        threshold: this.apiConfig.slowQueryThreshold,
        currentValue: duration,
        timestamp: new Date()
      });
    }
  }

  /**
   * Track WebSocket events
   */
  trackWebSocketEvent(
    event: 'connect' | 'disconnect' | 'message' | 'error',
    connectionCount: number,
    duration?: number,
    messageType?: string
  ): void {
    const metric: WebSocketMetric = {
      event,
      duration,
      messageType,
      connectionCount,
      timestamp: new Date()
    };

    this.websocketMetrics.push(metric);
  }

  /**
   * Track custom error
   */
  trackError(error: Omit<ErrorMetric, 'timestamp'>): void {
    const metric: ErrorMetric = {
      ...error,
      timestamp: new Date()
    };

    this.errorMetrics.push(metric);
  }

  /**
   * Get comprehensive performance statistics
   */
  getStatistics(): APMStatistics {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentMetrics = this.responseTimeMetrics.filter(m => 
      now - m.timestamp.getTime() < oneHour
    );

    // Response time statistics
    const durations = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const responseTime = {
      average: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      slowest: recentMetrics.reduce((slowest, current) => 
        current.duration > slowest.duration ? current : slowest, 
        recentMetrics[0] || { duration: 0 } as ResponseTimeMetric
      )
    };

    // Throughput statistics
    const throughput = {
      requestsPerSecond: this.calculateRequestsPerSecond(),
      requestsPerMinute: this.calculateRequestsPerMinute(),
      totalRequests: recentMetrics.length,
      peakRPS: this.calculatePeakRPS()
    };

    // Error rate statistics
    const recentErrors = this.errorMetrics.filter(e => 
      now - e.timestamp.getTime() < oneHour
    );
    const errorRate = {
      percentage: recentMetrics.length > 0 ? (recentErrors.length / recentMetrics.length) * 100 : 0,
      totalErrors: recentErrors.length,
      errorsByType: this.groupErrorsByType(recentErrors),
      errorsByEndpoint: this.groupErrorsByEndpoint(recentErrors)
    };

    // Database statistics
    const recentDbMetrics = this.databaseMetrics.filter(m => 
      now - m.timestamp.getTime() < oneHour
    );
    const database = {
      averageQueryTime: recentDbMetrics.length > 0 ? 
        recentDbMetrics.reduce((sum, m) => sum + m.duration, 0) / recentDbMetrics.length : 0,
      slowQueries: recentDbMetrics
        .filter(m => m.duration > this.apiConfig.slowQueryThreshold)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
      queryCount: recentDbMetrics.length,
      connectionPoolUsage: 0 // TODO: Implement connection pool monitoring
    };

    // WebSocket statistics
    const recentWsMetrics = this.websocketMetrics.filter(m => 
      now - m.timestamp.getTime() < oneHour
    );
    const websocket = {
      activeConnections: this.getActiveWebSocketConnections(),
      messagesPerSecond: this.calculateWebSocketMessagesPerSecond(recentWsMetrics),
      connectionErrors: recentWsMetrics.filter(m => m.event === 'error').length,
      averageLatency: this.calculateAverageWebSocketLatency(recentWsMetrics)
    };

    // System statistics
    const latestSystemMetric = this.systemMetrics[this.systemMetrics.length - 1];
    const system = {
      cpuUsage: latestSystemMetric?.cpuUsage || 0,
      memoryUsage: latestSystemMetric?.memoryUsage || 0,
      eventLoopDelay: latestSystemMetric?.eventLoopDelay || 0,
      uptime: process.uptime()
    };

    return {
      responseTime,
      throughput,
      errorRate,
      database,
      websocket,
      system
    };
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metric: SystemMetric = {
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      eventLoopDelay: this.getEventLoopDelay(),
      activeConnections: this.getActiveConnections(),
      timestamp: new Date()
    };

    this.systemMetrics.push(metric);
  }

  /**
   * Start event loop monitoring
   */
  private startEventLoopMonitoring(): void {
    const { performance } = require('perf_hooks');
    
    this.eventLoopMonitor = setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const delay = performance.now() - start;
        if (delay > 10) { // Alert if event loop delay > 10ms
          this.triggerAlert({
            type: 'resource',
            severity: delay > 100 ? 'critical' : 'warning',
            message: `High event loop delay: ${delay.toFixed(2)}ms`,
            metric: { delay },
            threshold: 10,
            currentValue: delay,
            timestamp: new Date()
          });
        }
      });
    }, 5000);
  }

  /**
   * Analyze metrics and trigger alerts
   */
  private analyzeMetrics(): void {
    this.checkErrorRateAlert();
    this.checkThroughputAlert();
    this.checkSystemResourceAlert();
  }

  /**
   * Check response time alert
   */
  private checkResponseTimeAlert(metric: ResponseTimeMetric): void {
    if (metric.duration > this.RESPONSE_TIME_CRITICAL) {
      this.triggerAlert({
        type: 'response_time',
        severity: 'critical',
        message: `Critical response time: ${metric.duration}ms for ${metric.method} ${metric.endpoint}`,
        metric,
        threshold: this.RESPONSE_TIME_CRITICAL,
        currentValue: metric.duration,
        timestamp: new Date()
      });
    } else if (metric.duration > this.RESPONSE_TIME_WARNING) {
      this.triggerAlert({
        type: 'response_time',
        severity: 'warning',
        message: `Slow response time: ${metric.duration}ms for ${metric.method} ${metric.endpoint}`,
        metric,
        threshold: this.RESPONSE_TIME_WARNING,
        currentValue: metric.duration,
        timestamp: new Date()
      });
    }
  }

  /**
   * Check error rate alert
   */
  private checkErrorRateAlert(): void {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    const recentRequests = this.responseTimeMetrics.filter(m => 
      now - m.timestamp.getTime() < fiveMinutes
    );
    const recentErrors = this.errorMetrics.filter(e => 
      now - e.timestamp.getTime() < fiveMinutes
    );

    if (recentRequests.length < 10) return; // Need sufficient data

    const errorRate = (recentErrors.length / recentRequests.length) * 100;

    if (errorRate > this.ERROR_RATE_CRITICAL) {
      this.triggerAlert({
        type: 'error_rate',
        severity: 'critical',
        message: `Critical error rate: ${errorRate.toFixed(1)}%`,
        metric: { errorRate, totalRequests: recentRequests.length, totalErrors: recentErrors.length },
        threshold: this.ERROR_RATE_CRITICAL,
        currentValue: errorRate,
        timestamp: new Date()
      });
    } else if (errorRate > this.ERROR_RATE_WARNING) {
      this.triggerAlert({
        type: 'error_rate',
        severity: 'warning',
        message: `High error rate: ${errorRate.toFixed(1)}%`,
        metric: { errorRate, totalRequests: recentRequests.length, totalErrors: recentErrors.length },
        threshold: this.ERROR_RATE_WARNING,
        currentValue: errorRate,
        timestamp: new Date()
      });
    }
  }

  /**
   * Check throughput alert
   */
  private checkThroughputAlert(): void {
    const rps = this.calculateRequestsPerSecond();
    const maxConcurrent = this.apiConfig.maxConcurrentRequests;
    
    if (rps > maxConcurrent * 0.9) {
      this.triggerAlert({
        type: 'throughput',
        severity: rps > maxConcurrent ? 'critical' : 'warning',
        message: `High throughput: ${rps.toFixed(1)} RPS (limit: ${maxConcurrent})`,
        metric: { rps, limit: maxConcurrent },
        threshold: maxConcurrent * 0.9,
        currentValue: rps,
        timestamp: new Date()
      });
    }
  }

  /**
   * Check system resource alert
   */
  private checkSystemResourceAlert(): void {
    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latest) return;

    // Memory usage alert
    if (latest.memoryUsage > this.config.memoryThreshold * 100) {
      this.triggerAlert({
        type: 'resource',
        severity: latest.memoryUsage > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${latest.memoryUsage.toFixed(1)}%`,
        metric: latest,
        threshold: this.config.memoryThreshold * 100,
        currentValue: latest.memoryUsage,
        timestamp: new Date()
      });
    }

    // Event loop delay alert
    if (latest.eventLoopDelay > 100) {
      this.triggerAlert({
        type: 'resource',
        severity: latest.eventLoopDelay > 500 ? 'critical' : 'warning',
        message: `High event loop delay: ${latest.eventLoopDelay.toFixed(2)}ms`,
        metric: latest,
        threshold: 100,
        currentValue: latest.eventLoopDelay,
        timestamp: new Date()
      });
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(alert: PerformanceAlert): void {
    logger.performance('warn', `APM Alert [${alert.severity.toUpperCase()}]`, {
      type: alert.type,
      message: alert.message,
      threshold: alert.threshold,
      currentValue: alert.currentValue
    });

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Error in APM alert callback', { error: error.message });
      }
    });
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Clean up old metrics to prevent memory bloat
   */
  private cleanupOldMetrics(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = new Date(Date.now() - maxAge);

    this.responseTimeMetrics = this.responseTimeMetrics.filter(m => m.timestamp > cutoff);
    this.errorMetrics = this.errorMetrics.filter(m => m.timestamp > cutoff);
    this.databaseMetrics = this.databaseMetrics.filter(m => m.timestamp > cutoff);
    this.websocketMetrics = this.websocketMetrics.filter(m => m.timestamp > cutoff);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);

    // Limit total metrics to prevent memory issues
    if (this.responseTimeMetrics.length > this.MAX_METRICS_HISTORY) {
      this.responseTimeMetrics = this.responseTimeMetrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  // Helper methods
  private trackThroughput(endpoint: string, method: string): void {
    const key = `${method} ${endpoint}`;
    const timestamps = this.throughputMetrics.get(key) || [];
    timestamps.push(Date.now());
    
    // Keep only recent timestamps
    const cutoff = Date.now() - (this.THROUGHPUT_WINDOW * 1000);
    this.throughputMetrics.set(key, timestamps.filter(t => t > cutoff));
  }

  private calculateRequestsPerSecond(): number {
    const now = Date.now();
    const oneSecond = 1000;
    const recent = this.responseTimeMetrics.filter(m => 
      now - m.timestamp.getTime() < oneSecond
    );
    return recent.length;
  }

  private calculateRequestsPerMinute(): number {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const recent = this.responseTimeMetrics.filter(m => 
      now - m.timestamp.getTime() < oneMinute
    );
    return recent.length;
  }

  private calculatePeakRPS(): number {
    // Calculate peak RPS in the last hour
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recent = this.responseTimeMetrics.filter(m => 
      now - m.timestamp.getTime() < oneHour
    );

    let maxRPS = 0;
    for (let i = 0; i < 3600; i++) { // Check each second in the last hour
      const secondStart = now - (i * 1000);
      const secondEnd = secondStart + 1000;
      const requestsInSecond = recent.filter(m => {
        const time = m.timestamp.getTime();
        return time >= secondStart && time < secondEnd;
      }).length;
      maxRPS = Math.max(maxRPS, requestsInSecond);
    }

    return maxRPS;
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode >= 400) return 'client_error';
    return 'unknown';
  }

  private hashQuery(query: string): string {
    // Simple hash for query deduplication
    return query.replace(/\s+/g, ' ').toLowerCase().trim();
  }

  private groupErrorsByType(errors: ErrorMetric[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupErrorsByEndpoint(errors: ErrorMetric[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      const key = `${error.method} ${error.endpoint}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getEventLoopDelay(): number {
    // This would be populated by the event loop monitoring
    return 0;
  }

  private getActiveConnections(): number {
    // This would be integrated with connection monitoring
    return 0;
  }

  private getActiveWebSocketConnections(): number {
    // This would be integrated with WebSocket server
    return 0;
  }

  private calculateWebSocketMessagesPerSecond(metrics: WebSocketMetric[]): number {
    const now = Date.now();
    const oneSecond = 1000;
    const recent = metrics.filter(m => 
      m.event === 'message' && now - m.timestamp.getTime() < oneSecond
    );
    return recent.length;
  }

  private calculateAverageWebSocketLatency(metrics: WebSocketMetric[]): number {
    const messagesWithDuration = metrics.filter(m => 
      m.event === 'message' && m.duration !== undefined
    );
    if (messagesWithDuration.length === 0) return 0;
    
    const totalDuration = messagesWithDuration.reduce((sum, m) => sum + (m.duration || 0), 0);
    return totalDuration / messagesWithDuration.length;
  }
}

export default new APMMonitor();

