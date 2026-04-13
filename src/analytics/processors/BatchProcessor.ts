/**
 * @epic-6.1-advanced-analytics - Batch Data Processor
 * @persona-all - Process historical data for batch analytics insights
 */
import { getAnalyticsEngine, type AnalyticsEvent, type AnalyticsMetric } from '../AnalyticsEngine';
import { logger } from '../../utils/logger';

export interface BatchJob {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startDate: Date;
  endDate: Date;
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface BatchAnalysis {
  id: string;
  jobId: string;
  type: 'trend_analysis' | 'user_segmentation' | 'performance_analysis' | 'predictive_analysis';
  data: Record<string, any>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    data: Record<string, any>;
  }>;
  createdAt: Date;
}

export interface BatchProcessorConfig {
  maxConcurrentJobs: number;
  defaultBatchSize: number;
  retentionDays: number;
  enableCompression: boolean;
}

export class BatchProcessor {
  private analyticsEngine = getAnalyticsEngine();
  private jobs: Map<string, BatchJob> = new Map();
  private analyses: Map<string, BatchAnalysis> = new Map();
  private config: BatchProcessorConfig;
  private isProcessing: boolean = false;
  private processingQueue: string[] = [];
  private activeJobs: Set<string> = new Set();

  constructor(config: Partial<BatchProcessorConfig> = {}) {
    this.config = {
      maxConcurrentJobs: 3,
      defaultBatchSize: 10000,
      retentionDays: 90,
      enableCompression: true,
      ...config
    };
  }

  async createJob(name: string, type: BatchJob['type'], startDate: Date, endDate: Date): Promise<string> {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BatchJob = {
      id: jobId,
      name,
      type,
      status: 'pending',
      startDate,
      endDate,
      progress: 0,
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    this.processingQueue.push(jobId);

    logger.info(`Created batch job: ${name} (${jobId})`);
    return jobId;
  }

  async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    logger.info('Batch processor started');
    this.processQueue();
  }

  stopProcessing(): void {
    if (!this.isProcessing) return;
    this.isProcessing = false;
    logger.info('Batch processor stopped');
  }

  private async processQueue(): Promise<void> {
    while (this.isProcessing && this.processingQueue.length > 0) {
      if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const jobId = this.processingQueue.shift();
      if (jobId) {
        this.activeJobs.add(jobId);
        this.processJob(jobId).finally(() => {
          this.activeJobs.delete(jobId);
        });
      }
    }

    // Continue monitoring for new jobs
    if (this.isProcessing) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      logger.info(`Starting batch job: ${job.name}`);

      // Get data for the time period
      const data = await this.getDataForPeriod(job.startDate, job.endDate);
      
      // Process in batches
      const batches = this.createBatches(data, this.config.defaultBatchSize);
      
      for (let i = 0; i < batches.length; i++) {
        if (!this.isProcessing) break;

        const batch = batches[i];
        await this.processBatch(job, batch, i, batches.length);
        
        job.progress = ((i + 1) / batches.length) * 100;
      }

      // Generate analysis
      const analysis = await this.generateAnalysis(job, data);
      this.analyses.set(analysis.id, analysis);

      job.status = 'completed';
      job.result = analysis;
      job.completedAt = new Date();

      logger.info(`Completed batch job: ${job.name}`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      logger.error(`Failed batch job: ${job.name}`, error);
    }
  }

  private async getDataForPeriod(startDate: Date, endDate: Date): Promise<{
    events: AnalyticsEvent[];
    metrics: AnalyticsMetric[];
  }> {
    // In a real implementation, this would query the database
    // For now, return mock data
    const events: AnalyticsEvent[] = [];
    const metrics: AnalyticsMetric[] = [];

    const timeRange = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeRange / (1000 * 60 * 60 * 24));

    // Generate mock events
    for (let i = 0; i < days * 100; i++) {
      const timestamp = new Date(startDate.getTime() + (i * timeRange / (days * 100)));
      events.push({
        id: `event_${i}`,
        type: ['user_action', 'page_view', 'feature_usage'][Math.floor(Math.random() * 3)],
        userId: `user_${Math.floor(Math.random() * 10)}`,
        sessionId: `session_${Math.floor(Math.random() * 5)}`,
        data: { action: 'test_action', value: Math.random() },
        timestamp
      });
    }

