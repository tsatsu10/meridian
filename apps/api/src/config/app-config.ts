/**
 * 🔧 Centralized Application Configuration Management
 * 
 * Addresses hardcoded configuration values scattered throughout the codebase
 * by providing a centralized, environment-aware configuration system.
 */

import { z } from 'zod';
import { DEFAULT_API_PORT } from './default-api-port';

// Configuration schema with validation and defaults
const configSchema = z.object({
  // Server Configuration
  server: z.object({
    port: z.number().int().min(1000).max(65535).default(DEFAULT_API_PORT),
    host: z.string().default('localhost'),
    timeout: z.number().int().min(1000).max(300000).default(30000), // 30 seconds
    keepAliveTimeout: z.number().int().min(1000).max(120000).default(65000), // 65 seconds
    maxRequestSize: z.string().default('50mb'),
    corsOrigins: z.array(z.string()).default(['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'])
  }).default({}),

  // Database Configuration
  database: z.object({
    connectionTimeout: z.number().int().min(1000).max(60000).default(10000), // 10 seconds
    queryTimeout: z.number().int().min(1000).max(120000).default(30000), // 30 seconds
    maxConnections: z.number().int().min(1).max(100).default(10),
    idleTimeout: z.number().int().min(1000).max(300000).default(60000), // 1 minute
    retryAttempts: z.number().int().min(0).max(10).default(3),
    retryDelay: z.number().int().min(100).max(10000).default(1000) // 1 second
  }).default({}),

  // Pagination and Limits
  pagination: z.object({
    defaultLimit: z.number().int().min(1).max(1000).default(50),
    maxLimit: z.number().int().min(1).max(10000).default(1000),
    exportLimit: z.number().int().min(1).max(100000).default(10000)
  }).default({}),

  // Memory and Performance
  performance: z.object({
    memoryThreshold: z.number().min(0.1).max(1.0).default(0.85), // 85% memory usage threshold
    cpuThreshold: z.number().min(0.1).max(1.0).default(0.8), // 80% CPU usage threshold
    diskThreshold: z.number().min(0.1).max(1.0).default(0.9), // 90% disk usage threshold
    maxLogSize: z.number().int().min(1024).max(1073741824).default(52428800), // 50MB
    maxRetainedErrors: z.number().int().min(100).max(100000).default(10000),
    gcInterval: z.number().int().min(10000).max(3600000).default(300000) // 5 minutes
  }).default({}),

  // WebSocket Configuration
  websocket: z.object({
    pingInterval: z.number().int().min(1000).max(300000).default(30000), // 30 seconds
    pongTimeout: z.number().int().min(1000).max(60000).default(5000), // 5 seconds
    maxConnections: z.number().int().min(1).max(10000).default(1000),
    messageQueueSize: z.number().int().min(10).max(10000).default(1000),
    broadcastThrottle: z.number().int().min(10).max(5000).default(100), // 100ms
    reconnectAttempts: z.number().int().min(1).max(20).default(5),
    reconnectDelay: z.number().int().min(1000).max(30000).default(3000) // 3 seconds
  }).default({}),

  // Security Configuration
  security: z.object({
    rateLimitWindow: z.number().int().min(1000).max(3600000).default(900000), // 15 minutes
    rateLimitMax: z.number().int().min(1).max(10000).default(100),
    sessionTimeout: z.number().int().min(300000).max(86400000).default(3600000), // 1 hour
    jwtExpiry: z.number().int().min(300).max(86400).default(3600), // 1 hour in seconds
    maxFailedAttempts: z.number().int().min(1).max(20).default(5),
    lockoutDuration: z.number().int().min(60000).max(3600000).default(900000), // 15 minutes
    passwordMinLength: z.number().int().min(6).max(128).default(8)
  }).default({}),

  // File and Upload Configuration
  files: z.object({
    maxFileSize: z.number().int().min(1024).max(1073741824).default(104857600), // 100MB
    allowedTypes: z.array(z.string()).default([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]),
    uploadTimeout: z.number().int().min(10000).max(300000).default(60000), // 1 minute
    thumbnailSize: z.number().int().min(50).max(1000).default(200),
    compressionQuality: z.number().min(0.1).max(1.0).default(0.8)
  }).default({}),

  // API Configuration
  api: z.object({
    requestTimeout: z.number().int().min(1000).max(300000).default(30000), // 30 seconds
    maxConcurrentRequests: z.number().int().min(1).max(1000).default(100),
    slowQueryThreshold: z.number().int().min(100).max(10000).default(1000), // 1 second
    cacheTimeout: z.number().int().min(1000).max(3600000).default(300000), // 5 minutes
    retryAttempts: z.number().int().min(0).max(10).default(3),
    retryDelay: z.number().int().min(100).max(10000).default(1000) // 1 second
  }).default({}),

  // Notification Configuration
  notifications: z.object({
    queueSize: z.number().int().min(10).max(100000).default(10000),
    batchSize: z.number().int().min(1).max(1000).default(100),
    processingInterval: z.number().int().min(1000).max(300000).default(5000), // 5 seconds
    retryAttempts: z.number().int().min(0).max(10).default(3),
    retryDelay: z.number().int().min(1000).max(300000).default(30000), // 30 seconds
    emailTimeout: z.number().int().min(5000).max(120000).default(30000) // 30 seconds
  }).default({}),

  // Integration Configuration
  integrations: z.object({
    slackApiLimit: z.number().int().min(1).max(10000).default(1000),
    googleApiTimeout: z.number().int().min(5000).max(120000).default(30000),
    webhookTimeout: z.number().int().min(1000).max(60000).default(10000),
    oauthTokenExpiry: z.number().int().min(300).max(86400).default(3600), // 1 hour in seconds
    maxWebhookRetries: z.number().int().min(0).max(10).default(3)
  }).default({}),

  // Calendar Configuration
  calendar: z.object({
    defaultReminderMinutes: z.number().int().min(1).max(10080).default(15), // 15 minutes
    emailReminderMinutes: z.number().int().min(1).max(43200).default(1440), // 1 day
    maxEventsPerRequest: z.number().int().min(1).max(1000).default(250),
    syncInterval: z.number().int().min(60000).max(86400000).default(3600000) // 1 hour
  }).default({}),

  // Analytics Configuration
  analytics: z.object({
    maxDateRange: z.number().int().min(86400000).max(31536000000).default(31536000000), // 1 year
    aggregationInterval: z.number().int().min(3600000).max(86400000).default(86400000), // 1 day
    retentionDays: z.number().int().min(30).max(2555).default(365), // 1 year
    batchSize: z.number().int().min(10).max(10000).default(1000)
  }).default({}),

  // Automation Configuration
  automation: z.object({
    minTriggerInterval: z.number().int().min(1000).max(86400000).default(60000), // 1 minute
    maxTriggerInterval: z.number().int().min(60000).max(2592000000).default(86400000), // 1 day
    maxRulesPerWorkspace: z.number().int().min(1).max(10000).default(1000),
    executionTimeout: z.number().int().min(1000).max(300000).default(30000), // 30 seconds
    maxConditions: z.number().int().min(1).max(100).default(10),
    maxActions: z.number().int().min(1).max(100).default(10)
  }).default({}),

  // APM (Application Performance Monitoring) Configuration
  apm: z.object({
    enabled: z.boolean().default(true),
    responseTimeWarning: z.number().int().min(100).max(30000).default(1000), // 1 second
    responseTimeCritical: z.number().int().min(500).max(60000).default(2000), // 2 seconds
    errorRateWarning: z.number().min(0.1).max(50).default(5), // 5%
    errorRateCritical: z.number().min(1).max(100).default(10), // 10%
    metricsRetentionHours: z.number().int().min(1).max(720).default(168), // 1 week
    maxMetricsHistory: z.number().int().min(1000).max(100000).default(10000),
    collectSystemMetrics: z.boolean().default(true),
    collectDatabaseMetrics: z.boolean().default(true),
    collectWebSocketMetrics: z.boolean().default(true),
    alertingEnabled: z.boolean().default(true),
    monitoringInterval: z.number().int().min(10000).max(300000).default(30000) // 30 seconds
  }).default({})
});

