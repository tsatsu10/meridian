/**
 * Enhanced Security Logging Service
 * 
 * Comprehensive security event logging and monitoring:
 * - Authentication and authorization events
 * - Security violations and threats
 * - Audit trail for compliance
 * - Real-time threat detection
 * - Automated security reporting
 */

import logger from '../utils/logger';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details: Record<string, any>;
  blocked: boolean;
  riskScore: number;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export type SecurityEventType = 
  | 'authentication'
  | 'authorization'
  | 'csrf'
  | 'rate_limit'
  | 'injection_attempt'
  | 'xss_attempt'
  | 'suspicious_activity'
  | 'data_access'
  | 'privilege_escalation'
  | 'account_lockout'
  | 'password_change'
  | 'session_hijack'
  | 'brute_force'
  | 'malicious_upload'
  | 'api_abuse';

export type SecuritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  blockedEvents: number;
  averageRiskScore: number;
  topThreats: Array<{
    type: SecurityEventType;
    count: number;
    lastSeen: Date;
  }>;
  topIPs: Array<{
    ip: string;
    eventCount: number;
    riskScore: number;
    lastSeen: Date;
  }>;
  recentHighRiskEvents: SecurityEvent[];
}

export interface ThreatDetectionRule {
  name: string;
  pattern: RegExp | ((event: SecurityEvent) => boolean);
  severity: SecuritySeverity;
  action: 'log' | 'block' | 'alert';
  threshold?: number;
  timeWindow?: number; // in milliseconds
}

class SecurityLoggingService {
  private events: SecurityEvent[] = [];
  private ipAnalytics = new Map<string, {
    eventCount: number;
    riskScore: number;
    lastSeen: Date;
    events: SecurityEvent[];
  }>();
  private threatRules: ThreatDetectionRule[] = [];
  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory

