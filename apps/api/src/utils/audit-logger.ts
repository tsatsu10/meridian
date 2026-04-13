/**
 * 🔍 Comprehensive Audit Logging System
 * Track security-sensitive operations across the WebSocket system
 */

import { logger } from './logger';
import { getDatabase } from "../database/connection";
import { auditLogTable } from '../database/schema';
import { count, gte, desc, eq, and } from 'drizzle-orm';
import { geolocationService } from '../services/geolocation-service';

// Initialize database connection for audit logger
let db: Awaited<ReturnType<typeof getDatabase>>;

async function initializeAuditDatabase() {
  if (!db) {
    db = await getDatabase();
    logger.info('📊 Audit Logger Database connection initialized');
  }
  return db;
}

export interface AuditEvent {
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  workspaceId?: string;
  channelId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'success' | 'failure' | 'blocked';
  retryAttempt?: boolean;
  metadata?: {
    sessionId?: string;
    socketId?: string;
    timestamp?: Date;
    duration?: number;
    errorCode?: string;
    errorMessage?: string;
    location?: {
      country?: string;
      countryCode?: string;
      city?: string;
      timezone?: string;
      isp?: string;
      isProxy?: boolean;
      isTor?: boolean;
      threatLevel?: string;
    };
  };
}

export type AuditEventType =
  | 'authentication'
  | 'authorization' 
  | 'websocket_connection'
  | 'message_operation'
  | 'channel_operation'
  | 'workspace_operation'
  | 'security_violation'
  | 'rate_limit'
  | 'configuration_change'
  | 'data_access'
  | 'admin_operation';

export interface AuditQuery {
  eventTypes?: AuditEventType[];
  userId?: string;
  userEmail?: string;
  workspaceId?: string;
  severity?: string[];
  outcome?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export class AuditLogger {
  private batchQueue: AuditEvent[] = [];
  private batchSize: number;
  private flushInterval: number;
  private retentionDays: number;
  private sensitiveFields: Set<string>;

  constructor(config: {
    batchSize?: number;
    flushInterval?: number;
    retentionDays?: number;
    sensitiveFields?: string[];
  } = {}) {
    this.batchSize = config.batchSize || 100;
    this.flushInterval = config.flushInterval || 10000; // 10 seconds
    this.retentionDays = config.retentionDays || 90;
    this.sensitiveFields = new Set(config.sensitiveFields || [
      'password', 'token', 'secret', 'key', 'authorization'
    ]);

    // Start batch processing
    setInterval(() => {
      this.flushBatch();
    }, this.flushInterval);

    // Clean up old audit logs daily
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000);

    logger.info('Audit logger initialized', {
      batchSize: this.batchSize,
      flushInterval: this.flushInterval,
      retentionDays: this.retentionDays
    });
  }

  /**
   * Log an audit event
   */
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Enrich event with geolocation data if IP address is available
      const enrichedEvent = await this.enrichWithGeolocation(event);
      
      // Sanitize sensitive data
      const sanitizedEvent = this.sanitizeEvent(enrichedEvent);
      
      // Add timestamp if not provided
      if (!sanitizedEvent.metadata?.timestamp) {
        sanitizedEvent.metadata = {
          ...sanitizedEvent.metadata,
          timestamp: new Date()
        };
      }

      // Add to batch queue
      this.batchQueue.push(sanitizedEvent);

      // If batch is full, flush immediately
      if (this.batchQueue.length >= this.batchSize) {
        await this.flushBatch();
      }

