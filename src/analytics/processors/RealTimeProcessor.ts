/**
 * @epic-6.1-advanced-analytics - Real-time Data Processor
 * @persona-all - Process live data for real-time insights
 */
import { getAnalyticsEngine, type AnalyticsEvent, type AnalyticsMetric } from '../AnalyticsEngine';
import { logger } from '../../utils/logger';

export interface RealTimeData {
  timestamp: Date;
  type: string;
  data: Record<string, any>;
  userId?: string;
  sessionId?: string;
  source: string;
}

export interface RealTimeInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'pattern' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  data: Record<string, any>;
  timestamp: Date;
  expiresAt?: Date;
}

export interface ProcessingRule {
  id: string;
  name: string;
  condition: (data: RealTimeData) => boolean;
  action: (data: RealTimeData) => Promise<RealTimeInsight | null>;
  enabled: boolean;
  priority: number;
}

export class RealTimeProcessor {
  private analyticsEngine = getAnalyticsEngine();
  private processingRules: Map<string, ProcessingRule> = new Map();
  private dataBuffer: RealTimeData[] = [];
  private insights: RealTimeInsight[] = [];
  private isProcessing: boolean = true; // Assume always processing when data is pushed
  private bufferSize: number = 1000; // Still relevant for internal buffering if needed, but not for polling
  private insightsCache: RealTimeInsight[] | null = null;
  private lastCacheUpdateTime: number = 0;
  private cacheDuration: number = 5000; // Cache insights for 5 seconds

  constructor() {
    this.setupDefaultRules();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.analyticsEngine.on('event', this.handleEvent.bind(this));
    this.analyticsEngine.on('metric', this.handleMetric.bind(this));
  }

  private setupDefaultRules(): void {
    // High activity detection
    this.addRule({
      id: 'high_activity',
      name: 'High User Activity Detection',
      condition: (data) => {
        return data.type === 'user_action' && 
               data.data.actionCount > 50;
      },
      action: async (data) => {
        return {
          id: `high_activity_${Date.now()}`,
          type: 'trend',
          title: 'High User Activity Detected',
          description: `User ${data.userId} is showing high activity with ${data.data.actionCount} actions`,
          severity: 'medium',
          data: { userId: data.userId, actionCount: data.data.actionCount },
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        };
      },
      enabled: true,
      priority: 1
    });

    // Performance degradation detection
    this.addRule({
      id: 'performance_degradation',
      name: 'Performance Degradation Detection',
      condition: (data) => {
        return data.type === 'api_performance' && 
               data.data.responseTime > 2000;
      },
      action: async (data) => {
        return {
          id: `perf_degradation_${Date.now()}`,
          type: 'alert',
          title: 'Performance Degradation Detected',
          description: `API endpoint ${data.data.endpoint} is experiencing slow response times`,
          severity: 'high',
          data: { endpoint: data.data.endpoint, responseTime: data.data.responseTime },
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 1800000) // 30 minutes
        };
      },
      enabled: true,
      priority: 2
    });

