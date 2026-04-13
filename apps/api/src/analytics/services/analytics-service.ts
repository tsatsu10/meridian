// @ts-nocheck
import { getDatabase } from '../../database/connection';
import logger from '../../utils/logger';
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { analyticsExports } from '../../database/schema-features';

export interface AnalyticsEvent {
  workspaceId: string;
  userId: string;
  eventType: string;
  eventData?: any;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: any;
}

export interface MessageMetrics {
  messageCount: number;
  characterCount: number;
  reactionCount: number;
  replyCount: number;
  fileUploadCount: number;
  averageResponseTime?: number;
  activeMinutes: number;
}

export interface ChannelMetrics {
  totalMessages: number;
  uniqueUsers: number;
  activeUsers: number;
  engagementRate: number;
  averageResponseTime?: number;
  peakActivityHour?: number;
  messageGrowth?: number;
  memberGrowth?: number;
}

export interface UserMetrics {
  loginCount: number;
  sessionDuration: number;
  messagesSent: number;
  messagesReceived: number;
  reactionsGiven: number;
  reactionsReceived: number;
  channelsJoined: number;
  filesUploaded: number;
  averageResponseTime?: number;
  productivityScore?: number;
  collaborationScore?: number;
}

export interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  totalMessages: number;
  totalTasks: number;
  completedTasks: number;
  averageTaskCompletionTime?: number;
  teamVelocity?: number;
  collaborationIndex?: number;
  workloadDistribution?: number;
  communicationEfficiency?: number;
}

export class AnalyticsService {
  private db: any = null;

