/**
 * Frontend Logger Utility
 * Centralized logging for the web application
 * 
 * @epic-3.1-monitoring: Structured logging for better debugging
 * @performance: Efficient logging with configurable levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private logLevel: LogLevel;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 100;

  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.MODE === 'production';
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 
                    (this.isProduction ? 'warn' : 'debug');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${contextStr}`;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      stack: error?.stack
    };

    this.addToBuffer(entry);

    // In development, use console with colors
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(level, message, context);
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage, context);
          break;
        case 'error':
          console.error(formattedMessage, context, error);
          break;
      }
    } else {
      // In production, only log errors and warnings to console
      if (level === 'error' || level === 'warn') {
        console[level](this.formatMessage(level, message, context));
      }
      
      // Send to external logging service (e.g., Sentry, LogRocket)
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // TODO: Integrate with external logging service
    // Examples: Sentry, LogRocket, Datadog, etc.
    if (entry.level === 'error' && window.Sentry) {
      // window.Sentry.captureException(new Error(entry.message));
    }
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error messages
   */
  error(message: string, contextOrError?: Record<string, any> | Error, error?: Error): void {
    let context: Record<string, any> | undefined;
    let err: Error | undefined;

    if (contextOrError instanceof Error) {
      err = contextOrError;
    } else {
      context = contextOrError;
      err = error;
    }

    this.log('error', message, context, err);
  }

  /**
   * Get recent log entries (useful for debugging)
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearLogs(): void {
    this.logBuffer = [];
  }

  /**
   * Set log level dynamically
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('Log level changed', { newLevel: level });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, any>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
  error: (message: string, contextOrError?: Record<string, any> | Error, error?: Error) => 
    logger.error(message, contextOrError, error)
};

export default logger;
