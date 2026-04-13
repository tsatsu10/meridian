/**
 * 📊 Monitoring & Metrics Service
 * 
 * Centralized monitoring system that collects and aggregates:
 * - Application metrics (requests, errors, latency)
 * - System metrics (CPU, memory, disk)
 * - Business metrics (tasks, projects, users)
 * - Custom metrics
 * 
 * Integrates with external services like DataDog, Prometheus, CloudWatch
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import { winstonLog } from '../../utils/winston-logger';

export interface Metric {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  tags?: Record<string, string>;
  timestamp: number;
}

export interface MetricSnapshot {
  timestamp: number;
  metrics: Record<string, number>;
  tags?: Record<string, string>;
}

class MonitoringService extends EventEmitter {
  private metrics: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private isRunning: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  constructor() {
    super();
  }

  /**
   * Start monitoring service
   */
  public start(intervalSeconds: number = 60): void {
    if (this.isRunning) {
      logger.warn('Monitoring service already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    winstonLog.info('📊 Monitoring service started', {
      interval: intervalSeconds,
    });

    // Collect system metrics periodically
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalSeconds * 1000);

    // Initial collection
    this.collectSystemMetrics();
  }

  /**
   * Stop monitoring service
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    winstonLog.info('📊 Monitoring service stopped');
  }

  /**
   * Increment a counter metric
   */
  public increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);

    this.emit('metric', {
      name,
      value: current + value,
      type: 'counter',
      tags,
      timestamp: Date.now(),
    });
  }

  /**
   * Decrement a counter metric
   */
  public decrement(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags);
  }

  /**
   * Set a gauge metric (absolute value)
   */
  public gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.set(name, value);

    this.emit('metric', {
      name,
      value,
      type: 'gauge',
      tags,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a timing/histogram metric
   */
  public timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    // Store in histogram
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }

    const histogram = this.histograms.get(name)!;
    histogram.push(durationMs);

    // Keep last 1000 values
    if (histogram.length > 1000) {
      histogram.shift();
    }

    this.emit('metric', {
      name,
      value: durationMs,
      type: 'histogram',
      tags,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current metric value
   */
  public getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get histogram statistics
   */
  public getHistogramStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      min: sorted[0]!,
      max: sorted[count - 1]!,
      avg: sorted.reduce((a, b) => a + b, 0) / count,
      p50: sorted[Math.floor(count * 0.5)]!,
      p95: sorted[Math.floor(count * 0.95)]!,
      p99: sorted[Math.floor(count * 0.99)]!,
    };
  }

  /**
   * Get all metrics snapshot
   */
  public getSnapshot(): MetricSnapshot {
    const metrics: Record<string, number> = {};

    // Copy all metrics
    for (const [name, value] of this.metrics.entries()) {
      metrics[name] = value;
    }

    // Add histogram stats
    for (const [name, _] of this.histograms.entries()) {
      const stats = this.getHistogramStats(name);
      if (stats) {
        metrics[`${name}.avg`] = stats.avg;
        metrics[`${name}.p95`] = stats.p95;
        metrics[`${name}.p99`] = stats.p99;
      }
    }

    return {
      timestamp: Date.now(),
      metrics,
      tags: {
        service: 'meridian-api',
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }

  /**
   * Collect system metrics (CPU, memory, etc.)
   */
  private collectSystemMetrics(): void {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.gauge('system.memory.heap_used', memUsage.heapUsed);
    this.gauge('system.memory.heap_total', memUsage.heapTotal);
    this.gauge('system.memory.rss', memUsage.rss);
    this.gauge('system.memory.external', memUsage.external);

    // Uptime
    const uptime = Date.now() - this.startTime;
    this.gauge('system.uptime', uptime);

    // Log if memory usage is high
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercent > 90) {
      winstonLog.warn('High memory usage detected', {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        usagePercent: Math.round(usagePercent),
      });
    }
  }

  /**
   * Record HTTP request metrics
   */
  public recordRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    userId?: string
  ): void {
    // Count total requests
    this.increment('http.requests.total', 1, {
      method,
      status: statusCode.toString(),
    });

    // Count by status code range
    if (statusCode >= 500) {
      this.increment('http.requests.5xx', 1, { method, path });
    } else if (statusCode >= 400) {
      this.increment('http.requests.4xx', 1, { method, path });
    } else if (statusCode >= 300) {
      this.increment('http.requests.3xx', 1, { method, path });
    } else if (statusCode >= 200) {
      this.increment('http.requests.2xx', 1, { method, path });
    }

    // Record latency
    this.timing('http.request.duration', durationMs, { method, path });

    // Log slow requests
    const slowThreshold = 1000; // 1 second
    if (durationMs > slowThreshold) {
      winstonLog.warn('Slow request detected', {
        method,
        path,
        durationMs,
        userId,
        threshold: slowThreshold,
      }, { category: 'PERFORMANCE' });
    }
  }

  /**
   * Record database query metrics
   */
  public recordQuery(
    operation: string,
    table: string,
    durationMs: number,
    success: boolean
  ): void {
    this.increment('database.queries.total', 1, { operation, table });

    if (!success) {
      this.increment('database.queries.errors', 1, { operation, table });
    }

    this.timing('database.query.duration', durationMs, { operation, table });

    // Log slow queries
    const slowThreshold = 100; // 100ms
    if (durationMs > slowThreshold) {
      winstonLog.warn('Slow database query', {
        operation,
        table,
        durationMs,
        threshold: slowThreshold,
      }, { category: 'DATABASE' });
    }
  }

  /**
   * Record cache metrics
   */
  public recordCacheHit(key: string): void {
    this.increment('cache.hits', 1, { key });
  }

  public recordCacheMiss(key: string): void {
    this.increment('cache.misses', 1, { key });
  }

  public recordCacheSet(key: string): void {
    this.increment('cache.sets', 1, { key });
  }

  public recordCacheDelete(key: string): void {
    this.increment('cache.deletes', 1, { key });
  }

  /**
   * Record WebSocket metrics
   */
  public recordWebSocketConnection(connected: boolean): void {
    if (connected) {
      this.increment('websocket.connections', 1);
    } else {
      this.decrement('websocket.connections', 1);
    }
  }

  public recordWebSocketEvent(event: string): void {
    this.increment('websocket.events', 1, { event });
  }

  /**
   * Record business metrics
   */
  public recordTaskCreated(projectId: string): void {
    this.increment('business.tasks.created', 1, { projectId });
  }

  public recordTaskCompleted(projectId: string): void {
    this.increment('business.tasks.completed', 1, { projectId });
  }

  public recordUserLogin(success: boolean): void {
    if (success) {
      this.increment('auth.logins.success', 1);
    } else {
      this.increment('auth.logins.failed', 1);
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  public exportPrometheus(): string {
    let output = '';

    // Counters
    for (const [name, value] of this.metrics.entries()) {
      output += `# TYPE ${name.replace(/\./g, '_')} counter\n`;
      output += `${name.replace(/\./g, '_')} ${value}\n\n`;
    }

    // Histograms
    for (const [name, _] of this.histograms.entries()) {
      const stats = this.getHistogramStats(name);
      if (stats) {
        const metricName = name.replace(/\./g, '_');
        output += `# TYPE ${metricName} summary\n`;
        output += `${metricName}{quantile="0.5"} ${stats.p50}\n`;
        output += `${metricName}{quantile="0.95"} ${stats.p95}\n`;
        output += `${metricName}{quantile="0.99"} ${stats.p99}\n`;
        output += `${metricName}_sum ${stats.avg * stats.count}\n`;
        output += `${metricName}_count ${stats.count}\n\n`;
      }
    }

    return output;
  }

  /**
   * Export metrics in JSON format
   */
  public exportJSON(): any {
    const snapshot = this.getSnapshot();
    const histogramStats: Record<string, any> = {};

    for (const [name, _] of this.histograms.entries()) {
      const stats = this.getHistogramStats(name);
      if (stats) {
        histogramStats[name] = stats;
      }
    }

    return {
      ...snapshot,
      histograms: histogramStats,
      system: {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
      },
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.metrics.clear();
    this.histograms.clear();
    winstonLog.info('Metrics reset');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Auto-start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  monitoringService.start(60); // Collect metrics every 60 seconds
}

// Graceful shutdown
process.on('SIGTERM', () => {
  monitoringService.stop();
});

process.on('SIGINT', () => {
  monitoringService.stop();
});

export default monitoringService;


