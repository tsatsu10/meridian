/**
 * 🔊 Enhanced Logging System with Environment-Based Controls
 * 
 * Addresses console logging noise by providing comprehensive log level
 * enforcement, structured output, and environment-specific configurations.
 */

import fs from 'fs/promises';
import path from 'path';
import { getLogAggregationService, LogMetrics } from '../services/log-aggregation';
import { getLoggingConfig } from '../config/logging';

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';
export type LogCategory = 'SYSTEM' | 'AUTH' | 'DATABASE' | 'API' | 'WEBSOCKET' | 'ERROR' | 'VALIDATION' | 'PERFORMANCE';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFileLogging: boolean;
  logDirectory: string;
  colorOutput: boolean;
  timestampFormat: 'iso' | 'short' | 'none';
  categoryFilters: LogCategory[];
  quietMode: boolean;
  structuredOutput: boolean;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  context?: {
    userId?: string;
    endpoint?: string;
    requestId?: string;
  };
}

class EnhancedLogger {
  private config: LoggerConfig;
  private levels: Record<LogLevel, number> = {
    silent: -1,
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4
  };

  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m'
  };

  constructor() {
    // Get centralized logging configuration
    const loggingConfig = getLoggingConfig();
    
    this.config = {
      level: loggingConfig.level,
      enableConsole: loggingConfig.enableConsole,
      enableFileLogging: loggingConfig.enableFileLogging,
      logDirectory: loggingConfig.logDirectory,
      colorOutput: loggingConfig.colorOutput,
      timestampFormat: loggingConfig.structuredOutput ? 'iso' : 'short',
      categoryFilters: loggingConfig.categoryFilters,
      quietMode: process.env.QUIET_MODE === 'true',
      structuredOutput: loggingConfig.structuredOutput
    };

    // Ensure log directory exists if file logging is enabled
    if (this.config.enableFileLogging) {
      this.ensureLogDirectory();
    }
  }

  private parseCategoryFilters(categoriesEnv?: string): LogCategory[] {
    if (!categoriesEnv) return [];
    return categoriesEnv.split(',').map(c => c.trim().toUpperCase() as LogCategory);
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.logDirectory, { recursive: true });
    } catch (error) {
      // Fall back to console-only logging if directory creation fails
      this.config.enableFileLogging = false;
    }
  }

  private shouldLog(level: LogLevel, category?: LogCategory): boolean {
    // Silent mode blocks everything
    if (this.config.level === 'silent') return false;
    
    // Check log level
    if (this.levels[level] > this.levels[this.config.level]) return false;
    
    // Check category filters
    if (category && this.config.categoryFilters.length > 0) {
      return this.config.categoryFilters.includes(category);
    }
    
    return true;
  }

  private formatTimestamp(): string {
    const now = new Date();
    switch (this.config.timestampFormat) {
      case 'iso':
        return now.toISOString();
      case 'short':
        return now.toLocaleTimeString();
      case 'none':
        return '';
      default:
        return now.toISOString();
    }
  }

  private colorize(text: string, color: keyof typeof this.colors): string {
    if (!this.config.colorOutput) return text;
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  private formatConsoleMessage(entry: LogEntry): string {
    if (this.config.structuredOutput) {
      return JSON.stringify(entry);
    }

    const timestamp = entry.timestamp ? `[${entry.timestamp}] ` : '';
    const level = entry.level.toUpperCase().padEnd(7);
    const category = entry.category ? `[${entry.category}] ` : '';
    
    let coloredLevel = level;
    switch (entry.level) {
      case 'error':
        coloredLevel = this.colorize(level, 'red');
        break;
      case 'warn':
        coloredLevel = this.colorize(level, 'yellow');
        break;
      case 'info':
        coloredLevel = this.colorize(level, 'blue');
        break;
      case 'debug':
        coloredLevel = this.colorize(level, 'cyan');
        break;
      case 'verbose':
        coloredLevel = this.colorize(level, 'gray');
        break;
    }

    return `${this.colorize(timestamp, 'gray')}${coloredLevel}${this.colorize(category, 'magenta')}${entry.message}`;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.enableFileLogging) return;

    try {
      const logFile = path.join(this.config.logDirectory, `app.log`);
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      // Silently fail file logging to avoid recursion
    }
  }

  private async log(
    level: LogLevel,
    message: string,
    data?: any,
    category: LogCategory = 'SYSTEM',
    context?: any
  ): Promise<void> {
    if (!this.shouldLog(level, category)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
      context
    };

    // Console output
    if (this.config.enableConsole && !this.config.quietMode) {
      const formattedMessage = this.formatConsoleMessage(entry);
      
      switch (level) {
        case 'error':
          console.error(formattedMessage, data || '');
          break;
        case 'warn':
          console.warn(formattedMessage, data || '');
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'verbose':
          console.log(formattedMessage);
          break;
      }
    }

    // File output
    await this.writeToFile(entry);

    // Log aggregation for monitoring and analytics
    try {
      const logAggregationService = getLogAggregationService();
      const logMetrics: LogMetrics = {
        timestamp: Date.now(),
        level,
        category,
        message,
        duration: data?.duration,
        userId: context?.userId,
        endpoint: context?.endpoint,
        statusCode: context?.statusCode,
        errorCode: data?.code || data?.errorCode,
        metadata: { ...data, ...context }
      };
      
      logAggregationService.recordLog(logMetrics);
    } catch (error) {
      // Silently fail log aggregation to avoid recursion
    }
  }

  // Standard log methods
  async error(message: string, data?: any, category: LogCategory = 'ERROR', context?: any): Promise<void> {
    await this.log('error', message, data, category, context);
  }

  async warn(message: string, data?: any, category: LogCategory = 'SYSTEM', context?: any): Promise<void> {
    await this.log('warn', message, data, category, context);
  }

  async info(message: string, data?: any, category: LogCategory = 'SYSTEM', context?: any): Promise<void> {
    await this.log('info', message, data, category, context);
  }

  async debug(message: string, data?: any, category: LogCategory = 'SYSTEM', context?: any): Promise<void> {
    await this.log('debug', message, data, category, context);
  }

  async verbose(message: string, data?: any, category: LogCategory = 'SYSTEM', context?: any): Promise<void> {
    await this.log('verbose', message, data, category, context);
  }

  // Category-specific methods
  async auth(level: LogLevel, message: string, data?: any, context?: any): Promise<void> {
    await this.log(level, message, data, 'AUTH', context);
  }

  async database(level: LogLevel, message: string, data?: any, context?: any): Promise<void> {
    await this.log(level, message, data, 'DATABASE', context);
  }

  async api(level: LogLevel, message: string, data?: any, context?: any): Promise<void> {
    await this.log(level, message, data, 'API', context);
  }

  async websocket(level: LogLevel, message: string, data?: any, context?: any): Promise<void> {
    await this.log(level, message, data, 'WEBSOCKET', context);
  }

  async validation(level: LogLevel, message: string, data?: any, context?: any): Promise<void> {
    await this.log(level, message, data, 'VALIDATION', context);
  }

  async performance(level: LogLevel, message: string, data?: any, context?: any): Promise<void> {
    await this.log(level, message, data, 'PERFORMANCE', context);
  }

  // Special system event methods (always visible unless silent mode)
  async startup(message: string, data?: any): Promise<void> {
    if (this.config.level === 'silent') return;
    
    const emoji = this.config.colorOutput ? '🚀' : '[STARTUP]';
    await this.log('info', `${emoji} ${message}`, data, 'SYSTEM');
  }

  async shutdown(message: string, data?: any): Promise<void> {
    if (this.config.level === 'silent') return;
    
    const emoji = this.config.colorOutput ? '🛑' : '[SHUTDOWN]';
    await this.log('info', `${emoji} ${message}`, data, 'SYSTEM');
  }

  async success(message: string, data?: any, category: LogCategory = 'SYSTEM'): Promise<void> {
    if (this.config.level === 'silent') return;
    
    const emoji = this.config.colorOutput ? '✅' : '[SUCCESS]';
    await this.log('info', `${emoji} ${message}`, data, category);
  }

  async failure(message: string, data?: any, category: LogCategory = 'ERROR'): Promise<void> {
    if (this.config.level === 'silent') return;
    
    const emoji = this.config.colorOutput ? '❌' : '[FAILURE]';
    await this.log('error', `${emoji} ${message}`, data, category);
  }

  async security(message: string, data?: any, context?: any): Promise<void> {
    if (this.config.level === 'silent') return;
    
    const emoji = this.config.colorOutput ? '🔒' : '[SECURITY]';
    await this.log('warn', `${emoji} ${message}`, data, 'AUTH', context);
  }

  // Development-only logging
  dev(message: string, data?: any, category: LogCategory = 'SYSTEM'): void {
    if (process.env.NODE_ENV === 'development' && this.shouldLog('debug', category)) {
      const emoji = this.config.colorOutput ? '🔧' : '[DEV]';
      console.debug(this.colorize(`${emoji} ${message}`, 'cyan'), data || '');
    }
  }

  // Performance timing utilities
  time(label: string): void {
    if (this.shouldLog('debug', 'PERFORMANCE')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug', 'PERFORMANCE')) {
      console.timeEnd(label);
    }
  }

  // Request/Response logging utilities
  async request(method: string, url: string, context?: { userId?: string; requestId?: string }): Promise<void> {
    await this.log('info', `${method} ${url}`, { method, url }, 'API', context);
  }

  async response(method: string, url: string, statusCode: number, duration: number, context?: { userId?: string; requestId?: string }): Promise<void> {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    await this.log(level, `${method} ${url} ${statusCode} (${duration}ms)`, { 
      method, url, statusCode, duration 
    }, 'API', context);
  }

  // Structured query logging for database operations
  async query(query: string, duration?: number, context?: { userId?: string; operation?: string }): Promise<void> {
    const truncatedQuery = query.length > 200 ? query.substring(0, 200) + '...' : query;
    await this.log('debug', `DB Query: ${truncatedQuery}`, { 
      fullQuery: query, 
      duration,
      operation: context?.operation 
    }, 'DATABASE', context);
  }

  // WebSocket event logging
  async websocketEvent(event: string, data?: any, context?: { userId?: string; connectionId?: string }): Promise<void> {
    await this.log('debug', `WebSocket: ${event}`, data, 'WEBSOCKET', context);
  }

  // Authentication event logging
  async authEvent(event: string, success: boolean, context?: { userId?: string; email?: string; ip?: string }): Promise<void> {
    const level: LogLevel = success ? 'info' : 'warn';
    const message = `Auth ${event}: ${success ? 'SUCCESS' : 'FAILED'}`;
    await this.log(level, message, { event, success }, 'AUTH', context);
  }

  // Business logic event logging
  async businessEvent(event: string, data?: any, context?: { userId?: string; workspaceId?: string; projectId?: string }): Promise<void> {
    await this.log('info', `Business Event: ${event}`, data, 'SYSTEM', context);
  }

  // Structured validation output (for environment validation, etc.)
  validationResults(title: string, results: { errors: string[], warnings: string[], recommendations: string[] }): void {
    if (this.config.level === 'silent') return;
    
    if (!this.config.enableConsole) return;

    console.debug("\n🔍 ${title}");
    console.info("═══════════════════════════════════════════════════════════════");

    if (results.errors.length === 0) {
      console.info("✅ Validation passed!");
    } else {
      console.error("❌ Validation failed!");
    }

    if (results.errors.length > 0) {
      console.error("\n❌ Errors:");
      results.errors.forEach(error => console.error("   • ${error}"));
    }

    if (results.warnings.length > 0) {
      console.warn("\n⚠️  Warnings:");
      results.warnings.forEach(warning => console.warn("   • ${warning}"));
    }

    if (results.recommendations.length > 0) {
      console.info("\n💡 Recommendations:");
      results.recommendations.forEach(rec => console.info("   • ${rec}"));
    }

    console.info("═══════════════════════════════════════════════════════════════\n");
  }

  // Configuration utilities
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setQuietMode(quiet: boolean): void {
    this.config.quietMode = quiet;
  }

  isDebugEnabled(): boolean {
    return this.shouldLog('debug');
  }

  isVerboseEnabled(): boolean {
    return this.shouldLog('verbose');
  }
}

// Export singleton instance
export const logger = new EnhancedLogger();

// Backward compatibility exports
export const log = logger.info.bind(logger);
export const error = logger.error.bind(logger);
export const warn = logger.warn.bind(logger);
export const info = logger.info.bind(logger);
export const debug = logger.debug.bind(logger);

// Legacy class export for compatibility
export const Logger = EnhancedLogger;

export default logger;