    // Generate mock metrics
    for (let i = 0; i < days * 24; i++) {
      const timestamp = new Date(startDate.getTime() + (i * timeRange / (days * 24)));
      metrics.push({
        id: `metric_${i}`,
        name: ['session_duration', 'time_spent', 'task_time_spent'][Math.floor(Math.random() * 3)],
        value: Math.random() * 100,
        userId: `user_${Math.floor(Math.random() * 10)}`,
        timestamp
      });
    }

    return { events, metrics };
  }

  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(job: BatchJob, batch: any[], batchIndex: number, totalBatches: number): Promise<void> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    logger.debug(`Processed batch ${batchIndex + 1}/${totalBatches} for job ${job.name}`);
  }

  private async generateAnalysis(job: BatchJob, data: { events: AnalyticsEvent[]; metrics: AnalyticsMetric[] }): Promise<BatchAnalysis> {
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const analysis: BatchAnalysis = {
      id: analysisId,
      jobId: job.id,
      type: this.determineAnalysisType(job),
      data: this.aggregateData(data),
      insights: await this.generateInsights(data, job),
      createdAt: new Date()
    };

    return analysis;
  }

  private determineAnalysisType(job: BatchJob): BatchAnalysis['type'] {
    switch (job.type) {
      case 'daily':
        return 'trend_analysis';
      case 'weekly':
        return 'user_segmentation';
      case 'monthly':
        return 'performance_analysis';
      default:
        return 'predictive_analysis';
    }
  }

  private aggregateData(data: { events: AnalyticsEvent[]; metrics: AnalyticsMetric[] }): Record<string, any> {
    const aggregated: Record<string, any> = {
      totalEvents: data.events.length,
      totalMetrics: data.metrics.length,
      uniqueUsers: new Set(data.events.map(e => e.userId)).size,
      uniqueSessions: new Set(data.events.map(e => e.sessionId)).size,
      eventTypes: {},
      metricTypes: {},
      timeDistribution: {},
      userActivity: {}
    };

    // Event type distribution
    for (const event of data.events) {
      aggregated.eventTypes[event.type] = (aggregated.eventTypes[event.type] || 0) + 1;
    }

    // Metric type distribution
    for (const metric of data.metrics) {
      aggregated.metricTypes[metric.name] = (aggregated.metricTypes[metric.name] || 0) + 1;
    }

    // Time distribution (by hour)
    for (const event of data.events) {
      const hour = event.timestamp.getHours();
      aggregated.timeDistribution[hour] = (aggregated.timeDistribution[hour] || 0) + 1;
    }

    // User activity
    for (const event of data.events) {
      if (!aggregated.userActivity[event.userId]) {
        aggregated.userActivity[event.userId] = 0;
      }
      aggregated.userActivity[event.userId]++;
    }

    return aggregated;
  }

  private async generateInsights(data: { events: AnalyticsEvent[]; metrics: AnalyticsMetric[] }, job: BatchJob): Promise<Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    data: Record<string, any>;
  }>> {
    const insights: Array<{
      type: string;
      title: string;
      description: string;
      confidence: number;
      data: Record<string, any>;
    }> = [];

    // User engagement insight
    const uniqueUsers = new Set(data.events.map(e => e.userId)).size;
    const totalEvents = data.events.length;
    const avgEventsPerUser = totalEvents / uniqueUsers;

    if (avgEventsPerUser > 10) {
      insights.push({
        type: 'engagement',
        title: 'High User Engagement',
        description: `Users are highly engaged with an average of ${avgEventsPerUser.toFixed(1)} events per user`,
        confidence: 0.85,
        data: { avgEventsPerUser, uniqueUsers, totalEvents }
      });
    }

    // Peak usage time insight
    const hourlyDistribution: Record<number, number> = {};
    for (const event of data.events) {
      const hour = event.timestamp.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    }

    const peakHour = Object.entries(hourlyDistribution)
      .sort(([,a], [,b]) => b - a)[0];

    if (peakHour) {
      insights.push({
        type: 'usage_pattern',
        title: 'Peak Usage Time Identified',
        description: `Peak usage occurs at ${peakHour[0]}:00 with ${peakHour[1]} events`,
        confidence: 0.9,
        data: { peakHour: parseInt(peakHour[0]), eventCount: peakHour[1] }
      });
    }

    // Feature usage insight
    const featureUsage: Record<string, number> = {};
    for (const event of data.events) {
      if (event.type === 'feature_usage') {
        const feature = event.data.feature || 'unknown';
        featureUsage[feature] = (featureUsage[feature] || 0) + 1;
      }
    }

    const mostUsedFeature = Object.entries(featureUsage)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostUsedFeature) {
      insights.push({
        type: 'feature_usage',
        title: 'Most Popular Feature',
        description: `Feature "${mostUsedFeature[0]}" is the most used with ${mostUsedFeature[1]} interactions`,
        confidence: 0.95,
        data: { feature: mostUsedFeature[0], usageCount: mostUsedFeature[1] }
      });
    }

    // Performance insight
    const responseTimes = data.metrics
      .filter(m => m.name === 'response_time')
      .map(m => m.value);

    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      if (avgResponseTime > 1000) {
        insights.push({
          type: 'performance',
          title: 'Performance Concern',
          description: `Average response time is ${avgResponseTime.toFixed(0)}ms, which may impact user experience`,
          confidence: 0.8,
          data: { avgResponseTime, sampleSize: responseTimes.length }
        });
      }
    }

    return insights;
  }

  getJob(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  getJobByStatus(status: BatchJob['status']): BatchJob[] {
    return this.getAllJobs().filter(job => job.status === status);
  }

  getAnalysis(analysisId: string): BatchAnalysis | null {
    return this.analyses.get(analysisId) || null;
  }

  getAnalysesForJob(jobId: string): BatchAnalysis[] {
    return Array.from(this.analyses.values()).filter(analysis => analysis.jobId === jobId);
  }

  getAllAnalyses(): BatchAnalysis[] {
    return Array.from(this.analyses.values());
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return false;

    // Remove from queue
    const queueIndex = this.processingQueue.indexOf(jobId);
    if (queueIndex > -1) {
      this.processingQueue.splice(queueIndex, 1);
    }

    job.status = 'failed';
    job.error = 'Job cancelled by user';
    job.completedAt = new Date();

    logger.info(`Cancelled batch job: ${job.name}`);
    return true;
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Cancel if running
    if (job.status === 'running' || job.status === 'pending') {
      await this.cancelJob(jobId);
    }

    this.jobs.delete(jobId);
    
    // Delete associated analyses
    const analyses = this.getAnalysesForJob(jobId);
    for (const analysis of analyses) {
      this.analyses.delete(analysis.id);
    }

    logger.info(`Deleted batch job: ${job.name}`);
    return true;
  }

  cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    // Clean up old jobs
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoffDate) {
        this.jobs.delete(jobId);
      }
    }

    // Clean up old analyses
    for (const [analysisId, analysis] of this.analyses.entries()) {
      if (analysis.createdAt < cutoffDate) {
        this.analyses.delete(analysisId);
      }
    }

    logger.info(`Cleaned up data older than ${this.config.retentionDays} days`);
  }

  getStats(): {
    isProcessing: boolean;
    totalJobs: number;
    activeJobs: number;
    pendingJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalAnalyses: number;
    queueLength: number;
  } {
    const jobs = this.getAllJobs();
    
    return {
      isProcessing: this.isProcessing,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'running').length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalAnalyses: this.analyses.size,
      queueLength: this.processingQueue.length
    };
  }

  updateConfig(newConfig: Partial<BatchProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Updated batch processor configuration');
  }
}

export const getBatchProcessor = (config?: Partial<BatchProcessorConfig>): BatchProcessor => {
  return new BatchProcessor(config);
}; 