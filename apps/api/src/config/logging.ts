/**
 * Centralized Logging Configuration
 * 
 * Provides environment-specific logging configurations for:
 * - Development: Verbose console output with colors
 * - Production: Structured JSON logs with file output and monitoring
 * - Testing: Silent mode with minimal output
 */

import { LogLevel, LogCategory } from '../utils/logger'

export interface LoggingConfig {
  level: LogLevel
  enableConsole: boolean
  enableFileLogging: boolean
  enableAggregation: boolean
  enableExternalLogging: boolean // DataDog, Loggly, custom HTTP
  logDirectory: string
  maxFileSize: number
  maxFiles: number
  colorOutput: boolean
  structuredOutput: boolean
  enableRequestLogging: boolean
  enableSecurityLogging: boolean
  enableDatabaseLogging: boolean
  enablePerformanceLogging: boolean
  slowRequestThreshold: number
  categoryFilters: LogCategory[]
  excludePaths: string[]
  sensitiveHeaders: string[]
}

/**
 * Get environment-specific logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  const env = process.env.NODE_ENV || 'development'
  
  // Base configuration
  const baseConfig: LoggingConfig = {
    level: 'info',
    enableConsole: true,
    enableFileLogging: false,
    enableAggregation: true,
    enableExternalLogging: false, // DataDog, Loggly, custom HTTP
    logDirectory: './logs',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    colorOutput: false,
    structuredOutput: false,
    enableRequestLogging: true,
    enableSecurityLogging: true,
    enableDatabaseLogging: false,
    enablePerformanceLogging: true,
    slowRequestThreshold: 1000, // 1 second
    categoryFilters: [],
    excludePaths: ['/health', '/favicon.ico', '/meridian-logomark.png'],
    sensitiveHeaders: ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
  }

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        level: (process.env.LOG_LEVEL as LogLevel) || 'debug',
        colorOutput: process.stdout.isTTY,
        enableDatabaseLogging: process.env.LOG_DATABASE === 'true',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        excludePaths: ['/health', '/favicon.ico', '/meridian-logomark.png', '/api/db/metrics'] // Exclude frequent health checks
      }

    case 'production':
      return {
        ...baseConfig,
        level: (process.env.LOG_LEVEL as LogLevel) || 'warn',
        enableFileLogging: true,
        enableExternalLogging: process.env.ENABLE_EXTERNAL_LOGGING === 'true', // DataDog, Loggly, etc.
        structuredOutput: true,
        enableDatabaseLogging: false, // Too verbose for production
        slowRequestThreshold: 2000, // 2 seconds in production
        categoryFilters: process.env.LOG_CATEGORIES 
          ? process.env.LOG_CATEGORIES.split(',').map(c => c.trim().toUpperCase() as LogCategory)
          : [],
      }

    case 'staging':
      return {
        ...baseConfig,
        level: (process.env.LOG_LEVEL as LogLevel) || 'info',
        enableFileLogging: true,
        structuredOutput: true,
        enableDatabaseLogging: process.env.LOG_DATABASE === 'true',
        slowRequestThreshold: 1500, // 1.5 seconds
      }

    case 'test':
      return {
        ...baseConfig,
        level: 'silent',
        enableConsole: false,
        enableFileLogging: false,
        enableAggregation: false,
        enableRequestLogging: false,
        enableSecurityLogging: false,
        enablePerformanceLogging: false,
      }

    default:
      return baseConfig
  }
}

/**
 * Log rotation configuration for production
 */
export interface LogRotationConfig {
  enabled: boolean
  maxSize: string
  maxFiles: number
  compress: boolean
  datePattern: string
}

export function getLogRotationConfig(): LogRotationConfig {
  const isProd = process.env.NODE_ENV === 'production'
  
  return {
    enabled: isProd || process.env.LOG_ROTATION === 'true',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    compress: isProd,
    datePattern: 'YYYY-MM-DD'
  }
}

/**
 * Security logging configuration
 */
export interface SecurityLoggingConfig {
  enabled: boolean
  logFailedLogins: boolean
  logSuspiciousRequests: boolean
  logRateLimitViolations: boolean
  logIpBlacklist: string[]
  suspiciousPatterns: string[]
  alertThresholds: {
    failedLogins: number
    suspiciousRequests: number
    timeWindow: number // minutes
  }
}

export function getSecurityLoggingConfig(): SecurityLoggingConfig {
  return {
    enabled: process.env.SECURITY_LOGGING !== 'false',
    logFailedLogins: true,
    logSuspiciousRequests: true,
    logRateLimitViolations: true,
    logIpBlacklist: process.env.IP_BLACKLIST?.split(',') || [],
    suspiciousPatterns: [
      '/admin', '/wp-admin', '/.env', '/config', '/phpMyAdmin',
      'union select', 'drop table', 'delete from', '<script>',
      '<?php', 'eval(', 'system(', 'exec('
    ],
    alertThresholds: {
      failedLogins: parseInt(process.env.FAILED_LOGIN_THRESHOLD || '5'),
      suspiciousRequests: parseInt(process.env.SUSPICIOUS_REQUEST_THRESHOLD || '10'),
      timeWindow: parseInt(process.env.ALERT_TIME_WINDOW || '15') // 15 minutes
    }
  }
}

/**
 * Performance logging configuration
 */
export interface PerformanceLoggingConfig {
  enabled: boolean
  slowQueryThreshold: number
  slowRequestThreshold: number
  memoryUsageLogging: boolean
  cpuUsageLogging: boolean
  metricsInterval: number // seconds
}

export function getPerformanceLoggingConfig(): PerformanceLoggingConfig {
  return {
    enabled: process.env.PERFORMANCE_LOGGING !== 'false',
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'), // 1 second
    slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'), // 1 second
    memoryUsageLogging: process.env.LOG_MEMORY_USAGE === 'true',
    cpuUsageLogging: process.env.LOG_CPU_USAGE === 'true',
    metricsInterval: parseInt(process.env.METRICS_INTERVAL || '60') // 1 minute
  }
}

export default {
  getLoggingConfig,
  getLogRotationConfig,
  getSecurityLoggingConfig,
  getPerformanceLoggingConfig
}

