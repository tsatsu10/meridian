/**
 * @epic-6.1-advanced-analytics - System Health Collector
 * @persona-all - Track system health for operational insights
 */
import { getAnalyticsEngine, type AnalyticsEvent, type AnalyticsMetric } from '../AnalyticsEngine';
import { logger } from '../../utils/logger';

export interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  requestRate: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  uptime: number;
}

export interface SystemAlert {
  type: 'performance' | 'error' | 'resource' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  data: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class SystemHealthCollector {
  private analyticsEngine = getAnalyticsEngine();
  private systemMetrics: SystemMetrics[] = [];
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private alerts: SystemAlert[] = [];
  private isCollecting: boolean = false;
  private collectionInterval?: NodeJS.Timeout;
  private startTime: Date = new Date();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.analyticsEngine.on('system:error', this.handleSystemError.bind(this));
    this.analyticsEngine.on('system:performance', this.handlePerformanceEvent.bind(this));
    this.analyticsEngine.on('system:resource', this.handleResourceEvent.bind(this));
  }

  startCollecting(intervalMs: number = 60000): void {
    if (this.isCollecting) return;
    this.isCollecting = true;
    this.startTime = new Date();

    // Start periodic collection
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    // Initial collection
    this.collectSystemMetrics();
    logger.info('System Health Collector started');
  }

  stopCollecting(): void {
    if (!this.isCollecting) return;
    this.isCollecting = false;

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }

