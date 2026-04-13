/**
 * @epic-6.1-advanced-analytics - User Activity Collector
 * @persona-all - Track user behavior for analytics insights
 */

import { getAnalyticsEngine, type AnalyticsEvent, type AnalyticsMetric } from '../AnalyticsEngine';
import { logger } from '../../utils/logger';

export interface UserActivity {
  userId: string;
  action: string;
  target?: string;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  actions: number;
  lastActivity: Date;
}

export interface UserBehavior {
  userId: string;
  featureUsage: Record<string, number>;
  timeSpent: Record<string, number>;
  commonActions: string[];
  preferences: Record<string, any>;
  lastActive: Date;
}

export class UserActivityCollector {
  private analyticsEngine = getAnalyticsEngine();
  private sessions: Map<string, UserSession> = new Map();
  private behaviors: Map<string, UserBehavior> = new Map();
  private isCollecting: boolean = false;

  // CRITICAL: Store event handlers and observers for proper cleanup
  private clickHandler: ((event: Event) => void) | null = null;
  private submitHandler: ((event: Event) => void) | null = null;
  private mutationObserver: MutationObserver | null = null;
  private activityHandlers: Map<string, (event: Event) => void> = new Map();
  private sessionTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Register with analytics engine
    this.analyticsEngine.registerCollector('userActivity', this);
    
    // Set up event listeners
    this.setupEventListeners();
    
