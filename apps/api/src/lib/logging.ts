/**
 * 🔊 Centralized Logging Service Interface
 * 
 * Re-exports the enhanced logger from utils with a standardized interface
 * for use across the application and in tests.
 */

import logger from '../utils/logger';

// Re-export types
export type { LogLevel, LogCategory } from '../utils/logger';

export interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data?: any;
  context?: {
    userId?: string;
    endpoint?: string;
    requestId?: string;
  };
}

export interface LoggingConfig {
  level: string;
  enableConsole: boolean;
  enableFileLogging: boolean;
  logDirectory: string;
  colorOutput: boolean;
  categoryFilters: string[];
  quietMode: boolean;
  structuredOutput: boolean;
}

/**
 * Centralized logging service instance
 * Wraps the EnhancedLogger with a cleaner interface for tests and services
 */
class LoggingService {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS_IN_MEMORY = 1000;

  /**
   * Create a log entry
   */
  log(entry: Omit<LogEntry, 'timestamp'>): LogEntry {
    const fullEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    // Store in memory for retrieval
    this.logs.push(fullEntry);
    
    // Trim if exceeds max
    if (this.logs.length > this.MAX_LOGS_IN_MEMORY) {
      this.logs = this.logs.slice(-this.MAX_LOGS_IN_MEMORY);
    }

    // Also log using the actual logger
    const logMethod = entry.level.toLowerCase() as keyof typeof logger;
    if (typeof logger[logMethod] === 'function') {
      (logger[logMethod] as any)(entry.message, entry.data, entry.category);
    }

    return fullEntry;
  }

  /**
   * Get log entries with optional filtering
   */
  getLogs(limit?: number, level?: string, category?: string): LogEntry[] {
    let filtered = [...this.logs];

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Clear all stored logs (for testing)
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get log statistics
   */
  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    }

    return {
      total: this.logs.length,
      byLevel,
      byCategory
    };
  }
}

// Export singleton instance
export const loggingService = new LoggingService();

/**
 * Create logging middleware for Hono
 */
export function createLoggingMiddleware(config?: Partial<LoggingConfig>) {
  return async (c: any, next: () => Promise<void>) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    // Log request
    loggingService.log({
      level: 'info',
      category: 'API',
      message: `${method} ${path}`,
      context: {
        requestId: c.get('requestId'),
        userId: c.get('user')?.id
      }
    });

    try {
      await next();
    } catch (error) {
      loggingService.log({
        level: 'error',
        category: 'ERROR',
        message: `Request failed: ${method} ${path}`,
        data: error,
        context: {
          requestId: c.get('requestId'),
          userId: c.get('user')?.id
        }
      });
      throw error;
    } finally {
      const duration = Date.now() - start;
      loggingService.log({
        level: 'debug',
        category: 'PERFORMANCE',
        message: `${method} ${path} completed in ${duration}ms`,
        data: { duration },
        context: {
          requestId: c.get('requestId'),
          userId: c.get('user')?.id
        }
      });
    }
  };
}

// Re-export the actual logger for direct use
export { logger as default };
export { logger };

// Export LogLevel enum for convenience
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