  private async getDb() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const db = await this.getDb();
      await db.insert(analyticsEventsTable).values({
        id: nanoid(),
        workspaceId: event.workspaceId,
        userId: event.userId,
        eventType: event.eventType,
        eventData: event.eventData ? JSON.stringify(event.eventData) : null,
        sessionId: event.sessionId,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      });
    } catch (error) {
      logger.error('Failed to track analytics event:', error);
    }
  }

  /**
   * Get message analytics for a workspace
   */
  async getMessageAnalytics(
    workspaceId: string,
    startDate: string,
    endDate: string,
    channelId?: string,
    userId?: string,
    granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Promise<MessageMetrics[]> {
    const whereConditions = [
      eq(messageAnalyticsTable.workspaceId, workspaceId),
      gte(messageAnalyticsTable.date, startDate),
      lte(messageAnalyticsTable.date, endDate)
    ];

    if (channelId) {
      whereConditions.push(eq(messageAnalyticsTable.channelId, channelId));
    }

    if (userId) {
      whereConditions.push(eq(messageAnalyticsTable.userId, userId));
    }

    const db = await this.getDb();
    return await db
      .select()
      .from(messageAnalyticsTable)
      .where(and(...whereConditions))
      .orderBy(desc(messageAnalyticsTable.date));
  }

  /**
   * Get channel analytics for a workspace
   */
  async getChannelAnalytics(
    workspaceId: string,
    startDate: string,
    endDate: string,
    channelId?: string,
    granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Promise<ChannelMetrics[]> {
    const whereConditions = [
      eq(channelAnalyticsTable.workspaceId, workspaceId),
      gte(channelAnalyticsTable.date, startDate),
      lte(channelAnalyticsTable.date, endDate)
    ];

    if (channelId) {
      whereConditions.push(eq(channelAnalyticsTable.channelId, channelId));
    }

    const db = await this.getDb();
    return await db
      .select()
      .from(channelAnalyticsTable)
      .where(and(...whereConditions))
      .orderBy(desc(channelAnalyticsTable.date));
  }

  /**
   * Get user analytics for a workspace
   */
  async getUserAnalytics(
    workspaceId: string,
    startDate: string,
    endDate: string,
    userId?: string,
    granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Promise<UserMetrics[]> {
    const whereConditions = [
      eq(userAnalyticsTable.workspaceId, workspaceId),
      gte(userAnalyticsTable.date, startDate),
      lte(userAnalyticsTable.date, endDate)
    ];

    if (userId) {
      whereConditions.push(eq(userAnalyticsTable.userId, userId));
    }

    const db = await this.getDb();
    return await db
      .select()
      .from(userAnalyticsTable)
      .where(and(...whereConditions))
      .orderBy(desc(userAnalyticsTable.date));
  }

  /**
   * Get team analytics for a workspace
   */
  async getTeamAnalytics(
    workspaceId: string,
    startDate: string,
    endDate: string,
    teamId?: string
  ): Promise<TeamMetrics[]> {
    const whereConditions = [
      eq(teamAnalyticsTable.workspaceId, workspaceId),
      gte(teamAnalyticsTable.date, startDate),
      lte(teamAnalyticsTable.date, endDate)
    ];

    if (teamId) {
      whereConditions.push(eq(teamAnalyticsTable.teamId, teamId));
    }

    const db = await this.getDb();
    return await db
      .select()
      .from(teamAnalyticsTable)
      .where(and(...whereConditions))
      .orderBy(desc(teamAnalyticsTable.date));
  }

  /**
   * Get real-time metrics for a workspace
   */
  async getRealtimeMetrics(workspaceId: string): Promise<any[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const db = await this.getDb();
    return await db
      .select()
      .from(realtimeMetricsTable)
      .where(
        and(
          eq(realtimeMetricsTable.workspaceId, workspaceId),
          gte(realtimeMetricsTable.timestamp, oneHourAgo)
        )
      )
      .orderBy(desc(realtimeMetricsTable.timestamp));
  }

  /**
   * Update real-time metrics
   */
  async updateRealtimeMetric(
    workspaceId: string,
    metricType: string,
    metricValue: number,
    metadata?: any
  ): Promise<void> {
    try {
      const db = await this.getDb();
      await db.insert(realtimeMetricsTable).values({
        id: nanoid(),
        workspaceId,
        metricType,
        metricValue,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });
    } catch (error) {
      logger.error('Failed to update real-time metric:', error);
    }
  }

  /**
   * Calculate and store daily message analytics
   */
  async calculateDailyMessageAnalytics(workspaceId: string, date: string): Promise<void> {
    try {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);

      // Get all message events for the day
      const db = await this.getDb();
      const messageEvents = await db
        .select()
        .from(analyticsEventsTable)
        .where(
          and(
            eq(analyticsEventsTable.workspaceId, workspaceId),
            eq(analyticsEventsTable.eventType, 'message_sent'),
            gte(analyticsEventsTable.timestamp, startOfDay),
            lte(analyticsEventsTable.timestamp, endOfDay)
          )
        );

      // Group by channel and user
      const channelUserMetrics = new Map<string, MessageMetrics>();

      for (const event of messageEvents) {
        const eventData = event.eventData ? JSON.parse(event.eventData) : {};
        const channelId = eventData.channelId || 'direct';
        const key = `${channelId}:${event.userId}`;

        if (!channelUserMetrics.has(key)) {
          channelUserMetrics.set(key, {
            messageCount: 0,
            characterCount: 0,
            reactionCount: 0,
            replyCount: 0,
            fileUploadCount: 0,
            activeMinutes: 0,
          });
        }

        const metrics = channelUserMetrics.get(key)!;
        metrics.messageCount++;
        metrics.characterCount += eventData.characterCount || 0;
        metrics.reactionCount += eventData.reactionCount || 0;
        metrics.replyCount += eventData.replyCount || 0;
        metrics.fileUploadCount += eventData.fileUploadCount || 0;
        metrics.activeMinutes += eventData.activeMinutes || 0;

        if (eventData.responseTime) {
          if (!metrics.averageResponseTime) {
            metrics.averageResponseTime = eventData.responseTime;
          } else {
            metrics.averageResponseTime = (metrics.averageResponseTime + eventData.responseTime) / 2;
          }
        }
      }

      // Store aggregated metrics
      for (const [key, metrics] of channelUserMetrics) {
        const [channelId, userId] = key.split(':');

        const db = await this.getDb();
        await db.insert(messageAnalyticsTable).values({
          id: nanoid(),
          workspaceId,
          channelId: channelId === 'direct' ? null : channelId,
          userId,
          date,
          messageCount: metrics.messageCount,
          characterCount: metrics.characterCount,
          reactionCount: metrics.reactionCount,
          replyCount: metrics.replyCount,
          fileUploadCount: metrics.fileUploadCount,
          averageResponseTime: metrics.averageResponseTime,
          activeMinutes: metrics.activeMinutes,
          lastActivity: new Date(),
        });
      }
    } catch (error) {
      logger.error('Failed to calculate daily message analytics:', error);
    }
  }

  /**
   * Calculate and store daily channel analytics
   */
  async calculateDailyChannelAnalytics(workspaceId: string, date: string): Promise<void> {
    try {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);

      // Get all channel-related events for the day
      const db = await this.getDb();
      const channelEvents = await db
        .select()
        .from(analyticsEventsTable)
        .where(
          and(
            eq(analyticsEventsTable.workspaceId, workspaceId),
            sql`${analyticsEventsTable.eventType} IN ('message_sent', 'channel_joined', 'channel_left')`,
            gte(analyticsEventsTable.timestamp, startOfDay),
            lte(analyticsEventsTable.timestamp, endOfDay)
          )
        );

      // Group by channel
      const channelMetrics = new Map<string, ChannelMetrics>();

      for (const event of channelEvents) {
        const eventData = event.eventData ? JSON.parse(event.eventData) : {};
        const channelId = eventData.channelId;

        if (!channelId) continue;

        if (!channelMetrics.has(channelId)) {
          channelMetrics.set(channelId, {
            totalMessages: 0,
            uniqueUsers: new Set(),
            activeUsers: new Set(),
            engagementRate: 0,
            averageResponseTime: 0,
            peakActivityHour: 0,
          });
        }

        const metrics = channelMetrics.get(channelId)!;
        
        if (event.eventType === 'message_sent') {
          metrics.totalMessages++;
          metrics.uniqueUsers.add(event.userId);
          metrics.activeUsers.add(event.userId);
        }
      }

      // Calculate final metrics and store
      for (const [channelId, metrics] of channelMetrics) {
        const uniqueUsers = Array.from(metrics.uniqueUsers);
        const activeUsers = Array.from(metrics.activeUsers);

        const db = await this.getDb();
        await db.insert(channelAnalyticsTable).values({
          id: nanoid(),
          workspaceId,
          channelId,
          date,
          totalMessages: metrics.totalMessages,
          uniqueUsers: uniqueUsers.length,
          activeUsers: activeUsers.length,
          engagementRate: activeUsers.length / uniqueUsers.length * 100,
          averageResponseTime: metrics.averageResponseTime,
          peakActivityHour: metrics.peakActivityHour,
        });
      }
    } catch (error) {
      logger.error('Failed to calculate daily channel analytics:', error);
    }
  }

  /**
   * Calculate and store daily user analytics
   */
  async calculateDailyUserAnalytics(workspaceId: string, date: string): Promise<void> {
    try {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);

      // Get all user events for the day
      const db = await this.getDb();
      const userEvents = await db
        .select()
        .from(analyticsEventsTable)
        .where(
          and(
            eq(analyticsEventsTable.workspaceId, workspaceId),
            gte(analyticsEventsTable.timestamp, startOfDay),
            lte(analyticsEventsTable.timestamp, endOfDay)
          )
        );

      // Group by user
      const userMetrics = new Map<string, UserMetrics>();

      for (const event of userEvents) {
        if (!userMetrics.has(event.userId)) {
          userMetrics.set(event.userId, {
            loginCount: 0,
            sessionDuration: 0,
            messagesSent: 0,
            messagesReceived: 0,
            reactionsGiven: 0,
            reactionsReceived: 0,
            channelsJoined: 0,
            filesUploaded: 0,
          });
        }

        const metrics = userMetrics.get(event.userId)!;
        const eventData = event.eventData ? JSON.parse(event.eventData) : {};

        switch (event.eventType) {
          case 'user_login':
            metrics.loginCount++;
            break;
          case 'message_sent':
            metrics.messagesSent++;
            break;
          case 'message_received':
            metrics.messagesReceived++;
            break;
          case 'reaction_given':
            metrics.reactionsGiven++;
            break;
          case 'reaction_received':
            metrics.reactionsReceived++;
            break;
          case 'channel_joined':
            metrics.channelsJoined++;
            break;
          case 'file_uploaded':
            metrics.filesUploaded++;
            break;
        }
      }

      // Store aggregated metrics
      for (const [userId, metrics] of userMetrics) {
        const db = await this.getDb();
        await db.insert(userAnalyticsTable).values({
          id: nanoid(),
          workspaceId,
          userId,
          date,
          loginCount: metrics.loginCount,
          sessionDuration: metrics.sessionDuration,
          messagesSent: metrics.messagesSent,
          messagesReceived: metrics.messagesReceived,
          reactionsGiven: metrics.reactionsGiven,
          reactionsReceived: metrics.reactionsReceived,
          channelsJoined: metrics.channelsJoined,
          filesUploaded: metrics.filesUploaded,
          averageResponseTime: metrics.averageResponseTime,
          productivityScore: this.calculateProductivityScore(metrics),
          collaborationScore: this.calculateCollaborationScore(metrics),
        });
      }
    } catch (error) {
      logger.error('Failed to calculate daily user analytics:', error);
    }
  }

  /**
   * Calculate productivity score based on user metrics
   */
  private calculateProductivityScore(metrics: UserMetrics): number {
    const messageWeight = 0.3;
    const reactionWeight = 0.2;
    const fileWeight = 0.2;
    const channelWeight = 0.1;
    const sessionWeight = 0.2;

    const messageScore = Math.min(metrics.messagesSent / 50, 1) * 100;
    const reactionScore = Math.min(metrics.reactionsGiven / 20, 1) * 100;
    const fileScore = Math.min(metrics.filesUploaded / 10, 1) * 100;
    const channelScore = Math.min(metrics.channelsJoined / 5, 1) * 100;
    const sessionScore = Math.min(metrics.sessionDuration / 28800, 1) * 100; // 8 hours max

    return (
      messageScore * messageWeight +
      reactionScore * reactionWeight +
      fileScore * fileWeight +
      channelScore * channelWeight +
      sessionScore * sessionWeight
    );
  }

  /**
   * Calculate collaboration score based on user metrics
   */
  private calculateCollaborationScore(metrics: UserMetrics): number {
    const messageWeight = 0.4;
    const reactionWeight = 0.3;
    const channelWeight = 0.3;

    const messageScore = Math.min(metrics.messagesSent / 30, 1) * 100;
    const reactionScore = Math.min(metrics.reactionsGiven / 15, 1) * 100;
    const channelScore = Math.min(metrics.channelsJoined / 3, 1) * 100;

    return (
      messageScore * messageWeight +
      reactionScore * reactionWeight +
      channelScore * channelWeight
    );
  }

  /**
   * Get trend analysis for workspace analytics
   */
  async getTrendAnalysis(
    workspaceId: string,
    startDate: string,
    endDate: string,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<any> {
    try {
      const messageAnalytics = await this.getMessageAnalytics(workspaceId, startDate, endDate, undefined, undefined, granularity);
      const channelAnalytics = await this.getChannelAnalytics(workspaceId, startDate, endDate, granularity);
      
      return {
        messagesTrend: messageAnalytics,
        channelsTrend: channelAnalytics,
        growth: {
          messages: this.calculateGrowthRate(messageAnalytics),
          channels: this.calculateGrowthRate(channelAnalytics),
        },
        predictions: {
          nextPeriod: this.predictNextPeriod(messageAnalytics),
        }
      };
    } catch (error) {
      logger.error('Failed to get trend analysis:', error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    workspaceId: string,
    userId: string,
    format: 'csv' | 'json' | 'excel',
    dataTypes: string[]
  ): Promise<{ exportId: string; status: string }> {
    const exportId = nanoid();
    const db = getDatabase();
    const now = new Date();
    
    // Insert export record into database
    await db.insert(analyticsExports).values({
      exportId,
      userId,
      workspaceId,
      exportType: dataTypes.join(','),
      format,
      filters: { dataTypes },
      status: 'queued',
      progress: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    });

    // Queue background job for actual export processing
    // In a real implementation, this would use a proper job queue (Bull, BeeQueue, etc.)
    setTimeout(async () => {
      try {
        logger.info(`Processing export ${exportId} for workspace ${workspaceId}`);
        
        // Update status to processing
        await db
          .update(analyticsExports)
          .set({ 
            status: 'processing', 
            progress: 10,
            startedAt: new Date() 
          })
          .where(eq(analyticsExports.exportId, exportId));

        // Simulate export processing (in real implementation, generate actual file)
        // This is where you'd call actual export generation logic
        
        // For now, simulate progress updates
        for (let progress = 20; progress <= 90; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await db
            .update(analyticsExports)
            .set({ progress })
            .where(eq(analyticsExports.exportId, exportId));
        }

        // Mark as completed with file URL
        const fileUrl = `/api/analytics/export/${exportId}/download`;
        await db
          .update(analyticsExports)
          .set({ 
            status: 'completed', 
            progress: 100,
            fileUrl,
            fileSize: 1024 * 50, // Mock file size (50KB)
            completedAt: new Date() 
          })
          .where(eq(analyticsExports.exportId, exportId));

        logger.info(`✅ Export ${exportId} completed successfully`);

      } catch (error) {
        logger.error(`Failed to process export ${exportId}:`, error);
        
        // Mark export as failed
        await db
          .update(analyticsExports)
          .set({ 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Export processing failed' 
          })
          .where(eq(analyticsExports.exportId, exportId));
      }
    }, 1000);

    return {
      exportId,
      status: 'queued'
    };
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string, workspaceId: string): Promise<{
    exportId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
    error?: string;
  }> {
    const db = getDatabase();
    
    // Query the database for the export record
    const exportRecord = await db
      .select()
      .from(analyticsExports)
      .where(
        and(
          eq(analyticsExports.exportId, exportId),
          eq(analyticsExports.workspaceId, workspaceId)
        )
      )
      .limit(1);
    
    if (!exportRecord || exportRecord.length === 0) {
      throw new Error(`Export ${exportId} not found`);
    }
    
    const record = exportRecord[0];
    
    return {
      exportId: record.exportId,
      status: record.status as 'queued' | 'processing' | 'completed' | 'failed',
      progress: record.progress || 0,
      downloadUrl: record.status === 'completed' && record.fileUrl 
        ? record.fileUrl 
        : undefined,
      error: record.error || undefined,
    };
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(
    workspaceId: string,
    startDate: string,
    endDate: string,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<any> {
    try {
      const [messages, channels, users, realtime] = await Promise.all([
        this.getMessageAnalytics(workspaceId, startDate, endDate, undefined, undefined, granularity),
        this.getChannelAnalytics(workspaceId, startDate, endDate, granularity),
        this.getUserAnalytics(workspaceId, startDate, endDate, granularity),
        this.getRealtimeMetrics(workspaceId)
      ]);

      return {
        summary: {
          totalMessages: messages.reduce((sum: number, m: any) => sum + (m.messageCount || 0), 0),
          totalUsers: users.length,
          totalChannels: channels.length,
          averageResponseTime: this.calculateAverageResponseTime(messages),
        },
        charts: {
          messagesOverTime: messages,
          channelActivity: channels,
          userEngagement: users,
          realtimeMetrics: realtime.slice(0, 24), // Last 24 hours
        },
        insights: {
          mostActiveChannel: this.findMostActive(channels, 'totalMessages'),
          mostActiveUser: this.findMostActive(users, 'messagesSent'),
          peakHours: this.calculatePeakHours(realtime),
          trends: await this.getTrendAnalysis(workspaceId, startDate, endDate, granularity),
        }
      };
    } catch (error) {
      logger.error('Failed to get dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Helper method to calculate growth rate
   */
  private calculateGrowthRate(data: any[]): number {
    if (data.length < 2) return 0;
    
    const recent = data[data.length - 1];
    const previous = data[data.length - 2];
    
    if (!previous || !recent) return 0;
    
    const recentValue = recent.messageCount || recent.totalMessages || 0;
    const previousValue = previous.messageCount || previous.totalMessages || 0;
    
    if (previousValue === 0) return recentValue > 0 ? 100 : 0;
    
    return ((recentValue - previousValue) / previousValue) * 100;
  }

  /**
   * Helper method to predict next period
   */
  private predictNextPeriod(data: any[]): number {
    if (data.length < 3) return 0;
    
    const values = data.slice(-3).map((d: any) => d.messageCount || d.totalMessages || 0);
    const trend = (values[2] - values[0]) / 2; // Simple linear trend
    
    return Math.max(0, values[2] + trend);
  }

  /**
   * Helper method to calculate average response time
   */
  private calculateAverageResponseTime(data: any[]): number {
    const responseTimes = data
      .map((d: any) => d.averageResponseTime)
      .filter((rt: any) => rt && rt > 0);
    
    if (responseTimes.length === 0) return 0;
    
    return responseTimes.reduce((sum: number, rt: number) => sum + rt, 0) / responseTimes.length;
  }

  /**
   * Helper method to find most active entity
   */
  private findMostActive(data: any[], field: string): any {
    if (data.length === 0) return null;
    
    return data.reduce((max: any, current: any) => {
      return (current[field] || 0) > (max[field] || 0) ? current : max;
    });
  }

  /**
   * Helper method to calculate peak hours
   */
  private calculatePeakHours(realtimeData: any[]): number[] {
    const hourlyActivity = new Array(24).fill(0);
    
    realtimeData.forEach((metric: any) => {
      if (metric.timestamp) {
        const hour = new Date(metric.timestamp).getHours();
        hourlyActivity[hour] += metric.metricValue || 0;
      }
    });
    
    // Return top 3 peak hours
    return hourlyActivity
      .map((activity, hour) => ({ hour, activity }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 3)
      .map(item => item.hour);
  }
} 

