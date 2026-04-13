/**
 * 📊 Performance & APM Logging System
 * 
 * Comprehensive logging for:
 * - Request/response tracking
 * - Performance metrics
 * - Slow query detection
 * - Error rates
 * - System health
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Console format (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Performance logger (separate from general logs)
export const performanceLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: structuredFormat,
  defaultMeta: { service: 'meridian-api', type: 'performance' },
  transports: [
    // Daily rotating file for performance metrics
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'performance'),
      filename: 'performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
    }),
    
    // Separate file for slow queries
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'slow-queries'),
      filename: 'slow-queries-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'warn',
    }),
  ],
});

// Error logger
export const errorLogger = winston.createLogger({
  level: 'error',
  format: structuredFormat,
  defaultMeta: { service: 'meridian-api', type: 'error' },
  transports: [
    new DailyRotateFile({
      dirname: path.join(LOG_DIR, 'errors'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  performanceLogger.add(new winston.transports.Console({ format: consoleFormat }));
  errorLogger.add(new winston.transports.Console({ format: consoleFormat }));
}

/**
 * Log API request performance
 */
export function logRequestPerformance(data: {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userEmail?: string;
  workspaceId?: string;
  responseSize?: number;
}) {
  const level = data.duration > 1000 ? 'warn' : 'info'; // Warn if > 1 second
  
  performanceLogger.log(level, 'API Request', {
    method: data.method,
    path: data.path,
    statusCode: data.statusCode,
    duration: `${data.duration}ms`,
    userEmail: data.userEmail,
    workspaceId: data.workspaceId,
    responseSize: data.responseSize ? `${data.responseSize} bytes` : undefined,
    slow: data.duration > 1000,
  });
}

/**
 * Log database query performance
 */
export function logQueryPerformance(data: {
  query: string;
  duration: number;
  rowCount?: number;
}) {
  const level = data.duration > 500 ? 'warn' : 'info'; // Warn if > 500ms
  
  performanceLogger.log(level, 'Database Query', {
    query: data.query.substring(0, 200), // Truncate long queries
    duration: `${data.duration}ms`,
    rowCount: data.rowCount,
    slow: data.duration > 500,
  });
}

/**
 * Log cache operations
 */
export function logCacheOperation(data: {
  operation: 'get' | 'set' | 'delete' | 'invalidate';
  key: string;
  hit?: boolean;
  duration?: number;
}) {
  performanceLogger.info('Cache Operation', {
    operation: data.operation,
    key: data.key,
    hit: data.hit,
    duration: data.duration ? `${data.duration}ms` : undefined,
  });
}

/**
 * Log errors with context
 */
export function logError(error: Error, context?: Record<string, any>) {
  errorLogger.error(error.message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
  });
}

/**
 * Performance metrics aggregator
 */
class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();
  
  record(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(value);
  }
  
  getStats(metric: string) {
    const values = this.metrics.get(metric) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  reset() {
    this.metrics.clear();
  }
  
  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [metric, _] of this.metrics) {
      stats[metric] = this.getStats(metric);
    }
    return stats;
  }
}

export const performanceMetrics = new PerformanceMetrics();

// Log aggregated metrics every 5 minutes
setInterval(() => {
  const stats = performanceMetrics.getAllStats();
  if (Object.keys(stats).length > 0) {
    performanceLogger.info('Performance Summary (5min)', stats);
    performanceMetrics.reset();
  }
}, 5 * 60 * 1000);


