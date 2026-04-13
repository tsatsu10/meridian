#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Neon PostgreSQL Production Optimization Script
 * 
 * This script helps optimize Meridian for production deployment with Neon PostgreSQL by:
 * 1. Configuring connection pooling and optimization
 * 2. Setting up database schemas and indexes
 * 3. Implementing performance monitoring
 * 4. Creating backup and maintenance strategies
 */

class NeonPostgreSQLOptimizer {
  constructor() {
    this.scriptsDir = __dirname;
    this.rootDir = path.join(this.scriptsDir, '..');
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  generateConnectionConfig() {
    this.log('Generating optimized connection configuration...', 'info');
    
    const connectionConfig = `// Neon PostgreSQL Connection Configuration
// Optimized for production workloads

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Production connection configuration
const connectionConfig = {
  // Connection pool settings - optimized for Neon
  connectionString: process.env.DATABASE_URL!,
  
  // Neon-specific optimizations
  ssl: {
    rejectUnauthorized: true, // Security: verify SSL certificates
  },
  
  // Connection pool configuration
  max: 50,        // Maximum connections for production
  min: 5,         // Minimum connections to keep alive  
  idle: 30000,    // 30 second idle timeout
  connect: 15000, // 15 second connection timeout
  query: 60000,   // 60 second query timeout
  
  // Connection retry logic
  retryAttempts: 5,
  retryDelay: 2000,
  exponentialBackoff: true,
  
  // Performance optimization
  prepared: true,           // Use prepared statements
  keepalive: true,         // Enable TCP keepalive
  keepaliveInitialDelayMillis: 10000,
  
  // Connection validation
  validateConnection: true,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  
  // Statement timeout for long-running queries
  statement_timeout: 60000, // 60 seconds
  
  // Application-specific settings
  application_name: 'meridian-production',
  search_path: 'public',
  timezone: 'UTC',
};

// Create connection pool
export const pool = new Pool(connectionConfig);

// Create Drizzle instance with optimized settings
export const db = drizzle(neon(process.env.DATABASE_URL!), {
  logger: process.env.NODE_ENV === 'development',
});

// Health check function
export async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    const result = await db.execute('SELECT 1 as health_check');
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      duration,
      timestamp: new Date().toISOString(),
      connection: result ? 'success' : 'failed'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Connection monitoring
export function monitorConnections() {
  const stats = {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
  };
  
  console.log('Database Pool Stats:', stats);
  
  // Alert if pool is nearly exhausted
  if (stats.waitingClients > 10) {
    console.warn('⚠️ High number of waiting database clients:', stats.waitingClients);
  }
  
  if (stats.totalConnections > 40) {
    console.warn('⚠️ High database connection usage:', stats.totalConnections);
  }
  
  return stats;
}

// Graceful shutdown
export async function closeDatabaseConnections() {
  try {
    await pool.end();
    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}`;

    const configPath = path.join(this.rootDir, 'src/database/neon-config.ts');
    fs.writeFileSync(configPath, connectionConfig);
    this.log('Connection configuration generated', 'success');
  }

  generateOptimizedSchema() {
    this.log('Generating optimized database schema...', 'info');
    
    const optimizedSchema = `-- Neon PostgreSQL Production Schema Optimizations
-- Optimized for performance, scalability, and data integrity

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Performance tuning settings (Neon-optimized)
SET shared_preload_libraries = 'pg_stat_statements';
SET track_activity_query_size = 2048;
SET log_min_duration_statement = 1000; -- Log slow queries (>1s)

-- Connection and memory settings
SET max_connections = 100;
SET shared_buffers = '256MB';
SET effective_cache_size = '1GB';
SET maintenance_work_mem = '64MB';
SET checkpoint_completion_target = 0.9;
SET wal_buffers = '16MB';
SET default_statistics_target = 100;

-- ===============================
-- OPTIMIZED INDEXES
-- ===============================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
  ON users (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_workspace_id 
  ON users (workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
  ON users (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
  ON users (id) WHERE active = true;

-- Workspaces table indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_created_at 
  ON workspaces (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_active 
  ON workspaces (id) WHERE active = true;

-- Projects table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_workspace_id 
  ON projects (workspace_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status 
  ON projects (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at 
  ON projects (workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_due_date 
  ON projects (due_date) WHERE due_date IS NOT NULL;

-- Tasks table indexes (high frequency queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_project_id 
  ON tasks (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_id 
  ON tasks (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status_priority 
  ON tasks (status, priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_date 
  ON tasks (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_at 
  ON tasks (project_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_updated_at 
  ON tasks (updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_full_text 
  ON tasks USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Messages table indexes (real-time queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_id_created 
  ON messages (channel_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_author_id 
  ON messages (author_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at 
  ON messages (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread_id 
  ON messages (thread_id) WHERE thread_id IS NOT NULL;

-- Channels table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channels_workspace_id 
  ON channels (workspace_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channels_type 
  ON channels (type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_channels_active 
  ON channels (id) WHERE active = true;

-- Notifications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_created 
  ON notifications (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread 
  ON notifications (user_id) WHERE read = false;

-- Activity table indexes (analytics queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_workspace_id_created 
  ON activity (workspace_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_id_created 
  ON activity (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_entity 
  ON activity (entity_type, entity_id);

-- Attachments table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachments_entity 
  ON attachments (entity_type, entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachments_created_at 
  ON attachments (created_at DESC);

-- ===============================
-- PARTITIONING STRATEGY
-- ===============================

-- Partition activity table by month for better performance
CREATE TABLE IF NOT EXISTS activity_y2025m01 PARTITION OF activity
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS activity_y2025m02 PARTITION OF activity
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Partition audit_log table by month
CREATE TABLE IF NOT EXISTS audit_log_y2025m01 PARTITION OF audit_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS audit_log_y2025m02 PARTITION OF audit_log
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- ===============================
-- MAINTENANCE PROCEDURES
-- ===============================

-- Auto-cleanup old activity records (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_activity()
RETURNS void AS $$
BEGIN
  DELETE FROM activity 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Log cleanup
  INSERT INTO audit_log (action, entity_type, details, created_at)
  VALUES ('cleanup', 'activity', 'Cleaned old activity records', NOW());
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup old audit logs (keep 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log 
  WHERE created_at < NOW() - INTERVAL '2 years'
    AND entity_type != 'security'; -- Keep security logs longer
END;
$$ LANGUAGE plpgsql;

-- Update statistics for better query planning
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE users;
  ANALYZE workspaces;
  ANALYZE projects;
  ANALYZE tasks;
  ANALYZE messages;
  ANALYZE channels;
  ANALYZE notifications;
  ANALYZE activity;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- PERFORMANCE MONITORING
-- ===============================

-- Create materialized view for dashboard analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
  workspace_id,
  COUNT(DISTINCT projects.id) as total_projects,
  COUNT(DISTINCT tasks.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN tasks.status = 'completed' THEN tasks.id END) as completed_tasks,
  COUNT(DISTINCT users.id) as active_users,
  AVG(CASE WHEN tasks.status = 'completed' 
    THEN EXTRACT(EPOCH FROM (tasks.updated_at - tasks.created_at))/86400 
    END) as avg_completion_days
FROM workspaces
LEFT JOIN projects ON workspaces.id = projects.workspace_id
LEFT JOIN tasks ON projects.id = tasks.project_id  
LEFT JOIN users ON workspaces.id = users.workspace_id
WHERE workspaces.active = true
GROUP BY workspace_id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_workspace 
  ON dashboard_stats (workspace_id);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql;`;

    const schemaPath = path.join(this.rootDir, 'database/optimized-schema.sql');
    fs.writeFileSync(schemaPath, optimizedSchema);
    this.log('Optimized schema generated', 'success');
  }

  generatePerformanceMonitoring() {
    this.log('Generating performance monitoring utilities...', 'info');
    
    const monitoring = `// Neon PostgreSQL Performance Monitoring
// Real-time database performance tracking and optimization

import { db } from './neon-config';

interface DatabaseMetrics {
  connectionStats: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
  performanceStats: {
    avgQueryTime: number;
    slowQueries: number;
    cacheHitRatio: number;
    indexUsage: number;
  };
  resourceUsage: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  };
}

export class DatabaseMonitor {
  private metricsHistory: DatabaseMetrics[] = [];
  private readonly maxHistoryLength = 100;

  async collectMetrics(): Promise<DatabaseMetrics> {
    try {
      const [connectionStats, performanceStats, resourceStats] = await Promise.all([
        this.getConnectionStats(),
        this.getPerformanceStats(),
        this.getResourceUsage(),
      ]);

      const metrics: DatabaseMetrics = {
        connectionStats,
        performanceStats,
        resourceUsage: resourceStats,
      };

      // Store metrics history
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistoryLength) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      console.error('Error collecting database metrics:', error);
      throw error;
    }
  }

  private async getConnectionStats() {
    const result = await db.execute(\`
      SELECT 
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
        (SELECT COUNT(*) FROM pg_stat_activity) as total_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
    \`);
    
    const stats = result[0];
    return {
      totalConnections: stats.total_connections,
      activeConnections: stats.active_connections,
      idleConnections: stats.idle_connections,
      waitingClients: Math.max(0, stats.total_connections - stats.max_connections + 10),
    };
  }

  private async getPerformanceStats() {
    const result = await db.execute(\`
      SELECT 
        ROUND(AVG(mean_exec_time)::numeric, 2) as avg_query_time,
        COUNT(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries,
        ROUND((blks_hit::numeric / (blks_hit + blks_read) * 100), 2) as cache_hit_ratio,
        COUNT(*) as total_queries
      FROM pg_stat_statements pss
      JOIN pg_stat_database psd ON psd.datname = current_database()
      WHERE pss.calls > 0
    \`);
    
    const stats = result[0];
    return {
      avgQueryTime: parseFloat(stats.avg_query_time) || 0,
      slowQueries: parseInt(stats.slow_queries) || 0,
      cacheHitRatio: parseFloat(stats.cache_hit_ratio) || 0,
      indexUsage: 85, // Placeholder - would need more complex query
    };
  }

  private async getResourceUsage() {
    // Neon provides limited resource metrics via pg_stat_database
    const result = await db.execute(\`
      SELECT 
        ROUND((blks_read::numeric / (blks_read + blks_hit) * 100), 2) as disk_read_ratio,
        ROUND((xact_commit::numeric / (xact_commit + xact_rollback) * 100), 2) as transaction_success_rate,
        tup_returned + tup_fetched as total_rows_accessed,
        conflicts as database_conflicts
      FROM pg_stat_database 
      WHERE datname = current_database()
    \`);
    
    const stats = result[0];
    return {
      cpuUsage: 0,  // Not available in Neon
      memoryUsage: 0, // Not available in Neon  
      diskUsage: parseFloat(stats.disk_read_ratio) || 0,
      networkIO: parseInt(stats.total_rows_accessed) || 0,
    };
  }

  async getSlowQueries(limit = 10) {
    const result = await db.execute(\`
      SELECT 
        query,
        calls,
        ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
        ROUND(total_exec_time::numeric, 2) as total_time_ms,
        ROUND((100.0 * total_exec_time / sum(total_exec_time) OVER()), 2) as percentage
      FROM pg_stat_statements 
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT $1
    \`, [limit]);
    
    return result;
  }

  async getTableStats() {
    const result = await db.execute(\`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_autovacuum,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    \`);
    
    return result;
  }

  async getIndexUsage() {
    const result = await db.execute(\`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read as index_reads,
        idx_tup_fetch as index_fetches,
        CASE WHEN idx_tup_read > 0 
          THEN ROUND((idx_tup_fetch::numeric / idx_tup_read * 100), 2) 
          ELSE 0 
        END as efficiency_percentage
      FROM pg_stat_user_indexes
      WHERE idx_tup_read > 0
      ORDER BY idx_tup_read DESC
    \`);
    
    return result;
  }

  async checkDatabaseHealth() {
    try {
      const metrics = await this.collectMetrics();
      const issues: string[] = [];
      
      // Connection pool warnings
      if (metrics.connectionStats.waitingClients > 10) {
        issues.push(\`High waiting clients: \${metrics.connectionStats.waitingClients}\`);
      }
      
      // Performance warnings
      if (metrics.performanceStats.avgQueryTime > 500) {
        issues.push(\`High average query time: \${metrics.performanceStats.avgQueryTime}ms\`);
      }
      
      if (metrics.performanceStats.cacheHitRatio < 90) {
        issues.push(\`Low cache hit ratio: \${metrics.performanceStats.cacheHitRatio}%\`);
      }
      
      // Slow query warnings
      if (metrics.performanceStats.slowQueries > 5) {
        issues.push(\`Multiple slow queries detected: \${metrics.performanceStats.slowQueries}\`);
      }
      
      return {
        status: issues.length === 0 ? 'healthy' : 'warning',
        issues,
        metrics,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        status: 'error',
        issues: [\`Health check failed: \${error.message}\`],
        timestamp: new Date().toISOString(),
      };
    }
  }

  getMetricsHistory(): DatabaseMetrics[] {
    return [...this.metricsHistory];
  }

  // Real-time alerts
  async checkAlerts(metrics: DatabaseMetrics) {
    const alerts = [];
    
    if (metrics.connectionStats.totalConnections > 45) {
      alerts.push({
        type: 'connection_limit',
        severity: 'warning',
        message: \`High connection usage: \${metrics.connectionStats.totalConnections}/50\`,
      });
    }
    
    if (metrics.performanceStats.avgQueryTime > 1000) {
      alerts.push({
        type: 'slow_queries',
        severity: 'critical',
        message: \`Very slow average query time: \${metrics.performanceStats.avgQueryTime}ms\`,
      });
    }
    
    if (metrics.performanceStats.cacheHitRatio < 85) {
      alerts.push({
        type: 'cache_performance',
        severity: 'warning',  
        message: \`Poor cache performance: \${metrics.performanceStats.cacheHitRatio}%\`,
      });
    }
    
    return alerts;
  }
}

// Export singleton instance
export const dbMonitor = new DatabaseMonitor();

// Automated monitoring function
export async function startDatabaseMonitoring(intervalMs = 60000) {
  console.log('🔍 Starting database monitoring...');
  
  setInterval(async () => {
    try {
      const health = await dbMonitor.checkDatabaseHealth();
      
      if (health.status === 'warning') {
        console.warn('⚠️ Database health issues:', health.issues);
      } else if (health.status === 'error') {
        console.error('❌ Database health check failed:', health.issues);
      }
      
      // Check for alerts
      if (health.metrics) {
        const alerts = await dbMonitor.checkAlerts(health.metrics);
        for (const alert of alerts) {
          if (alert.severity === 'critical') {
            console.error(\`🚨 CRITICAL: \${alert.message}\`);
          } else {
            console.warn(\`⚠️ WARNING: \${alert.message}\`);
          }
        }
      }
      
    } catch (error) {
      console.error('Database monitoring error:', error);
    }
  }, intervalMs);
}`;

    const monitoringPath = path.join(this.rootDir, 'src/database/monitoring.ts');
    fs.writeFileSync(monitoringPath, monitoring);
    this.log('Performance monitoring utilities generated', 'success');
  }

  generateMaintenanceScripts() {
    this.log('Generating maintenance scripts...', 'info');
    
    // Daily maintenance script
    const dailyMaintenance = `#!/bin/bash

# Neon PostgreSQL Daily Maintenance Script
# Run this script daily via cron for optimal database performance

set -e

echo "🔧 Starting daily database maintenance..."
echo "Timestamp: $(date)"

# Database connection
DATABASE_URL="${DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable not set"
  exit 1
fi

# Function to execute SQL
execute_sql() {
  local sql="$1"
  local description="$2"
  
  echo "⏳ $description..."
  psql "$DATABASE_URL" -c "$sql" > /dev/null
  echo "✅ $description completed"
}

# 1. Update table statistics
execute_sql "SELECT update_table_statistics();" "Updating table statistics"

# 2. Refresh materialized views
execute_sql "SELECT refresh_dashboard_stats();" "Refreshing dashboard statistics"

# 3. Clean up old activity records (older than 1 year)
execute_sql "SELECT cleanup_old_activity();" "Cleaning up old activity records"

# 4. Clean up old audit logs (older than 2 years, except security)
execute_sql "SELECT cleanup_old_audit_logs();" "Cleaning up old audit logs"

# 5. Check for unused indexes
echo "⏳ Checking for unused indexes..."
psql "$DATABASE_URL" -c "
SELECT 
  schemaname, 
  tablename, 
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
ORDER BY schemaname, tablename, indexname;
" > unused_indexes_$(date +%Y%m%d).log

# 6. Check table bloat
echo "⏳ Checking table bloat..."
psql "$DATABASE_URL" -c "
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  CASE WHEN n_live_tup > 0 
    THEN ROUND((n_dead_tup::numeric / n_live_tup * 100), 2) 
    ELSE 0 
  END as bloat_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY bloat_percentage DESC;
" > table_bloat_$(date +%Y%m%d).log

# 7. Generate performance report
echo "⏳ Generating performance report..."
psql "$DATABASE_URL" -c "
SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value
UNION ALL
SELECT 
  'Total Connections',
  COUNT(*)::text
FROM pg_stat_activity
UNION ALL  
SELECT
  'Active Queries',
  COUNT(*)::text
FROM pg_stat_activity 
WHERE state = 'active'
UNION ALL
SELECT
  'Cache Hit Ratio',
  ROUND((blks_hit::numeric / (blks_hit + blks_read) * 100), 2)::text || '%'
FROM pg_stat_database 
WHERE datname = current_database();
" > performance_report_$(date +%Y%m%d).log

echo "✅ Daily maintenance completed successfully!"
echo "📊 Reports generated:"
echo "  - unused_indexes_$(date +%Y%m%d).log"
echo "  - table_bloat_$(date +%Y%m%d).log"  
echo "  - performance_report_$(date +%Y%m%d).log"
echo ""`;

    const maintenancePath = path.join(this.rootDir, 'scripts/daily-maintenance.sh');
    fs.writeFileSync(maintenancePath, dailyMaintenance);
    fs.chmodSync(maintenancePath, '755');

    // Weekly optimization script
    const weeklyOptimization = `#!/bin/bash

# Neon PostgreSQL Weekly Optimization Script
# Run this script weekly for deeper optimization

set -e

echo "🚀 Starting weekly database optimization..."
echo "Timestamp: $(date)"

DATABASE_URL="${DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable not set"
  exit 1
fi

# Function to execute SQL
execute_sql() {
  local sql="$1"
  local description="$2"
  
  echo "⏳ $description..."
  psql "$DATABASE_URL" -c "$sql" > /dev/null
  echo "✅ $description completed"
}

# 1. Analyze all tables for optimal query plans
echo "⏳ Analyzing all tables..."
psql "$DATABASE_URL" -c "ANALYZE;" > /dev/null
echo "✅ Table analysis completed"

# 2. Check for missing indexes on frequently queried columns
echo "⏳ Checking for potential missing indexes..."
psql "$DATABASE_URL" -c "
SELECT 
  query,
  calls,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms
FROM pg_stat_statements 
WHERE query ILIKE '%WHERE%'
  AND calls > 100
  AND mean_exec_time > 100
  AND query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;
" > potential_missing_indexes_$(date +%Y%m%d).log

# 3. Check index effectiveness
echo "⏳ Checking index effectiveness..."
psql "$DATABASE_URL" -c "
SELECT 
  t.schemaname,
  t.tablename,
  indexname,
  c.reltuples as num_rows,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  i.idx_tup_read,
  i.idx_tup_fetch,
  CASE WHEN i.idx_tup_read > 0 
    THEN ROUND((i.idx_tup_fetch::numeric / i.idx_tup_read * 100), 2) 
    ELSE 0 
  END as effectiveness_percentage
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables t ON i.relid = t.relid
JOIN pg_class c ON c.oid = i.relid
WHERE c.reltuples > 1000
ORDER BY i.idx_tup_read DESC;
" > index_effectiveness_$(date +%Y%m%d).log

# 4. Generate weekly summary report
echo "⏳ Generating weekly summary report..."
psql "$DATABASE_URL" -c "
SELECT 
  '=== WEEKLY DATABASE SUMMARY ===' as report
UNION ALL
SELECT 
  'Report Date: $(date)' as report
UNION ALL
SELECT 
  '' as report
UNION ALL
SELECT 
  'Database Size: ' || pg_size_pretty(pg_database_size(current_database())) as report
UNION ALL
SELECT 
  'Total Tables: ' || COUNT(*)::text as report
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 
  'Total Indexes: ' || COUNT(*)::text as report  
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Active Connections This Week: ' || MAX(numbackends)::text as report
FROM pg_stat_database
WHERE datname = current_database();
" > weekly_summary_$(date +%Y%m%d).log

echo "✅ Weekly optimization completed successfully!"
echo "📊 Reports generated:"
echo "  - potential_missing_indexes_$(date +%Y%m%d).log"
echo "  - index_effectiveness_$(date +%Y%m%d).log"
echo "  - weekly_summary_$(date +%Y%m%d).log"
echo ""`;

    const weeklyPath = path.join(this.rootDir, 'scripts/weekly-optimization.sh');
    fs.writeFileSync(weeklyPath, weeklyOptimization);
    fs.chmodSync(weeklyPath, '755');

    this.log('Maintenance scripts generated', 'success');
  }

  generateNeonSpecificConfig() {
    this.log('Generating Neon-specific configurations...', 'info');
    
    const neonConfig = `// Neon PostgreSQL Specific Configuration
// Optimized for Neon's serverless PostgreSQL architecture

export const NEON_CONFIG = {
  // Connection settings optimized for Neon
  connection: {
    // Neon uses connection pooling, so we can be more aggressive
    maxConnections: 50,
    minConnections: 5,
    
    // Neon has built-in connection pooling, so shorter idle times work well
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 15000, // 15 seconds
    
    // Neon supports prepared statements well
    allowPreparedStatements: true,
    maxPreparedStatements: 100,
    
    // SSL is required for Neon
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.NEON_CA_CERT, // If using custom CA
    },
  },
  
  // Query optimization for Neon
  queryOptimization: {
    // Neon works well with concurrent queries
    maxConcurrentQueries: 20,
    
    // Statement timeout (Neon has its own limits)
    statementTimeout: 60000, // 60 seconds
    
    // Batch operations for better performance
    batchSize: 100,
    maxBatchSize: 1000,
  },
  
  // Neon-specific features
  features: {
    // Neon supports read replicas
    readReplicas: {
      enabled: process.env.NEON_READ_REPLICA_URL ? true : false,
      url: process.env.NEON_READ_REPLICA_URL,
      maxConnections: 20,
    },
    
    // Neon has automatic backups
    backups: {
      automatic: true,
      pointInTimeRecovery: true,
      retentionDays: 30,
    },
    
    // Neon scaling features
    scaling: {
      autoscaling: true,
      scaleToZero: true, // Neon can scale to zero
      coldStartOptimization: true,
    },
  },
  
  // Performance monitoring specific to Neon
  monitoring: {
    // Neon metrics endpoints (if available)
    metricsEndpoint: process.env.NEON_METRICS_ENDPOINT,
    
    // Connection pool monitoring
    connectionPoolMetrics: true,
    
    // Query performance tracking
    slowQueryThreshold: 1000, // 1 second
    enableQueryLogging: process.env.NODE_ENV === 'development',
  },
  
  // Error handling and retries
  resilience: {
    retryAttempts: 5,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxRetryDelay: 30000,
    
    // Connection recovery
    reconnectOnFailure: true,
    healthCheckInterval: 30000,
  },
};

// Neon connection helper
export function createNeonConnection(overrides = {}) {
  const config = {
    ...NEON_CONFIG,
    ...overrides,
  };
  
  // Validate Neon-specific requirements
  if (!process.env.DATABASE_URL?.includes('neon.tech')) {
    console.warn('⚠️ DATABASE_URL does not appear to be a Neon connection string');
  }
  
  if (!process.env.DATABASE_URL?.includes('sslmode=require')) {
    console.warn('⚠️ SSL mode not explicitly set to required for Neon');
  }
  
  return config;
}

// Neon performance recommendations
export const NEON_PERFORMANCE_TIPS = {
  connections: [
    'Use connection pooling - Neon has built-in pooling that works well with moderate pool sizes',
    'Keep connections alive with keepalive settings',
    'Monitor connection usage to avoid limits',
  ],
  
  queries: [
    'Use prepared statements for frequently executed queries',
    'Batch INSERT/UPDATE operations when possible',
    'Use appropriate indexes - Neon supports all PostgreSQL index types',
    'Monitor slow queries and optimize them',
  ],
  
  schema: [
    'Use appropriate column types to minimize storage',
    'Add indexes on frequently queried columns',
    'Consider partitioning for large tables',
    'Use constraints to maintain data integrity',
  ],
  
  scaling: [
    'Take advantage of Neon\\'s autoscaling capabilities',
    'Use read replicas for read-heavy workloads',
    'Monitor resource usage through Neon console',
    'Optimize for cold starts if using scale-to-zero',
  ],
};`;

    const neonConfigPath = path.join(this.rootDir, 'src/database/neon-specific.ts');
    fs.writeFileSync(neonConfigPath, neonConfig);
    this.log('Neon-specific configuration generated', 'success');
  }

  async run() {
    try {
      this.log('🐘 Neon PostgreSQL Production Optimization', 'info');
      this.log('==========================================', 'info');
      
      this.generateConnectionConfig();
      this.generateOptimizedSchema();
      this.generatePerformanceMonitoring();
      this.generateMaintenanceScripts();
      this.generateNeonSpecificConfig();
      
      this.log('', 'info');
      this.log('🎉 Neon PostgreSQL optimization complete!', 'success');
      this.log('', 'info');
      this.log('Generated files:', 'info');
      this.log('- src/database/neon-config.ts (connection configuration)', 'info');
      this.log('- database/optimized-schema.sql (database optimizations)', 'info');
      this.log('- src/database/monitoring.ts (performance monitoring)', 'info');
      this.log('- scripts/daily-maintenance.sh (daily maintenance)', 'info');
      this.log('- scripts/weekly-optimization.sh (weekly optimization)', 'info');
      this.log('- src/database/neon-specific.ts (Neon configurations)', 'info');
      this.log('', 'info');
      this.log('Next steps:', 'info');
      this.log('1. Update DATABASE_URL with your Neon connection string', 'info');
      this.log('2. Run the optimized schema: psql $DATABASE_URL -f database/optimized-schema.sql', 'info');
      this.log('3. Set up cron jobs for maintenance scripts', 'info');
      this.log('4. Configure monitoring in your application', 'info');
      this.log('', 'info');
      
    } catch (error) {
      this.log(`Optimization failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new NeonPostgreSQLOptimizer();
  optimizer.run();
}

module.exports = NeonPostgreSQLOptimizer;