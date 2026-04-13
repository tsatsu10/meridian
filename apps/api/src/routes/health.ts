/**
 * Health Check API Routes
 * Endpoints for monitoring and health checks
 * Phase 1 - Monitoring & Observability
 */

import { Hono } from 'hono';
import { 
  getHealthStatus, 
  getLivenessProbe, 
  getReadinessProbe,
  getSystemInfo 
} from '../services/monitoring/health-check';
import { Logger } from '../services/logging/logger';

const health = new Hono();

/**
 * GET /api/health
 * Comprehensive health check
 */
health.get('/', async (c) => {
  try {
    const status = await getHealthStatus();

    const httpStatus = status.status === 'healthy' ? 200 : 
                       status.status === 'degraded' ? 200 : 503;

    return c.json(status, httpStatus);
  } catch (error: any) {
    Logger.error('Health check failed', error);
    
    return c.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        message: error.message,
      },
      503
    );
  }
});

/**
 * GET /api/health/live
 * Liveness probe (Kubernetes compatible)
 */
health.get('/live', (c) => {
  const probe = getLivenessProbe();
  return c.json(probe, probe.alive ? 200 : 503);
});

/**
 * GET /api/health/ready
 * Readiness probe (Kubernetes compatible)
 */
health.get('/ready', async (c) => {
  try {
    const probe = await getReadinessProbe();
    return c.json(probe, probe.ready ? 200 : 503);
  } catch (error: any) {
    Logger.error('Readiness probe failed', error);
    
    return c.json(
      {
        ready: false,
        error: error.message,
      },
      503
    );
  }
});

/**
 * GET /api/health/info
 * System information
 */
health.get('/info', (c) => {
  try {
    const info = getSystemInfo();
    return c.json(info);
  } catch (error: any) {
    Logger.error('System info failed', error);
    
    return c.json(
      {
        error: 'Failed to get system info',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/health/metrics
 * Basic metrics (Prometheus compatible format)
 */
health.get('/metrics', (c) => {
  try {
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    // Prometheus format
    const metrics = `
# HELP nodejs_heap_size_total_bytes Total heap size
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memory.heapTotal}

# HELP nodejs_heap_size_used_bytes Used heap size
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${memory.heapUsed}

# HELP nodejs_external_memory_bytes External memory
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes ${memory.external}

# HELP process_resident_memory_bytes Resident memory
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${memory.rss}

# HELP process_uptime_seconds Process uptime
# TYPE process_uptime_seconds counter
process_uptime_seconds ${uptime}
`.trim();

    return c.text(metrics);
  } catch (error: any) {
    Logger.error('Metrics endpoint failed', error);
    return c.text('# Failed to generate metrics', 500);
  }
});

/**
 * GET /api/health/version
 * Version information
 */
health.get('/version', (c) => {
  return c.json({
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
  });
});

export default health;


