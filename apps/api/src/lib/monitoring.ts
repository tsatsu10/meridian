import { Context } from 'hono';
import { createError } from './errors';
import logger from '../utils/logger';

// Monitoring service for application metrics
export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, any> = new Map();
  private alerts: Array<{ id: string; message: string; severity: string; timestamp: Date }> = [];

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Record application metrics
  recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;
    const existing = this.metrics.get(key) || { count: 0, total: 0, avg: 0, min: Infinity, max: -Infinity };
    
    existing.count++;
    existing.total += value;
    existing.avg = existing.total / existing.count;
    existing.min = Math.min(existing.min, value);
    existing.max = Math.max(existing.max, value);
    existing.lastValue = value;
    existing.lastUpdated = new Date();
    
    this.metrics.set(key, existing);
  }

  // Record counter metric
  incrementCounter(name: string, value: number = 1, tags: Record<string, string> = {}) {
    const key = `counter:${name}:${JSON.stringify(tags)}`;
    const existing = this.metrics.get(key) || { count: 0, lastUpdated: new Date() };
    
    existing.count += value;
    existing.lastUpdated = new Date();
    
    this.metrics.set(key, existing);
  }

  // Record gauge metric
  setGauge(name: string, value: number, tags: Record<string, string> = {}) {
    const key = `gauge:${name}:${JSON.stringify(tags)}`;
    this.metrics.set(key, {
      value,
      lastUpdated: new Date(),
    });
  }

  // Record histogram metric
  recordHistogram(name: string, value: number, tags: Record<string, string> = {}) {
    const key = `histogram:${name}:${JSON.stringify(tags)}`;
    const existing = this.metrics.get(key) || { 
      count: 0, 
      sum: 0, 
      buckets: new Map(),
      lastUpdated: new Date()
    };
    
    existing.count++;
    existing.sum += value;
    
    // Add to buckets
    const bucketKey = this.getBucketKey(value);
    existing.buckets.set(bucketKey, (existing.buckets.get(bucketKey) || 0) + 1);
    
    existing.lastUpdated = new Date();
    this.metrics.set(key, existing);
  }

  // Get bucket key for histogram
  private getBucketKey(value: number): string {
    const buckets = [0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
    for (const bucket of buckets) {
      if (value <= bucket) {
        return `le_${bucket}`;
      }
    }
    return 'le_inf';
  }

  // Record event
  recordEvent(name: string, data: any, tags: Record<string, string> = {}) {
    const event = {
      name,
      data,
      tags,
      timestamp: new Date(),
    };
    
    // Store event (in real implementation, send to event store)
    logger.debug('Event recorded:', event);
  }

  // Create alert
  createAlert(message: string, severity: 'low' | 'medium' | 'high' | 'critical', tags: Record<string, string> = {}) {
    const alert = {
      id: crypto.randomUUID(),
      message,
      severity,
      tags,
      timestamp: new Date(),
      resolved: false,
    };
    
    this.alerts.push(alert);
    
    // Send alert notification
    this.sendAlertNotification(alert);
    
    return alert;
  }

  // Resolve alert
  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  // Get metrics
  getMetrics(filter?: string) {
    const allMetrics = Object.fromEntries(this.metrics);
    
    if (filter) {
      return Object.fromEntries(
        Object.entries(allMetrics).filter(([key]) => key.includes(filter))
      );
    }
    
    return allMetrics;
  }

  // Get alerts
  getAlerts(resolved: boolean = false) {
    return this.alerts.filter(alert => alert.resolved === resolved);
  }

  // Get health status
  getHealthStatus() {
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical' && !a.resolved);
    const highAlerts = this.alerts.filter(a => a.severity === 'high' && !a.resolved);
    
    if (criticalAlerts.length > 0) {
      return { status: 'critical', message: 'Critical alerts active' };
    }
    
    if (highAlerts.length > 0) {
      return { status: 'warning', message: 'High severity alerts active' };
    }
    
    return { status: 'healthy', message: 'All systems operational' };
  }

  // Send alert notification
  private async sendAlertNotification(alert: any) {
    try {
      // Send to external monitoring service
      if (process.env.ALERT_WEBHOOK_URL) {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `🚨 ${alert.severity.toUpperCase()} Alert`,
            attachments: [
              {
                color: this.getSeverityColor(alert.severity),
                fields: [
                  {
                    title: 'Message',
                    value: alert.message,
                    short: false,
                  },
                  {
                    title: 'Severity',
                    value: alert.severity,
                    short: true,
                  },
                  {
                    title: 'Timestamp',
                    value: alert.timestamp.toISOString(),
                    short: true,
                  },
                ],
              },
            ],
          }),
        });
      }
    } catch (error) {
      logger.error('Failed to send alert notification:', error);
    }
  }

  // Get severity color for alerts
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'warning';
      case 'low': return 'good';
      default: return 'good';
    }
  }

  // Clear old metrics
  clearOldMetrics(olderThanHours: number = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [key, metric] of this.metrics) {
      if (metric.lastUpdated && metric.lastUpdated < cutoffTime) {
        this.metrics.delete(key);
      }
    }
  }

  // Clear resolved alerts
  clearResolvedAlerts() {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
  }
}

