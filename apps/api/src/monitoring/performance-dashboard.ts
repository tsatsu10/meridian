/**
 * 📊 Performance Monitoring Dashboard
 * Provides real-time performance metrics and system health monitoring
 */

import { Hono } from 'hono';
import { logger } from '../utils/logger';
import { startupOptimizer } from '../utils/startup-optimizer';
import { lazyLoader } from '../utils/lazy-loader';
import { errorMonitor } from './error-monitor';
import fs from 'fs';
import os from 'os';

const performanceDashboard = new Hono();

interface SystemMetrics {
  timestamp: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    heapUsedMB: number;
    heapTotalMB: number;
  };
  cpu: {
    usage: number[];
    loadAverage: number[];
  };
  system: {
    uptime: number;
    platform: string;
    arch: string;
    nodeVersion: string;
    totalMemory: number;
    freeMemory: number;
    memoryUsagePercent: number;
  };
  performance: {
    startupHealth: number;
    bundleOptimization: string;
    errorRate: number;
    responseTime: number;
  };
}

interface PerformanceHistory {
  timestamp: string;
  memory: number;
  cpu: number;
  responseTime: number;
  errorCount: number;
}

// Store performance history (last 24 hours)
const performanceHistory: PerformanceHistory[] = [];
const MAX_HISTORY_ENTRIES = 1440; // 24 hours at 1-minute intervals

// Real-time metrics collection
let metricsCollectionActive = false;
let lastResponseTimes: number[] = [];
const MAX_RESPONSE_TIME_SAMPLES = 100;

/**
 * Start collecting performance metrics
 */
function startMetricsCollection() {
  if (metricsCollectionActive) return;
  
  metricsCollectionActive = true;
  logger.info('📊 Performance metrics collection started');

  // Collect metrics every minute
  setInterval(() => {
    collectPerformanceSnapshot();
  }, 60000);

  // Collect CPU usage every 5 seconds for more accurate readings
  setInterval(() => {
    updateCpuMetrics();
  }, 5000);
}

/**
 * Collect performance snapshot
 */
function collectPerformanceSnapshot() {
  try {
    const memory = process.memoryUsage();
    const errorStats = errorMonitor.getStats();
    
    const snapshot: PerformanceHistory = {
      timestamp: new Date().toISOString(),
      memory: memory.heapUsed / 1024 / 1024, // MB
      cpu: getCpuUsage(),
      responseTime: getAverageResponseTime(),
      errorCount: errorStats.totalErrors
    };

    performanceHistory.push(snapshot);
    
    // Keep only last 24 hours
    if (performanceHistory.length > MAX_HISTORY_ENTRIES) {
      performanceHistory.shift();
    }

    // Log warning if metrics are concerning
    if (snapshot.memory > 200) {
      logger.warn('High memory usage detected', { memoryMB: snapshot.memory });
    }
    if (snapshot.responseTime > 2000) {
      logger.warn('Slow response time detected', { responseTimeMs: snapshot.responseTime });
    }

  } catch (error) {
    logger.error('Failed to collect performance snapshot', { error });
  }
}

/**
 * Get current CPU usage percentage
 */
function getCpuUsage(): number {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const totalTick = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);
  return Math.round(((totalTick - totalIdle) / totalTick) * 100);
}

/**
 * Update CPU metrics (called more frequently)
 */
function updateCpuMetrics() {
  // This runs every 5 seconds to maintain more accurate CPU readings
  // The actual collection happens in the snapshot function
}

/**
 * Record response time
 */
export function recordResponseTime(timeMs: number) {
  lastResponseTimes.push(timeMs);
  if (lastResponseTimes.length > MAX_RESPONSE_TIME_SAMPLES) {
    lastResponseTimes.shift();
  }
}

/**
 * Get average response time
 */
function getAverageResponseTime(): number {
  if (lastResponseTimes.length === 0) return 0;
  const sum = lastResponseTimes.reduce((a, b) => a + b, 0);
  return Math.round(sum / lastResponseTimes.length);
}

/**
 * Get comprehensive system metrics
 */
function getSystemMetrics(): SystemMetrics {
  const memory = process.memoryUsage();
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const errorStats = errorMonitor.getStats();
  
  return {
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
    },
    cpu: {
      usage: cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return Math.round(((total - cpu.times.idle) / total) * 100);
      }),
      loadAverage: loadAvg,
    },
    system: {
      uptime: Math.round(process.uptime()),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: totalMem,
      freeMemory: freeMem,
      memoryUsagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    performance: {
      startupHealth: startupOptimizer.getHealthScore(),
      bundleOptimization: getBundleOptimizationStatus(),
      errorRate: calculateErrorRate(errorStats),
      responseTime: getAverageResponseTime(),
    },
  };
}

