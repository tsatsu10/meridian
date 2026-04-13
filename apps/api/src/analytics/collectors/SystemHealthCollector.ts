// @ts-nocheck
import { getDatabase } from "../../database/connection";
import { analyticsEvents } from '../../database/schema';
import { redis } from '../../lib/redis';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  databaseConnections: number;
  activeUsers: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
  lastUpdated: Date;
  workspaceId: string;
}

export interface HealthAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  workspaceId: string;
}

export class SystemHealthCollector {
  private static instance: SystemHealthCollector;
  private alerts: HealthAlert[] = [];
  private metrics: SystemHealthMetrics[] = [];
  private lastCpuUsage: number = 0;
  private lastCpuTime: number = 0;

  static getInstance(): SystemHealthCollector {
    if (!SystemHealthCollector.instance) {
      SystemHealthCollector.instance = new SystemHealthCollector();
    }
    return SystemHealthCollector.instance;
  }

  async collectSystemMetrics(workspaceId: string): Promise<SystemHealthMetrics> {
    const metrics: SystemHealthMetrics = {
      cpuUsage: await this.getCPUUsage(),
      memoryUsage: await this.getMemoryUsage(),
      diskUsage: await this.getDiskUsage(),
      networkLatency: await this.getNetworkLatency(),
      databaseConnections: await this.getDatabaseConnections(),
      activeUsers: await this.getActiveUsers(workspaceId),
      errorRate: await this.getErrorRate(workspaceId),
      responseTime: await this.getAverageResponseTime(workspaceId),
      uptime: await this.getSystemUptime(),
      lastUpdated: new Date(),
      workspaceId
    };

    this.metrics.push(metrics);
    await this.checkHealthAlerts(metrics);
    await this.cacheMetrics(metrics);

    return metrics;
  }