    logger.info('System Health Collector stopped');
  }

  private async collectSystemMetrics(): Promise<void> {
    if (!this.isCollecting) return;

    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUsage: await this.getCPUUsage(),
        memoryUsage: await this.getMemoryUsage(),
        diskUsage: await this.getDiskUsage(),
        networkLatency: await this.getNetworkLatency(),
        activeConnections: await this.getActiveConnections(),
        requestRate: await this.getRequestRate(),
        errorRate: await this.getErrorRate(),
        responseTime: await this.getAverageResponseTime(),
        uptime: this.getUptime()
      };

      this.systemMetrics.push(metrics);

      // Keep only last 1000 metrics to prevent memory issues
      if (this.systemMetrics.length > 1000) {
        this.systemMetrics = this.systemMetrics.slice(-1000);
      }

      // Check for alerts
      await this.checkForAlerts(metrics);

      // Track metrics
      await this.analyticsEngine.recordMetric('system_cpu_usage', metrics.cpuUsage);
      await this.analyticsEngine.recordMetric('system_memory_usage', metrics.memoryUsage);
      await this.analyticsEngine.recordMetric('system_disk_usage', metrics.diskUsage);
      await this.analyticsEngine.recordMetric('system_network_latency', metrics.networkLatency);
      await this.analyticsEngine.recordMetric('system_active_connections', metrics.activeConnections);
      await this.analyticsEngine.recordMetric('system_request_rate', metrics.requestRate);
      await this.analyticsEngine.recordMetric('system_error_rate', metrics.errorRate);
      await this.analyticsEngine.recordMetric('system_response_time', metrics.responseTime);

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
      await this.analyticsEngine.trackEvent('system_metrics_collection_error', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  async trackServiceHealth(serviceName: string, data: {
    status: ServiceHealth['status'];
    responseTime: number;
    errorRate: number;
  }): Promise<void> {
    if (!this.isCollecting) return;

    const health: ServiceHealth = {
      serviceName,
      status: data.status,
      responseTime: data.responseTime,
      errorRate: data.errorRate,
      lastCheck: new Date(),
      uptime: this.getUptime()
    };

    this.serviceHealth.set(serviceName, health);

    await this.analyticsEngine.trackEvent('service_health_check', {
      serviceName,
      status: data.status,
      responseTime: data.responseTime,
      errorRate: data.errorRate
    });

    // Check for service alerts
    if (data.status === 'unhealthy' || data.errorRate > 0.1) {
      await this.createAlert({
        type: 'error',
        severity: data.status === 'unhealthy' ? 'high' : 'medium',
        title: `Service Health Issue: ${serviceName}`,
        description: `Service ${serviceName} is experiencing issues. Status: ${data.status}, Error Rate: ${(data.errorRate * 100).toFixed(1)}%`,
        data: { serviceName, ...data }
      });
    }
  }

  async trackDatabaseHealth(data: {
    connectionCount: number;
    queryTime: number;
    errorRate: number;
    activeTransactions: number;
  }): Promise<void> {
    if (!this.isCollecting) return;

    await this.analyticsEngine.trackEvent('database_health_check', data);
    await this.analyticsEngine.recordMetric('database_connection_count', data.connectionCount);
    await this.analyticsEngine.recordMetric('database_query_time', data.queryTime);
    await this.analyticsEngine.recordMetric('database_error_rate', data.errorRate);
    await this.analyticsEngine.recordMetric('database_active_transactions', data.activeTransactions);

    // Check for database alerts
    if (data.errorRate > 0.05 || data.queryTime > 1000) {
      await this.createAlert({
        type: 'performance',
        severity: data.errorRate > 0.1 ? 'high' : 'medium',
        title: 'Database Performance Issue',
        description: `Database is experiencing performance issues. Query time: ${data.queryTime}ms, Error rate: ${(data.errorRate * 100).toFixed(1)}%`,
        data
      });
    }
  }

  async trackAPIPerformance(endpoint: string, data: {
    responseTime: number;
    statusCode: number;
    error: boolean;
  }): Promise<void> {
    if (!this.isCollecting) return;

    await this.analyticsEngine.trackEvent('api_performance', {
      endpoint,
      responseTime: data.responseTime,
      statusCode: data.statusCode,
      error: data.error
    });

    await this.analyticsEngine.recordMetric(`api_response_time_${endpoint.replace(/\//g, '_')}`, data.responseTime);

    // Check for API performance alerts
    if (data.responseTime > 2000 || (data.error && data.statusCode >= 500)) {
      await this.createAlert({
        type: 'performance',
        severity: data.responseTime > 5000 ? 'high' : 'medium',
        title: `API Performance Issue: ${endpoint}`,
        description: `API endpoint ${endpoint} is experiencing issues. Response time: ${data.responseTime}ms, Status: ${data.statusCode}`,
        data: { endpoint, ...data }
      });
    }
  }

  async trackSecurityEvent(eventType: string, data: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    details: Record<string, any>;
  }): Promise<void> {
    if (!this.isCollecting) return;

    await this.analyticsEngine.trackEvent('security_event', {
      eventType,
      severity: data.severity,
      source: data.source,
      details: data.details
    });

    if (data.severity === 'high' || data.severity === 'critical') {
      await this.createAlert({
        type: 'security',
        severity: data.severity,
        title: `Security Alert: ${eventType}`,
        description: `Security event detected from ${data.source}`,
        data: { eventType, ...data }
      });
    }
  }

  getSystemMetrics(limit: number = 100): SystemMetrics[] {
    return this.systemMetrics.slice(-limit);
  }

  getServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): SystemAlert[] {
    return this.alerts;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.timestamp.getTime().toString() === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      await this.analyticsEngine.trackEvent('system_alert_resolved', {
        alertId,
        alertType: alert.type,
        severity: alert.severity,
        resolutionTime: alert.resolvedAt.getTime() - alert.timestamp.getTime()
      });
    }
  }

  getSystemStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    cpu: number;
    memory: number;
    disk: number;
    errorRate: number;
    activeAlerts: number;
  } {
    const latestMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (criticalAlerts > 0 || (latestMetrics && latestMetrics.errorRate > 0.1)) {
      overall = 'unhealthy';
    } else if (highAlerts > 0 || (latestMetrics && latestMetrics.cpuUsage > 80)) {
      overall = 'degraded';
    }

    return {
      overall,
      cpu: latestMetrics?.cpuUsage || 0,
      memory: latestMetrics?.memoryUsage || 0,
      disk: latestMetrics?.diskUsage || 0,
      errorRate: latestMetrics?.errorRate || 0,
      activeAlerts: activeAlerts.length
    };
  }

  async generateSystemInsights(): Promise<Array<{
    type: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    data: Record<string, any>;
  }>> {
    const insights: Array<{
      type: string;
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      data: Record<string, any>;
    }> = [];

    const latestMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latestMetrics) return insights;

    // CPU insights
    if (latestMetrics.cpuUsage > 80) {
      insights.push({
        type: 'performance',
        title: 'High CPU Usage',
        description: `CPU usage is at ${latestMetrics.cpuUsage.toFixed(1)}%. Consider optimizing resource-intensive operations.`,
        severity: latestMetrics.cpuUsage > 90 ? 'high' : 'medium',
        data: { cpuUsage: latestMetrics.cpuUsage }
      });
    }

    // Memory insights
    if (latestMetrics.memoryUsage > 85) {
      insights.push({
        type: 'resource',
        title: 'High Memory Usage',
        description: `Memory usage is at ${latestMetrics.memoryUsage.toFixed(1)}%. Consider memory optimization or scaling.`,
        severity: latestMetrics.memoryUsage > 95 ? 'high' : 'medium',
        data: { memoryUsage: latestMetrics.memoryUsage }
      });
    }

    // Error rate insights
    if (latestMetrics.errorRate > 0.05) {
      insights.push({
        type: 'error',
        title: 'High Error Rate',
        description: `Error rate is at ${(latestMetrics.errorRate * 100).toFixed(1)}%. Investigate system issues.`,
        severity: latestMetrics.errorRate > 0.1 ? 'high' : 'medium',
        data: { errorRate: latestMetrics.errorRate }
      });
    }

    // Response time insights
    if (latestMetrics.responseTime > 1000) {
      insights.push({
        type: 'performance',
        title: 'Slow Response Times',
        description: `Average response time is ${latestMetrics.responseTime}ms. Consider performance optimization.`,
        severity: latestMetrics.responseTime > 2000 ? 'high' : 'medium',
        data: { responseTime: latestMetrics.responseTime }
      });
    }

    return insights;
  }

  private async checkForAlerts(metrics: SystemMetrics): Promise<void> {
    // CPU alert
    if (metrics.cpuUsage > 90) {
      await this.createAlert({
        type: 'resource',
        severity: 'high',
        title: 'Critical CPU Usage',
        description: `CPU usage is critically high at ${metrics.cpuUsage.toFixed(1)}%`,
        data: { cpuUsage: metrics.cpuUsage }
      });
    }

    // Memory alert
    if (metrics.memoryUsage > 95) {
      await this.createAlert({
        type: 'resource',
        severity: 'critical',
        title: 'Critical Memory Usage',
        description: `Memory usage is critically high at ${metrics.memoryUsage.toFixed(1)}%`,
        data: { memoryUsage: metrics.memoryUsage }
      });
    }

    // Error rate alert
    if (metrics.errorRate > 0.1) {
      await this.createAlert({
        type: 'error',
        severity: 'high',
        title: 'High Error Rate',
        description: `Error rate is high at ${(metrics.errorRate * 100).toFixed(1)}%`,
        data: { errorRate: metrics.errorRate }
      });
    }

    // Response time alert
    if (metrics.responseTime > 5000) {
      await this.createAlert({
        type: 'performance',
        severity: 'high',
        title: 'Very Slow Response Times',
        description: `Response time is very slow at ${metrics.responseTime}ms`,
        data: { responseTime: metrics.responseTime }
      });
    }
  }

  private async createAlert(alert: Omit<SystemAlert, 'timestamp' | 'resolved'>): Promise<void> {
    const newAlert: SystemAlert = {
      ...alert,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(newAlert);

    await this.analyticsEngine.trackEvent('system_alert_created', {
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description
    });
  }

  private getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  // Mock implementations for system metrics collection
  private async getCPUUsage(): Promise<number> {
    // In a real implementation, this would use os.cpus() or similar
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    // In a real implementation, this would use process.memoryUsage() or similar
    return Math.random() * 100;
  }

  private async getDiskUsage(): Promise<number> {
    // In a real implementation, this would check disk space
    return Math.random() * 100;
  }

  private async getNetworkLatency(): Promise<number> {
    // In a real implementation, this would ping external services
    return Math.random() * 100;
  }

  private async getActiveConnections(): Promise<number> {
    // In a real implementation, this would count active connections
    return Math.floor(Math.random() * 1000);
  }

  private async getRequestRate(): Promise<number> {
    // In a real implementation, this would calculate requests per second
    return Math.random() * 100;
  }

  private async getErrorRate(): Promise<number> {
    // In a real implementation, this would calculate error percentage
    return Math.random() * 0.1;
  }

  private async getAverageResponseTime(): Promise<number> {
    // In a real implementation, this would calculate average response time
    return Math.random() * 1000;
  }

  private handleSystemError(data: any): void {
    this.trackSecurityEvent('system_error', {
      severity: 'medium',
      source: 'system',
      details: data
    });
  }

  private handlePerformanceEvent(data: any): void {
    this.trackAPIPerformance(data.endpoint || 'unknown', {
      responseTime: data.responseTime || 0,
      statusCode: data.statusCode || 200,
      error: data.error || false
    });
  }

  private handleResourceEvent(data: any): void {
    this.trackServiceHealth(data.serviceName || 'unknown', {
      status: data.status || 'healthy',
      responseTime: data.responseTime || 0,
      errorRate: data.errorRate || 0
    });
  }
}

export const getSystemHealthCollector = (): SystemHealthCollector => {
  return new SystemHealthCollector();
}; 