/**
 * Get bundle optimization status
 */
function getBundleOptimizationStatus(): string {
  try {
    const stats = lazyLoader.getStats();
    if (stats.totalModules > 10) {
      return 'Excellent - Heavy modules lazy loaded';
    } else if (stats.totalModules > 5) {
      return 'Good - Some optimization applied';
    } else {
      return 'Needs Improvement - Consider more lazy loading';
    }
  } catch {
    return 'Unknown';
  }
}

/**
 * Calculate error rate (errors per hour)
 */
function calculateErrorRate(errorStats: any): number {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const recentErrors = errorStats.recentErrors?.filter((error: any) => 
    new Date(error.timestamp).getTime() > oneHourAgo
  ).length || 0;
  
  return recentErrors;
}

// Dashboard routes

/**
 * Main dashboard overview
 */
performanceDashboard.get('/', async (c) => {
  try {
    const metrics = getSystemMetrics();
    const lazyStats = lazyLoader.getStats();
    const errorStats = errorMonitor.getStats();
    
    const dashboard = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics,
      lazyLoader: lazyStats,
      errors: errorStats,
      recommendations: startupOptimizer.generateRecommendations(),
    };

    return c.json(dashboard);
  } catch (error) {
    logger.error('Dashboard error:', error);
    return c.json({ error: 'Failed to generate dashboard' }, 500);
  }
});

/**
 * Performance history endpoint
 */
performanceDashboard.get('/history', async (c) => {
  const hours = parseInt(c.req.query('hours') || '6'); // Default 6 hours
  const maxEntries = Math.min(hours * 60, MAX_HISTORY_ENTRIES);
  
  const history = performanceHistory.slice(-maxEntries);
  
  return c.json({
    period: `${hours} hours`,
    dataPoints: history.length,
    history,
    summary: {
      avgMemory: Math.round(history.reduce((sum, h) => sum + h.memory, 0) / history.length),
      avgCpu: Math.round(history.reduce((sum, h) => sum + h.cpu, 0) / history.length),
      avgResponseTime: Math.round(history.reduce((sum, h) => sum + h.responseTime, 0) / history.length),
      totalErrors: history.reduce((sum, h) => sum + h.errorCount, 0),
    }
  });
});

/**
 * Real-time metrics endpoint
 */
performanceDashboard.get('/realtime', async (c) => {
  const metrics = getSystemMetrics();
  return c.json({
    timestamp: metrics.timestamp,
    memory: metrics.memory.heapUsedMB,
    cpu: getCpuUsage(),
    responseTime: getAverageResponseTime(),
    uptime: metrics.system.uptime,
    memoryPercent: metrics.system.memoryUsagePercent,
  });
});

/**
 * Performance alerts endpoint
 */
performanceDashboard.get('/alerts', async (c) => {
  const metrics = getSystemMetrics();
  const alerts = [];

  // Memory alerts
  if (metrics.memory.heapUsedMB > 200) {
    alerts.push({
      type: 'warning',
      category: 'memory',
      message: `High memory usage: ${metrics.memory.heapUsedMB}MB`,
      threshold: '200MB',
      current: `${metrics.memory.heapUsedMB}MB`
    });
  }

  // CPU alerts
  const avgCpu = getCpuUsage();
  if (avgCpu > 80) {
    alerts.push({
      type: 'critical',
      category: 'cpu',
      message: `High CPU usage: ${avgCpu}%`,
      threshold: '80%',
      current: `${avgCpu}%`
    });
  }

  // Response time alerts
  const responseTime = getAverageResponseTime();
  if (responseTime > 2000) {
    alerts.push({
      type: 'warning',
      category: 'performance',
      message: `Slow response time: ${responseTime}ms`,
      threshold: '2000ms',
      current: `${responseTime}ms`
    });
  }

  // Error rate alerts
  const errorStats = errorMonitor.getStats();
  const errorRate = calculateErrorRate(errorStats);
  if (errorRate > 10) {
    alerts.push({
      type: 'critical',
      category: 'errors',
      message: `High error rate: ${errorRate} errors/hour`,
      threshold: '10 errors/hour',
      current: `${errorRate} errors/hour`
    });
  }

  return c.json({
    alertCount: alerts.length,
    alerts,
    lastChecked: new Date().toISOString()
  });
});

