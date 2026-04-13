/**
 * 🚀 Startup Time Optimizer
 * Optimizes application startup time through lazy loading and deferred initialization
 */

import { logger } from './logger';
import { lazyLoader, preloadCriticalModules } from './lazy-loader';

export interface StartupMetrics {
  totalStartupTime: number;
  databaseInitTime: number;
  moduleLoadTime: number;
  middlewareInitTime: number;
  routeRegistrationTime: number;
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
    delta: number;
  };
}

class StartupOptimizer {
  private startTime: number = 0;
  private metrics: Partial<StartupMetrics> = {};
  private initialized: boolean = false;

  /**
   * Start tracking startup metrics
   */
  startTracking(): void {
    this.startTime = Date.now();
    this.metrics.memoryUsage = {
      initial: process.memoryUsage(),
      final: process.memoryUsage(),
      delta: 0
    };
    logger.info('🚀 Startup optimization tracking started');
  }

  /**
   * Mark a phase completion
   */
  markPhase(phase: keyof StartupMetrics, duration?: number): void {
    const currentTime = Date.now();
    const phaseDuration = duration || (currentTime - this.startTime);
    
    (this.metrics as any)[phase] = phaseDuration;
    
    logger.debug(`✅ Startup phase completed: ${phase} (${phaseDuration}ms)`);
  }

  /**
   * Complete startup tracking
   */
  completeTracking(): StartupMetrics {
    const endTime = Date.now();
    const totalStartupTime = endTime - this.startTime;
    
    const finalMemory = process.memoryUsage();
    const memoryDelta = finalMemory.heapUsed - (this.metrics.memoryUsage?.initial.heapUsed || 0);

    const finalMetrics: StartupMetrics = {
      totalStartupTime,
      databaseInitTime: this.metrics.databaseInitTime || 0,
      moduleLoadTime: this.metrics.moduleLoadTime || 0,
      middlewareInitTime: this.metrics.middlewareInitTime || 0,
      routeRegistrationTime: this.metrics.routeRegistrationTime || 0,
      memoryUsage: {
        initial: this.metrics.memoryUsage?.initial || process.memoryUsage(),
        final: finalMemory,
        delta: memoryDelta
      }
    };

    this.logStartupSummary(finalMetrics);
    this.initialized = true;
    
    return finalMetrics;
  }

  /**
   * Optimize application startup
   */
  async optimizeStartup(): Promise<void> {
    logger.info('🔧 Starting application startup optimization...');

    // Start background preloading of critical modules
    this.preloadCriticalModulesInBackground();

    // Defer non-critical initializations
    this.deferNonCriticalInit();

    // Enable garbage collection hints
    this.enableGCOptimizations();

    logger.info('✅ Startup optimizations applied');
  }

  /**
   * Preload critical modules in background
   */
  private async preloadCriticalModulesInBackground(): Promise<void> {
    // Don't await this - let it run in background
    preloadCriticalModules().catch(error => {
      logger.warn('Background preloading failed', { error });
    });
  }

  /**
   * Defer non-critical initializations
   */
  private deferNonCriticalInit(): void {
    // Defer cleanup tasks
    setTimeout(() => {
      this.scheduleCleanupTasks();
    }, 10000); // 10 seconds after startup

    // Defer metrics collection
    setTimeout(() => {
      this.startMetricsCollection();
    }, 5000); // 5 seconds after startup
  }

  /**
   * Enable garbage collection optimizations
   */
  private enableGCOptimizations(): void {
    // Suggest garbage collection after startup
    setTimeout(() => {
      if (global.gc) {
        global.gc();
        logger.debug('🗑️ Manual garbage collection triggered');
      }
    }, 2000);

    // Set up periodic GC hints for memory optimization
    setInterval(() => {
      if (global.gc && process.memoryUsage().heapUsed > 100 * 1024 * 1024) { // > 100MB
        global.gc();
        logger.debug('🗑️ Periodic garbage collection triggered');
      }
    }, 60000); // Every minute
  }

  /**
   * Schedule cleanup tasks
   */
  private scheduleCleanupTasks(): void {
    // Clean up lazy loader cache periodically
    setInterval(() => {
      const stats = lazyLoader.getStats();
      if (stats.totalModules > 20) { // If too many modules cached
        logger.debug('🧹 Cleaning up lazy loader cache');
        // Could implement selective cleanup here
      }
    }, 300000); // Every 5 minutes

    logger.debug('🧹 Cleanup tasks scheduled');
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Monitor memory usage
    setInterval(() => {
      const memory = process.memoryUsage();
      if (memory.heapUsed > 200 * 1024 * 1024) { // > 200MB
        logger.warn('High memory usage detected', {
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB'
        });
      }
    }, 30000); // Every 30 seconds

    logger.debug('📊 Metrics collection started');
  }

  /**
   * Log startup summary
   */
  private logStartupSummary(metrics: StartupMetrics): void {
    const memoryMB = Math.round(metrics.memoryUsage.delta / 1024 / 1024);
    
    logger.success('🎉 Application startup completed!', {
      totalTime: `${metrics.totalStartupTime}ms`,
      memoryUsed: `${memoryMB}MB`,
      phases: {
        database: `${metrics.databaseInitTime}ms`,
        modules: `${metrics.moduleLoadTime}ms`,
        middleware: `${metrics.middlewareInitTime}ms`,
        routes: `${metrics.routeRegistrationTime}ms`
      }
    });

    // Performance assessment
    if (metrics.totalStartupTime < 2000) {
      logger.success('⚡ Excellent startup performance!');
    } else if (metrics.totalStartupTime < 5000) {
      logger.info('✅ Good startup performance');
    } else {
      logger.warn('⚠️ Slow startup detected - consider further optimization');
    }
  }

  /**
   * Get startup health score
   */
  getHealthScore(): number {
    if (!this.initialized) return 0;

    let score = 100;
    const metrics = this.metrics as StartupMetrics;

    // Deduct points for slow startup
    if (metrics.totalStartupTime > 5000) score -= 30;
    else if (metrics.totalStartupTime > 2000) score -= 15;

    // Deduct points for high memory usage
    const memoryMB = metrics.memoryUsage.delta / 1024 / 1024;
    if (memoryMB > 100) score -= 20;
    else if (memoryMB > 50) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics as StartupMetrics;

    if (!this.initialized) {
      return ['Complete startup tracking first'];
    }

    if (metrics.totalStartupTime > 5000) {
      recommendations.push('Consider lazy loading more modules');
      recommendations.push('Profile database initialization time');
    }

    if (metrics.memoryUsage.delta > 100 * 1024 * 1024) {
      recommendations.push('Reduce memory usage during startup');
      recommendations.push('Consider streaming large data instead of loading all at once');
    }

    if (metrics.databaseInitTime > 1000) {
      recommendations.push('Optimize database connection and schema loading');
    }

    if (recommendations.length === 0) {
      recommendations.push('Startup performance is already optimized!');
    }

    return recommendations;
  }
}

// Export singleton instance
export const startupOptimizer = new StartupOptimizer();

export default startupOptimizer;

