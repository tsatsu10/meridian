import logger from '../utils/logger';

/**
 * WebSocket Connection Health Monitor
 * Provides health checking and optimization for WebSocket connections
 */

export interface ConnectionHealth {
  totalConnections: number;
  activeConnections: number;
  staleConnections: number;
  healthyConnections: number;
  avgResponseTime: number;
  connectionErrors: number;
  lastHealthCheck: Date;
}

export interface ConnectionPoolStats {
  poolSize: number;
  availableConnections: number;
  busyConnections: number;
  poolUtilization: number;
}

export class ConnectionHealthMonitor {
  private healthHistory: ConnectionHealth[] = [];
  private readonly MAX_HISTORY_SIZE = 100;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private healthCheckCallbacks: Array<(health: ConnectionHealth) => void> = [];

  constructor(private wsServer: any) {}

  /**
   * Start health monitoring
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      logger.info('📊 Connection health monitoring already running');
      return;
    }

    logger.info('🔍 Starting WebSocket connection health monitoring');
    this.isMonitoring = true;

    this.monitorInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    logger.info('🛑 Stopping connection health monitoring');
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<ConnectionHealth> {
    const startTime = Date.now();
    const stats = this.wsServer.getConnectionStats();
    
    // Early return for empty connection pool to save CPU
    if (stats.currentConnections === 0) {
      const health: ConnectionHealth = {
        totalConnections: 0,
        activeConnections: 0,
        staleConnections: 0,
        healthyConnections: 0,
        avgResponseTime: 0,
        connectionErrors: 0,
        lastHealthCheck: new Date(),
      };

      // Store in history
      this.healthHistory.push(health);
      if (this.healthHistory.length > this.MAX_HISTORY_SIZE) {
        this.healthHistory.shift();
      }

      // Notify callbacks
      this.healthCheckCallbacks.forEach(callback => {
        try {
          callback(health);
        } catch (error) {
          logger.error('Error in health check callback:', error);
        }
      });

      // Skip logging for empty pools to reduce noise
      return health;
    }
    
    // Ping a sample of connections to check responsiveness
    const sampleConnections = this.getSampleConnections();
    const pingResults = await this.pingConnections(sampleConnections);
    
    const health: ConnectionHealth = {
      totalConnections: stats.currentConnections,
      activeConnections: stats.currentConnections - pingResults.staleCount,
      staleConnections: pingResults.staleCount,
      healthyConnections: pingResults.healthyCount,
      avgResponseTime: pingResults.avgResponseTime,
      connectionErrors: pingResults.errorCount,
      lastHealthCheck: new Date(),
    };

    // Store in history
    this.healthHistory.push(health);
    if (this.healthHistory.length > this.MAX_HISTORY_SIZE) {
      this.healthHistory.shift();
    }

    // Notify callbacks
    this.healthCheckCallbacks.forEach(callback => {
      try {
        callback(health);
      } catch (error) {
        logger.error('Error in health check callback:', error);
      }
    });

    // Log health status
    this.logHealthStatus(health);

    return health;
  }

  /**
   * Get sample connections for health checking
   */
  private getSampleConnections(): string[] {
    const allConnections = Array.from(this.wsServer.connections.keys());
    const sampleSize = Math.min(20, Math.max(5, Math.floor(allConnections.length * 0.1))); // 10% sample, min 5, max 20
    
    // Randomly sample connections
    const sample: string[] = [];
    for (let i = 0; i < sampleSize && allConnections.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * allConnections.length);
      sample.push(allConnections.splice(randomIndex, 1)[0]);
    }
    