/**
 * System health check
 */
performanceDashboard.get('/health', async (c) => {
  const metrics = getSystemMetrics();
  const health = {
    status: 'healthy',
    score: 100,
    checks: {
      memory: metrics.memory.heapUsedMB < 200,
      cpu: getCpuUsage() < 80,
      responseTime: getAverageResponseTime() < 2000,
      errors: calculateErrorRate(errorMonitor.getStats()) < 10,
      startup: startupOptimizer.getHealthScore() > 70,
    }
  };

  // Calculate overall health score
  const passedChecks = Object.values(health.checks).filter(Boolean).length;
  health.score = Math.round((passedChecks / Object.keys(health.checks).length) * 100);

  if (health.score < 70) {
    health.status = 'critical';
  } else if (health.score < 85) {
    health.status = 'warning';
  }

  return c.json(health);
});

/**
 * Generate performance report
 */
performanceDashboard.get('/report', async (c) => {
  const format = c.req.query('format') || 'json';
  
  try {
    const metrics = getSystemMetrics();
    const history = performanceHistory.slice(-60); // Last hour
    const errorStats = errorMonitor.getStats();
    
    const report = {
      generatedAt: new Date().toISOString(),
      period: 'Last 1 hour',
      summary: {
        systemHealth: startupOptimizer.getHealthScore(),
        averageMemoryUsage: Math.round(history.reduce((sum, h) => sum + h.memory, 0) / history.length),
        averageCpuUsage: Math.round(history.reduce((sum, h) => sum + h.cpu, 0) / history.length),
        averageResponseTime: Math.round(history.reduce((sum, h) => sum + h.responseTime, 0) / history.length),
        totalErrors: errorStats.totalErrors,
        uptime: metrics.system.uptime,
      },
      recommendations: startupOptimizer.generateRecommendations(),
      optimizations: {
        bundleSize: getBundleOptimizationStatus(),
        lazyLoading: lazyLoader.getStats(),
        memoryManagement: metrics.memory,
      },
      alerts: (await performanceDashboard.request('/alerts')).json(),
    };

    if (format === 'html') {
      const html = generateHtmlReport(report);
      c.header('Content-Type', 'text/html');
      return c.text(html);
    }

    return c.json(report);
  } catch (error) {
    logger.error('Report generation error:', error);
    return c.json({ error: 'Failed to generate report' }, 500);
  }
});

/**
 * Generate HTML performance report
 */
function generateHtmlReport(report: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report - ${report.generatedAt}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .good { border-color: #4CAF50; background: #f9fff9; }
        .warning { border-color: #ff9800; background: #fff8f0; }
        .critical { border-color: #f44336; background: #fff0f0; }
        .recommendations { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Meridian API Performance Report</h1>
        <p>Generated: ${report.generatedAt}</p>
        <p>Period: ${report.period}</p>
    </div>
    
    <h2>📊 Performance Summary</h2>
    <div class="metric ${report.summary.systemHealth > 80 ? 'good' : 'warning'}">
        <h3>System Health</h3>
        <p>${report.summary.systemHealth}/100</p>
    </div>
    <div class="metric ${report.summary.averageMemoryUsage < 200 ? 'good' : 'warning'}">
        <h3>Memory Usage</h3>
        <p>${report.summary.averageMemoryUsage}MB avg</p>
    </div>
    <div class="metric ${report.summary.averageResponseTime < 1000 ? 'good' : 'warning'}">
        <h3>Response Time</h3>
        <p>${report.summary.averageResponseTime}ms avg</p>
    </div>
    <div class="metric ${report.summary.totalErrors === 0 ? 'good' : 'critical'}">
        <h3>Error Count</h3>
        <p>${report.summary.totalErrors} errors</p>
    </div>
    
    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
            ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    
    <h2>🔧 Optimizations Applied</h2>
    <p><strong>Bundle Optimization:</strong> ${report.optimizations.bundleSize}</p>
    <p><strong>Lazy Loading:</strong> ${report.optimizations.lazyLoading.totalModules} modules loaded on demand</p>
    <p><strong>Memory Management:</strong> ${Math.round(report.optimizations.memoryManagement.heapUsedMB)}MB / ${Math.round(report.optimizations.memoryManagement.heapTotalMB)}MB</p>
</body>
</html>
  `;
}

// Initialize metrics collection when dashboard is loaded
startMetricsCollection();

export default performanceDashboard;
export { startMetricsCollection };

