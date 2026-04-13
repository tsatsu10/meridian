/**
 * 📊 Prometheus-Compatible Metrics Endpoint
 * 
 * Exposes application metrics in Prometheus format for monitoring.
 * Compatible with Prometheus, Grafana, and other monitoring tools.
 * 
 * @epic-infrastructure: Production monitoring
 */

import { Hono } from 'hono';
import { getDatabase } from '../database/connection';
import { userTable, projectTable, taskTable, workspaceTable, sessionTable } from '../database/schema';
import { sql } from 'drizzle-orm';
import logger from '../utils/logger';

const metricsApp = new Hono();

// Track request counts
const requestCounts = new Map<string, number>();
const requestDurations = new Map<string, number[]>();
let serverStartTime = Date.now();

/**
 * Record HTTP request metrics
 */
export function recordRequest(path: string, duration: number) {
  // Increment request count
  const count = requestCounts.get(path) || 0;
  requestCounts.set(path, count + 1);

  // Record duration
  const durations = requestDurations.get(path) || [];
  durations.push(duration);
  
  // Keep only last 100 durations per path
  if (durations.length > 100) {
    durations.shift();
  }
  
  requestDurations.set(path, durations);
}

/**
 * GET /api/metrics - Prometheus-compatible metrics endpoint
 */
metricsApp.get('/', async (c) => {
  try {
    const db = getDatabase();
    const now = Date.now();
    const uptime = (now - serverStartTime) / 1000; // seconds

    // Gather database metrics
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(userTable);
    const [workspaceCount] = await db.select({ count: sql<number>`count(*)::int` }).from(workspaceTable);
    const [projectCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projectTable);
    const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(taskTable);
    const [activeSessionCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(sessionTable)
      .where(sql`expires_at > NOW()`);

    // Build Prometheus metrics
    const metrics: string[] = [];

    // Help text
    metrics.push('# HELP meridian_info Application information');
    metrics.push('# TYPE meridian_info gauge');
    metrics.push(`meridian_info{version="0.4.0",environment="${process.env.NODE_ENV}"} 1`);
    metrics.push('');

    // Uptime
    metrics.push('# HELP meridian_uptime_seconds Server uptime in seconds');
    metrics.push('# TYPE meridian_uptime_seconds counter');
    metrics.push(`meridian_uptime_seconds ${uptime.toFixed(2)}`);
    metrics.push('');

    // Database metrics
    metrics.push('# HELP meridian_users_total Total number of users');
    metrics.push('# TYPE meridian_users_total gauge');
    metrics.push(`meridian_users_total ${userCount.count}`);
    metrics.push('');

    metrics.push('# HELP meridian_workspaces_total Total number of workspaces');
    metrics.push('# TYPE meridian_workspaces_total gauge');
    metrics.push(`meridian_workspaces_total ${workspaceCount.count}`);
    metrics.push('');

    metrics.push('# HELP meridian_projects_total Total number of projects');
    metrics.push('# TYPE meridian_projects_total gauge');
    metrics.push(`meridian_projects_total ${projectCount.count}`);
    metrics.push('');

    metrics.push('# HELP meridian_tasks_total Total number of tasks');
    metrics.push('# TYPE meridian_tasks_total gauge');
    metrics.push(`meridian_tasks_total ${taskCount.count}`);
    metrics.push('');

    metrics.push('# HELP meridian_active_sessions Active user sessions');
    metrics.push('# TYPE meridian_active_sessions gauge');
    metrics.push(`meridian_active_sessions ${activeSessionCount.count}`);
    metrics.push('');

    // HTTP metrics
    metrics.push('# HELP meridian_http_requests_total Total HTTP requests');
    metrics.push('# TYPE meridian_http_requests_total counter');
    for (const [path, count] of requestCounts.entries()) {
      metrics.push(`meridian_http_requests_total{path="${path}"} ${count}`);
    }
    metrics.push('');

    // HTTP request durations
    metrics.push('# HELP meridian_http_request_duration_ms HTTP request duration in milliseconds');
    metrics.push('# TYPE meridian_http_request_duration_ms summary');
    for (const [path, durations] of requestDurations.entries()) {
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const sorted = [...durations].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        
        metrics.push(`meridian_http_request_duration_ms{path="${path}",quantile="0.5"} ${p50.toFixed(2)}`);
        metrics.push(`meridian_http_request_duration_ms{path="${path}",quantile="0.95"} ${p95.toFixed(2)}`);
        metrics.push(`meridian_http_request_duration_ms{path="${path}",quantile="0.99"} ${p99.toFixed(2)}`);
        metrics.push(`meridian_http_request_duration_ms{path="${path}",quantile="avg"} ${avg.toFixed(2)}`);
      }
    }
    metrics.push('');

    // Memory metrics
    const memUsage = process.memoryUsage();
    metrics.push('# HELP meridian_memory_usage_bytes Memory usage in bytes');
    metrics.push('# TYPE meridian_memory_usage_bytes gauge');
    metrics.push(`meridian_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
    metrics.push(`meridian_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}`);
    metrics.push(`meridian_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}`);
    metrics.push(`meridian_memory_usage_bytes{type="external"} ${memUsage.external}`);
    metrics.push('');

    // Process metrics
    metrics.push('# HELP meridian_process_cpu_seconds_total Total CPU time');
    metrics.push('# TYPE meridian_process_cpu_seconds_total counter');
    const cpuUsage = process.cpuUsage();
    metrics.push(`meridian_process_cpu_seconds_total{mode="user"} ${(cpuUsage.user / 1000000).toFixed(2)}`);
    metrics.push(`meridian_process_cpu_seconds_total{mode="system"} ${(cpuUsage.system / 1000000).toFixed(2)}`);
    metrics.push('');

    // Return metrics in Prometheus text format
    c.header('Content-Type', 'text/plain; version=0.0.4');
    return c.text(metrics.join('\n'));

  } catch (error) {
    logger.error('❌ Error generating metrics:', error);
    return c.json({ error: 'Failed to generate metrics' }, 500);
  }
});

/**
 * GET /api/metrics/health - Health check endpoint
 */
metricsApp.get('/health', async (c) => {
  try {
    const db = getDatabase();
    
    // Check database connection
    await db.select({ count: sql<number>`1` }).from(userTable).limit(1);
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - serverStartTime) / 1000,
      database: 'connected',
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    }, 503);
  }
});

/**
 * GET /api/metrics/stats - Human-readable statistics
 */
metricsApp.get('/stats', async (c) => {
  try {
    const db = getDatabase();

    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(userTable);
    const [workspaceCount] = await db.select({ count: sql<number>`count(*)::int` }).from(workspaceTable);
    const [projectCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projectTable);
    const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(taskTable);
    const [activeSessionCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(sessionTable)
      .where(sql`expires_at > NOW()`);

    const memUsage = process.memoryUsage();

    return c.json({
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: (Date.now() - serverStartTime) / 1000,
        formatted: formatUptime((Date.now() - serverStartTime) / 1000),
      },
      database: {
        users: userCount.count,
        workspaces: workspaceCount.count,
        projects: projectCount.count,
        tasks: taskCount.count,
        activeSessions: activeSessionCount.count,
      },
      http: {
        totalRequests: Array.from(requestCounts.values()).reduce((a, b) => a + b, 0),
        uniquePaths: requestCounts.size,
      },
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
      },
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

/**
 * Helper: Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export default metricsApp;