  constructor() {
    this.initializeDefaultRules();
    this.startPeriodicCleanup();
    logger.info('🛡️ Security Logging Service initialized');
  }

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'riskScore'>): SecurityEvent {
    const fullEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
      riskScore: this.calculateRiskScore(event),
    };

    // Apply threat detection rules
    this.applyThreatDetection(fullEvent);

    // Store event
    this.events.push(fullEvent);

    // Update IP analytics
    this.updateIPAnalytics(fullEvent);

    // Log to standard logger based on severity
    this.logToStandardLogger(fullEvent);

    // Cleanup old events if needed
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    return fullEvent;
  }

  /**
   * Log authentication event
   */
  logAuthenticationEvent(
    type: 'login_success' | 'login_failure' | 'logout' | 'password_reset' | 'account_locked',
    userId: string | undefined,
    ip: string,
    details: Record<string, any> = {}
  ): SecurityEvent {
    return this.logEvent({
      type: 'authentication',
      severity: type.includes('failure') || type === 'account_locked' ? 'medium' : 'info',
      userId,
      ip,
      userAgent: details.userAgent,
      details: { ...details, authType: type },
      blocked: false,
    });
  }

  /**
   * Log authorization event
   */
  logAuthorizationEvent(
    success: boolean,
    userId: string,
    resource: string,
    action: string,
    ip: string,
    details: Record<string, any> = {}
  ): SecurityEvent {
    return this.logEvent({
      type: 'authorization',
      severity: success ? 'info' : 'medium',
      userId,
      ip,
      resource,
      action,
      details,
      blocked: !success,
    });
  }

  /**
   * Log CSRF event
   */
  logCSRFEvent(
    type: 'token_missing' | 'token_invalid' | 'token_generated' | 'validation_success',
    userId: string | undefined,
    ip: string,
    details: Record<string, any> = {}
  ): SecurityEvent {
    return this.logEvent({
      type: 'csrf',
      severity: type.includes('invalid') || type.includes('missing') ? 'high' : 'info',
      userId,
      ip,
      details: { ...details, csrfType: type },
      blocked: type.includes('invalid') || type.includes('missing'),
    });
  }

  /**
   * Log rate limiting event
   */
  logRateLimitEvent(
    ip: string,
    endpoint: string,
    attempts: number,
    limit: number,
    details: Record<string, any> = {}
  ): SecurityEvent {
    return this.logEvent({
      type: 'rate_limit',
      severity: 'medium',
      ip,
      resource: endpoint,
      details: { ...details, attempts, limit },
      blocked: true,
    });
  }

  /**
   * Log injection attempt
   */
  logInjectionAttempt(
    type: 'sql' | 'nosql' | 'ldap' | 'command',
    userId: string | undefined,
    ip: string,
    payload: string,
    blocked: boolean,
    details: Record<string, any> = {}
  ): SecurityEvent {
    return this.logEvent({
      type: 'injection_attempt',
      severity: 'high',
      userId,
      ip,
      details: {
        ...details,
        injectionType: type,
        payload: payload.substring(0, 200), // Truncate for logging
      },
      blocked,
    });
  }

  /**
   * Log XSS attempt
   */
  logXSSAttempt(
    userId: string | undefined,
    ip: string,
    payload: string,
    blocked: boolean,
    details: Record<string, any> = {}
  ): SecurityEvent {
    return this.logEvent({
      type: 'xss_attempt',
      severity: 'high',
      userId,
      ip,
      details: {
        ...details,
        payload: payload.substring(0, 200), // Truncate for logging
      },
      blocked,
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    description: string,
    userId: string | undefined,
    ip: string,
    severity: SecuritySeverity = 'medium',
    details: Record<string, any> = {}
  ): SecurityEvent {
    return this.logEvent({
      type: 'suspicious_activity',
      severity,
      userId,
      ip,
      details: { ...details, description },
      blocked: false,
    });
  }

  /**
   * Get security metrics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): SecurityMetrics {
    let filteredEvents = this.events;

    if (timeRange) {
      filteredEvents = this.events.filter(event => 
        event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }

    const eventsByType = filteredEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const eventsBySeverity = filteredEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<SecuritySeverity, number>);

    const blockedEvents = filteredEvents.filter(event => event.blocked).length;

    const averageRiskScore = filteredEvents.length > 0
      ? filteredEvents.reduce((sum, event) => sum + event.riskScore, 0) / filteredEvents.length
      : 0;

    const topThreats = Object.entries(eventsByType)
      .map(([type, count]) => ({
        type: type as SecurityEventType,
        count,
        lastSeen: filteredEvents
          .filter(e => e.type === type)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || new Date(0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topIPs = Array.from(this.ipAnalytics.entries())
      .map(([ip, data]) => ({
        ip,
        eventCount: data.eventCount,
        riskScore: data.riskScore,
        lastSeen: data.lastSeen,
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    const recentHighRiskEvents = filteredEvents
      .filter(event => event.riskScore >= 70)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return {
      totalEvents: filteredEvents.length,
      eventsByType,
      eventsBySeverity,
      blockedEvents,
      averageRiskScore,
      topThreats,
      topIPs,
      recentHighRiskEvents,
    };
  }

  /**
   * Search events
   */
  searchEvents(criteria: {
    type?: SecurityEventType;
    severity?: SecuritySeverity;
    userId?: string;
    ip?: string;
    timeRange?: { start: Date; end: Date };
    riskScoreMin?: number;
    blocked?: boolean;
  }): SecurityEvent[] {
    return this.events.filter(event => {
      if (criteria.type && event.type !== criteria.type) return false;
      if (criteria.severity && event.severity !== criteria.severity) return false;
      if (criteria.userId && event.userId !== criteria.userId) return false;
      if (criteria.ip && event.ip !== criteria.ip) return false;
      if (criteria.blocked !== undefined && event.blocked !== criteria.blocked) return false;
      if (criteria.riskScoreMin !== undefined && event.riskScore < criteria.riskScoreMin) return false;
      if (criteria.timeRange) {
        if (event.timestamp < criteria.timeRange.start || event.timestamp > criteria.timeRange.end) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Add custom threat detection rule
   */
  addThreatRule(rule: ThreatDetectionRule): void {
    this.threatRules.push(rule);
    logger.info('🔍 Threat detection rule added', { name: rule.name, severity: rule.severity });
  }

  /**
   * Export events as JSON
   */
  exportEvents(criteria?: Parameters<typeof this.searchEvents>[0]): string {
    const events = criteria ? this.searchEvents(criteria) : this.events;
    return JSON.stringify(events, null, 2);
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'riskScore'>): number {
    let score = 0;

    // Base score by severity
    const severityScores = {
      info: 10,
      low: 25,
      medium: 50,
      high: 75,
      critical: 95,
    };
    score += severityScores[event.severity];

    // Increase score for blocked events
    if (event.blocked) {
      score += 20;
    }

    // Increase score based on event type
    const typeScores = {
      authentication: 5,
      authorization: 10,
      csrf: 15,
      rate_limit: 10,
      injection_attempt: 30,
      xss_attempt: 25,
      suspicious_activity: 15,
      data_access: 10,
      privilege_escalation: 35,
      account_lockout: 20,
      password_change: 5,
      session_hijack: 40,
      brute_force: 30,
      malicious_upload: 25,
      api_abuse: 20,
    };
    score += typeScores[event.type] || 0;

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Apply threat detection rules
   */
  private applyThreatDetection(event: SecurityEvent): void {
    for (const rule of this.threatRules) {
      let matches = false;

      if (rule.pattern instanceof RegExp) {
        const searchText = JSON.stringify(event.details);
        matches = rule.pattern.test(searchText);
      } else if (typeof rule.pattern === 'function') {
        matches = rule.pattern(event);
      }

      if (matches) {
        logger.warn(`🚨 Threat rule triggered: ${rule.name}`, {
          eventId: event.id,
          ruleAction: rule.action,
        });

        if (rule.action === 'block') {
          event.blocked = true;
        }

        if (rule.action === 'alert') {
          // In a real implementation, this would trigger alerts
          logger.error(`🚨 SECURITY ALERT: ${rule.name}`, event);
        }
      }
    }
  }

  /**
   * Update IP analytics
   */
  private updateIPAnalytics(event: SecurityEvent): void {
    const analytics = this.ipAnalytics.get(event.ip) || {
      eventCount: 0,
      riskScore: 0,
      lastSeen: new Date(),
      events: [],
    };

    analytics.eventCount++;
    analytics.lastSeen = event.timestamp;
    analytics.events.push(event);

    // Keep only last 100 events per IP
    if (analytics.events.length > 100) {
      analytics.events = analytics.events.slice(-100);
    }

    // Calculate risk score based on recent events
    const recentEvents = analytics.events.filter(e => 
      e.timestamp.getTime() > Date.now() - 3600000 // Last hour
    );

    analytics.riskScore = recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + e.riskScore, 0) / recentEvents.length
      : 0;

    this.ipAnalytics.set(event.ip, analytics);
  }

  /**
   * Log to standard logger
   */
  private logToStandardLogger(event: SecurityEvent): void {
    const logData = {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      blocked: event.blocked,
      riskScore: event.riskScore,
    };

    switch (event.severity) {
      case 'critical':
        logger.error('🚨 CRITICAL SECURITY EVENT', logData);
        break;
      case 'high':
        logger.error('⚠️ HIGH SEVERITY SECURITY EVENT', logData);
        break;
      case 'medium':
        logger.warn('⚠️ SECURITY EVENT', logData);
        break;
      case 'low':
        logger.info('🔍 Low severity security event', logData);
        break;
      case 'info':
        logger.debug('🔍 Security event', logData);
        break;
    }
  }

  /**
   * Initialize default threat detection rules
   */
  private initializeDefaultRules(): void {
    // SQL Injection patterns
    this.addThreatRule({
      name: 'SQL Injection Detection',
      pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|WHERE|AND|OR)\b)/i,
      severity: 'high',
      action: 'block',
    });

    // XSS patterns
    this.addThreatRule({
      name: 'XSS Script Injection',
      pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      severity: 'high',
      action: 'block',
    });

    // Brute force detection
    this.addThreatRule({
      name: 'Brute Force Attack',
      pattern: (event) => {
        if (event.type !== 'authentication' || !event.details.authType?.includes('failure')) {
          return false;
        }
        const recentFailures = this.events.filter(e => 
          e.ip === event.ip &&
          e.type === 'authentication' &&
          e.details.authType?.includes('failure') &&
          e.timestamp.getTime() > Date.now() - 300000 // Last 5 minutes
        );
        return recentFailures.length >= 5;
      },
      severity: 'high',
      action: 'alert',
    });

    // Privilege escalation
    this.addThreatRule({
      name: 'Privilege Escalation Attempt',
      pattern: /\b(admin|administrator|root|superuser|sudo)\b/i,
      severity: 'high',
      action: 'alert',
    });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      // Remove events older than 30 days
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.events = this.events.filter(event => event.timestamp > cutoff);

      // Cleanup IP analytics
      for (const [ip, analytics] of this.ipAnalytics.entries()) {
        analytics.events = analytics.events.filter(event => event.timestamp > cutoff);
        if (analytics.events.length === 0) {
          this.ipAnalytics.delete(ip);
        }
      }
    }, 3600000); // Every hour
  }
}

// Singleton instance
let securityLoggingService: SecurityLoggingService | null = null;

/**
 * Get singleton security logging service instance
 */
export function getSecurityLoggingService(): SecurityLoggingService {
  if (!securityLoggingService) {
    securityLoggingService = new SecurityLoggingService();
  }
  return securityLoggingService;
}

export default SecurityLoggingService;

