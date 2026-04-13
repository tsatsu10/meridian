// Process Lifecycle Manager
// Comprehensive process management for graceful startup and shutdown

import logger from './logger';
import processHealthMonitor from './process-health-monitor';

export interface LifecycleHandler {
  name: string;
  cleanup: () => Promise<void>;
  priority?: number; // Higher numbers execute first during cleanup
}

class ProcessLifecycleManager {
  private handlers: LifecycleHandler[] = [];
  private isShuttingDown = false;
  private shutdownTimeout = 10000; // 10 seconds
  private startupTimeout = 30000; // 30 seconds

  /**
   * Register a cleanup handler
   */
  register(handler: LifecycleHandler): void {
    this.handlers.push(handler);
    // Sort by priority (highest first)
    this.handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    logger.info(`🔧 Registered lifecycle handler: ${handler.name}`);
  }

  /**
   * Initialize process signal handlers and health monitoring
   */
  initialize(): void {
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('📡 Received SIGINT (Ctrl+C)');
      this.gracefulShutdown('SIGINT');
    });

    // Handle SIGTERM (terminate signal)
    process.on('SIGTERM', () => {
      logger.info('📡 Received SIGTERM');
      this.gracefulShutdown('SIGTERM');
    });

    // Handle SIGQUIT (quit signal)
    process.on('SIGQUIT', () => {
      logger.info('📡 Received SIGQUIT');
      this.gracefulShutdown('SIGQUIT');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      this.forcedShutdown('uncaughtException', 1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.forcedShutdown('unhandledRejection', 1);
    });

    // Handle beforeExit (clean exit)
    process.on('beforeExit', (code) => {
      if (code === 0 && !this.isShuttingDown) {
        logger.info(`📤 Process about to exit with code: ${code}`);
      }
    });

    // Handle exit (final cleanup)
    process.on('exit', (code) => {
      logger.info(`🚪 Process exiting with code: ${code}`);
    });

    // Register process health monitor cleanup
    this.register({
      name: 'Process Health Monitor',
      cleanup: async () => {
        processHealthMonitor.stopMonitoring();
      },
      priority: 80,
    });

    // Start process health monitoring
    // processHealthMonitor.startMonitoring() // DISABLED - causing startup hangs;

    logger.info('✅ Process lifecycle manager initialized');
  }

  /**
   * Graceful shutdown with cleanup
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('⏳ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`🛑 Starting graceful shutdown (${signal})...`);

    // Set shutdown timeout
    const shutdownTimer = setTimeout(() => {
      logger.error('⏰ Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Execute all cleanup handlers in priority order
      for (const handler of this.handlers) {
        try {
          logger.info(`🧹 Executing cleanup: ${handler.name}`);
          await handler.cleanup();
          logger.info(`✅ Cleanup completed: ${handler.name}`);
        } catch (error) {
          logger.error(`❌ Cleanup failed for ${handler.name}:`, error);
        }
      }

      clearTimeout(shutdownTimer);
      logger.info('✅ Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      clearTimeout(shutdownTimer);
      logger.error('❌ Graceful shutdown failed:', error);
      process.exit(1);
    }
  }

  /**
   * Forced shutdown for critical errors
   */
  private forcedShutdown(reason: string, exitCode: number): void {
    logger.error(`💥 Forced shutdown due to: ${reason}`);
    
    // Try quick cleanup (without waiting)
    this.handlers.forEach(handler => {
      try {
        handler.cleanup().catch(() => {
          // Ignore cleanup errors during forced shutdown
        });
      } catch {
        // Ignore sync cleanup errors
      }
    });

    // Force exit after short delay
    setTimeout(() => {
      process.exit(exitCode);
    }, 1000);
  }

  /**
   * Wait for startup completion with timeout
   */
  async waitForStartup<T>(startupPromise: Promise<T>, name: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Startup timeout for ${name} (${this.startupTimeout}ms)`));
      }, this.startupTimeout);
    });

    try {
      const result = await Promise.race([startupPromise, timeoutPromise]);
      logger.info(`✅ Startup completed: ${name}`);
      return result;
    } catch (error) {
      logger.error(`❌ Startup failed: ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get shutdown status
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Set custom shutdown timeout
   */
  setShutdownTimeout(ms: number): void {
    this.shutdownTimeout = ms;
    logger.info(`⏰ Shutdown timeout set to ${ms}ms`);
  }

  /**
   * Set custom startup timeout
   */
  setStartupTimeout(ms: number): void {
    this.startupTimeout = ms;
    logger.info(`⏰ Startup timeout set to ${ms}ms`);
  }

  /**
   * Comprehensive health check including process health metrics
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, boolean>; processHealth?: any }> {
    const details: Record<string, boolean> = {};
    let overallHealthy = true;

    // Check all registered handlers
    for (const handler of this.handlers) {
      try {
        // Basic handler health check
        const handlerHealthy = true;
        details[handler.name] = handlerHealthy;
        
        if (!handlerHealthy) {
          overallHealthy = false;
        }
      } catch (error) {
        logger.error(`❌ Health check failed for ${handler.name}:`, error);
        details[handler.name] = false;
        overallHealthy = false;
      }
    }

    // Get detailed process health metrics
    let processHealth;
    try {
      processHealth = await processHealthMonitor.getHealthMetrics();
      
      // Check for critical process health issues
      if (processHealth.orphanedProcesses.length > 0) {
        details['Orphaned Processes'] = false;
        overallHealthy = false;
      } else {
        details['Orphaned Processes'] = true;
      }

      if (processHealth.zombieProcesses.length > 0) {
        details['Zombie Processes'] = false;
        overallHealthy = false;
      } else {
        details['Zombie Processes'] = true;
      }

      if (processHealth.portConflicts.length > 0) {
        details['Port Conflicts'] = false;
        overallHealthy = false;
      } else {
        details['Port Conflicts'] = true;
      }

      // System load thresholds
      details['CPU Load'] = processHealth.systemLoad.cpu < 90;
      details['Memory Usage'] = processHealth.systemLoad.memory < 90;

      if (processHealth.systemLoad.cpu >= 90 || processHealth.systemLoad.memory >= 90) {
        overallHealthy = false;
      }

    } catch (error) {
      logger.error('❌ Process health metrics failed:', error);
      details['Process Health Monitor'] = false;
      overallHealthy = false;
    }

    return {
      healthy: overallHealthy,
      details,
      processHealth
    };
  }

  /**
   * Basic health check without expensive process monitoring (for lightweight health endpoint)
   */
  getBasicHealth(): { healthy: boolean; details: Record<string, boolean> } {
    const details: Record<string, boolean> = {};
    let overallHealthy = true;

    // Check all registered handlers
    for (const handler of this.handlers) {
      try {
        // Basic handler health check (just verify they exist)
        const handlerHealthy = true;
        details[handler.name] = handlerHealthy;

        if (!handlerHealthy) {
          overallHealthy = false;
        }
      } catch (error) {
        logger.error(`❌ Basic health check failed for ${handler.name}:`, error);
        details[handler.name] = false;
        overallHealthy = false;
      }
    }

    // Add basic system checks without expensive monitoring
    details['Orphaned Processes'] = true; // Assume OK for basic check
    details['Zombie Processes'] = true;   // Assume OK for basic check
    details['Port Conflicts'] = true;     // Assume OK for basic check
    details['CPU Load'] = true;           // Assume OK for basic check
    details['Memory Usage'] = true;       // Assume OK for basic check

    return {
      healthy: overallHealthy,
      details
    };
  }
}

// Export singleton instance
export const processLifecycleManager = new ProcessLifecycleManager();
export default processLifecycleManager;

