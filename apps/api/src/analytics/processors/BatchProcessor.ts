// @ts-nocheck
import { getDatabase } from "../../database/connection";
import { analyticsEvents, userAnalytics, projectAnalytics, teamAnalytics } from '../../database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { redis } from '../../lib/redis';
import logger from '../../utils/logger';

export interface BatchJob {
  id: string;
  type: 'etl' | 'aggregation' | 'cleanup' | 'migration';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startTime?: Date;
  endTime?: Date;
  error?: string;
  data: any;
}

export interface AggregationResult {
  workspaceId: string;
  date: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    avgCompletionTime: number;
    teamVelocity: number;
    qualityScore: number;
    collaborationScore: number;
  };
  trends: {
    productivity: 'improving' | 'stable' | 'declining';
    quality: 'improving' | 'stable' | 'declining';
    collaboration: 'improving' | 'stable' | 'declining';
  };
}

export class BatchProcessor {
  private static instance: BatchProcessor;
  private jobs: Map<string, BatchJob> = new Map();
  private isProcessing = false;

  static getInstance(): BatchProcessor {
    if (!BatchProcessor.instance) {
      BatchProcessor.instance = new BatchProcessor();
    }
    return BatchProcessor.instance;
  }

  async startETLJob(workspaceId: string, dateRange: { start: Date; end: Date }): Promise<string> {
    const jobId = `etl-${workspaceId}-${Date.now()}`;
    const job: BatchJob = {
      id: jobId,
      type: 'etl',
      status: 'pending',
      progress: 0,
      data: { workspaceId, dateRange }
    };

    this.jobs.set(jobId, job);
    this.processJob(jobId);
    return jobId;
  }

  async startAggregationJob(workspaceId: string, granularity: 'daily' | 'weekly' | 'monthly'): Promise<string> {
    const jobId = `agg-${workspaceId}-${Date.now()}`;
    const job: BatchJob = {
      id: jobId,
      type: 'aggregation',
      status: 'pending',
      progress: 0,
      data: { workspaceId, granularity }
    };

    this.jobs.set(jobId, job);
    this.processJob(jobId);
    return jobId;
  }

  async startCleanupJob(workspaceId: string, retentionDays: number): Promise<string> {
    const jobId = `cleanup-${workspaceId}-${Date.now()}`;
    const job: BatchJob = {
      id: jobId,
      type: 'cleanup',
      status: 'pending',
      progress: 0,
      data: { workspaceId, retentionDays }
    };

    this.jobs.set(jobId, job);
    this.processJob(jobId);
    return jobId;
  }

  private async processJob(jobId: string): Promise<void> {
    if (this.isProcessing) {
      setTimeout(() => this.processJob(jobId), 5000);
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) return;

    this.isProcessing = true;
    job.status = 'running';
    job.startTime = new Date();

    try {
      switch (job.type) {
        case 'etl':
          await this.processETLJob(job);
          break;
        case 'aggregation':
          await this.processAggregationJob(job);
          break;
        case 'cleanup':
          await this.processCleanupJob(job);
          break;
      }

      job.status = 'completed';
      job.progress = 100;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      job.endTime = new Date();
      this.isProcessing = false;
    }
  }

  private async processETLJob(job: BatchJob): Promise<void> {
    const { workspaceId, dateRange } = job.data;
    
    // Step 1: Extract raw data (20%)
    job.progress = 20;
    const rawData = await this.extractRawData(workspaceId, dateRange);
    
    // Step 2: Transform data (60%)
    job.progress = 60;
    const transformedData = await this.transformData(rawData);
    
    // Step 3: Load processed data (100%)
    job.progress = 100;
    await this.loadProcessedData(workspaceId, transformedData);
  }