  private async getCPUUsage(): Promise<number> {
    try {
      const cpus = os.cpus();
      if (!cpus || cpus.length === 0) return 0;

      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;

      if (this.lastCpuTime > 0) {
        const idleDifference = idle - this.lastCpuUsage;
        const totalDifference = total - this.lastCpuTime;
        const percentageCPU = 100 - (100 * idleDifference / totalDifference);
        
        this.lastCpuUsage = idle;
        this.lastCpuTime = total;
        
        return Math.round(percentageCPU * 100) / 100;
      } else {
        this.lastCpuUsage = idle;
        this.lastCpuTime = total;
        return 0;
      }
    } catch (error) {
      logger.error('Error getting CPU usage:', error);
      return 0;
    }
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercentage = (usedMem / totalMem) * 100;
      
      return Math.round(usagePercentage * 100) / 100;
    } catch (error) {
      logger.error('Error getting memory usage:', error);
      return 0;
    }
  }

  private async getDiskUsage(): Promise<number> {
    try {
      // Get disk usage for the current working directory
      const currentPath = process.cwd();
      const stats = fs.statSync(currentPath);
      
      // For a more comprehensive disk check, we could use a library like 'diskusage'
      // For now, we'll use a simplified approach
      const totalSpace = 1024 * 1024 * 1024 * 100; // Assume 100GB total (simplified)
      const usedSpace = stats.size || 0;
      const usagePercentage = (usedSpace / totalSpace) * 100;
      
      return Math.round(usagePercentage * 100) / 100;
    } catch (error) {
      logger.error('Error getting disk usage:', error);
      return 0;
    }
  }

  private async getNetworkLatency(): Promise<number> {
    try {
      // Measure network latency by pinging a reliable host
      const startTime = Date.now();
      
      // Try to connect to a reliable external service
      const testUrl = 'https://httpbin.org/delay/0';
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      return Math.round(latency);
    } catch (error) {
      logger.error('Error measuring network latency:', error);
      return 1000; // Return high latency on error
    }
  }

  private async getDatabaseConnections(): Promise<number> {
    // Get actual database connection count
    try {
      const result = await db.execute(sql`SELECT count(*) as connections FROM pg_stat_activity`);
      return result[0]?.connections || 0;
    } catch (error) {
      logger.error('Error getting database connections:', error);
      return 0;
    }
  }

  private async getActiveUsers(workspaceId: string): Promise<number> {
    // Count active users in the last 15 minutes
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    try {
      const result = await db
        .select({
          activeUsers: sql<number>`COUNT(DISTINCT user_id)`
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.workspaceId, workspaceId),
            gte(analyticsEvents.timestamp, fifteenMinutesAgo),
            eq(analyticsEvents.eventType, 'user_activity')
          )
        );

      return result[0]?.activeUsers || 0;
    } catch (error) {
      logger.error('Error getting active users:', error);
      return 0;
    }
  }

  private async getErrorRate(workspaceId: string): Promise<number> {
    // Calculate error rate from recent events
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    try {
      const result = await db
        .select({
          totalEvents: sql<number>`COUNT(*)`,
          errorEvents: sql<number>`COUNT(CASE WHEN event_type = 'error' THEN 1 END)`
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.workspaceId, workspaceId),
            gte(analyticsEvents.timestamp, oneHourAgo)
          )
        );

      const data = result[0];
      if (data && data.totalEvents > 0) {
        return (data.errorEvents / data.totalEvents) * 100;
      }
      return 0;
    } catch (error) {
      logger.error('Error calculating error rate:', error);
      return 0;
    }
  }

  private async getAverageResponseTime(workspaceId: string): Promise<number> {
    // Calculate average response time from recent API calls
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    try {
      const result = await db
        .select({
          avgResponseTime: sql<number>`AVG(CAST(event_data->>'responseTime' AS FLOAT))`
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.workspaceId, workspaceId),
            gte(analyticsEvents.timestamp, oneHourAgo),
            eq(analyticsEvents.eventType, 'api_call')
          )
        );

      return result[0]?.avgResponseTime || 0;
    } catch (error) {
      logger.error('Error calculating average response time:', error);
      return 0;
    }
  }

  private async getSystemUptime(): Promise<number> {
    // Get system uptime in seconds
    const uptime = process.uptime();
    return Math.round(uptime);
  }

  private async checkHealthAlerts(metrics: SystemHealthMetrics): Promise<void> {
    const alerts: HealthAlert[] = [];

    // CPU usage alert
    if (metrics.cpuUsage > 80) {
      alerts.push({
        id: `cpu-${Date.now()}`,
        type: metrics.cpuUsage > 90 ? 'critical' : 'warning',
        message: `High CPU usage detected: ${metrics.cpuUsage}%`,
        metric: 'cpuUsage',
        value: metrics.cpuUsage,
        threshold: 80,
        timestamp: new Date(),
        resolved: false,
        workspaceId: metrics.workspaceId
      });
    }

    // Memory usage alert
    if (metrics.memoryUsage > 85) {
      alerts.push({
        id: `memory-${Date.now()}`,
        type: metrics.memoryUsage > 95 ? 'critical' : 'warning',
        message: `High memory usage detected: ${metrics.memoryUsage}%`,
        metric: 'memoryUsage',
        value: metrics.memoryUsage,
        threshold: 85,
        timestamp: new Date(),
        resolved: false,
        workspaceId: metrics.workspaceId
      });
    }

    // Disk usage alert
    if (metrics.diskUsage > 90) {
      alerts.push({
        id: `disk-${Date.now()}`,
        type: 'critical',
        message: `Critical disk usage detected: ${metrics.diskUsage}%`,
        metric: 'diskUsage',
        value: metrics.diskUsage,
        threshold: 90,
        timestamp: new Date(),
        resolved: false,
        workspaceId: metrics.workspaceId
      });
    }

    // Network latency alert
    if (metrics.networkLatency > 500) {
      alerts.push({
        id: `network-${Date.now()}`,
        type: metrics.networkLatency > 1000 ? 'critical' : 'warning',
        message: `High network latency detected: ${metrics.networkLatency}ms`,
        metric: 'networkLatency',
        value: metrics.networkLatency,
        threshold: 500,
        timestamp: new Date(),
        resolved: false,
        workspaceId: metrics.workspaceId
      });
    }

    // Database connections alert
    if (metrics.databaseConnections > 100) {
      alerts.push({
        id: `db-${Date.now()}`,
        type: 'warning',
        message: `High database connection count: ${metrics.databaseConnections}`,
        metric: 'databaseConnections',
        value: metrics.databaseConnections,
        threshold: 100,
        timestamp: new Date(),
        resolved: false,
        workspaceId: metrics.workspaceId
      });
    }

    // Error rate alert
    if (metrics.errorRate > 5) {
      alerts.push({
        id: `error-${Date.now()}`,
        type: metrics.errorRate > 10 ? 'critical' : 'warning',
        message: `High error rate detected: ${metrics.errorRate.toFixed(2)}%`,
        metric: 'errorRate',
        value: metrics.errorRate,
        threshold: 5,
        timestamp: new Date(),
        resolved: false,
        workspaceId: metrics.workspaceId
      });
    }

    // Response time alert
    if (metrics.responseTime > 2000) {
      alerts.push({
        id: `response-${Date.now()}`,
        type: metrics.responseTime > 5000 ? 'critical' : 'warning',
        message: `Slow response time detected: ${metrics.responseTime}ms`,
        metric: 'responseTime',
        value: metrics.responseTime,
        threshold: 2000,
        timestamp: new Date(),
        resolved: false,
        workspaceId: metrics.workspaceId
      });
    }

    this.alerts.push(...alerts);
    await this.cacheAlerts(metrics.workspaceId);
  }

  private async cacheMetrics(metrics: SystemHealthMetrics): Promise<void> {
    const cacheKey = `system-health-metrics:${metrics.workspaceId}`;
    await redis.setex(cacheKey, 300, JSON.stringify(metrics)); // Cache for 5 minutes
  }

  private async cacheAlerts(workspaceId: string): Promise<void> {
    const cacheKey = `system-health-alerts:${workspaceId}`;
    const workspaceAlerts = this.alerts.filter(alert => alert.workspaceId === workspaceId);
    await redis.setex(cacheKey, 300, JSON.stringify(workspaceAlerts)); // Cache for 5 minutes
  }

  async getCurrentMetrics(workspaceId: string): Promise<SystemHealthMetrics | null> {
    const cacheKey = `system-health-metrics:${workspaceId}`;
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async getActiveAlerts(workspaceId: string): Promise<HealthAlert[]> {
    const cacheKey = `system-health-alerts:${workspaceId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      const workspaceAlerts = JSON.parse(cached);
      this.alerts = this.alerts.filter(alert => alert.workspaceId !== workspaceId);
      this.alerts.push(...workspaceAlerts);
    }
    return this.alerts.filter(alert => !alert.resolved && alert.workspaceId === workspaceId);
  }

  async resolveAlert(alertId: string, workspaceId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId && a.workspaceId === workspaceId);
    if (alert) {
      alert.resolved = true;
      await this.cacheAlerts(workspaceId);
      return true;
    }
    return false;
  }

  async getMetricsHistory(workspaceId: string, hours: number = 24): Promise<SystemHealthMetrics[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return this.metrics.filter(metric => 
      metric.lastUpdated >= cutoffTime && metric.workspaceId === workspaceId
    );
  }

  async getSystemStatus(workspaceId: string): Promise<'healthy' | 'warning' | 'critical'> {
    const alerts = await this.getActiveAlerts(workspaceId);
    
    if (alerts.some(alert => alert.type === 'critical')) {
      return 'critical';
    }
    
    if (alerts.some(alert => alert.type === 'warning')) {
      return 'warning';
    }
    
    return 'healthy';
  }

  async startMonitoring(workspaceId: string, intervalMs: number = 60000): Promise<void> {
    // Start periodic monitoring for the specific workspace
    setInterval(async () => {
      await this.collectSystemMetrics(workspaceId);
    }, intervalMs);
  }

  async getSystemInfo(): Promise<any> {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      cpuCount: os.cpus().length,
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAverage: os.loadavg()
    };
  }

  async getProcessInfo(): Promise<any> {
    const usage = process.memoryUsage();
    return {
      pid: process.pid,
      memoryUsage: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external
      },
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    };
  }
}

export const systemHealthCollector = SystemHealthCollector.getInstance(); 