export type AppConfig = z.infer<typeof configSchema>;

class ConfigurationManager {
  private config: AppConfig;
  private isLoaded: boolean = false;

  constructor() {
    this.config = this.loadConfiguration();
    this.isLoaded = true;
  }

  /**
   * Load configuration from environment variables with fallbacks
   */
  private loadConfiguration(): AppConfig {
    const rawConfig = {
      server: {
        port: this.parseNumber(process.env.API_PORT, DEFAULT_API_PORT),
        host: process.env.HOST || 'localhost',
        timeout: this.parseNumber(process.env.SERVER_TIMEOUT, 30000),
        keepAliveTimeout: this.parseNumber(process.env.KEEP_ALIVE_TIMEOUT, 65000),
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '50mb',
        corsOrigins: this.parseArray(process.env.CORS_ORIGINS, ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'])
      },
      database: {
        connectionTimeout: this.parseNumber(process.env.DB_CONNECTION_TIMEOUT, 10000),
        queryTimeout: this.parseNumber(process.env.DB_QUERY_TIMEOUT, 30000),
        maxConnections: this.parseNumber(process.env.DB_MAX_CONNECTIONS, 10),
        idleTimeout: this.parseNumber(process.env.DB_IDLE_TIMEOUT, 60000),
        retryAttempts: this.parseNumber(process.env.DB_RETRY_ATTEMPTS, 3),
        retryDelay: this.parseNumber(process.env.DB_RETRY_DELAY, 1000)
      },
      pagination: {
        defaultLimit: this.parseNumber(process.env.DEFAULT_PAGE_LIMIT, 50),
        maxLimit: this.parseNumber(process.env.MAX_PAGE_LIMIT, 1000),
        exportLimit: this.parseNumber(process.env.EXPORT_LIMIT, 10000)
      },
      performance: {
        memoryThreshold: this.parseFloat(process.env.MEMORY_THRESHOLD, 0.85),
        cpuThreshold: this.parseFloat(process.env.CPU_THRESHOLD, 0.8),
        diskThreshold: this.parseFloat(process.env.DISK_THRESHOLD, 0.9),
        maxLogSize: this.parseNumber(process.env.MAX_LOG_SIZE, 52428800),
        maxRetainedErrors: this.parseNumber(process.env.MAX_RETAINED_ERRORS, 10000),
        gcInterval: this.parseNumber(process.env.GC_INTERVAL, 300000)
      },
      websocket: {
        pingInterval: this.parseNumber(process.env.WS_PING_INTERVAL, 60000), // Increased from 30s to 1min
        pongTimeout: this.parseNumber(process.env.WS_PONG_TIMEOUT, 5000),
        maxConnections: this.parseNumber(process.env.WS_MAX_CONNECTIONS, 1000),
        messageQueueSize: this.parseNumber(process.env.WS_MESSAGE_QUEUE_SIZE, 1000),
        broadcastThrottle: this.parseNumber(process.env.WS_BROADCAST_THROTTLE, 100),
        reconnectAttempts: this.parseNumber(process.env.WS_RECONNECT_ATTEMPTS, 5),
        reconnectDelay: this.parseNumber(process.env.WS_RECONNECT_DELAY, 3000)
      },
      security: {
        rateLimitWindow: this.parseNumber(process.env.RATE_LIMIT_WINDOW, 900000),
        rateLimitMax: this.parseNumber(process.env.RATE_LIMIT_MAX, 100),
        sessionTimeout: this.parseNumber(process.env.SESSION_TIMEOUT, 3600000),
        jwtExpiry: this.parseNumber(process.env.JWT_EXPIRY, 3600),
        maxFailedAttempts: this.parseNumber(process.env.MAX_FAILED_ATTEMPTS, 5),
        lockoutDuration: this.parseNumber(process.env.LOCKOUT_DURATION, 900000),
        passwordMinLength: this.parseNumber(process.env.PASSWORD_MIN_LENGTH, 8)
      },
      files: {
        maxFileSize: this.parseNumber(process.env.MAX_FILE_SIZE, 104857600),
        allowedTypes: this.parseArray(process.env.ALLOWED_FILE_TYPES, [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'application/json'
        ]),
        uploadTimeout: this.parseNumber(process.env.UPLOAD_TIMEOUT, 60000),
        thumbnailSize: this.parseNumber(process.env.THUMBNAIL_SIZE, 200),
        compressionQuality: this.parseFloat(process.env.COMPRESSION_QUALITY, 0.8)
      },
      api: {
        requestTimeout: this.parseNumber(process.env.API_REQUEST_TIMEOUT, 30000),
        maxConcurrentRequests: this.parseNumber(process.env.MAX_CONCURRENT_REQUESTS, 100),
        slowQueryThreshold: this.parseNumber(process.env.SLOW_QUERY_THRESHOLD, 1000),
        cacheTimeout: this.parseNumber(process.env.CACHE_TIMEOUT, 300000),
        retryAttempts: this.parseNumber(process.env.API_RETRY_ATTEMPTS, 3),
        retryDelay: this.parseNumber(process.env.API_RETRY_DELAY, 1000)
      },
      notifications: {
        queueSize: this.parseNumber(process.env.NOTIFICATION_QUEUE_SIZE, 10000),
        batchSize: this.parseNumber(process.env.NOTIFICATION_BATCH_SIZE, 100),
        processingInterval: this.parseNumber(process.env.NOTIFICATION_PROCESSING_INTERVAL, 5000),
        retryAttempts: this.parseNumber(process.env.NOTIFICATION_RETRY_ATTEMPTS, 3),
        retryDelay: this.parseNumber(process.env.NOTIFICATION_RETRY_DELAY, 30000),
        emailTimeout: this.parseNumber(process.env.EMAIL_TIMEOUT, 30000)
      },
      integrations: {
        slackApiLimit: this.parseNumber(process.env.SLACK_API_LIMIT, 1000),
        googleApiTimeout: this.parseNumber(process.env.GOOGLE_API_TIMEOUT, 30000),
        webhookTimeout: this.parseNumber(process.env.WEBHOOK_TIMEOUT, 10000),
        oauthTokenExpiry: this.parseNumber(process.env.OAUTH_TOKEN_EXPIRY, 3600),
        maxWebhookRetries: this.parseNumber(process.env.MAX_WEBHOOK_RETRIES, 3)
      },
      calendar: {
        defaultReminderMinutes: this.parseNumber(process.env.DEFAULT_REMINDER_MINUTES, 15),
        emailReminderMinutes: this.parseNumber(process.env.EMAIL_REMINDER_MINUTES, 1440),
        maxEventsPerRequest: this.parseNumber(process.env.MAX_EVENTS_PER_REQUEST, 250),
        syncInterval: this.parseNumber(process.env.CALENDAR_SYNC_INTERVAL, 3600000)
      },
      analytics: {
        maxDateRange: this.parseNumber(process.env.ANALYTICS_MAX_DATE_RANGE, 31536000000),
        aggregationInterval: this.parseNumber(process.env.ANALYTICS_AGGREGATION_INTERVAL, 86400000),
        retentionDays: this.parseNumber(process.env.ANALYTICS_RETENTION_DAYS, 365),
        batchSize: this.parseNumber(process.env.ANALYTICS_BATCH_SIZE, 1000)
      },
      automation: {
        minTriggerInterval: this.parseNumber(process.env.AUTOMATION_MIN_TRIGGER_INTERVAL, 60000),
        maxTriggerInterval: this.parseNumber(process.env.AUTOMATION_MAX_TRIGGER_INTERVAL, 86400000),
        maxRulesPerWorkspace: this.parseNumber(process.env.AUTOMATION_MAX_RULES_PER_WORKSPACE, 1000),
        executionTimeout: this.parseNumber(process.env.AUTOMATION_EXECUTION_TIMEOUT, 30000),
        maxConditions: this.parseNumber(process.env.AUTOMATION_MAX_CONDITIONS, 10),
        maxActions: this.parseNumber(process.env.AUTOMATION_MAX_ACTIONS, 10)
      },
      apm: {
        enabled: this.parseBoolean(process.env.APM_ENABLED, true),
        responseTimeWarning: this.parseNumber(process.env.APM_RESPONSE_TIME_WARNING, 1000),
        responseTimeCritical: this.parseNumber(process.env.APM_RESPONSE_TIME_CRITICAL, 2000),
        errorRateWarning: this.parseFloat(process.env.APM_ERROR_RATE_WARNING, 5),
        errorRateCritical: this.parseFloat(process.env.APM_ERROR_RATE_CRITICAL, 10),
        metricsRetentionHours: this.parseNumber(process.env.APM_METRICS_RETENTION_HOURS, 168),
        maxMetricsHistory: this.parseNumber(process.env.APM_MAX_METRICS_HISTORY, 10000),
        collectSystemMetrics: this.parseBoolean(process.env.APM_COLLECT_SYSTEM_METRICS, true),
        collectDatabaseMetrics: this.parseBoolean(process.env.APM_COLLECT_DATABASE_METRICS, true),
        collectWebSocketMetrics: this.parseBoolean(process.env.APM_COLLECT_WEBSOCKET_METRICS, true),
        alertingEnabled: this.parseBoolean(process.env.APM_ALERTING_ENABLED, true),
        monitoringInterval: this.parseNumber(process.env.APM_MONITORING_INTERVAL, 30000)
      }
    };

    // Validate and return configuration
    return configSchema.parse(rawConfig);
  }

  /**
   * Parse number from environment variable with fallback
   */
  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Parse float from environment variable with fallback
   */
  private parseFloat(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Parse array from comma-separated string with fallback
   */
  private parseArray(value: string | undefined, fallback: string[]): string[] {
    if (!value) return fallback;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  /**
   * Parse boolean from environment variable with fallback
   */
  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get the complete configuration
   */
  getConfig(): AppConfig {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  /**
   * Get server configuration
   */
  getServerConfig() {
    return this.config.server;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return this.config.database;
  }

  /**
   * Get pagination configuration
   */
  getPaginationConfig() {
    return this.config.pagination;
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig() {
    return this.config.performance;
  }

  /**
   * Get WebSocket configuration
   */
  getWebSocketConfig() {
    return this.config.websocket;
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return this.config.security;
  }

  /**
   * Get file configuration
   */
  getFileConfig() {
    return this.config.files;
  }

  /**
   * Get API configuration
   */
  getApiConfig() {
    return this.config.api;
  }

  /**
   * Get notification configuration
   */
  getNotificationConfig() {
    return this.config.notifications;
  }

  /**
   * Get integration configuration
   */
  getIntegrationConfig() {
    return this.config.integrations;
  }

  /**
   * Get calendar configuration
   */
  getCalendarConfig() {
    return this.config.calendar;
  }

  /**
   * Get analytics configuration
   */
  getAnalyticsConfig() {
    return this.config.analytics;
  }

  /**
   * Get automation configuration
   */
  getAutomationConfig() {
    return this.config.automation;
  }

  /**
   * Get APM configuration
   */
  getAPMConfig() {
    return this.config.apm;
  }

  /**
   * Reload configuration (useful for testing or dynamic updates)
   */
  reload(): void {
    this.config = this.loadConfiguration();
  }

  /**
   * Get configuration summary for debugging
   */
  getSummary(): Record<string, any> {
    return {
      server: {
        port: this.config.server.port,
        timeout: this.config.server.timeout
      },
      database: {
        connectionTimeout: this.config.database.connectionTimeout,
        maxConnections: this.config.database.maxConnections
      },
      performance: {
        memoryThreshold: this.config.performance.memoryThreshold,
        maxLogSize: this.config.performance.maxLogSize
      },
      pagination: {
        defaultLimit: this.config.pagination.defaultLimit,
        maxLimit: this.config.pagination.maxLimit
      }
    };
  }

  /**
   * Validate configuration against environment constraints
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
      if (this.config.performance.memoryThreshold > 0.95) {
        errors.push('Memory threshold too high for production (max 95%)');
      }
      if (this.config.pagination.maxLimit > 5000) {
        errors.push('Max pagination limit too high for production (max 5000)');
      }
      if (this.config.security.jwtExpiry > 86400) {
        errors.push('JWT expiry too long for production (max 24 hours)');
      }
    }

    // Development-specific validations
    if (process.env.NODE_ENV === 'development') {
      if (this.config.server.timeout < 5000) {
        errors.push('Server timeout too short for development (min 5 seconds)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const appConfig = new ConfigurationManager();

// Export individual configuration getters for convenience
export const getServerConfig = () => appConfig.getServerConfig();
export const getDatabaseConfig = () => appConfig.getDatabaseConfig();
export const getPaginationConfig = () => appConfig.getPaginationConfig();
export const getPerformanceConfig = () => appConfig.getPerformanceConfig();
export const getWebSocketConfig = () => appConfig.getWebSocketConfig();
export const getSecurityConfig = () => appConfig.getSecurityConfig();
export const getFileConfig = () => appConfig.getFileConfig();
export const getApiConfig = () => appConfig.getApiConfig();
export const getNotificationConfig = () => appConfig.getNotificationConfig();
export const getIntegrationConfig = () => appConfig.getIntegrationConfig();
export const getCalendarConfig = () => appConfig.getCalendarConfig();
export const getAnalyticsConfig = () => appConfig.getAnalyticsConfig();
export const getAutomationConfig = () => appConfig.getAutomationConfig();
export const getAPMConfig = () => appConfig.getAPMConfig();

export default appConfig;

