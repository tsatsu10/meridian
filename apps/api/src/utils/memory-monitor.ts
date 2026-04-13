import { logger } from './logger';

/**
 * Production Memory Monitor
 * 
 * Monitors memory usage and implements automatic garbage collection
 */

interface MemoryStats {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  timestamp: Date;
}

interface MemoryThresholds {
  warning: number;    // 80% of heap limit
  critical: number;   // 90% of heap limit
  emergency: number;  // 95% of heap limit
}

export class MemoryMonitor {
  private stats: MemoryStats[] = [];
  private thresholds: MemoryThresholds;
  private monitorInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private maxStatsHistory = 100; // Keep last 100 readings

  constructor() {
    // Calculate thresholds based on V8 heap limit
    const heapLimit = this.getHeapLimit();
    this.thresholds = {
      warning: heapLimit * 0.8,
      critical: heapLimit * 0.9,
      emergency: heapLimit * 0.95,
    };
  }

  start(intervalMs: number = 30000): void { // Monitor every 30 seconds
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.collectStats();
      this.checkThresholds();
    }, intervalMs);

    logger.info('🔍 Memory monitoring started');
  }

  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('🔍 Memory monitoring stopped');
  }

  private collectStats(): void {
    const memUsage = process.memoryUsage();
    const stats: MemoryStats = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      timestamp: new Date(),
    };

    this.stats.push(stats);

    // Keep only recent stats
    if (this.stats.length > this.maxStatsHistory) {
      this.stats = this.stats.slice(-this.maxStatsHistory);
    }
  }

  private checkThresholds(): void {
    const latest = this.stats[this.stats.length - 1];
    if (!latest) return;

    const heapUsedMB = this.bytesToMB(latest.heapUsed);
    const warningMB = this.bytesToMB(this.thresholds.warning);
    const criticalMB = this.bytesToMB(this.thresholds.critical);
    const emergencyMB = this.bytesToMB(this.thresholds.emergency);

    if (latest.heapUsed >= this.thresholds.emergency) {
      logger.error(`🚨 EMERGENCY: Memory usage at ${heapUsedMB}MB (>${emergencyMB}MB)`);
      this.forceGarbageCollection();
      this.emergencyCleanup();
    } else if (latest.heapUsed >= this.thresholds.critical) {
      logger.warn(`⚠️ CRITICAL: Memory usage at ${heapUsedMB}MB (>${criticalMB}MB)`);
      this.forceGarbageCollection();
    } else if (latest.heapUsed >= this.thresholds.warning) {
      logger.warn(`⚠️ WARNING: Memory usage at ${heapUsedMB}MB (>${warningMB}MB)`);
      this.softGarbageCollection();
    }
  }

  private forceGarbageCollection(): void {
    if (global.gc) {
      try {
        global.gc();
        logger.info('🗑️ Forced garbage collection completed');
      } catch (error) {
        logger.error('Failed to force garbage collection:', error);
      }
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc)');
    }
  }

  private softGarbageCollection(): void {
    // Trigger less aggressive cleanup
    setTimeout(() => {
      if (global.gc) {
        global.gc();
      }
    }, 1000);
  }

  private emergencyCleanup(): void {
    logger.info('🚨 Performing emergency memory cleanup...');
    
    // Clear any large objects that might be cached
    try {
      // Force multiple GC cycles
      if (global.gc) {
        for (let i = 0; i < 3; i++) {
          global.gc();
        }
      }
      
      // Clear old stats except the most recent
      this.stats = this.stats.slice(-10);
      
      logger.info('🧹 Emergency cleanup completed');
    } catch (error) {
      logger.error('Emergency cleanup failed:', error);
    }
  }

  private getHeapLimit(): number {
    // Try to get V8 heap limit, fallback to estimate
    try {
      const v8 = require('v8');
      return v8.getHeapStatistics().heap_size_limit;
    } catch {
      // Fallback to typical Node.js heap limit
      return 1.4 * 1024 * 1024 * 1024; // ~1.4GB
    }
  }

  getCurrentStats(): MemoryStats | null {
    return this.stats[this.stats.length - 1] || null;
  }

  getMemoryReport(): any {
    const current = this.getCurrentStats();
    if (!current) return null;

    const heapUsagePercent = (current.heapUsed / current.heapTotal) * 100;
    const heapLimitPercent = (current.heapUsed / this.getHeapLimit()) * 100;

    return {
      current: {
        rss: this.bytesToMB(current.rss),
        heapTotal: this.bytesToMB(current.heapTotal),
        heapUsed: this.bytesToMB(current.heapUsed),
        external: this.bytesToMB(current.external),
        arrayBuffers: this.bytesToMB(current.arrayBuffers),
      },
      percentages: {
        heapUsage: Math.round(heapUsagePercent * 100) / 100,
        heapLimit: Math.round(heapLimitPercent * 100) / 100,
      },
      thresholds: {
        warning: this.bytesToMB(this.thresholds.warning),
        critical: this.bytesToMB(this.thresholds.critical),
        emergency: this.bytesToMB(this.thresholds.emergency),
      },
      status: this.getMemoryStatus(current.heapUsed),
      timestamp: current.timestamp,
    };
  }

  private getMemoryStatus(heapUsed: number): string {
    if (heapUsed >= this.thresholds.emergency) return 'EMERGENCY';
    if (heapUsed >= this.thresholds.critical) return 'CRITICAL';
    if (heapUsed >= this.thresholds.warning) return 'WARNING';
    return 'HEALTHY';
  }

  private bytesToMB(bytes: number): number {
    return Math.round((bytes / 1024 / 1024) * 100) / 100;
  }

  destroy(): void {
    this.stop();
    this.stats = [];
  }
}

// Global memory monitor instance
export const globalMemoryMonitor = new MemoryMonitor();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  globalMemoryMonitor.start(30000); // Every 30 seconds in production
} else {
  globalMemoryMonitor.start(60000); // Every minute in development
}

// Graceful shutdown
process.on('SIGTERM', () => {
  globalMemoryMonitor.destroy();
});

process.on('SIGINT', () => {
  globalMemoryMonitor.destroy();
});

export default MemoryMonitor;