    // Error spike detection
    this.addRule({
      id: 'error_spike',
      name: 'Error Spike Detection',
      condition: (data) => {
        return data.type === 'error' && 
               this.getRecentErrorCount(data.source) > 10;
      },
      action: async (data) => {
        return {
          id: `error_spike_${Date.now()}`,
          type: 'alert',
          title: 'Error Spike Detected',
          description: `High number of errors detected from ${data.source}`,
          severity: 'high',
          data: { source: data.source, errorCount: this.getRecentErrorCount(data.source) },
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 900000) // 15 minutes
        };
      },
      enabled: true,
      priority: 3
    });

    // User behavior pattern detection
    this.addRule({
      id: 'user_pattern',
      name: 'User Behavior Pattern Detection',
      condition: (data) => {
        return data.type === 'user_action' && 
               this.detectUserPattern(data.userId!, data.data.action);
      },
      action: async (data) => {
        return {
          id: `user_pattern_${Date.now()}`,
          type: 'pattern',
          title: 'User Behavior Pattern Detected',
          description: `Unusual behavior pattern detected for user ${data.userId}`,
          severity: 'medium',
          data: { userId: data.userId, pattern: data.data.action },
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 7200000) // 2 hours
        };
      },
      enabled: true,
      priority: 1
    });
  }

  

  addRule(rule: ProcessingRule): void {
    this.processingRules.set(rule.id, rule);
    logger.info(`Added processing rule: ${rule.name}`);
  }

  removeRule(ruleId: string): void {
    this.processingRules.delete(ruleId);
    logger.info(`Removed processing rule: ${ruleId}`);
  }

  updateRule(ruleId: string, updates: Partial<ProcessingRule>): void {
    const rule = this.processingRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      logger.info(`Updated processing rule: ${ruleId}`);
    }
  }

  async processData(data: RealTimeData): Promise<void> {
    if (!this.isProcessing) return;

    this.dataBuffer.push(data);

    // Process immediately when data arrives
    await this.processSingleDataPoint(data);
  }

  public async pushWebSocketData(data: RealTimeData): Promise<void> {
    await this.processData(data);
  }

  private async processSingleDataPoint(data: RealTimeData): Promise<void> {
    const insights: RealTimeInsight[] = [];

    try {
      const ruleInsights = await this.applyRules(data);
      insights.push(...ruleInsights);
    } catch (error) {
      logger.error('Error processing real-time data:', error);
    }

    // Add new insights
    this.insights.push(...insights);

    // Clean up expired insights
    this.cleanupExpiredInsights();

    // Keep only recent insights (last 1000)
    if (this.insights.length > 1000) {
      this.insights = this.insights.slice(-1000);
    }

    // Emit insights
    for (const insight of insights) {
      this.analyticsEngine.emit('real_time_insight', insight);
    }

    logger.debug(`Processed 1 data point, generated ${insights.length} insights`);
  }

  private async applyRules(data: RealTimeData): Promise<RealTimeInsight[]> {
    const insights: RealTimeInsight[] = [];

    // Sort rules by priority (higher priority first)
    const sortedRules = Array.from(this.processingRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        if (rule.condition(data)) {
          const insight = await rule.action(data);
          if (insight) {
            insights.push(insight);
          }
        }
      } catch (error) {
        logger.error(`Error applying rule ${rule.id}:`, error);
      }
    }

    return insights;
  }

  private cleanupExpiredInsights(): void {
    const now = new Date();
    this.insights = this.insights.filter(insight => 
      !insight.expiresAt || insight.expiresAt > now
    );
  }

  getActiveInsights(): RealTimeInsight[] {
    const now = Date.now();
    if (this.insightsCache && (now - this.lastCacheUpdateTime < this.cacheDuration)) {
      return this.insightsCache;
    }
    this.cleanupExpiredInsights();
    this.insightsCache = this.insights;
    this.lastCacheUpdateTime = now;
    return this.insightsCache;
  }

  getInsightsByType(type: RealTimeInsight['type']): RealTimeInsight[] {
    return this.getActiveInsights().filter(insight => insight.type === type);
  }

  getInsightsBySeverity(severity: RealTimeInsight['severity']): RealTimeInsight[] {
    return this.getActiveInsights().filter(insight => insight.severity === severity);
  }

  async getTrendingData(timeWindow: number = 300000): Promise<Array<{
    metric: string;
    value: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    change: number;
  }>> {
    const now = Date.now();
    const windowStart = now - timeWindow;

    const recentData = this.dataBuffer.filter(data => 
      data.timestamp.getTime() > windowStart
    );

    const metrics: Record<string, number[]> = {};

    // Group data by type
    for (const data of recentData) {
      if (!metrics[data.type]) {
        metrics[data.type] = [];
      }
      metrics[data.type].push(data.timestamp.getTime());
    }

    const trends: Array<{
      metric: string;
      value: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      change: number;
    }> = [];

    for (const [metric, timestamps] of Object.entries(metrics)) {
      const value = timestamps.length;
      const halfWindow = timeWindow / 2;
      
      const firstHalf = timestamps.filter(t => t <= now - halfWindow).length;
      const secondHalf = timestamps.filter(t => t > now - halfWindow).length;
      
      const change = secondHalf - firstHalf;
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      
      if (change > 0) trend = 'increasing';
      else if (change < 0) trend = 'decreasing';

      trends.push({ metric, value, trend, change });
    }

    return trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }

  private handleEvent(event: AnalyticsEvent): void {
    this.processData({
      timestamp: new Date(),
      type: 'event',
      data: event,
      userId: event.userId,
      sessionId: event.sessionId,
      source: 'analytics_engine'
    });
  }

  private handleMetric(metric: AnalyticsMetric): void {
    this.processData({
      timestamp: new Date(),
      type: 'metric',
      data: metric,
      source: 'analytics_engine'
    });
  }

  private getRecentErrorCount(source: string): number {
    const fiveMinutesAgo = Date.now() - 300000;
    return this.dataBuffer.filter(data => 
      data.type === 'error' && 
      data.source === source && 
      data.timestamp.getTime() > fiveMinutesAgo
    ).length;
  }

  private detectUserPattern(userId: string, action: string): boolean {
    // Simple pattern detection - in a real implementation, this would be more sophisticated
    const recentActions = this.dataBuffer
      .filter(data => data.userId === userId && data.type === 'user_action')
      .slice(-10);

    if (recentActions.length < 5) return false;

    const actionCounts: Record<string, number> = {};
    for (const data of recentActions) {
      const actionType = data.data.action;
      actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
    }

    // Detect if user is repeating the same action frequently
    const mostFrequentAction = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return mostFrequentAction && mostFrequentAction[1] >= 3;
  }

  getStats(): {
    isProcessing: boolean;
    bufferSize: number;
    activeInsights: number;
    rulesCount: number;
    processingRate: number;
  } {
    return {
      isProcessing: this.isProcessing,
      bufferSize: this.dataBuffer.length,
      activeInsights: this.getActiveInsights().length,
      rulesCount: this.processingRules.size,
      processingRate: this.processingDelay
    };
  }
}

export const getRealTimeProcessor = (): RealTimeProcessor => {
  return new RealTimeProcessor();
}; 