/**
 * 📊 Metrics API Endpoint
 * 
 * Exposes application metrics for monitoring and observability:
 * - Prometheus format (/api/metrics)
 * - JSON format (/api/metrics/json)
 * - Health status (/api/metrics/health)
 */

import { Hono } from 'hono';
import { monitoringService } from '../../services/monitoring/monitoring-service';
import { winstonLog } from '../../utils/winston-logger';
import { notificationQueue } from '../../services/queue/notification-queue';

const metrics = new Hono();

/**
 * GET /api/metrics
 * Prometheus-compatible metrics endpoint
 */
metrics.get('/', (c) => {
  const prometheusMetrics = monitoringService.exportPrometheus();
  
  return c.text(prometheusMetrics, 200, {
    'Content-Type': 'text/plain; version=0.0.4',
  });
});

/**
 * GET /api/metrics/json
 * JSON format metrics for custom monitoring
 */
metrics.get('/json', (c) => {
  const jsonMetrics = monitoringService.exportJSON();
  
  // Add queue stats
  const queueStats = notificationQueue.getStats();
  
  return c.json({
    ...jsonMetrics,
    queue: {
      pending: queueStats.pending,
      processing: queueStats.processing,
      completed: queueStats.completed,
      failed: queueStats.failed,
      totalProcessed: queueStats.totalProcessed,
      avgTime: queueStats.averageProcessingTime,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/metrics/health
 * Health status with metrics summary
 */
metrics.get('/health', (c) => {
  const snapshot = monitoringService.getSnapshot();
  const queueStats = notificationQueue.getStats();
  
  // Calculate health status
  const errorRate = (snapshot.metrics['http.requests.5xx'] || 0) / 
                    (snapshot.metrics['http.requests.total'] || 1);
  
  const memoryUsage = process.memoryUsage();
  const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  const isHealthy = 
    errorRate < 0.05 &&  // Less than 5% error rate
    heapUsedPercent < 90 && // Less than 90% memory usage
    queueStats.failed < 100; // Less than 100 failed jobs
  
  return c.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    metrics: {
      requests: {
        total: snapshot.metrics['http.requests.total'] || 0,
        errors: snapshot.metrics['http.requests.5xx'] || 0,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        usagePercent: Math.round(heapUsedPercent),
      },
      queue: {
        pending: queueStats.pending,
        processing: queueStats.processing,
        failed: queueStats.failed,
      },
      uptime: snapshot.metrics['system.uptime'] || 0,
    },
    checks: {
      errorRate: errorRate < 0.05 ? 'pass' : 'fail',
      memory: heapUsedPercent < 90 ? 'pass' : 'fail',
      queue: queueStats.failed < 100 ? 'pass' : 'fail',
    },
  });
});

/**
 * GET /api/metrics/histogram/:name
 * Get detailed histogram statistics for a specific metric
 */
metrics.get('/histogram/:name', (c) => {
  const name = c.req.param('name');
  const stats = monitoringService.getHistogramStats(name);
  
  if (!stats) {
    return c.json({ error: 'Histogram not found' }, 404);
  }
  
  return c.json({
    name,
    stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/metrics/reset
 * Reset all metrics (admin only)
 */
metrics.post('/reset', (c) => {
  // In production, this should require admin authentication
  // For now, just reset
  
  monitoringService.reset();
  
  winstonLog.info('Metrics reset by user', {
    userId: c.get('userId'),
    userEmail: c.get('userEmail'),
  });
  
  return c.json({ message: 'Metrics reset successfully' });
});

export default metrics;


