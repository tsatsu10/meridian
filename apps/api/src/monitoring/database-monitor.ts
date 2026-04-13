import { EventEmitter } from 'events';
import logger from '../utils/logger';
import DatabaseValidator from '../middlewares/database-validation';
import { validateDatabaseConfigurationLock } from '../config/database-config-lock';

interface DatabaseAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  timestamp: string;
  resolved: boolean;
}

interface MonitoringStats {
  totalChecks: number;
  failedChecks: number;
  successfulChecks: number;
  consecutiveFailures: number;
  lastCheckTime: string;
  uptime: number;
  averageResponseTime: number;
}

class DatabaseMonitor extends EventEmitter {
  private static instance: DatabaseMonitor;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alerts: Map<string, DatabaseAlert> = new Map();
  private stats: MonitoringStats = {
    totalChecks: 0,
    failedChecks: 0,
    successfulChecks: 0,
    consecutiveFailures: 0,
    lastCheckTime: '',
    uptime: 0,
    averageResponseTime: 0
  };
  private startTime = Date.now();
  private responseTimes: number[] = [];

  // Configuration
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly RESPONSE_TIME_SAMPLES = 10;

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private createAlert(type: DatabaseAlert['type'], message: string, details?: any): DatabaseAlert {
    const alert: DatabaseAlert = {
      id: this.generateAlertId(),
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert', alert);

    // Log alert
    const logLevel = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
    logger[logLevel](`🚨 Database Alert [${type.toUpperCase()}]: ${message}`, details);

    return alert;
  }

  private resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
      logger.info(`✅ Database Alert Resolved: ${alert.message}`);
    }
  }

  private async performHealthCheck(): Promise<{ success: boolean; responseTime: number; errors: string[] }> {
    const startTime = Date.now();

    try {
      // 1. Database validation check
      const validator = DatabaseValidator.getInstance();
      const validation = await validator.validateDatabase();

      // 2. Configuration lock validation
      const configValidation = validateDatabaseConfigurationLock();

      const errors: string[] = [];

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }

      if (!configValidation.isValid) {
        errors.push(...configValidation.errors);
      }

      const responseTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        responseTime,
        errors
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private updateStats(success: boolean, responseTime: number): void {
    this.stats.totalChecks++;
    this.stats.lastCheckTime = new Date().toISOString();
    this.stats.uptime = Date.now() - this.startTime;

    if (success) {
      this.stats.successfulChecks++;
      this.stats.consecutiveFailures = 0;
    } else {
      this.stats.failedChecks++;
      this.stats.consecutiveFailures++;
    }

    // Update response time average
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.RESPONSE_TIME_SAMPLES) {
      this.responseTimes.shift();
    }
    this.stats.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  private async monitoringLoop(): Promise<void> {
    logger.debug('🔍 Performing database health check...');

    const healthCheck = await this.performHealthCheck();
    this.updateStats(healthCheck.success, healthCheck.responseTime);

    if (!healthCheck.success) {
      // Create or update failure alert
      const errorMessage = `Database health check failed: ${healthCheck.errors.join(', ')}`;
      this.createAlert('error', errorMessage, {
        errors: healthCheck.errors,
        consecutiveFailures: this.stats.consecutiveFailures,
        responseTime: healthCheck.responseTime
      });

      // Critical alert for consecutive failures
      if (this.stats.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.createAlert('error', `CRITICAL: ${this.stats.consecutiveFailures} consecutive database failures detected`, {
          consecutiveFailures: this.stats.consecutiveFailures,
          totalChecks: this.stats.totalChecks,
          failureRate: (this.stats.failedChecks / this.stats.totalChecks * 100).toFixed(2) + '%'
        });
      }
    } else {
      // Check for slow response times
      if (healthCheck.responseTime > 5000) { // 5 seconds
        this.createAlert('warning', `Slow database response time: ${healthCheck.responseTime}ms`, {
          responseTime: healthCheck.responseTime,
          averageResponseTime: this.stats.averageResponseTime
        });
      }

      // Resolve any existing failure alerts
      const unresolvedAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved && alert.type === 'error');
      unresolvedAlerts.forEach(alert => this.resolveAlert(alert.id));
    }

    this.emit('health-check-complete', {
      success: healthCheck.success,
      stats: this.stats,
      errors: healthCheck.errors
    });
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Database monitoring is already running');
      return;
    }

    logger.info('🚀 Starting real-time database monitoring...');
    logger.info(`📊 Health checks every ${this.CHECK_INTERVAL_MS / 1000} seconds`);

    this.isMonitoring = true;
    this.startTime = Date.now();

    // Perform initial check
    this.monitoringLoop();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.monitoringLoop();
    }, this.CHECK_INTERVAL_MS);

    this.emit('monitoring-started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('Database monitoring is not running');
      return;
    }

    logger.info('🛑 Stopping database monitoring...');

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoring-stopped');
  }

  getMonitoringStats(): MonitoringStats {
    return { ...this.stats };
  }

  getActiveAlerts(): DatabaseAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(): DatabaseAlert[] {
    return Array.from(this.alerts.values());
  }

  isHealthy(): boolean {
    return this.stats.consecutiveFailures === 0;
  }

  getHealthScore(): number {
    if (this.stats.totalChecks === 0) return 100;
    return Math.round((this.stats.successfulChecks / this.stats.totalChecks) * 100);
  }

  // Manual health check endpoint
  async performManualHealthCheck(): Promise<{
    healthy: boolean;
    stats: MonitoringStats;
    alerts: DatabaseAlert[];
    lastCheck: any;
  }> {
    const healthCheck = await this.performHealthCheck();
    this.updateStats(healthCheck.success, healthCheck.responseTime);

    return {
      healthy: healthCheck.success,
      stats: this.getMonitoringStats(),
      alerts: this.getActiveAlerts(),
      lastCheck: {
        success: healthCheck.success,
        responseTime: healthCheck.responseTime,
        errors: healthCheck.errors,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Convenience functions
export function startDatabaseMonitoring(): void {
  const monitor = DatabaseMonitor.getInstance();
  monitor.startMonitoring();
}

export function stopDatabaseMonitoring(): void {
  const monitor = DatabaseMonitor.getInstance();
  monitor.stopMonitoring();
}

export function getDatabaseMonitoringStats(): MonitoringStats {
  const monitor = DatabaseMonitor.getInstance();
  return monitor.getMonitoringStats();
}

export function getDatabaseAlerts(): DatabaseAlert[] {
  const monitor = DatabaseMonitor.getInstance();
  return monitor.getActiveAlerts();
}

export function isDatabaseHealthy(): boolean {
  const monitor = DatabaseMonitor.getInstance();
  return monitor.isHealthy();
}

export async function performManualDatabaseHealthCheck() {
  const monitor = DatabaseMonitor.getInstance();
  return await monitor.performManualHealthCheck();
}

export default DatabaseMonitor;