    logger.info('User Activity Collector initialized');
  }

  private setupEventListeners(): void {
    // Track page views
    if (typeof window !== 'undefined') {
      this.trackPageView();
      this.trackUserInteractions();
      this.trackSessionActivity();
    }
  }

  /**
   * Start collecting user activity
   */
  startCollecting(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.analyticsEngine.emit('collectorStarted', { name: 'userActivity' });
    
    logger.info('User activity collection started');
  }

  /**
   * Stop collecting user activity
   */
  stopCollecting(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    this.endAllSessions();
    this.analyticsEngine.emit('collectorStopped', { name: 'userActivity' });
    
    logger.info('User activity collection stopped');
  }

  /**
   * Track a user action
   */
  async trackAction(
    userId: string,
    action: string,
    options: {
      target?: string;
      duration?: number;
      metadata?: Record<string, any>;
      sessionId?: string;
    } = {}
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    const activity: UserActivity = {
      userId,
      action,
      target: options.target,
      duration: options.duration,
      metadata: options.metadata,
      timestamp: new Date(),
    };

    // Track with analytics engine
    await this.analyticsEngine.trackEvent('user_action', {
      action,
      target: options.target,
      duration: options.duration,
      metadata: options.metadata,
    }, {
      userId,
      sessionId: options.sessionId,
    });

    // Update user behavior
    this.updateUserBehavior(userId, action, options);

    // Update session
    if (options.sessionId) {
      this.updateSession(options.sessionId, userId);
    }

    logger.debug('User action tracked', { userId, action, target: options.target });
  }

  /**
   * Track page view
   */
  async trackPageView(
    userId?: string,
    options: {
      page: string;
      referrer?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.trackEvent('page_view', {
      page: options.page,
      referrer: options.referrer,
      metadata: options.metadata,
    }, {
      userId,
      sessionId: options.sessionId,
    });

    // Update session
    if (options.sessionId && userId) {
      this.updateSession(options.sessionId, userId);
    }

    logger.debug('Page view tracked', { userId, page: options.page });
  }

  /**
   * Start a user session
   */
  startSession(userId: string, sessionId: string): void {
    const session: UserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      pageViews: 0,
      actions: 0,
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    
    logger.debug('User session started', { userId, sessionId });
  }

  /**
   * End a user session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();

    // Record session metrics
    this.analyticsEngine.recordMetric('session_duration', session.duration, {
      unit: 'ms',
      dimensions: { userId: session.userId },
      metadata: {
        pageViews: session.pageViews,
        actions: session.actions,
      },
    });

    this.sessions.delete(sessionId);
    
    logger.debug('User session ended', { 
      userId: session.userId, 
      sessionId, 
      duration: session.duration 
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(
    userId: string,
    feature: string,
    options: {
      duration?: number;
      success?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.trackEvent('feature_usage', {
      feature,
      duration: options.duration,
      success: options.success,
      metadata: options.metadata,
    }, {
      userId,
    });

    // Update feature usage in behavior
    const behavior = this.behaviors.get(userId) || this.createDefaultBehavior(userId);
    behavior.featureUsage[feature] = (behavior.featureUsage[feature] || 0) + 1;
    this.behaviors.set(userId, behavior);

    logger.debug('Feature usage tracked', { userId, feature, success: options.success });
  }

  /**
   * Track time spent on features
   */
  async trackTimeSpent(
    userId: string,
    feature: string,
    duration: number
  ): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    await this.analyticsEngine.recordMetric('time_spent', duration, {
      unit: 'ms',
      dimensions: { feature, userId },
    });

    // Update time spent in behavior
    const behavior = this.behaviors.get(userId) || this.createDefaultBehavior(userId);
    behavior.timeSpent[feature] = (behavior.timeSpent[feature] || 0) + duration;
    this.behaviors.set(userId, behavior);

    logger.debug('Time spent tracked', { userId, feature, duration });
  }

  /**
   * Get user behavior insights
   */
  getUserBehavior(userId: string): UserBehavior | null {
    return this.behaviors.get(userId) || null;
  }

  /**
   * Get all user behaviors
   */
  getAllBehaviors(): UserBehavior[] {
    return Array.from(this.behaviors.values());
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    activeSessions: number;
    totalSessions: number;
    averageSessionDuration: number;
  } {
    const activeSessions = this.sessions.size;
    const sessions = Array.from(this.sessions.values());
    
    const completedSessions = sessions.filter(s => s.duration);
    const averageDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0;

    return {
      activeSessions,
      totalSessions: sessions.length,
      averageSessionDuration: averageDuration,
    };
  }

  /**
   * Generate user behavior insights
   */
  async generateBehaviorInsights(userId: string): Promise<any[]> {
    const behavior = this.getUserBehavior(userId);
    if (!behavior) {
      return [];
    }

    const insights = [];

    // Most used feature
    const mostUsedFeature = Object.entries(behavior.featureUsage)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (mostUsedFeature) {
      insights.push({
        type: 'feature_usage',
        title: 'Most Used Feature',
        description: `You use "${mostUsedFeature[0]}" the most (${mostUsedFeature[1]} times)`,
        data: { feature: mostUsedFeature[0], usage: mostUsedFeature[1] },
      });
    }

    // Time spent analysis
    const mostTimeSpent = Object.entries(behavior.timeSpent)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (mostTimeSpent) {
      const hours = Math.round(mostTimeSpent[1] / (1000 * 60 * 60) * 100) / 100;
      insights.push({
        type: 'time_analysis',
        title: 'Most Time Spent',
        description: `You spend the most time on "${mostTimeSpent[0]}" (${hours} hours)`,
        data: { feature: mostTimeSpent[0], hours },
      });
    }

    // Activity patterns
    const daysSinceLastActive = Math.floor(
      (Date.now() - behavior.lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActive > 7) {
      insights.push({
        type: 'activity_pattern',
        title: 'Inactive User',
        description: `You haven't been active for ${daysSinceLastActive} days`,
        severity: 'medium',
        actionable: true,
        actionUrl: '/dashboard',
      });
    }

    return insights;
  }

  /**
   * Browser-specific tracking setup
   */
  private trackPageView(): void {
    if (typeof window === 'undefined') return;

    // Track initial page view
    this.trackPageView(undefined, {
      page: window.location.pathname,
      referrer: document.referrer,
    });

    // Track navigation changes
    let currentPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        this.trackPageView(undefined, {
          page: currentPath,
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // CRITICAL: Store observer for cleanup
    this.mutationObserver = observer;
  }

  /**
   * Track user interactions
   */
  private trackUserInteractions(): void {
    if (typeof window === 'undefined') return;

    // Track clicks - CRITICAL: Store handler for cleanup
    this.clickHandler = (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-analytics-action') || 'click';
      const userId = this.getCurrentUserId();

      this.trackAction(userId, action, {
        target: target.tagName.toLowerCase(),
        metadata: {
          className: target.className,
          id: target.id,
          text: target.textContent?.substring(0, 100),
        },
      });
    };
    document.addEventListener('click', this.clickHandler);

    // Track form submissions - CRITICAL: Store handler for cleanup
    this.submitHandler = (event) => {
      const form = event.target as HTMLFormElement;
      const userId = this.getCurrentUserId();

      this.trackAction(userId, 'form_submit', {
        target: form.action || 'unknown',
        metadata: {
          formId: form.id,
          formClass: form.className,
        },
      });
    };
    document.addEventListener('submit', this.submitHandler);
  }

  /**
   * Track session activity
   */
  private trackSessionActivity(): void {
    if (typeof window === 'undefined') return;

    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const resetSessionTimeout = () => {
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
      }
      this.sessionTimeout = setTimeout(() => {
        // Session expired
        this.endAllSessions();
      }, SESSION_TIMEOUT);
    };

    // Reset timeout on user activity - CRITICAL: Store handlers for cleanup
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(eventType => {
      const handler = () => resetSessionTimeout();
      this.activityHandlers.set(eventType, handler);
      document.addEventListener(eventType, handler, true);
    });

    resetSessionTimeout();
  }

  /**
   * Update user behavior
   */
  private updateUserBehavior(
    userId: string,
    action: string,
    options: { duration?: number; metadata?: Record<string, any> }
  ): void {
    const behavior = this.behaviors.get(userId) || this.createDefaultBehavior(userId);
    
    // Update common actions
    if (!behavior.commonActions.includes(action)) {
      behavior.commonActions.push(action);
      if (behavior.commonActions.length > 10) {
        behavior.commonActions = behavior.commonActions.slice(-10);
      }
    }

    // Update last activity
    behavior.lastActive = new Date();

    this.behaviors.set(userId, behavior);
  }

  /**
   * Update session
   */
  private updateSession(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.actions++;
      session.lastActivity = new Date();
    } else {
      this.startSession(userId, sessionId);
    }
  }

  /**
   * End all active sessions
   */
  private endAllSessions(): void {
    for (const sessionId of this.sessions.keys()) {
      this.endSession(sessionId);
    }
  }

  /**
   * Create default behavior for user
   */
  private createDefaultBehavior(userId: string): UserBehavior {
    return {
      userId,
      featureUsage: {},
      timeSpent: {},
      commonActions: [],
      preferences: {},
      lastActive: new Date(),
    };
  }

  /**
   * Get current user ID (placeholder - should be integrated with auth system)
   */
  private getCurrentUserId(): string {
    // This should be integrated with your authentication system
    return 'current_user';
  }

  /**
   * CRITICAL: Dispose method to cleanup all event listeners and observers
   * Call this when the collector is no longer needed to prevent memory leaks
   */
  public dispose(): void {
    // Remove click listener
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }

    // Remove submit listener
    if (this.submitHandler) {
      document.removeEventListener('submit', this.submitHandler);
      this.submitHandler = null;
    }

    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Remove all activity event listeners
    this.activityHandlers.forEach((handler, eventType) => {
      document.removeEventListener(eventType, handler, true);
    });
    this.activityHandlers.clear();

    // Clear session timeout
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }

    // End all sessions
    this.endAllSessions();

    // Clear maps
    this.sessions.clear();
    this.behaviors.clear();

    this.isCollecting = false;

    logger.info('UserActivityCollector disposed and cleaned up');
  }
}

// Export singleton instance
export const getUserActivityCollector = (): UserActivityCollector => {
  return new UserActivityCollector();
}; 