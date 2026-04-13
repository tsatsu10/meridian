// Database Monitoring Dashboard
// Real-time metrics and alerts for Neon PostgreSQL

import { Client, Pool } from 'pg';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

interface DatabaseMetrics {
  timestamp: string;
  connections: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    maxConnections: number;
    poolUtilization: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    queriesPerSecond: number;
    cacheHitRatio: number;
    indexHitRatio: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastCheck: string;
    responseTime: number;
  };
  storage: {
    databaseSize: number;
    tableCount: number;
    indexCount: number;
    deadTuples: number;
  };
}

interface AlertConfig {
  enabled: boolean;
  thresholds: {
    connectionUtilization: number;    // 80%
    avgQueryTime: number;            // 1000ms
    cacheHitRatio: number;          // 90%
    responseTime: number;           // 500ms
    slowQueryCount: number;         // 10 queries
  };
  recipients: string[];
  webhookUrl?: string;
}

export class DatabaseMonitoringDashboard extends EventEmitter {
  private pool: Pool;
  private metrics: DatabaseMetrics[] = [];
  private alertConfig: AlertConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly maxMetricsHistory = 1000; // Keep last 1000 metrics points

  constructor(connectionString: string, alertConfig: Partial<AlertConfig> = {}) {
    super();

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: true },
      max: 5, // Dedicated monitoring connections
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.alertConfig = {
      enabled: true,
      thresholds: {
        connectionUtilization: 80,
        avgQueryTime: 1000,
        cacheHitRatio: 90,
        responseTime: 500,
        slowQueryCount: 10,
      },
      recipients: [],
      ...alertConfig,
    };
  }

  async collectMetrics(): Promise<DatabaseMetrics> {
    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      const [connectionStats, performanceStats, storageStats] = await Promise.all([
        this.getConnectionMetrics(client),
        this.getPerformanceMetrics(client),
        this.getStorageMetrics(client),
      ]);

      const responseTime = Date.now() - startTime;
      const health = this.assessHealth(connectionStats, performanceStats, responseTime);

      const metrics: DatabaseMetrics = {
        timestamp: new Date().toISOString(),
        connections: connectionStats,
        performance: performanceStats,
        health,
        storage: storageStats,
      };

      this.storeMetrics(metrics);
      this.checkAlerts(metrics);

      return metrics;

    } finally {
      client.release();
    }
  }

  private async getConnectionMetrics(client: Client) {
    const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM pg_stat_activity) as total_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL) as waiting_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
    `);

    const row = result.rows[0];
    const poolUtilization = (row.total_connections / row.max_connections) * 100;

    return {
      total: parseInt(row.total_connections),
      active: parseInt(row.active_connections),
      idle: parseInt(row.idle_connections),
      waiting: parseInt(row.waiting_connections),
      maxConnections: parseInt(row.max_connections),
      poolUtilization: Math.round(poolUtilization * 100) / 100,
    };
  }

  private async getPerformanceMetrics(client: Client) {
    // Check if pg_stat_statements is available
    const hasStatsExtension = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      ) as has_extension
    `);

    if (hasStatsExtension.rows[0].has_extension) {
      return this.getAdvancedPerformanceMetrics(client);
    } else {
      return this.getBasicPerformanceMetrics(client);
    }
  }

  private async getAdvancedPerformanceMetrics(client: Client) {
    const [queryStatsResult, cacheStatsResult] = await Promise.all([
      client.query(`
        SELECT 
          ROUND(AVG(mean_exec_time)::numeric, 2) as avg_query_time,
          COUNT(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries,
          SUM(calls) as total_queries
        FROM pg_stat_statements
        WHERE calls > 0
      `),
      client.query(`
        SELECT 
          ROUND((blks_hit::numeric / NULLIF(blks_hit + blks_read, 0) * 100), 2) as cache_hit_ratio,
          ROUND((idx_blks_hit::numeric / NULLIF(idx_blks_hit + idx_blks_read, 0) * 100), 2) as index_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `),
    ]);

    const queryStats = queryStatsResult.rows[0];
    const cacheStats = cacheStatsResult.rows[0];

    return {
      avgQueryTime: parseFloat(queryStats.avg_query_time) || 0,
      slowQueries: parseInt(queryStats.slow_queries) || 0,
      queriesPerSecond: 0, // Would need time-based calculation
      cacheHitRatio: parseFloat(cacheStats.cache_hit_ratio) || 0,
      indexHitRatio: parseFloat(cacheStats.index_hit_ratio) || 0,
    };
  }

  private async getBasicPerformanceMetrics(client: Client) {
    const result = await client.query(`
      SELECT 
        ROUND((blks_hit::numeric / NULLIF(blks_hit + blks_read, 0) * 100), 2) as cache_hit_ratio,
        tup_returned + tup_fetched as total_tuples
      FROM pg_stat_database
      WHERE datname = current_database()
    `);

    const row = result.rows[0];

    return {
      avgQueryTime: 0,
      slowQueries: 0,
      queriesPerSecond: 0,
      cacheHitRatio: parseFloat(row.cache_hit_ratio) || 0,
      indexHitRatio: 0,
    };
  }

  private async getStorageMetrics(client: Client) {
    const result = await client.query(`
      SELECT 
        pg_database_size(current_database()) as database_size,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as index_count,
        COALESCE((SELECT SUM(n_dead_tup) FROM pg_stat_user_tables), 0) as dead_tuples
    `);

    const row = result.rows[0];

    return {
      databaseSize: parseInt(row.database_size),
      tableCount: parseInt(row.table_count),
      indexCount: parseInt(row.index_count),
      deadTuples: parseInt(row.dead_tuples),
    };
  }

  private assessHealth(
    connections: any,
    performance: any,
    responseTime: number
  ): DatabaseMetrics['health'] {
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check critical conditions
    if (
      connections.poolUtilization > 95 ||
      responseTime > 2000 ||
      performance.avgQueryTime > 5000
    ) {
      status = 'critical';
    }
    // Check warning conditions
    else if (
      connections.poolUtilization > 80 ||
      responseTime > 500 ||
      performance.avgQueryTime > 1000 ||
      performance.cacheHitRatio < 90
    ) {
      status = 'warning';
    }

    return {
      status,
      uptime: process.uptime(),
      lastCheck: new Date().toISOString(),
      responseTime,
    };
  }

  private storeMetrics(metrics: DatabaseMetrics) {
    this.metrics.push(metrics);

    // Keep only the last N metrics to prevent memory issues
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Emit metrics event for real-time subscribers
    this.emit('metrics', metrics);
  }

  private checkAlerts(metrics: DatabaseMetrics) {
    if (!this.alertConfig.enabled) return;

    const alerts = [];

    // Connection utilization alert
    if (metrics.connections.poolUtilization > this.alertConfig.thresholds.connectionUtilization) {
      alerts.push({
        type: 'connection_utilization',
        severity: metrics.connections.poolUtilization > 95 ? 'critical' : 'warning',
        message: `Connection pool utilization: ${metrics.connections.poolUtilization}%`,
        value: metrics.connections.poolUtilization,
        threshold: this.alertConfig.thresholds.connectionUtilization,
      });
    }

    // Query performance alert
    if (metrics.performance.avgQueryTime > this.alertConfig.thresholds.avgQueryTime) {
      alerts.push({
        type: 'slow_queries',
        severity: metrics.performance.avgQueryTime > 2000 ? 'critical' : 'warning',
        message: `Average query time: ${metrics.performance.avgQueryTime}ms`,
        value: metrics.performance.avgQueryTime,
        threshold: this.alertConfig.thresholds.avgQueryTime,
      });
    }

    // Cache hit ratio alert
    if (metrics.performance.cacheHitRatio < this.alertConfig.thresholds.cacheHitRatio) {
      alerts.push({
        type: 'cache_performance',
        severity: metrics.performance.cacheHitRatio < 80 ? 'critical' : 'warning',
        message: `Cache hit ratio: ${metrics.performance.cacheHitRatio}%`,
        value: metrics.performance.cacheHitRatio,
        threshold: this.alertConfig.thresholds.cacheHitRatio,
      });
    }

    // Response time alert
    if (metrics.health.responseTime > this.alertConfig.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: metrics.health.responseTime > 1000 ? 'critical' : 'warning',
        message: `Database response time: ${metrics.health.responseTime}ms`,
        value: metrics.health.responseTime,
        threshold: this.alertConfig.thresholds.responseTime,
      });
    }

    if (alerts.length > 0) {
      this.emit('alerts', alerts);
      this.sendAlerts(alerts);
    }
  }

  private async sendAlerts(alerts: any[]) {
    for (const alert of alerts) {
      logger.warn(`🚨 DATABASE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
      
      // If webhook URL is configured, send alert
      if (this.alertConfig.webhookUrl) {
        try {
          const response = await fetch(this.alertConfig.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              alert,
              timestamp: new Date().toISOString(),
              service: 'meridian-database',
            }),
          });

          if (!response.ok) {
            logger.error('Failed to send alert webhook:', response.statusText);
          }
        } catch (error) {
          logger.error('Error sending alert webhook:', error);
        }
      }
    }
  }

  // Public methods for dashboard API
  getLatestMetrics(): DatabaseMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(minutes: number = 60): DatabaseMetrics[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(m => new Date(m.timestamp) > cutoffTime);
  }

  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const latest = this.getLatestMetrics();
    return latest?.health.status || 'warning';
  }

  async getSlowQueries(limit: number = 10) {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          query,
          calls,
          ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
          ROUND(total_exec_time::numeric, 2) as total_time_ms
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      // If pg_stat_statements not available, return empty array
      return [];
    } finally {
      client.release();
    }
  }

  async getTableStats() {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          CASE WHEN n_live_tup > 0 
            THEN ROUND((n_dead_tup::numeric / n_live_tup * 100), 2) 
            ELSE 0 
          END as bloat_percentage,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 20
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Start/stop monitoring
  startMonitoring(intervalMs: number = 30000) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Error collecting database metrics:', error);
        this.emit('error', error);
      }
    }, intervalMs);

    logger.info("📊 Database monitoring started (interval: ${intervalMs}ms)");
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    logger.info("📊 Database monitoring stopped");
  }

  async close() {
    this.stopMonitoring();
    await this.pool.end();
  }
}

// Express.js middleware for dashboard API
export function createDashboardAPI(dashboard: DatabaseMonitoringDashboard) {
  const router = require('express').Router();

  // Current metrics endpoint
  router.get('/metrics', (req: any, res: any) => {
    const metrics = dashboard.getLatestMetrics();
    res.json(metrics || { error: 'No metrics available' });
  });

  // Historical metrics endpoint
  router.get('/metrics/history', (req: any, res: any) => {
    const minutes = parseInt(req.query.minutes) || 60;
    const history = dashboard.getMetricsHistory(minutes);
    res.json(history);
  });

  // Health check endpoint
  router.get('/health', (req: any, res: any) => {
    const status = dashboard.getHealthStatus();
    const statusCode = status === 'healthy' ? 200 : status === 'warning' ? 206 : 503;
    
    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Slow queries endpoint
  router.get('/slow-queries', async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const slowQueries = await dashboard.getSlowQueries(limit);
      res.json(slowQueries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch slow queries' });
    }
  });

  // Table statistics endpoint
  router.get('/table-stats', async (req: any, res: any) => {
    try {
      const tableStats = await dashboard.getTableStats();
      res.json(tableStats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch table statistics' });
    }
  });

  return router;
}

// Export singleton instance
let dashboardInstance: DatabaseMonitoringDashboard | null = null;

export function createDatabaseDashboard(connectionString: string, alertConfig?: Partial<AlertConfig>) {
  if (!dashboardInstance) {
    dashboardInstance = new DatabaseMonitoringDashboard(connectionString, alertConfig);
  }
  return dashboardInstance;
}

export function getDatabaseDashboard() {
  if (!dashboardInstance) {
    throw new Error('Database dashboard not initialized. Call createDatabaseDashboard first.');
  }
  return dashboardInstance;
}

