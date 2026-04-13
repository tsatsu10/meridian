/**
 * 📊 Performance Metrics API
 * 
 * Provides endpoints for accessing Application Performance Monitoring data:
 * - Real-time performance statistics
 * - Historical performance data
 * - Performance alerts and health status
 * - Detailed metrics for debugging
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import apmMonitor, { APMStatistics } from '../services/apm-monitor';
import memoryMonitor from '../services/memory-monitor';
import logger from '../utils/logger';
import { auth } from '../middlewares/auth';

const app = new Hono();

// Validation schemas
const timeRangeSchema = z.object({
  hours: z.number().min(1).max(168).default(1) // 1 hour to 1 week
});

const alertQuerySchema = z.object({
  type: z.enum(['response_time', 'error_rate', 'throughput', 'resource', 'database']).optional(),
  severity: z.enum(['warning', 'critical']).optional(),
  limit: z.number().min(1).max(1000).default(100)
});

/**
 * Get current performance statistics
 */
app.get('/stats', auth, async (c) => {
  try {
    const stats = apmMonitor.getStatistics();
    const memoryStats = memoryMonitor.getStatistics();

    const response = {
      timestamp: new Date().toISOString(),
      apm: stats,
      memory: memoryStats,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    await logger.api('info', 'Performance stats requested', {
      endpoint: '/performance/stats',
      userId: c.get('user')?.id
    });

    return c.json(response);
  } catch (error) {
    await logger.error('Failed to get performance stats', {
      error: error.message,
      endpoint: '/performance/stats'
    });

    return c.json({ 
      error: 'Failed to retrieve performance statistics',
      message: error.message 
    }, 500);
  }
});

/**
 * Get current performance metrics (alias for /stats)
 */
app.get('/metrics', auth, async (c) => {
  try {
    const stats = apmMonitor.getStatistics();
    const memoryStats = memoryMonitor.getStatistics();

    const response = {
      timestamp: new Date().toISOString(),
      apm: stats,
      memory: memoryStats,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    await logger.api('info', 'Performance metrics requested', {
      endpoint: '/performance/metrics',
      userId: c.get('user')?.id
    });

    return c.json(response);
  } catch (error) {
    await logger.error('Failed to get performance metrics', {
      error: error.message,
      endpoint: '/performance/metrics'
    });

    return c.json({
      error: 'Failed to retrieve performance metrics',
      message: error.message
    }, 500);
  }
});

/**
 * Get health check status
 */
app.get('/health', async (c) => {
  try {
    const stats = apmMonitor.getStatistics();
    const memoryStats = memoryMonitor.getStatistics();

    // Determine overall health status
    const healthChecks = {
      memory: memoryStats.current.percentage < 90,
      responseTime: stats.responseTime.p95 < 2000,
      errorRate: stats.errorRate.percentage < 10,
      uptime: process.uptime() > 60, // Running for at least 1 minute
      eventLoop: stats.system.eventLoopDelay < 100
    };

    const isHealthy = Object.values(healthChecks).every(check => check);
    const healthScore = Object.values(healthChecks).filter(check => check).length / Object.keys(healthChecks).length;

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      score: Math.round(healthScore * 100),
      checks: healthChecks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    // Return appropriate status code
    const statusCode = isHealthy ? 200 : 503;

    return c.json(response, statusCode);
  } catch (error) {
    await logger.error('Health check failed', {
      error: error.message,
      endpoint: '/performance/health'
    });

    return c.json({
      status: 'error',
      score: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * Get detailed response time metrics
 */
app.get('/response-times', auth, zValidator('query', timeRangeSchema), async (c) => {
  try {
    const { hours } = c.req.valid('query');
    const stats = apmMonitor.getStatistics();

    // Get detailed response time data
    const response = {
      summary: stats.responseTime,
      endpoints: await getTopSlowEndpoints(hours),
      distribution: await getResponseTimeDistribution(hours),
      trends: await getResponseTimeTrends(hours),
      timeRange: {
        hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    await logger.api('info', 'Response time metrics requested', {
      endpoint: '/performance/response-times',
      timeRange: hours,
      userId: c.get('user')?.id
    });

    return c.json(response);
  } catch (error) {
    await logger.error('Failed to get response time metrics', {
      error: error.message,
      endpoint: '/performance/response-times'
    });

    return c.json({ 
      error: 'Failed to retrieve response time metrics',
      message: error.message 
    }, 500);
  }
});

/**
 * Get error rate metrics
 */
app.get('/errors', auth, zValidator('query', timeRangeSchema), async (c) => {
  try {
    const { hours } = c.req.valid('query');
    const stats = apmMonitor.getStatistics();

    const response = {
      summary: stats.errorRate,
      byEndpoint: stats.errorRate.errorsByEndpoint,
      byType: stats.errorRate.errorsByType,
      trends: await getErrorRateTrends(hours),
      recentErrors: await getRecentErrors(50),
      timeRange: {
        hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    await logger.api('info', 'Error metrics requested', {
      endpoint: '/performance/errors',
      timeRange: hours,
      userId: c.get('user')?.id
    });

    return c.json(response);
  } catch (error) {
    await logger.error('Failed to get error metrics', {
      error: error.message,
      endpoint: '/performance/errors'
    });

    return c.json({ 
      error: 'Failed to retrieve error metrics',
      message: error.message 
    }, 500);
  }
});

/**
 * Get throughput metrics
 */
app.get('/throughput', auth, zValidator('query', timeRangeSchema), async (c) => {
  try {
    const { hours } = c.req.valid('query');
    const stats = apmMonitor.getStatistics();

    const response = {
      summary: stats.throughput,
      trends: await getThroughputTrends(hours),
      byEndpoint: await getThroughputByEndpoint(hours),
      peakTimes: await getPeakThroughputTimes(hours),
      timeRange: {
        hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    await logger.api('info', 'Throughput metrics requested', {
      endpoint: '/performance/throughput',
      timeRange: hours,
      userId: c.get('user')?.id
    });

    return c.json(response);
  } catch (error) {
    await logger.error('Failed to get throughput metrics', {
      error: error.message,
      endpoint: '/performance/throughput'
    });

    return c.json({ 
      error: 'Failed to retrieve throughput metrics',
      message: error.message 
    }, 500);
  }
});

/**
 * Get database performance metrics
 */
app.get('/database', auth, zValidator('query', timeRangeSchema), async (c) => {
  try {
    const { hours } = c.req.valid('query');
    const stats = apmMonitor.getStatistics();

    const response = {
      summary: stats.database,
      slowQueries: stats.database.slowQueries,
      queryDistribution: await getQueryTypeDistribution(hours),
      trends: await getDatabasePerformanceTrends(hours),
      timeRange: {
        hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    await logger.api('info', 'Database metrics requested', {
      endpoint: '/performance/database',
      timeRange: hours,
      userId: c.get('user')?.id
    });

    return c.json(response);
  } catch (error) {
    await logger.error('Failed to get database metrics', {
      error: error.message,
      endpoint: '/performance/database'
    });

    return c.json({ 
      error: 'Failed to retrieve database metrics',
      message: error.message 
    }, 500);
  }
});

/**
 * Get system resource metrics
 */
app.get('/system', auth, zValidator('query', timeRangeSchema), async (c) => {
  try {
    const { hours } = c.req.valid('query');
    const stats = apmMonitor.getStatistics();
    const memoryStats = memoryMonitor.getStatistics();

    const response = {
      current: {
        cpu: stats.system.cpuUsage,
        memory: stats.system.memoryUsage,
        eventLoop: stats.system.eventLoopDelay,
        uptime: stats.system.uptime,
        connections: stats.websocket.activeConnections
      },
      memory: {
        current: memoryStats.current,
        trend: memoryStats.trend,
        peak: memoryStats.peak,
        average: memoryStats.average,
        thresholds: memoryStats.thresholds
      },
      trends: await getSystemResourceTrends(hours),
      alerts: await getResourceAlerts(hours),
      timeRange: {
        hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    await logger.api('info', 'System metrics requested', {
      endpoint: '/performance/system',
      timeRange: hours,
      userId: c.get('user')?.id
    });

    return c.json(response);
  } catch (error) {
    await logger.error('Failed to get system metrics', {
      error: error.message,
      endpoint: '/performance/system'
    });

    return c.json({ 
      error: 'Failed to retrieve system metrics',
      message: error.message 
    }, 500);
  }
});

/**
 * Force memory cleanup (admin only)
 */
app.post('/cleanup', auth, async (c) => {
  try {
    // Check if user has admin permissions
    const user = c.get('user');
    if (user?.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    await memoryMonitor.forceCleanup();
    
    // Get updated stats
    const memoryStats = memoryMonitor.getStatistics();

    await logger.performance('info', 'Manual memory cleanup triggered', {
      userId: user.id,
      beforeCleanup: memoryStats.current
    });

    return c.json({
      message: 'Memory cleanup completed',
      memoryStats: memoryStats.current,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await logger.error('Failed to perform memory cleanup', {
      error: error.message,
      endpoint: '/performance/cleanup'
    });

    return c.json({ 
      error: 'Failed to perform memory cleanup',
      message: error.message 
    }, 500);
  }
});

/**
 * Get performance dashboard data (comprehensive overview)
 */
app.get('/dashboard', auth, async (c) => {
  try {
    const stats = apmMonitor.getStatistics();
    const memoryStats = memoryMonitor.getStatistics();

    const dashboard = {
      overview: {
        status: getOverallHealthStatus(stats, memoryStats),
        uptime: process.uptime(),
        requestsPerMinute: stats.throughput.requestsPerMinute,
        averageResponseTime: stats.responseTime.average,
        errorRate: stats.errorRate.percentage,
        memoryUsage: memoryStats.current.percentage
      },
      alerts: await getRecentAlerts(10),
      topSlowEndpoints: await getTopSlowEndpoints(1),
      recentErrors: await getRecentErrors(5),
      systemHealth: {
        cpu: stats.system.cpuUsage,
        memory: stats.system.memoryUsage,
        eventLoop: stats.system.eventLoopDelay,
        connections: stats.websocket.activeConnections
      },
      timestamp: new Date().toISOString()
    };

    await logger.api('info', 'Performance dashboard requested', {
      endpoint: '/performance/dashboard',
      userId: c.get('user')?.id
    });

    return c.json(dashboard);

  } catch (error) {
    await logger.error('Failed to get performance dashboard', {
      error: error.message,
      endpoint: '/performance/dashboard'
    });

    return c.json({ 
      error: 'Failed to retrieve performance dashboard',
      message: error.message 
    }, 500);
  }
});

// Helper functions (these would need to be implemented based on actual data storage)
async function getTopSlowEndpoints(hours: number) {
  // Implementation would access APM data and return top slow endpoints
  return [];
}

async function getResponseTimeDistribution(hours: number) {
  // Implementation would return response time distribution data
  return {};
}

async function getResponseTimeTrends(hours: number) {
  // Implementation would return response time trends
  return [];
}

async function getErrorRateTrends(hours: number) {
  // Implementation would return error rate trends
  return [];
}

async function getRecentErrors(limit: number) {
  // Implementation would return recent errors
  return [];
}

async function getThroughputTrends(hours: number) {
  // Implementation would return throughput trends
  return [];
}

async function getThroughputByEndpoint(hours: number) {
  // Implementation would return throughput by endpoint
  return {};
}

async function getPeakThroughputTimes(hours: number) {
  // Implementation would return peak throughput times
  return [];
}

async function getQueryTypeDistribution(hours: number) {
  // Implementation would return query type distribution
  return {};
}

async function getDatabasePerformanceTrends(hours: number) {
  // Implementation would return database performance trends
  return [];
}

async function getSystemResourceTrends(hours: number) {
  // Implementation would return system resource trends
  return [];
}

async function getResourceAlerts(hours: number) {
  // Implementation would return resource alerts
  return [];
}

async function getRecentAlerts(limit: number) {
  // Implementation would return recent alerts
  return [];
}

function getOverallHealthStatus(stats: APMStatistics, memoryStats: any): 'healthy' | 'warning' | 'critical' {
  const checks = [
    stats.responseTime.p95 < 2000,
    stats.errorRate.percentage < 10,
    memoryStats.current.percentage < 90,
    stats.system.eventLoopDelay < 100
  ];

  const healthyChecks = checks.filter(check => check).length;
  const percentage = healthyChecks / checks.length;

  if (percentage >= 0.8) return 'healthy';
  if (percentage >= 0.6) return 'warning';
  return 'critical';
}

export default app;