      // Log critical events immediately to console
      if (event.severity === 'critical') {
        logger.warn('CRITICAL AUDIT EVENT', {
          eventType: event.eventType,
          action: event.action,
          userEmail: event.userEmail,
          outcome: event.outcome,
          details: event.details,
          location: sanitizedEvent.metadata?.location ? 
            `${sanitizedEvent.metadata.location.city}, ${sanitizedEvent.metadata.location.country}` : 
            undefined
        });
      }

    } catch (error) {
      logger.error('Failed to log audit event', { error, event });
    }
  }

  /**
   * Log authentication events
   */
  async logAuthentication(params: {
    action: 'login' | 'logout' | 'token_validation' | 'session_created' | 'session_expired';
    userEmail?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    outcome: 'success' | 'failure' | 'blocked';
    details?: Record<string, any>;
    errorMessage?: string;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'authentication',
      action: params.action,
      userEmail: params.userEmail,
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      outcome: params.outcome,
      severity: params.outcome === 'failure' ? 'medium' : 'low',
      details: params.details,
      metadata: {
        errorMessage: params.errorMessage,
        timestamp: new Date()
      }
    });
  }

  /**
   * Log WebSocket connection events
   */
  async logWebSocketConnection(params: {
    action: 'connect' | 'disconnect' | 'upgrade' | 'error';
    socketId: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    workspaceId?: string;
    outcome: 'success' | 'failure' | 'blocked';
    details?: Record<string, any>;
    errorMessage?: string;
    duration?: number;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'websocket_connection',
      action: params.action,
      userEmail: params.userEmail,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      workspaceId: params.workspaceId,
      outcome: params.outcome,
      severity: params.outcome === 'blocked' ? 'high' : 'low',
      details: params.details,
      metadata: {
        socketId: params.socketId,
        errorMessage: params.errorMessage,
        duration: params.duration,
        timestamp: new Date()
      }
    });
  }

  /**
   * Log message operations
   */
  async logMessageOperation(params: {
    action: 'send' | 'edit' | 'delete' | 'pin' | 'unpin' | 'react';
    userEmail: string;
    messageId?: string;
    channelId?: string;
    workspaceId?: string;
    ipAddress?: string;
    outcome: 'success' | 'failure' | 'blocked';
    details?: Record<string, any>;
    errorMessage?: string;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'message_operation',
      action: params.action,
      userEmail: params.userEmail,
      resourceId: params.messageId,
      resourceType: 'message',
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      ipAddress: params.ipAddress,
      outcome: params.outcome,
      severity: params.action === 'delete' ? 'medium' : 'low',
      details: params.details,
      metadata: {
        errorMessage: params.errorMessage,
        timestamp: new Date()
      }
    });
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(params: {
    action: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    workspaceId?: string;
    violationType: 'rate_limit' | 'unauthorized_access' | 'malicious_content' | 'injection_attempt' | 'other';
    details: Record<string, any>;
    blockedAction?: string;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'security_violation',
      action: params.action,
      userEmail: params.userEmail,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      workspaceId: params.workspaceId,
      outcome: 'blocked',
      severity: 'high',
      details: {
        violationType: params.violationType,
        blockedAction: params.blockedAction,
        ...params.details
      },
      metadata: {
        timestamp: new Date()
      }
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimit(params: {
    action: 'connection_limit' | 'message_limit' | 'typing_limit' | 'presence_limit';
    userEmail?: string;
    ipAddress: string;
    workspaceId?: string;
    limitType: string;
    currentCount: number;
    maxAllowed: number;
    blockDuration?: number;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'rate_limit',
      action: params.action,
      userEmail: params.userEmail,
      ipAddress: params.ipAddress,
      workspaceId: params.workspaceId,
      outcome: 'blocked',
      severity: 'medium',
      details: {
        limitType: params.limitType,
        currentCount: params.currentCount,
        maxAllowed: params.maxAllowed,
        blockDuration: params.blockDuration
      },
      metadata: {
        timestamp: new Date()
      }
    });
  }

  /**
   * Log admin operations
   */
  async logAdminOperation(params: {
    action: string;
    adminEmail: string;
    targetUserEmail?: string;
    workspaceId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    outcome: 'success' | 'failure';
    details?: Record<string, any>;
    errorMessage?: string;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'admin_operation',
      action: params.action,
      userEmail: params.adminEmail,
      workspaceId: params.workspaceId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress,
      outcome: params.outcome,
      severity: 'high',
      details: {
        targetUserEmail: params.targetUserEmail,
        ...params.details
      },
      metadata: {
        errorMessage: params.errorMessage,
        timestamp: new Date()
      }
    });
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditQuery): Promise<{
    logs: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { eq, and, gte, lte, inArray, count, desc } = await import('drizzle-orm');
      
      const conditions = [];
      
      if (query.eventTypes?.length) {
        conditions.push(inArray(auditLogTable.action, query.eventTypes));
      }

      if (query.userId) {
        conditions.push(eq(auditLogTable.actorId, query.userId));
      }

      if (query.userEmail) {
        conditions.push(eq(auditLogTable.actorEmail, query.userEmail));
      }
      
      if (query.workspaceId) {
        conditions.push(eq(auditLogTable.workspaceId, query.workspaceId));
      }
      
      if (query.severity?.length) {
        conditions.push(inArray(auditLogTable.severity, query.severity));
      }

      // Note: outcome field doesn't exist in schema, skipping this filter
      if (query.outcome?.length) {
        // conditions.push(inArray(auditLogTable.outcome, query.outcome));
      }
      
      if (query.dateFrom) {
        conditions.push(gte(auditLogTable.timestamp, query.dateFrom));
      }
      
      if (query.dateTo) {
        conditions.push(lte(auditLogTable.timestamp, query.dateTo));
      }
      
      if (query.ipAddress) {
        conditions.push(eq(auditLogTable.ipAddress, query.ipAddress));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Initialize database connection
      const database = await initializeAuditDatabase();

      // Get total count
      const [totalResult] = await database
        .select({ count: count() })
        .from(auditLogTable)
        .where(whereClause);
      
      const total = totalResult?.count || 0;
      
      // Get logs
      const logs = await database
        .select()
        .from(auditLogTable)
        .where(whereClause)
        .orderBy(desc(auditLogTable.timestamp))
        .limit(query.limit || 50)
        .offset(query.offset || 0);

      const hasMore = (query.offset || 0) + logs.length < total;

      return { logs, total, hasMore };
      
    } catch (error) {
      logger.error('Failed to query audit logs', { error, query });
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsByOutcome: Record<string, number>;
    topUsers: Array<{ userEmail: string; count: number }>;
    topIPs: Array<{ ipAddress: string; count: number }>;
  }> {
    try {
      const { sql, gte, count, desc } = await import('drizzle-orm');

      // Initialize database connection
      const database = await initializeAuditDatabase();
      
      // Calculate timeframe start
      const now = new Date();
      const timeframeStart = new Date();
      switch (timeframe) {
        case 'hour':
          timeframeStart.setHours(now.getHours() - 1);
          break;
        case 'day':
          timeframeStart.setDate(now.getDate() - 1);
          break;
        case 'week':
          timeframeStart.setDate(now.getDate() - 7);
          break;
        case 'month':
          timeframeStart.setMonth(now.getMonth() - 1);
          break;
      }

      // Total events
      const [totalResult] = await database
        .select({ count: count() })
        .from(auditLogTable)
        .where(gte(auditLogTable.timestamp, timeframeStart));
      
      const totalEvents = totalResult?.count || 0;

      // Events by type (using action field)
      const eventTypeResults = await database
        .select({
          eventType: auditLogTable.action,
          count: count()
        })
        .from(auditLogTable)
        .where(gte(auditLogTable.timestamp, timeframeStart))
        .groupBy(auditLogTable.action);

      const eventsByType: Record<string, number> = {};
      eventTypeResults.forEach(result => {
        eventsByType[result.eventType] = result.count;
      });

      // Events by severity
      const severityResults = await database
        .select({
          severity: auditLogTable.severity,
          count: count()
        })
        .from(auditLogTable)
        .where(gte(auditLogTable.timestamp, timeframeStart))
        .groupBy(auditLogTable.severity);

      const eventsBySeverity: Record<string, number> = {};
      severityResults.forEach(result => {
        eventsBySeverity[result.severity] = result.count;
      });

      // Events by outcome (category field as proxy)
      const outcomeResults = await database
        .select({
          outcome: auditLogTable.category,
          count: count()
        })
        .from(auditLogTable)
        .where(gte(auditLogTable.timestamp, timeframeStart))
        .groupBy(auditLogTable.category);

      const eventsByOutcome: Record<string, number> = {};
      outcomeResults.forEach(result => {
        if (result.outcome) {
          eventsByOutcome[result.outcome] = result.count;
        }
      });

      // Top users
      const topUserResults = await database
        .select({
          userEmail: auditLogTable.actorEmail,
          count: count()
        })
        .from(auditLogTable)
        .where(gte(auditLogTable.timestamp, timeframeStart))
        .groupBy(auditLogTable.actorEmail)
        .orderBy(desc(count()))
        .limit(10);

      const topUsers = topUserResults
        .filter(result => result.userEmail)
        .map(result => ({
          userEmail: result.userEmail!,
          count: result.count
        }));

      // Top IPs
      const topIPResults = await database
        .select({
          ipAddress: auditLogTable.ipAddress,
          count: count()
        })
        .from(auditLogTable)
        .where(gte(auditLogTable.timestamp, timeframeStart))
        .groupBy(auditLogTable.ipAddress)
        .orderBy(desc(count()))
        .limit(10);

      const topIPs = topIPResults
        .filter(result => result.ipAddress)
        .map(result => ({
          ipAddress: result.ipAddress!,
          count: result.count
        }));

      return {
        totalEvents,
        eventsByType,
        eventsBySeverity,
        eventsByOutcome,
        topUsers,
        topIPs
      };

    } catch (error) {
      logger.error('Failed to get audit statistics', { error });
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByOutcome: {},
        topUsers: [],
        topIPs: []
      };
    }
  }

  /**
   * Sanitize event data to remove sensitive information
   */
  /**
   * Enrich audit event with geolocation data
   */
  private async enrichWithGeolocation(event: AuditEvent): Promise<AuditEvent> {
    // Skip if no IP address or geolocation already provided
    if (!event.ipAddress || event.metadata?.location) {
      return event;
    }

    try {
      const location = await geolocationService.getLocation(event.ipAddress);
      
      if (location) {
        return {
          ...event,
          metadata: {
            ...event.metadata,
            location: {
              country: location.country,
              countryCode: location.countryCode,
              city: location.city,
              timezone: location.timezone,
              isp: location.isp,
              isProxy: location.isProxy,
              isTor: location.isTor,
              threatLevel: location.threatLevel,
            },
          },
        };
      }
    } catch (error) {
      // Silently fail - geolocation is supplementary data
      logger.debug('Failed to enrich audit event with geolocation:', error);
    }

    return event;
  }

  private sanitizeEvent(event: AuditEvent): AuditEvent {
    const sanitized = { ...event };
    
    // Sanitize details object
    if (sanitized.details) {
      sanitized.details = this.sanitizeObject(sanitized.details);
    }
    
    // Sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata);
    }
    
    return sanitized;
  }

  /**
   * Recursively sanitize an object
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (this.sensitiveFields.has(lowerKey) || 
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Flush batch queue to database
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Initialize database connection
      const database = await initializeAuditDatabase();

      const currentTime = new Date();
      const auditRecords = batch.map(event => ({
        action: event.action || 'unknown',
        resourceType: event.resourceType || 'unknown',
        resourceId: event.resourceId || null,
        actorId: event.userId || 'system',
        actorEmail: event.userEmail || 'system@meridian.app',
        actorType: 'user',
        workspaceId: event.workspaceId || null,
        projectId: null, // Map from event if needed
        oldValues: null,
        newValues: event.details ? JSON.stringify(event.details) : null,
        changes: null,
        ipAddress: event.ipAddress || null,
        userAgent: event.userAgent || null,
        sessionId: event.metadata?.sessionId || null,
        requestId: null,
        severity: event.severity || 'info',
        category: event.eventType || 'general', // Map eventType to category
        description: event.action || 'Audit event',
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        retentionPolicy: 'standard',
        isSystemGenerated: false,
        timestamp: currentTime, // Always use current timestamp
        date: currentTime.toISOString().split('T')[0] // Ensure date is always set
      }));

      await database.insert(auditLogTable).values(auditRecords);
      
      logger.info(`Flushed ${batch.length} audit events to database`);

    } catch (error) {
      logger.error('Failed to flush audit batch', { error, batchSize: batch.length });

      // Don't retry database connection errors to prevent infinite loops
      // Instead, log the error and drop the batch to prevent memory buildup
      if (error.message?.includes('no such table') || error.code === '42P01') { // PostgreSQL relation does not exist
        logger.warn('Dropping audit batch due to database schema error - audit logging disabled until fixed', {
          batchSize: batch.length,
          errorCode: error.code
        });
      } else {
        // For other errors, retry only once
        if (!batch[0]?.retryAttempt) {
          batch.forEach(event => { event.retryAttempt = true; });
          this.batchQueue.unshift(...batch);
        } else {
          logger.warn('Dropping audit batch after failed retry', { batchSize: batch.length });
        }
      }
    }
  }

  /**
   * Clean up old audit logs
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const { lt } = await import('drizzle-orm');

      // Initialize database connection
      const database = await initializeAuditDatabase();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const result = await database
        .delete(auditLogTable)
        .where(lt(auditLogTable.timestamp, cutoffDate));
      
      logger.info(`Cleaned up old audit logs older than ${this.retentionDays} days`);
      
    } catch (error) {
      logger.error('Failed to cleanup old audit logs', { error });
    }
  }

  /**
   * Force flush all pending events
   */
  async flush(): Promise<void> {
    await this.flushBatch();
  }

  /**
   * Get audit system health
   */
  getHealth(): {
    queueSize: number;
    isHealthy: boolean;
    lastFlush: Date;
    retentionDays: number;
  } {
    return {
      queueSize: this.batchQueue.length,
      isHealthy: this.batchQueue.length < this.batchSize * 2,
      lastFlush: new Date(), // Could track this more precisely
      retentionDays: this.retentionDays
    };
  }
}

// Create default audit logger instance
export const auditLogger = new AuditLogger({
  batchSize: parseInt(process.env.AUDIT_BATCH_SIZE || '100'),
  flushInterval: parseInt(process.env.AUDIT_FLUSH_INTERVAL || '10000'),
  retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90'),
  sensitiveFields: (process.env.AUDIT_SENSITIVE_FIELDS || 'password,token,secret,key,authorization').split(',')
});

export default auditLogger;

