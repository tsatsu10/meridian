/**
 * Enhanced Logging Service
 * Structured logging with Winston
 * Phase 1 - Monitoring & Observability
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = process.env.LOG_FILE_PATH || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

/**
 * Create transports based on environment
 */
const transports: winston.transport[] = [];

// Console transport (always)
transports.push(
  new winston.transports.Console({
    format: NODE_ENV === 'production' ? logFormat : consoleFormat,
  })
);

// File transports (production)
if (NODE_ENV === 'production') {
  // Combined logs (all levels)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  );

  // Error logs (errors only)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    })
  );

  // Access logs (HTTP requests)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
    })
  );
}

/**
 * Create logger instance
 */
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Logging utility functions
 */
export class Logger {
  /**
   * Log info message
   */
  static info(message: string, meta?: Record<string, any>) {
    logger.info(message, meta);
  }

  /**
   * Log error message
   */
  static error(message: string, error?: Error | any, meta?: Record<string, any>) {
    logger.error(message, {
      ...meta,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    });
  }

  /**
   * Log warning message
   */
  static warn(message: string, meta?: Record<string, any>) {
    logger.warn(message, meta);
  }

  /**
   * Log debug message
   */
  static debug(message: string, meta?: Record<string, any>) {
    logger.debug(message, meta);
  }

  /**
   * Log HTTP request
   */
  static http(message: string, meta?: Record<string, any>) {
    logger.http(message, meta);
  }

  /**
   * Log database query
   */
  static query(query: string, duration: number, meta?: Record<string, any>) {
    logger.debug('Database query', {
      ...meta,
      query,
      duration,
      type: 'database',
    });
  }

  /**
   * Log authentication event
   */
  static auth(event: string, userId?: string, success: boolean = true, meta?: Record<string, any>) {
    logger.info(`Auth: ${event}`, {
      ...meta,
      userId,
      success,
      type: 'authentication',
    });
  }

  /**
   * Log security event
   */
  static security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: Record<string, any>) {
    logger.warn(`Security: ${event}`, {
      ...meta,
      severity,
      type: 'security',
    });
  }

  /**
   * Log API request
   */
  static request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, any>
  ) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(level, 'API Request', {
      ...meta,
      method,
      path,
      statusCode,
      duration,
      type: 'request',
    });
  }

  /**
   * Log performance metric
   */
  static performance(metric: string, value: number, unit: string, meta?: Record<string, any>) {
    logger.info(`Performance: ${metric}`, {
      ...meta,
      metric,
      value,
      unit,
      type: 'performance',
    });
  }

  /**
   * Log business event
   */
  static business(event: string, meta?: Record<string, any>) {
    logger.info(`Business: ${event}`, {
      ...meta,
      type: 'business',
    });
  }

  /**
   * Log external service call
   */
  static external(
    service: string,
    operation: string,
    success: boolean,
    duration?: number,
    meta?: Record<string, any>
  ) {
    logger.info(`External: ${service} - ${operation}`, {
      ...meta,
      service,
      operation,
      success,
      duration,
      type: 'external',
    });
  }
}

/**
 * Create child logger with context
 */
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log startup information
 */
export function logStartup() {
  logger.info('🚀 Meridian API Server Starting', {
    nodeEnv: NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
  });
}

/**
 * Log shutdown information
 */
export function logShutdown(signal: string) {
  logger.info('🛑 Meridian API Server Shutting Down', {
    signal,
    uptime: process.uptime(),
  });
}

export default logger;


