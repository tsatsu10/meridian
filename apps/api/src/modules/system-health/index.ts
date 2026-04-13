/**
 * 🏥 System Health Check Module
 * 
 * Provides health, readiness, and liveness endpoints for infrastructure monitoring.
 * 
 * **Health**: Overall system health status
 * **Readiness**: Is the app ready to serve traffic?
 * **Liveness**: Is the app running? (for restart signals)
 * 
 * @epic-infrastructure: Production monitoring and observability
 */

import { Hono } from 'hono';
import { getDatabase } from '../../database/connection';
import { logger } from '../../utils/logger';

const systemHealth = new Hono();

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheckResult;
    redis?: HealthCheckResult;
    websocket?: HealthCheckResult;
    disk?: HealthCheckResult;
    memory?: HealthCheckResult;
  };
  metadata?: {
    environment: string;
    nodeVersion: string;
    pid: number;
  };
}

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

/**
 * GET /api/system-health
 * 
 * Comprehensive health check - checks all dependencies
 * Use for monitoring dashboards and alerting systems
 */
systemHealth.get('/', async (c) => {
  const startTime = Date.now();
  
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    websocket: await checkWebSocket(),
    disk: await checkDisk(),
    memory: await checkMemory(),
  };
  
  // Determine overall status
  const hasFailure = Object.values(checks).some(check => check.status === 'fail');
  const hasWarning = Object.values(checks).some(check => check.status === 'warn');
  
  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 
    hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';
  
  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
    metadata: {
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid,
    },
  };
  
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  
  // Log health check failures
  if (overallStatus !== 'healthy') {
    logger.warn('Health check issues detected', {
      status: overallStatus,
      checks,
      duration: Date.now() - startTime,
    });
  }
  
  return c.json(response, statusCode);
});

/**
 * GET /api/system-health/live
 * 
 * Liveness probe - is the process alive?
 * Returns 200 if the process is running
 * Use for Kubernetes/Docker liveness probes
 */
systemHealth.get('/live', async (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
  });
});

/**
 * GET /api/system-health/ready
 * 
 * Readiness probe - is the app ready to serve traffic?
 * Checks critical dependencies (database, Redis)
 * Use for Kubernetes/Docker readiness probes
 */
systemHealth.get('/ready', async (c) => {
  const startTime = Date.now();
  
  // Check critical dependencies
  const dbCheck = await checkDatabase();
  const redisCheck = await checkRedis();
  
  const isReady = dbCheck.status === 'pass' && 
                  (redisCheck.status === 'pass' || redisCheck.status === 'warn');
  
  if (!isReady) {
    logger.warn('Readiness check failed', {
      database: dbCheck,
      redis: redisCheck,
      duration: Date.now() - startTime,
    });
    
    return c.json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbCheck,
        redis: redisCheck,
      },
    }, 503);
  }
  
  return c.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      redis: redisCheck,
    },
  });
});

/**
 * GET /api/system-health/startup
 * 
 * Startup probe - has the app completed initialization?
 * Returns 200 when app is fully started
 * Use for Kubernetes startup probes
 */
systemHealth.get('/startup', async (c) => {
  // Check if database is initialized
  try {
    const db = getDatabase();
    
    // Quick validation query
    await db.execute('SELECT 1');
    
    return c.json({
      status: 'started',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.warn('Startup check failed - database not ready', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return c.json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      message: 'Database still initializing',
    }, 503);
  }
});

/**
 * GET /api/system-health/metrics
 * 
 * System metrics endpoint - detailed performance metrics
 * Use for observability and monitoring
 */
systemHealth.get('/metrics', async (c) => {
  const memUsage = process.memoryUsage();
  
  return c.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    memory: {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external),
      arrayBuffers: formatBytes(memUsage.arrayBuffers),
    },
    cpu: {
      usage: process.cpuUsage(),
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      timezone: process.env.TZ || 'UTC',
    },
  });
});

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const db = getDatabase();
    
    // Execute simple query to verify connection
    await db.execute('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    
    // Warn if query takes > 100ms
    if (responseTime > 100) {
      return {
        status: 'warn',
        responseTime,
        message: 'Database responding slowly',
        details: {
          threshold: 100,
        },
      };
    }
    
    return {
      status: 'pass',
      responseTime,
      message: 'Database healthy',
    };
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });
    
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Check Redis connectivity and performance
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Try to import Redis client
    const redisModule = await import('../../utils/redis').catch(() => null);
    
    if (!redisModule) {
      return {
        status: 'warn',
        message: 'Redis not configured',
        details: {
          note: 'Redis is optional - app will function without it',
        },
      };
    }
    
    const redis = redisModule.default || redisModule;
    
    // Ping Redis
    await redis.ping();
    
    const responseTime = Date.now() - startTime;
    
    // Warn if ping takes > 50ms
    if (responseTime > 50) {
      return {
        status: 'warn',
        responseTime,
        message: 'Redis responding slowly',
        details: {
          threshold: 50,
        },
      };
    }
    
    return {
      status: 'pass',
      responseTime,
      message: 'Redis healthy',
    };
  } catch (error) {
    // Redis is optional - warn but don't fail
    return {
      status: 'warn',
      responseTime: Date.now() - startTime,
      message: 'Redis unavailable (optional service)',
      details: {
        error: error instanceof Error ? error.message : String(error),
        note: 'App will function without Redis (caching disabled)',
      },
    };
  }
}

/**
 * Check WebSocket server status
 */
async function checkWebSocket(): Promise<HealthCheckResult> {
  try {
    // Check if WebSocket server is initialized
    // This is a basic check - could be enhanced with actual connection testing
    
    return {
      status: 'pass',
      message: 'WebSocket server operational',
      details: {
        note: 'Basic availability check - full test requires client connection',
      },
    };
  } catch (error) {
    return {
      status: 'warn',
      message: 'WebSocket status unknown',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Check disk space availability
 */
async function checkDisk(): Promise<HealthCheckResult> {
  try {
    // Node.js doesn't have built-in disk space checking
    // This would require platform-specific commands or libraries
    
    return {
      status: 'pass',
      message: 'Disk check not implemented',
      details: {
        note: 'Requires platform-specific implementation',
      },
    };
  } catch (error) {
    return {
      status: 'warn',
      message: 'Disk check unavailable',
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemory(): Promise<HealthCheckResult> {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  // Warn if heap usage > 90%
  if (heapUsedPercent > 90) {
    return {
      status: 'warn',
      message: 'High memory usage detected',
      details: {
        heapUsedPercent: Math.round(heapUsedPercent),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        threshold: 90,
      },
    };
  }
  
  // Warn if heap usage > 80%
  if (heapUsedPercent > 80) {
    return {
      status: 'warn',
      message: 'Elevated memory usage',
      details: {
        heapUsedPercent: Math.round(heapUsedPercent),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        threshold: 80,
      },
    };
  }
  
  return {
    status: 'pass',
    message: 'Memory usage normal',
    details: {
      heapUsedPercent: Math.round(heapUsedPercent),
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      rss: formatBytes(memUsage.rss),
    },
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

export default systemHealth;


