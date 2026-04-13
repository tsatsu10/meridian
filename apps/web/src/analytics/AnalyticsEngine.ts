/**
 * @epic-6.1-advanced-analytics - Core Analytics Engine
 * @persona-all - Advanced analytics for all users
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface AnalyticsEvent {
  id: string;
  type: string;
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  data: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp: Date;
  dimensions?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface AnalyticsInsight {
  id: string;
  type: 'performance' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  data: Record<string, any>;
  timestamp: Date;
  actionable: boolean;
  actionUrl?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number; // 0-1
  batchSize: number;
  flushInterval: number; // milliseconds
  retentionDays: number;
  privacyMode: boolean;
  realTimeProcessing: boolean;
}

export class AnalyticsEngine extends EventEmitter {
  private static instance: AnalyticsEngine;
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private metrics: AnalyticsMetric[] = [];
  private insights: AnalyticsInsight[] = [];
  private processors: Map<string, any> = new Map();
  private collectors: Map<string, any> = new Map();
  private isProcessing: boolean = false;
  private flushTimer?: NodeJS.Timeout;

  private constructor(config: Partial<AnalyticsConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
      retentionDays: 90,
      privacyMode: false,
      realTimeProcessing: true,
      ...config,
    };

    this.initialize();
  }

  static getInstance(config?: Partial<AnalyticsConfig>): AnalyticsEngine {
    if (!AnalyticsEngine.instance) {
      AnalyticsEngine.instance = new AnalyticsEngine(config);
    }
    return AnalyticsEngine.instance;
  }

  private initialize(): void {
    if (!this.config.enabled) {
      logger.info('Analytics engine disabled');
      return;
    }

    this.setupEventHandlers();
    this.startFlushTimer();
    this.emit('initialized', { config: this.config });

    logger.info('Analytics engine initialized', {
      sampleRate: this.config.sampleRate,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
    });
  }

  private setupEventHandlers(): void {
    // Handle real-time processing
    if (this.config.realTimeProcessing) {
      this.on('event', this.handleEvent.bind(this));
      this.on('metric', this.handleMetric.bind(this));
    }

    // Handle batch processing
    this.on('flush', this.processBatch.bind(this));
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Track an analytics event
   */
  async trackEvent(
    type: string,
    data: Record<string, any>,
    options: {
      userId?: string;
      workspaceId?: string;
      projectId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const event: AnalyticsEvent = {
      id: this.generateId(),
      type,
      userId: options.userId,
      workspaceId: options.workspaceId,
      projectId: options.projectId,
      data: this.sanitizeData(data),
      timestamp: new Date(),
      sessionId: options.sessionId,
      metadata: options.metadata,
    };

    this.events.push(event);

    // Emit for real-time processing
    if (this.config.realTimeProcessing) {
      this.emit('event', event);
    }

    // Check if we need to flush
    if (this.events.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  /**
   * Record an analytics metric
   */
  async recordMetric(
    name: string,
    value: number,
    options: {
      unit?: string;
      dimensions?: Record<string, string>;
      metadata?: Record<string, any>;
      userId?: string;
      workspaceId?: string;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const metric: AnalyticsMetric = {
      name,
      value,
      unit: options.unit,
      timestamp: new Date(),
      dimensions: options.dimensions,
      metadata: options.metadata,
    };

    this.metrics.push(metric);

    // Emit for real-time processing
    if (this.config.realTimeProcessing) {
      this.emit('metric', metric);
    }
  }

  /**
   * Generate an insight
   */
  async generateInsight(
    type: AnalyticsInsight['type'],
    title: string,
    description: string,
    data: Record<string, any>,
    options: {
      severity?: AnalyticsInsight['severity'];
      confidence?: number;
      actionable?: boolean;
      actionUrl?: string;
    } = {}
  ): Promise<AnalyticsInsight> {
    const insight: AnalyticsInsight = {
      id: this.generateId(),
      type,
      title,
      description,
      severity: options.severity || 'medium',
      confidence: options.confidence || 0.8,
      data,
      timestamp: new Date(),
      actionable: options.actionable || false,
      actionUrl: options.actionUrl,
    };

    this.insights.push(insight);
    this.emit('insight', insight);

    return insight;
  }

  /**
   * Register a data processor
   */
  registerProcessor(name: string, processor: any): void {
    this.processors.set(name, processor);
    logger.info('Analytics processor registered', { name });
  }

  /**
   * Register a data collector
   */
  registerCollector(name: string, collector: any): void {
    this.collectors.set(name, collector);
    logger.info('Analytics collector registered', { name });
  }

  /**
   * Get analytics data
   */
  async getAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    workspaceId?: string;
    projectId?: string;
    types?: string[];
    limit?: number;
  } = {}): Promise<{
    events: AnalyticsEvent[];
    metrics: AnalyticsMetric[];
    insights: AnalyticsInsight[];
  }> {
    const { startDate, endDate, userId, workspaceId, projectId, types, limit = 1000 } = options;

    let filteredEvents = this.events;
    let filteredMetrics = this.metrics;
    let filteredInsights = this.insights;

    // Apply filters
    if (startDate || endDate) {
      const filterByDate = (item: { timestamp: Date }) => {
        if (startDate && item.timestamp < startDate) return false;
        if (endDate && item.timestamp > endDate) return false;
        return true;
      };

      filteredEvents = filteredEvents.filter(filterByDate);
      filteredMetrics = filteredMetrics.filter(filterByDate);
      filteredInsights = filteredInsights.filter(filterByDate);
    }

    if (userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === userId);
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.metadata?.userId === userId
      );
    }

    if (workspaceId) {
      filteredEvents = filteredEvents.filter(event => event.workspaceId === workspaceId);
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.metadata?.workspaceId === workspaceId
      );
    }

    if (projectId) {
      filteredEvents = filteredEvents.filter(event => event.projectId === projectId);
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.metadata?.projectId === projectId
      );
    }

    if (types && types.length > 0) {
      filteredEvents = filteredEvents.filter(event => types.includes(event.type));
    }

    // Apply limit
    filteredEvents = filteredEvents.slice(-limit);
    filteredMetrics = filteredMetrics.slice(-limit);
    filteredInsights = filteredInsights.slice(-limit);

    return {
      events: filteredEvents,
      metrics: filteredMetrics,
      insights: filteredInsights,
    };
  }

  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(options: {
    metricName: string;
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
    groupBy?: string[];
    startDate?: Date;
    endDate?: Date;
    dimensions?: Record<string, string>;
  }): Promise<Array<{
    value: number;
    dimensions: Record<string, string>;
    timestamp: Date;
  }>> {
    const { metricName, aggregation, groupBy = [], startDate, endDate, dimensions } = options;

    let filteredMetrics = this.metrics.filter(metric => metric.name === metricName);

    // Apply date filters
    if (startDate || endDate) {
      filteredMetrics = filteredMetrics.filter(metric => {
        if (startDate && metric.timestamp < startDate) return false;
        if (endDate && metric.timestamp > endDate) return false;
        return true;
      });
    }

    // Apply dimension filters
    if (dimensions) {
      filteredMetrics = filteredMetrics.filter(metric => {
        return Object.entries(dimensions).every(([key, value]) => 
          metric.dimensions?.[key] === value
        );
      });
    }

    // Group by dimensions
    const grouped = new Map<string, AnalyticsMetric[]>();
    
    for (const metric of filteredMetrics) {
      const key = groupBy.map(dim => metric.dimensions?.[dim] || 'unknown').join('|');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    }

    // Aggregate each group
    const results: Array<{
      value: number;
      dimensions: Record<string, string>;
      timestamp: Date;
    }> = [];

    for (const [key, metrics] of grouped) {
      const dimensionValues = key.split('|');
      const dimensionMap: Record<string, string> = {};
      
      groupBy.forEach((dim, index) => {
        dimensionMap[dim] = dimensionValues[index];
      });

      let value: number;
      switch (aggregation) {
        case 'sum':
          value = metrics.reduce((sum, m) => sum + m.value, 0);
          break;
        case 'avg':
          value = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
          break;
        case 'min':
          value = Math.min(...metrics.map(m => m.value));
          break;
        case 'max':
          value = Math.max(...metrics.map(m => m.value));
          break;
        case 'count':
          value = metrics.length;
          break;
        default:
          value = 0;
      }

      results.push({
        value,
        dimensions: dimensionMap,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Flush analytics data
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.events.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const eventsToProcess = [...this.events];
      const metricsToProcess = [...this.metrics];

      // Clear the arrays
      this.events = [];
      this.metrics = [];

      // Process the batch
      await this.processBatch(eventsToProcess, metricsToProcess);

      logger.info('Analytics data flushed', {
        eventsProcessed: eventsToProcess.length,
        metricsProcessed: metricsToProcess.length,
      });
    } catch (error) {
      logger.error('Error flushing analytics data', { error });
      // Restore events on error
      this.events = [...this.events, ...this.events];
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of analytics data
   */
  private async processBatch(events: AnalyticsEvent[], metrics: AnalyticsMetric[]): Promise<void> {
    // Process events through registered processors
    for (const [name, processor] of this.processors) {
      try {
        await processor.process(events, metrics);
      } catch (error) {
        logger.error('Error in analytics processor', { processor: name, error });
      }
    }

    // Emit batch processed event
    this.emit('batchProcessed', { events, metrics });
  }

  /**
   * Handle real-time event processing
   */
  private async handleEvent(event: AnalyticsEvent): Promise<void> {
    // Process through real-time processors
    for (const [name, processor] of this.processors) {
      if (processor.realTime) {
        try {
          await processor.processEvent(event);
        } catch (error) {
          logger.error('Error in real-time event processor', { processor: name, error });
        }
      }
    }
  }

  /**
   * Handle real-time metric processing
   */
  private async handleMetric(metric: AnalyticsMetric): Promise<void> {
    // Process through real-time processors
    for (const [name, processor] of this.processors) {
      if (processor.realTime) {
        try {
          await processor.processMetric(metric);
        } catch (error) {
          logger.error('Error in real-time metric processor', { processor: name, error });
        }
      }
    }
  }

  /**
   * Sanitize data for privacy
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    if (!this.config.privacyMode) {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'email'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    eventsCount: number;
    metricsCount: number;
    insightsCount: number;
    processorsCount: number;
    collectorsCount: number;
    isProcessing: boolean;
  } {
    return {
      eventsCount: this.events.length,
      metricsCount: this.metrics.length,
      insightsCount: this.insights.length,
      processorsCount: this.processors.size,
      collectorsCount: this.collectors.size,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.flushInterval) {
      this.startFlushTimer();
    }

    this.emit('configUpdated', { config: this.config });
    logger.info('Analytics configuration updated', { config: this.config });
  }

  /**
   * Cleanup old data
   */
  async cleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const originalEventsCount = this.events.length;
    const originalMetricsCount = this.metrics.length;
    const originalInsightsCount = this.insights.length;

    this.events = this.events.filter(event => event.timestamp > cutoffDate);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffDate);
    this.insights = this.insights.filter(insight => insight.timestamp > cutoffDate);

    logger.info('Analytics cleanup completed', {
      eventsRemoved: originalEventsCount - this.events.length,
      metricsRemoved: originalMetricsCount - this.metrics.length,
      insightsRemoved: originalInsightsCount - this.insights.length,
      retentionDays: this.config.retentionDays,
    });
  }

  /**
   * Shutdown the analytics engine
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    await this.flush();
    await this.cleanup();

    this.removeAllListeners();
    logger.info('Analytics engine shutdown complete');
  }
}

// Export singleton instance
export const getAnalyticsEngine = (): AnalyticsEngine => {
  return AnalyticsEngine.getInstance();
}; 