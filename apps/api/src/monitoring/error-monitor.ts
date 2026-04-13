/**
 * 🔍 Centralized Error Monitoring System
 * Comprehensive error tracking, alerting, and analytics
 */

import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export interface ErrorContext {
  userId?: string;
  workspaceId?: string;
  endpoint?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  stack?: string;
  timestamp?: Date;
}

export interface ErrorAlert {
  id: string;
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  resolved: boolean;
  tags: string[];
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorsByUser: Record<string, number>;
  errorsByWorkspace: Record<string, number>;
  errorsByHour: Record<string, number>;
  criticalErrors: number;
  resolvedErrors: number;
  averageResolutionTime: number;
}

class ErrorMonitor {
  private alerts: Map<string, ErrorAlert> = new Map();
  private errorLog: ErrorAlert[] = [];
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByEndpoint: {},
    errorsByUser: {},
    errorsByWorkspace: {},
    errorsByHour: {},
    criticalErrors: 0,
    resolvedErrors: 0,
    averageResolutionTime: 0
  };
  
  private alertCallbacks: Array<(alert: ErrorAlert) => void | Promise<void>> = [];
  private metricsCallbacks: Array<(metrics: ErrorMetrics) => void | Promise<void>> = [];

  /**
   * Track a new error
   */
  async trackError(error: Error, context: ErrorContext = {}): Promise<string> {
    const errorId = this.generateErrorId(error, context);
    const severity = this.determineSeverity(error, context);
    const now = new Date();

    // Check if this error already exists
    let alert = this.alerts.get(errorId);
    
    if (alert) {
      // Update existing alert
      alert.frequency++;
      alert.lastOccurrence = now;
    } else {
      // Create new alert
      alert = {
        id: errorId,
        error,
        context: { ...context, timestamp: now },
        severity,
        frequency: 1,
        firstOccurrence: now,
        lastOccurrence: now,
        resolved: false,
        tags: this.generateTags(error, context)
      };
      
      this.alerts.set(errorId, alert);
    }

    // Add to error log
    this.errorLog.push({ ...alert });

    // Update metrics
    await this.updateMetrics(alert);

    // Log the error
    await this.logError(alert);

    // Trigger alerts if needed
    await this.checkAlertThresholds(alert);

    // Persist error data
    await this.persistError(alert);

    return errorId;
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): ErrorAlert | undefined {
    return this.alerts.get(errorId);
  }

  /**
   * Get all errors with optional filtering
   */
  getErrors(filter?: {
    severity?: string;
    resolved?: boolean;
    userId?: string;
    workspaceId?: string;
    endpoint?: string;
    limit?: number;
    offset?: number;
  }): ErrorAlert[] {
    let errors = Array.from(this.alerts.values());

    if (filter) {
      if (filter.severity) {
        errors = errors.filter(e => e.severity === filter.severity);
      }
      if (filter.resolved !== undefined) {
        errors = errors.filter(e => e.resolved === filter.resolved);
      }
      if (filter.userId) {
        errors = errors.filter(e => e.context.userId === filter.userId);
      }
      if (filter.workspaceId) {
        errors = errors.filter(e => e.context.workspaceId === filter.workspaceId);
      }
      if (filter.endpoint) {
        errors = errors.filter(e => e.context.endpoint === filter.endpoint);
      }
    }

    // Sort by last occurrence (most recent first)
    errors.sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime());

    // Apply pagination
    if (filter?.offset || filter?.limit) {
      const start = filter.offset || 0;
      const end = filter.limit ? start + filter.limit : undefined;
      errors = errors.slice(start, end);
    }

    return errors;
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.alerts.get(errorId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    this.metrics.resolvedErrors++;

    // Log resolution
    logger.info('Error resolved', { 
      errorId, 
      resolvedBy, 
      error: alert.error.message,
      context: alert.context
    });

    await this.persistError(alert);
    return true;
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: ErrorAlert) => void | Promise<void>): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Register metrics callback
   */
  onMetricsUpdate(callback: (metrics: ErrorMetrics) => void | Promise<void>): void {
    this.metricsCallbacks.push(callback);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(error: Error, context: ErrorContext): string {
    const errorType = error.constructor.name;
    const message = error.message;
    const endpoint = context.endpoint || 'unknown';
    const hash = this.hashString(`${errorType}:${message}:${endpoint}`);
    return `error_${hash}`;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (
      error.name === 'DatabaseError' || 
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Out of memory') ||
      context.endpoint?.includes('/auth/')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      error.name === 'ValidationError' ||
      error.name === 'AuthenticationError' ||
      error.message.includes('timeout') ||
      context.endpoint?.includes('/payment/')
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      error.name === 'NotFoundError' ||
      error.name === 'PermissionError' ||
      error.message.includes('rate limit')
    ) {
      return 'medium';
    }

    // Default to low severity
    return 'low';
  }

  /**
   * Generate error tags
   */
  private generateTags(error: Error, context: ErrorContext): string[] {
    const tags: string[] = [];

    // Error type tag
    tags.push(`type:${error.constructor.name}`);

    // Endpoint tag
    if (context.endpoint) {
      tags.push(`endpoint:${context.endpoint}`);
    }

    // Method tag
    if (context.method) {
      tags.push(`method:${context.method}`);
    }

    // User tag
    if (context.userId) {
      tags.push(`user:${context.userId}`);
    }

    // Workspace tag
    if (context.workspaceId) {
      tags.push(`workspace:${context.workspaceId}`);
    }

    // Environment tag
    tags.push(`env:${process.env.NODE_ENV || 'development'}`);

    return tags;
  }

  /**
   * Update error metrics
   */
  private async updateMetrics(alert: ErrorAlert): Promise<void> {
    this.metrics.totalErrors++;

    // Error by type
    const errorType = alert.error.constructor.name;
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;

    // Error by endpoint
    if (alert.context.endpoint) {
      this.metrics.errorsByEndpoint[alert.context.endpoint] = 
        (this.metrics.errorsByEndpoint[alert.context.endpoint] || 0) + 1;
    }

    // Error by user
    if (alert.context.userId) {
      this.metrics.errorsByUser[alert.context.userId] = 
        (this.metrics.errorsByUser[alert.context.userId] || 0) + 1;
    }

    // Error by workspace
    if (alert.context.workspaceId) {
      this.metrics.errorsByWorkspace[alert.context.workspaceId] = 
        (this.metrics.errorsByWorkspace[alert.context.workspaceId] || 0) + 1;
    }

    // Error by hour
    const hour = alert.lastOccurrence.getHours().toString();
    this.metrics.errorsByHour[hour] = (this.metrics.errorsByHour[hour] || 0) + 1;

    // Critical errors
    if (alert.severity === 'critical') {
      this.metrics.criticalErrors++;
    }

    // Trigger metrics callbacks
    for (const callback of this.metricsCallbacks) {
      try {
        await callback(this.metrics);
      } catch (error) {
        logger.error('Error in metrics callback', { error });
      }
    }
  }

  /**
   * Log error details
   */
  private async logError(alert: ErrorAlert): Promise<void> {
    const logData = {
      errorId: alert.id,
      severity: alert.severity,
      frequency: alert.frequency,
      error: {
        name: alert.error.name,
        message: alert.error.message,
        stack: alert.error.stack
      },
      context: alert.context,
      tags: alert.tags,
      timestamp: alert.lastOccurrence
    };

    switch (alert.severity) {
      case 'critical':
        logger.error('🚨 CRITICAL ERROR', logData, 'ERROR');
        break;
      case 'high':
        logger.error('⚠️ HIGH SEVERITY ERROR', logData, 'ERROR');
        break;
      case 'medium':
        logger.warn('⚡ MEDIUM SEVERITY ERROR', logData, 'SYSTEM');
        break;
      case 'low':
        logger.info('ℹ️ LOW SEVERITY ERROR', logData, 'SYSTEM');
        break;
    }
  }

  /**
   * Check if alert thresholds are met
   */
  private async checkAlertThresholds(alert: ErrorAlert): Promise<void> {
    const shouldAlert = (
      alert.severity === 'critical' ||
      (alert.severity === 'high' && alert.frequency >= 5) ||
      (alert.severity === 'medium' && alert.frequency >= 10) ||
      (alert.severity === 'low' && alert.frequency >= 20)
    );

    if (shouldAlert) {
      // Trigger alert callbacks
      for (const callback of this.alertCallbacks) {
        try {
          await callback(alert);
        } catch (error) {
          logger.error('Error in alert callback', { error });
        }
      }
    }
  }

  /**
   * Persist error to file system
   */
  private async persistError(alert: ErrorAlert): Promise<void> {
    try {
      const errorDir = './logs/errors';
      await fs.mkdir(errorDir, { recursive: true });

      const date = alert.lastOccurrence.toISOString().split('T')[0];
      const filename = path.join(errorDir, `errors-${date}.json`);

      // Read existing errors for the day
      let errors: any[] = [];
      try {
        const data = await fs.readFile(filename, 'utf8');
        errors = JSON.parse(data);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      // Find and update existing error or add new one
      const existingIndex = errors.findIndex(e => e.id === alert.id);
      const errorData = {
        id: alert.id,
        severity: alert.severity,
        frequency: alert.frequency,
        firstOccurrence: alert.firstOccurrence,
        lastOccurrence: alert.lastOccurrence,
        resolved: alert.resolved,
        error: {
          name: alert.error.name,
          message: alert.error.message,
          stack: alert.error.stack
        },
        context: alert.context,
        tags: alert.tags
      };

      if (existingIndex >= 0) {
        errors[existingIndex] = errorData;
      } else {
        errors.push(errorData);
      }

      await fs.writeFile(filename, JSON.stringify(errors, null, 2));
    } catch (error) {
      logger.error('Failed to persist error', { error });
    }
  }

  /**
   * Hash string for consistent ID generation
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean up old errors (older than 30 days)
   */
  async cleanup(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.lastOccurrence < thirtyDaysAgo) {
        this.alerts.delete(id);
      }
    }

    logger.info('Error monitor cleanup completed', { 
      remainingErrors: this.alerts.size 
    });
  }

  /**
   * Generate error report
   */
  generateReport(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): any {
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const errors = this.errorLog.filter(e => 
      e.lastOccurrence >= startTime && e.lastOccurrence <= now
    );

    return {
      timeRange,
      period: { start: startTime, end: now },
      totalErrors: errors.length,
      criticalErrors: errors.filter(e => e.severity === 'critical').length,
      highSeverityErrors: errors.filter(e => e.severity === 'high').length,
      mediumSeverityErrors: errors.filter(e => e.severity === 'medium').length,
      lowSeverityErrors: errors.filter(e => e.severity === 'low').length,
      topErrorTypes: this.getTopItems(errors.map(e => e.error.constructor.name)),
      topEndpoints: this.getTopItems(errors.map(e => e.context.endpoint).filter(Boolean)),
      errorTrends: this.calculateTrends(errors),
      recentErrors: errors.slice(0, 10),
      metrics: this.metrics
    };
  }

  private getTopItems(items: string[]): Array<{ item: string; count: number }> {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateTrends(errors: ErrorAlert[]): any {
    // Simple trend calculation - could be enhanced
    const hourlyGroups: Record<string, number> = {};

    errors.forEach(error => {
      const hour = error.lastOccurrence.getHours();
      const key = `${hour}:00`;
      hourlyGroups[key] = (hourlyGroups[key] || 0) + 1;
    });

    return hourlyGroups;
  }

  /**
   * Get current error statistics
   */
  getStats(): ErrorMetrics {
    return { ...this.metrics };
  }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor();

// Export class for testing
export { ErrorMonitor };

export default errorMonitor;