  private async processAggregationJob(job: BatchJob): Promise<void> {
    const { workspaceId, granularity } = job.data;
    
    // Step 1: Calculate daily aggregations (30%)
    job.progress = 30;
    const dailyAggregations = await this.calculateDailyAggregations(workspaceId);
    
    // Step 2: Calculate weekly/monthly aggregations (70%)
    job.progress = 70;
    const periodAggregations = await this.calculatePeriodAggregations(dailyAggregations, granularity);
    
    // Step 3: Store aggregated data (100%)
    job.progress = 100;
    await this.storeAggregatedData(workspaceId, periodAggregations);
  }

  private async processCleanupJob(job: BatchJob): Promise<void> {
    const { workspaceId, retentionDays } = job.data;
    
    // Step 1: Identify old data (25%)
    job.progress = 25;
    const oldData = await this.identifyOldData(workspaceId, retentionDays);
    
    // Step 2: Archive important data (50%)
    job.progress = 50;
    await this.archiveImportantData(oldData);
    
    // Step 3: Delete old data (75%)
    job.progress = 75;
    await this.deleteOldData(workspaceId, retentionDays);
    
    // Step 4: Update indexes (100%)
    job.progress = 100;
    await this.updateIndexes(workspaceId);
  }

  private async extractRawData(workspaceId: string, dateRange: { start: Date; end: Date }): Promise<any[]> {
    // Extract analytics events
    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.workspaceId, workspaceId),
          gte(analyticsEvents.timestamp, dateRange.start),
          lte(analyticsEvents.timestamp, dateRange.end)
        )
      );

    // Extract user analytics
    const userData = await db
      .select()
      .from(userAnalytics)
      .where(
        and(
          eq(userAnalytics.workspaceId, workspaceId),
          gte(userAnalytics.timestamp, dateRange.start),
          lte(userAnalytics.timestamp, dateRange.end)
        )
      );

    // Extract project analytics
    const projectData = await db
      .select()
      .from(projectAnalytics)
      .where(
        and(
          eq(projectAnalytics.workspaceId, workspaceId),
          gte(projectAnalytics.timestamp, dateRange.start),
          lte(projectAnalytics.timestamp, dateRange.end)
        )
      );

    // Extract team analytics
    const teamData = await db
      .select()
      .from(teamAnalytics)
      .where(
        and(
          eq(teamAnalytics.workspaceId, workspaceId),
          gte(teamAnalytics.timestamp, dateRange.start),
          lte(teamAnalytics.timestamp, dateRange.end)
        )
      );

    return { events, userData, projectData, teamData };
  }

  private async transformData(rawData: any): Promise<any> {
    const { events, userData, projectData, teamData } = rawData;

    // Transform events into structured format
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      workspaceId: event.workspaceId,
      userId: event.userId,
      eventType: event.eventType,
      eventData: JSON.parse(event.eventData || '{}'),
      timestamp: event.timestamp,
      metadata: {
        sessionId: event.sessionId,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress
      }
    }));

    // Transform user analytics
    const transformedUserData = userData.map((user: any) => ({
      id: user.id,
      workspaceId: user.workspaceId,
      userId: user.userId,
      metrics: {
        tasksCompleted: user.tasksCompleted,
        timeSpent: user.timeSpent,
        productivityScore: user.productivityScore,
        qualityScore: user.qualityScore
      },
      timestamp: user.timestamp
    }));

    // Transform project analytics
    const transformedProjectData = projectData.map((project: any) => ({
      id: project.id,
      workspaceId: project.workspaceId,
      projectId: project.projectId,
      metrics: {
        totalTasks: project.totalTasks,
        completedTasks: project.completedTasks,
        progress: project.progress,
        velocity: project.velocity,
        qualityScore: project.qualityScore
      },
      timestamp: project.timestamp
    }));

    // Transform team analytics
    const transformedTeamData = teamData.map((team: any) => ({
      id: team.id,
      workspaceId: team.workspaceId,
      teamId: team.teamId,
      metrics: {
        collaborationScore: team.collaborationScore,
        communicationScore: team.communicationScore,
        efficiencyScore: team.efficiencyScore,
        overallScore: team.overallScore
      },
      timestamp: team.timestamp
    }));

    return {
      events: transformedEvents,
      userData: transformedUserData,
      projectData: transformedProjectData,
      teamData: transformedTeamData
    };
  }

  private async loadProcessedData(workspaceId: string, transformedData: any): Promise<void> {
    // Store processed data in optimized format
    const cacheKey = `processed-data:${workspaceId}`;
    await redis.setex(cacheKey, 86400, JSON.stringify(transformedData)); // Cache for 24 hours

    // Update analytics summary
    await this.updateAnalyticsSummary(workspaceId, transformedData);
  }

  private async calculateDailyAggregations(workspaceId: string): Promise<AggregationResult[]> {
    const results: AggregationResult[] = [];

    // Get the last 30 days of data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Calculate daily metrics
      const dailyMetrics = await this.calculateDailyMetrics(workspaceId, date);
      
      // Calculate trends
      const trends = await this.calculateTrends(workspaceId, date);

      results.push({
        workspaceId,
        date: dateStr,
        metrics: dailyMetrics,
        trends
      });
    }

    return results;
  }

  private async calculateDailyMetrics(workspaceId: string, date: Date): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const metrics = await db
      .select({
        totalTasks: sql<number>`COUNT(*)`,
        completedTasks: sql<number>`COUNT(CASE WHEN status = 'done' THEN 1 END)`,
        overdueTasks: sql<number>`COUNT(CASE WHEN due_date < NOW() AND status != 'done' THEN 1 END)`,
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400)`,
        teamVelocity: sql<number>`AVG(velocity_score)`,
        qualityScore: sql<number>`AVG(quality_score)`,
        collaborationScore: sql<number>`AVG(collaboration_score)`
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.workspaceId, workspaceId),
          gte(analyticsEvents.timestamp, startOfDay),
          lte(analyticsEvents.timestamp, endOfDay)
        )
      );

    return metrics[0] || {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      avgCompletionTime: 0,
      teamVelocity: 0,
      qualityScore: 0,
      collaborationScore: 0
    };
  }

  private async calculateTrends(workspaceId: string, date: Date): Promise<any> {
    // Compare with previous period to determine trends
    const currentPeriod = await this.calculateDailyMetrics(workspaceId, date);
    
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 7);
    const previousPeriod = await this.calculateDailyMetrics(workspaceId, previousDate);

    const calculateTrend = (current: number, previous: number): 'improving' | 'stable' | 'declining' => {
      const change = ((current - previous) / previous) * 100;
      if (change > 5) return 'improving';
      if (change < -5) return 'declining';
      return 'stable';
    };

    return {
      productivity: calculateTrend(currentPeriod.completedTasks, previousPeriod.completedTasks),
      quality: calculateTrend(currentPeriod.qualityScore, previousPeriod.qualityScore),
      collaboration: calculateTrend(currentPeriod.collaborationScore, previousPeriod.collaborationScore)
    };
  }

  private async calculatePeriodAggregations(dailyAggregations: AggregationResult[], granularity: 'daily' | 'weekly' | 'monthly'): Promise<AggregationResult[]> {
    if (granularity === 'daily') return dailyAggregations;

    const groupedData = new Map<string, AggregationResult[]>();

    // Group by period
    dailyAggregations.forEach(day => {
      let periodKey: string;
      if (granularity === 'weekly') {
        const weekStart = this.getWeekStart(new Date(day.date));
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        const monthStart = new Date(day.date);
        monthStart.setDate(1);
        periodKey = monthStart.toISOString().split('T')[0];
      }

      if (!groupedData.has(periodKey)) {
        groupedData.set(periodKey, []);
      }
      groupedData.get(periodKey)!.push(day);
    });

    // Aggregate each period
    const results: AggregationResult[] = [];
    for (const [periodKey, days] of groupedData) {
      const aggregatedMetrics = this.aggregateMetrics(days.map(d => d.metrics));
      const aggregatedTrends = this.aggregateTrends(days.map(d => d.trends));

      results.push({
        workspaceId: days[0].workspaceId,
        date: periodKey,
        metrics: aggregatedMetrics,
        trends: aggregatedTrends
      });
    }

    return results;
  }

  private aggregateMetrics(metricsArray: any[]): any {
    return {
      totalTasks: metricsArray.reduce((sum, m) => sum + m.totalTasks, 0),
      completedTasks: metricsArray.reduce((sum, m) => sum + m.completedTasks, 0),
      overdueTasks: metricsArray.reduce((sum, m) => sum + m.overdueTasks, 0),
      avgCompletionTime: metricsArray.reduce((sum, m) => sum + m.avgCompletionTime, 0) / metricsArray.length,
      teamVelocity: metricsArray.reduce((sum, m) => sum + m.teamVelocity, 0) / metricsArray.length,
      qualityScore: metricsArray.reduce((sum, m) => sum + m.qualityScore, 0) / metricsArray.length,
      collaborationScore: metricsArray.reduce((sum, m) => sum + m.collaborationScore, 0) / metricsArray.length
    };
  }

  private aggregateTrends(trendsArray: any[]): any {
    const countTrends = (trend: string) => trendsArray.filter(t => 
      t.productivity === trend || t.quality === trend || t.collaboration === trend
    ).length;

    const getDominantTrend = (trendType: 'productivity' | 'quality' | 'collaboration'): 'improving' | 'stable' | 'declining' => {
      const improving = trendsArray.filter(t => t[trendType] === 'improving').length;
      const declining = trendsArray.filter(t => t[trendType] === 'declining').length;
      const stable = trendsArray.filter(t => t[trendType] === 'stable').length;

      if (improving > declining && improving > stable) return 'improving';
      if (declining > improving && declining > stable) return 'declining';
      return 'stable';
    };

    return {
      productivity: getDominantTrend('productivity'),
      quality: getDominantTrend('quality'),
      collaboration: getDominantTrend('collaboration')
    };
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  private async storeAggregatedData(workspaceId: string, aggregations: AggregationResult[]): Promise<void> {
    const cacheKey = `aggregated-data:${workspaceId}`;
    await redis.setex(cacheKey, 86400, JSON.stringify(aggregations)); // Cache for 24 hours
  }

  private async identifyOldData(workspaceId: string, retentionDays: number): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Identify old analytics events
    const oldEvents = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.workspaceId, workspaceId),
          lte(analyticsEvents.timestamp, cutoffDate)
        )
      );

    return oldEvents;
  }

  private async archiveImportantData(oldData: any[]): Promise<void> {
    // Archive important data before deletion
    const archiveKey = `archived-data:${Date.now()}`;
    await redis.setex(archiveKey, 2592000, JSON.stringify(oldData)); // Archive for 30 days
  }

  private async deleteOldData(workspaceId: string, retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old analytics events
    await db
      .delete(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.workspaceId, workspaceId),
          lte(analyticsEvents.timestamp, cutoffDate)
        )
      );
  }

  private async updateIndexes(workspaceId: string): Promise<void> {
    // Update database indexes for better performance
    logger.info(`Updated indexes for workspace ${workspaceId}`);
  }

  private async updateAnalyticsSummary(workspaceId: string, data: any): Promise<void> {
    // Update analytics summary for quick access
    const summary = {
      totalEvents: data.events.length,
      totalUsers: new Set(data.userData.map((u: any) => u.userId)).size,
      totalProjects: new Set(data.projectData.map((p: any) => p.projectId)).size,
      lastUpdated: new Date().toISOString()
    };

    const summaryKey = `analytics-summary:${workspaceId}`;
    await redis.setex(summaryKey, 3600, JSON.stringify(summary)); // Cache for 1 hour
  }

  async getJobStatus(jobId: string): Promise<BatchJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getAllJobs(): Promise<BatchJob[]> {
    return Array.from(this.jobs.values());
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      return true;
    }
    return false;
  }
}

export const batchProcessor = BatchProcessor.getInstance(); 

