/**
 * Health Check Service
 * System health monitoring
 * Phase 1 - Monitoring & Observability
 */

import { sql } from 'drizzle-orm';
import { getDatabase } from '../../database/connection';
import { Logger } from '../logging/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    disk?: CheckResult;
    redis?: CheckResult;
    search?: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const db = getDatabase();
    await db.execute(sql`SELECT 1`);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 100 ? 'pass' : 'warn',
      message: responseTime < 100 ? 'Database connection healthy' : 'Database responding slowly',
      responseTime,
    };
  } catch (error: any) {
    Logger.error('Database health check failed', error);
    
    return {
      status: 'fail',
      message: 'Database connection failed',
      responseTime: Date.now() - startTime,
      details: { error: error.message },
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  const usage = process.memoryUsage();
  const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
  
  // Warn if heap usage > 80%
  const status = heapUsedPercent > 90 ? 'fail' : heapUsedPercent > 80 ? 'warn' : 'pass';
  
  return {
    status,
    message: `Heap usage: ${heapUsedPercent.toFixed(1)}%`,
    details: {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
    },
  };
}

/**
 * Check disk space (Linux/Mac only)
 */
async function checkDisk(): Promise<CheckResult | undefined> {
  try {
    const { execSync } = await import('child_process');
    const output = execSync('df -h / | tail -1').toString();
    const parts = output.split(/\s+/);
    const usagePercent = parseInt(parts[4].replace('%', ''));
    
    const status = usagePercent > 90 ? 'fail' : usagePercent > 80 ? 'warn' : 'pass';
    
    return {
      status,
      message: `Disk usage: ${usagePercent}%`,
      details: {
        used: parts[2],
        available: parts[3],
        total: parts[1],
      },
    };
  } catch (error) {
    // Disk check not available on this platform
    return undefined;
  }
}

/**
 * Check Redis (if configured)
 */
async function checkRedis(): Promise<CheckResult | undefined> {
  // TODO: Implement when Redis is added in Phase 1.3
  return undefined;
}

/**
 * Check search service (MeiliSearch)
 */
async function checkSearch(): Promise<CheckResult | undefined> {
  const startTime = Date.now();
  
  try {
    const searchHost = process.env.MEILISEARCH_HOST;
    if (!searchHost) {
      return undefined;
    }

    const response = await fetch(`${searchHost}/health`);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        status: 'pass',
        message: 'Search service healthy',
        responseTime,
      };
    } else {
      return {
        status: 'fail',
        message: 'Search service unhealthy',
        responseTime,
      };
    }
  } catch (error: any) {
    return {
      status: 'fail',
      message: 'Search service unavailable',
      details: { error: error.message },
    };
  }
}

/**
 * Get overall health status
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const checks = {
    database: await checkDatabase(),
    memory: checkMemory(),
    disk: await checkDisk(),
    redis: await checkRedis(),
    search: await checkSearch(),
  };

  // Determine overall status
  const hasFailure = Object.values(checks).some(
    check => check && check.status === 'fail'
  );
  const hasWarning = Object.values(checks).some(
    check => check && check.status === 'warn'
  );

  const status = hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };
}

/**
 * Get liveness probe
 * Quick check to see if service is alive
 */
export function getLivenessProbe(): { alive: boolean } {
  return { alive: true };
}

/**
 * Get readiness probe
 * Check if service is ready to accept traffic
 */
export async function getReadinessProbe(): Promise<{ ready: boolean; message?: string }> {
  try {
    // Check database connectivity
    const dbCheck = await checkDatabase();
    
    if (dbCheck.status === 'fail') {
      return {
        ready: false,
        message: 'Database not available',
      };
    }

    // Check memory
    const memCheck = checkMemory();
    
    if (memCheck.status === 'fail') {
      return {
        ready: false,
        message: 'Memory exhausted',
      };
    }

    return { ready: true };
  } catch (error: any) {
    Logger.error('Readiness probe failed', error);
    
    return {
      ready: false,
      message: error.message,
    };
  }
}

/**
 * Get system info
 */
export function getSystemInfo() {
  return {
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    env: process.env.NODE_ENV || 'development',
  };
}

/**
 * Monitor health continuously
 */
export function startHealthMonitoring(intervalMs: number = 60000) {
  Logger.info('🏥 Starting health monitoring', { interval: intervalMs });

  setInterval(async () => {
    const health = await getHealthStatus();
    
    if (health.status !== 'healthy') {
      Logger.warn('Health check warning', {
        status: health.status,
        checks: health.checks,
      });
    }
  }, intervalMs);
}



