import { logger } from '../utils/logger';

// @epic-2.4-monitoring: Memory monitoring and cleanup service
// Prevents memory leaks and monitors system health

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  percentage: number;
  timestamp: Date;
}

interface MemoryAlert {
  level: 'warning' | 'critical';
  message: string;
  stats: MemoryStats;
  timestamp: Date;
}

class MemoryMonitor {
  private memoryHistory: MemoryStats[] = [];
  private alertCallbacks: Array<(alert: MemoryAlert) => void> = [];
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupTasks: Array<() => Promise<void>> = [];
  
  // Configuration
  private readonly WARNING_THRESHOLD = 75; // 75% memory usage
  private readonly CRITICAL_THRESHOLD = 90; // 90% memory usage
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly MONITOR_INTERVAL_MS = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL_MS = 300000; // 5 minutes

  /**
   * Start memory monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      logger.info('📊 Memory monitor already running');
      return;
    }

    logger.info('🔍 Starting memory monitor');
    this.isMonitoring = true;

    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, this.MONITOR_INTERVAL_MS);

    // Initial check
    this.checkMemory();

    // Start cleanup routine
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;

    logger.info('🛑 Stopping memory monitor');
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current memory statistics
   */
  getCurrentStats(): MemoryStats {
    const usage = process.memoryUsage();
    const percentage = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
      percentage,
      timestamp: new Date()
    };
  }

  /**
   * Check memory usage and trigger alerts if needed
   */
  private checkMemory(): void {
    const stats = this.getCurrentStats();
    
    // Store in history
    this.memoryHistory.push(stats);
    if (this.memoryHistory.length > this.MAX_HISTORY_SIZE) {
      this.memoryHistory.shift();
    }

    // Check for alerts
    if (stats.percentage >= this.CRITICAL_THRESHOLD) {
      this.triggerAlert('critical', `Critical memory usage: ${stats.percentage.toFixed(1)}%`, stats);
      this.performEmergencyCleanup();
    } else if (stats.percentage >= this.WARNING_THRESHOLD) {
      this.triggerAlert('warning', `High memory usage: ${stats.percentage.toFixed(1)}%`, stats);
    }

    // Log periodic status
    if (this.memoryHistory.length % 10 === 0) {
      logger.info(`💾 Memory usage: ${stats.percentage.toFixed(1)}% (${stats.heapUsed}MB/${stats.heapTotal}MB)`);
    }
  }

  /**
   * Trigger memory alert
   */
  private triggerAlert(level: 'warning' | 'critical', message: string, stats: MemoryStats): void {
    const alert: MemoryAlert = {
      level,
      message,
      stats,
      timestamp: new Date()
    };

    logger.warn(`⚠️ Memory Alert [${level.toUpperCase()}]: ${message}`);
    
    // Notify registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Error in memory alert callback:', error);
      }
    });
  }

  /**
   * Register cleanup task
   */
  registerCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Perform routine cleanup
   */
  private async performCleanup(): Promise<void> {
    const stats = this.getCurrentStats();
    
    if (stats.percentage > 60) { // Only cleanup if memory usage is above 60%
      logger.info('🧹 Performing routine memory cleanup');
      
      // Run registered cleanup tasks
      for (const task of this.cleanupTasks) {
        try {
          await task();
        } catch (error) {
          logger.error('Error in cleanup task:', error);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.info('🗑️ Forced garbage collection');
      }
    }
  }

  /**
   * Perform emergency cleanup when memory is critically high
   */
  private async performEmergencyCleanup(): Promise<void> {
    logger.error('🚨 Performing emergency memory cleanup');
    
    // Clear memory history to free up space
    this.memoryHistory = this.memoryHistory.slice(-10);
    
    // Run all cleanup tasks immediately
    await this.performCleanup();
    
    // Additional aggressive cleanup
    if (global.gc) {
      // Force multiple GC cycles
      for (let i = 0; i < 3; i++) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: MemoryAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get memory usage trend
   */
  getTrend(): { direction: 'increasing' | 'decreasing' | 'stable', rate: number } {
    if (this.memoryHistory.length < 5) {
      return { direction: 'stable', rate: 0 };
    }

    const recent = this.memoryHistory.slice(-5);
    const first = recent[0].percentage;
    const last = recent[recent.length - 1].percentage;
    const change = last - first;

    if (Math.abs(change) < 2) {
      return { direction: 'stable', rate: change };
    }

    return {
      direction: change > 0 ? 'increasing' : 'decreasing',
      rate: Math.abs(change)
    };
  }

  /**
   * Get memory statistics for monitoring dashboard
   */
  getStatistics() {
    const current = this.getCurrentStats();
    const trend = this.getTrend();
    
    const peak = this.memoryHistory.length > 0 
      ? Math.max(...this.memoryHistory.map(s => s.percentage))
      : current.percentage;

    const average = this.memoryHistory.length > 0
      ? this.memoryHistory.reduce((sum, s) => sum + s.percentage, 0) / this.memoryHistory.length
      : current.percentage;

    return {
      current,
      trend,
      peak,
      average: Math.round(average * 10) / 10,
      history: this.memoryHistory.slice(-20), // Last 20 readings
      thresholds: {
        warning: this.WARNING_THRESHOLD,
        critical: this.CRITICAL_THRESHOLD
      },
      isMonitoring: this.isMonitoring,
      activeCleanupTasks: this.cleanupTasks.length
    };
  }

  /**
   * Force cleanup now (for manual triggering)
   */
  async forceCleanup(): Promise<void> {
    logger.info('🔧 Manual memory cleanup triggered');
    await this.performCleanup();
  }
}

export default new MemoryMonitor();