    return sample;
  }

  /**
   * Ping sampled connections to check health
   */
  private async pingConnections(connectionIds: string[]): Promise<{
    healthyCount: number;
    staleCount: number;
    errorCount: number;
    avgResponseTime: number;
  }> {
    const results = await Promise.allSettled(
      connectionIds.map(socketId => this.pingConnection(socketId))
    );

    let healthyCount = 0;
    let staleCount = 0;
    let errorCount = 0;
    let totalResponseTime = 0;
    let validResponses = 0;

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { isHealthy, responseTime, isStale } = result.value;
        if (isHealthy) {
          healthyCount++;
          totalResponseTime += responseTime;
          validResponses++;
        } else if (isStale) {
          staleCount++;
        } else {
          errorCount++;
        }
      } else {
        errorCount++;
      }
    });

    return {
      healthyCount,
      staleCount,
      errorCount,
      avgResponseTime: validResponses > 0 ? totalResponseTime / validResponses : 0,
    };
  }

  /**
   * Ping individual connection
   */
  private async pingConnection(socketId: string): Promise<{
    isHealthy: boolean;
    responseTime: number;
    isStale: boolean;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => {
        resolve({ isHealthy: false, responseTime: 0, isStale: true });
      }, 5000); // 5 second timeout

      const socket = this.wsServer.io.sockets.sockets.get(socketId);
      if (!socket) {
        clearTimeout(timeout);
        resolve({ isHealthy: false, responseTime: 0, isStale: true });
        return;
      }

      socket.emit('health_ping', { timestamp: startTime }, (response: any) => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        resolve({ 
          isHealthy: true, 
          responseTime, 
          isStale: false 
        });
      });
    });
  }

  /**
   * Log health status
   */
  private logHealthStatus(health: ConnectionHealth): void {
    const healthPercentage = health.totalConnections > 0 
      ? (health.healthyConnections / health.totalConnections) * 100 
      : 100;

    if (healthPercentage < 80) {
      logger.warn(`🚨 Connection health warning: ${healthPercentage.toFixed(1)}% healthy`);
    } else if (healthPercentage < 95) {
      logger.info(`⚠️ Connection health: ${healthPercentage.toFixed(1)}% healthy`);
    } else {
      logger.info(`✅ Connection health: ${healthPercentage.toFixed(1)}% healthy`);
    }

    logger.info(`📊 Connections: ${health.activeConnections}/${health.totalConnections} active, ${health.staleConnections} stale, avg response: ${health.avgResponseTime.toFixed(0)}ms`);
  }

  /**
   * Get health statistics
   */
  public getHealthStats() {
    if (this.healthHistory.length === 0) {
      return null;
    }

    const latest = this.healthHistory[this.healthHistory.length - 1];
    const avgHealth = this.healthHistory.reduce((sum, h) => sum + (h.healthyConnections / Math.max(h.totalConnections, 1)), 0) / this.healthHistory.length;
    const avgResponseTime = this.healthHistory.reduce((sum, h) => sum + h.avgResponseTime, 0) / this.healthHistory.length;

    return {
      current: latest,
      averageHealthPercentage: avgHealth * 100,
      averageResponseTime,
      totalHealthChecks: this.healthHistory.length,
      isMonitoring: this.isMonitoring,
      trend: this.getHealthTrend(),
    };
  }

  /**
   * Get health trend (improving/declining/stable)
   */
  private getHealthTrend(): 'improving' | 'declining' | 'stable' {
    if (this.healthHistory.length < 5) return 'stable';

    const recent = this.healthHistory.slice(-5);
    const older = this.healthHistory.slice(-10, -5);
    
    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, h) => sum + (h.healthyConnections / Math.max(h.totalConnections, 1)), 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + (h.healthyConnections / Math.max(h.totalConnections, 1)), 0) / older.length;

    const diff = recentAvg - olderAvg;
    
    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Register health check callback
   */
  public onHealthCheck(callback: (health: ConnectionHealth) => void): void {
    this.healthCheckCallbacks.push(callback);
  }

  /**
   * Force health check
   */
  public async forceHealthCheck(): Promise<ConnectionHealth> {
    return this.performHealthCheck();
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopMonitoring();
    this.healthHistory = [];
    this.healthCheckCallbacks = [];
  }
}

export default ConnectionHealthMonitor;