// Monitoring middleware
export function createMonitoringMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const startTime = Date.now();
    const endpoint = c.req.path;
    const method = c.req.method;
    
    try {
      await next();
      
      const duration = Date.now() - startTime;
      const status = c.res.status;
      
      // Record metrics
      const monitoring = MonitoringService.getInstance();
      monitoring.recordMetric('http_request_duration', duration, {
        method,
        endpoint,
        status: status.toString(),
      });
      
      monitoring.incrementCounter('http_requests_total', 1, {
        method,
        endpoint,
        status: status.toString(),
      });
      
      // Check for slow requests
      if (duration > 5000) {
        monitoring.createAlert(
          `Slow request detected: ${method} ${endpoint} took ${duration}ms`,
          'medium',
          { method, endpoint, duration: duration.toString() }
        );
      }
      
      // Check for error rates
      if (status >= 500) {
        monitoring.createAlert(
          `Server error: ${method} ${endpoint} returned ${status}`,
          'high',
          { method, endpoint, status: status.toString() }
        );
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record error metrics
      const monitoring = MonitoringService.getInstance();
      monitoring.recordMetric('http_request_duration', duration, {
        method,
        endpoint,
        status: 'error',
      });
      
      monitoring.incrementCounter('http_requests_total', 1, {
        method,
        endpoint,
        status: 'error',
      });
      
      monitoring.createAlert(
        `Request failed: ${method} ${endpoint} - ${error.message}`,
        'high',
        { method, endpoint, error: error.message }
      );
      
      throw error;
    }
  };
}

// Database monitoring middleware
export function createDatabaseMonitoringMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const startTime = Date.now();
    
    try {
      await next();
      
      const duration = Date.now() - startTime;
      const monitoring = MonitoringService.getInstance();
      
      monitoring.recordMetric('database_query_duration', duration);
      
      if (duration > 1000) {
        monitoring.createAlert(
          `Slow database query detected: ${duration}ms`,
          'medium',
          { duration: duration.toString() }
        );
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const monitoring = MonitoringService.getInstance();
      
      monitoring.recordMetric('database_query_duration', duration);
      monitoring.createAlert(
        `Database query failed: ${error.message}`,
        'high',
        { error: error.message }
      );
      
      throw error;
    }
  };
}

// Memory monitoring
export function startMemoryMonitoring() {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const monitoring = MonitoringService.getInstance();
    
    monitoring.setGauge('memory_usage_bytes', memUsage.heapUsed, { type: 'heap' });
    monitoring.setGauge('memory_usage_bytes', memUsage.heapTotal, { type: 'heap_total' });
    monitoring.setGauge('memory_usage_bytes', memUsage.rss, { type: 'rss' });
    monitoring.setGauge('memory_usage_bytes', memUsage.external, { type: 'external' });
    
    // Check for memory leaks
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      monitoring.createAlert(
        `High memory usage detected: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        'high',
        { memory: memUsage.heapUsed.toString() }
      );
    }
  }, 30000); // Every 30 seconds
}

// CPU monitoring
export function startCPUMonitoring() {
  let lastCpuUsage = process.cpuUsage();
  
  setInterval(() => {
    const cpuUsage = process.cpuUsage(lastCpuUsage);
    const monitoring = MonitoringService.getInstance();
    
    const userTime = cpuUsage.user / 1000000; // Convert to seconds
    const systemTime = cpuUsage.system / 1000000;
    
    monitoring.recordMetric('cpu_usage_seconds', userTime + systemTime);
    
    lastCpuUsage = process.cpuUsage();
  }, 10000); // Every 10 seconds
}

// Export monitoring service instance
export const monitoring = MonitoringService.getInstance();
export const monitoringMiddleware = createMonitoringMiddleware();
export const databaseMonitoringMiddleware = createDatabaseMonitoringMiddleware();

