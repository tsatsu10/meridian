import { Hono } from 'hono';
import { z } from 'zod';
import { createError } from '../lib/errors';
import { monitoring } from '../lib/monitoring';
import { logger, LogLevel } from '../lib/logging';
import { authMiddleware } from '../lib/security';

const monitoringRouter = new Hono();

// Apply authentication to all monitoring routes
monitoringRouter.use('*', authMiddleware);

// Get application metrics
monitoringRouter.get('/metrics', async (c) => {
  try {
    const filter = c.req.query('filter');
    const metrics = monitoring.getMetrics(filter);
    
    return c.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message });
    throw createError.internalError('Failed to retrieve metrics');
  }
});

// Get application health status
monitoringRouter.get('/health', async (c) => {
  try {
    const healthStatus = monitoring.getHealthStatus();
    
    return c.json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    logger.error('Failed to get health status', { error: error.message });
    throw createError.internalError('Failed to retrieve health status');
  }
});

// Get alerts
monitoringRouter.get('/alerts', async (c) => {
  try {
    const resolved = c.req.query('resolved') === 'true';
    const alerts = monitoring.getAlerts(resolved);
    
    return c.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Failed to get alerts', { error: error.message });
    throw createError.internalError('Failed to retrieve alerts');
  }
});

// Create alert
monitoringRouter.post('/alerts', async (c) => {
  try {
    const body = await c.req.json();
    const alertSchema = z.object({
      message: z.string().min(1, 'Message is required'),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      tags: z.record(z.string()).optional(),
    });
    
    const validatedData = alertSchema.parse(body);
    const alert = monitoring.createAlert(
      validatedData.message,
      validatedData.severity,
      validatedData.tags
    );
    
    return c.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError.validationError('Invalid alert data', {
        errors: error.errors,
      });
    }
    logger.error('Failed to create alert', { error: error.message });
    throw createError.internalError('Failed to create alert');
  }
});

// Resolve alert
monitoringRouter.put('/alerts/:alertId/resolve', async (c) => {
  try {
    const alertId = c.req.param('alertId');
    monitoring.resolveAlert(alertId);
    
    return c.json({
      success: true,
      message: 'Alert resolved',
    });
  } catch (error) {
    logger.error('Failed to resolve alert', { error: error.message });
    throw createError.internalError('Failed to resolve alert');
  }
});

// Get logs
monitoringRouter.get('/logs', async (c) => {
  try {
    const level = c.req.query('level') as keyof typeof LogLevel;
    const limit = parseInt(c.req.query('limit') || '100');
    
    const logLevel = level ? LogLevel[level] : undefined;
    const logs = logger.getLogs(logLevel, limit);
    
    return c.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    logger.error('Failed to get logs', { error: error.message });
    throw createError.internalError('Failed to retrieve logs');
  }
});

// Get log statistics
monitoringRouter.get('/logs/stats', async (c) => {
  try {
    const stats = logger.getLogStats();
    
    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get log stats', { error: error.message });
    throw createError.internalError('Failed to retrieve log statistics');
  }
});

// Clear logs
monitoringRouter.delete('/logs', async (c) => {
  try {
    logger.clearLogs();
    
    return c.json({
      success: true,
      message: 'Logs cleared',
    });
  } catch (error) {
    logger.error('Failed to clear logs', { error: error.message });
    throw createError.internalError('Failed to clear logs');
  }
});

// Get system information
monitoringRouter.get('/system', async (c) => {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const version = process.version;
    const platform = process.platform;
    const arch = process.arch;
    
    const systemInfo = {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
      },
      uptime,
      version,
      platform,
      arch,
      pid: process.pid,
      cwd: process.cwd(),
    };
    
    return c.json({
      success: true,
      data: systemInfo,
    });
  } catch (error) {
    logger.error('Failed to get system info', { error: error.message });
    throw createError.internalError('Failed to retrieve system information');
  }
});

// Get performance metrics
monitoringRouter.get('/performance', async (c) => {
  try {
    const metrics = monitoring.getMetrics('http_request_duration');
    const performanceMetrics = {
      requestMetrics: metrics,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
    
    return c.json({
      success: true,
      data: performanceMetrics,
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', { error: error.message });
    throw createError.internalError('Failed to retrieve performance metrics');
  }
});

// Clear old metrics
monitoringRouter.delete('/metrics', async (c) => {
  try {
    const olderThanHours = parseInt(c.req.query('olderThanHours') || '24');
    monitoring.clearOldMetrics(olderThanHours);
    
    return c.json({
      success: true,
      message: `Cleared metrics older than ${olderThanHours} hours`,
    });
  } catch (error) {
    logger.error('Failed to clear old metrics', { error: error.message });
    throw createError.internalError('Failed to clear old metrics');
  }
});

// Clear resolved alerts
monitoringRouter.delete('/alerts/resolved', async (c) => {
  try {
    monitoring.clearResolvedAlerts();
    
    return c.json({
      success: true,
      message: 'Resolved alerts cleared',
    });
  } catch (error) {
    logger.error('Failed to clear resolved alerts', { error: error.message });
    throw createError.internalError('Failed to clear resolved alerts');
  }
});

// Export monitoring data
monitoringRouter.get('/export', async (c) => {
  try {
    const format = c.req.query('format') || 'json';
    const includeLogs = c.req.query('includeLogs') === 'true';
    const includeMetrics = c.req.query('includeMetrics') === 'true';
    const includeAlerts = c.req.query('includeAlerts') === 'true';
    
    const exportData: any = {};
    
    if (includeMetrics) {
      exportData.metrics = monitoring.getMetrics();
    }
    
    if (includeAlerts) {
      exportData.alerts = monitoring.getAlerts();
    }
    
    if (includeLogs) {
      exportData.logs = logger.getLogs();
    }
    
    exportData.exportedAt = new Date().toISOString();
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="monitoring-data.csv"',
      });
    }
    
    return c.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logger.error('Failed to export monitoring data', { error: error.message });
    throw createError.internalError('Failed to export monitoring data');
  }
});

// Convert data to CSV format
function convertToCSV(data: any): string {
  const lines: string[] = [];
  
  // Add headers
  lines.push('Type,Timestamp,Message,Level,Context');
  
  // Add metrics
  if (data.metrics) {
    for (const [key, metric] of Object.entries(data.metrics)) {
      lines.push(`metric,${metric.lastUpdated || new Date().toISOString()},${key},info,"${JSON.stringify(metric)}"`);
    }
  }
  
  // Add alerts
  if (data.alerts) {
    for (const alert of data.alerts) {
      lines.push(`alert,${alert.timestamp},${alert.message},${alert.severity},"${JSON.stringify(alert.tags || {})}"`);
    }
  }
  
  // Add logs
  if (data.logs) {
    for (const log of data.logs) {
      lines.push(`log,${log.timestamp},${log.message},${LogLevel[log.level]},"${JSON.stringify(log.context || {})}"`);
    }
  }
  
  return lines.join('\n');
}

export default monitoringRouter;

