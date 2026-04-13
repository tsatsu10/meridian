/**
 * Notification Service
 * Core notification management logic
 * Phase 2.2 - Smart Notifications System
 */

import { getDatabase } from '../../database/connection';
import { 
  notification, 
  notificationPreference,
  notificationReceipt,
  type NewNotification 
} from '../../database/schema/notifications';
import { eq, and, desc, sql, inArray, isNull, or, gte, lte } from 'drizzle-orm';
import { EmailService } from '../email/email-service';
import { logger } from '../logging/logger';

interface CreateNotificationParams {
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  metadata?: any;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  groupKey?: string;
  deliveryChannels?: string[];
}

interface GetNotificationsOptions {
  userId: string;
  workspaceId: string;
  isRead?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  private getDb() {
    return getDatabase();
  }

  /**
   * Create a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<any> {
    try {
      // Get user's notification preferences
      const preferences = await this.getUserPreferences(params.userId, params.workspaceId);

      // Check if user wants this notification type
      if (!this.shouldSendNotification(params.type, preferences)) {
        logger.info('Notification suppressed by user preferences', {
          userId: params.userId,
          type: params.type,
        });
        return null;
      }

      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        logger.info('Notification delayed due to quiet hours', {
          userId: params.userId,
        });
        // Could implement queue for later delivery
      }

      // Check if notification should be grouped
      const groupKey = params.groupKey || this.generateGroupKey(params);

      // Create notification
      const [createdNotification] = await this.getDb().insert(notification).values({
        userId: params.userId,
        workspaceId: params.workspaceId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.actorId,
        actorName: params.actorName,
        actorAvatar: params.actorAvatar,
        metadata: params.metadata || {},
        actionUrl: params.actionUrl,
        priority: params.priority || 'normal',
        groupKey,
        deliveryChannels: params.deliveryChannels || ['in_app'],
        isRead: false,
      }).returning();

      // Send to delivery channels
      await this.deliverNotification(createdNotification, preferences);

      logger.info('Notification created', {
        notificationId: createdNotification.id,
        userId: params.userId,
        type: params.type,
      });

      return createdNotification;
    } catch (error: any) {
      logger.error('Failed to create notification', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Create bulk notifications (for batch operations)
   */
  async createBulkNotifications(notificationsList: CreateNotificationParams[]): Promise<any[]> {
    try {
      const created = [];

      for (const params of notificationsList) {
        const notification = await this.createNotification(params);
        if (notification) {
          created.push(notification);
        }
      }

      return created;
    } catch (error: any) {
      logger.error('Failed to create bulk notifications', {
        error: error.message,
        count: notificationsList.length,
      });
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(options: GetNotificationsOptions): Promise<any> {
    try {
      const conditions = [
        eq(notification.userId, options.userId),
        eq(notification.workspaceId, options.workspaceId),
      ];

      if (options.isRead !== undefined) {
        conditions.push(eq(notification.isRead, options.isRead));
      }

      if (options.type) {
        conditions.push(eq(notification.type, options.type));
      }

      const notifications = await this.getDb()
        .select()
        .from(notification)
        .where(and(...conditions))
        .orderBy(desc(notification.createdAt))
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      const [countResult] = await this.getDb()
        .select({ count: sql<number>`count(*)` })
        .from(notification)
        .where(and(...conditions));

      return {
        notifications,
        total: countResult.count,
        unreadCount: await this.getUnreadCount(options.userId, options.workspaceId),
      };
    } catch (error: any) {
      logger.error('Failed to get notifications', {
        error: error.message,
        options,
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.getDb()
        .update(notification)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(
          eq(notification.id, notificationId),
          eq(notification.userId, userId)
        ));

      // Track receipt
      await this.trackReceipt(notificationId, userId, 'viewed');

      logger.info('Notification marked as read', { notificationId, userId });
    } catch (error: any) {
      logger.error('Failed to mark notification as read', {
        error: error.message,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, workspaceId: string): Promise<void> {
    try {
      await this.getDb()
        .update(notification)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(
          eq(notification.userId, userId),
          eq(notification.workspaceId, workspaceId),
          eq(notification.isRead, false)
        ));

      logger.info('All notifications marked as read', { userId, workspaceId });
    } catch (error: any) {
      logger.error('Failed to mark all as read', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await this.getDb()
        .delete(notification)
        .where(and(
          eq(notification.id, notificationId),
          eq(notification.userId, userId)
        ));

      logger.info('Notification deleted', { notificationId, userId });
    } catch (error: any) {
      logger.error('Failed to delete notification', {
        error: error.message,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string, workspaceId: string): Promise<number> {
    try {
      const [result] = await this.getDb()
        .select({ count: sql<number>`count(*)` })
        .from(notification)
        .where(and(
          eq(notification.userId, userId),
          eq(notification.workspaceId, workspaceId),
          eq(notification.isRead, false)
        ));

      return result.count;
    } catch (error: any) {
      logger.error('Failed to get unread count', {
        error: error.message,
        userId,
      });
      return 0;
    }
  }

  /**
   * Get grouped notifications
   */
  async getGroupedNotifications(userId: string, workspaceId: string): Promise<any> {
    try {
      const notifications = await this.getDb()
        .select()
        .from(notification)
        .where(and(
          eq(notification.userId, userId),
          eq(notification.workspaceId, workspaceId),
          eq(notification.isRead, false)
        ))
        .orderBy(desc(notification.createdAt))
        .limit(100);

      // Group by groupKey
      const grouped: Record<string, any[]> = {};
      const ungrouped: any[] = [];

      for (const notif of notifications) {
        if (notif.groupKey) {
          if (!grouped[notif.groupKey]) {
            grouped[notif.groupKey] = [];
          }
          grouped[notif.groupKey].push(notif);
        } else {
          ungrouped.push(notif);
        }
      }

      return {
        grouped: Object.entries(grouped).map(([key, items]) => ({
          groupKey: key,
          count: items.length,
          latestNotification: items[0],
          notifications: items,
        })),
        ungrouped,
      };
    } catch (error: any) {
      logger.error('Failed to get grouped notifications', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get or create user notification preferences
   */
  async getUserPreferences(userId: string, workspaceId: string): Promise<any> {
    try {
      const [existing] = await this.getDb()
        .select()
        .from(notificationPreference)
        .where(and(
          eq(notificationPreference.userId, userId),
          eq(notificationPreference.workspaceId, workspaceId)
        ));

      if (existing) {
        return existing;
      }

      // Create default preferences
      const [created] = await this.getDb().insert(notificationPreference).values({
        userId,
        workspaceId,
        inAppEnabled: true,
        emailEnabled: true,
        slackEnabled: false,
        teamsEnabled: false,
        typePreferences: {},
        dailyDigestEnabled: true,
        dailyDigestTime: '09:00',
        weeklyDigestEnabled: true,
        weeklyDigestDay: 1,
        weeklyDigestTime: '09:00',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        groupSimilarNotifications: true,
        groupingWindowMinutes: 15,
        minimumPriority: 'low',
      }).returning();

      return created;
    } catch (error: any) {
      logger.error('Failed to get user preferences', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, workspaceId: string, updates: any): Promise<any> {
    try {
      const [updated] = await this.getDb()
        .update(notificationPreference)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(
          eq(notificationPreference.userId, userId),
          eq(notificationPreference.workspaceId, workspaceId)
        ))
        .returning();

      logger.info('Notification preferences updated', { userId });
      return updated;
    } catch (error: any) {
      logger.error('Failed to update preferences', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await this.getDb()
        .delete(notification)
        .where(
          or(
            lte(notification.createdAt, cutoffDate),
            and(
              eq(notification.isRead, true),
              lte(notification.readAt!, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            )
          )
        );

      logger.info('Old notifications cleaned up', { deleted });
      return 0; // Drizzle doesn't return count for deletes
    } catch (error: any) {
      logger.error('Failed to cleanup notifications', {
        error: error.message,
      });
      return 0;
    }
  }

  // Private helper methods

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(type: string, preferences: any): boolean {
    // Check type-specific preferences
    if (preferences.typePreferences && preferences.typePreferences[type]) {
      const typePref = preferences.typePreferences[type];
      if (typePref.enabled === false) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(preferences: any): boolean {
    if (!preferences.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Crosses midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * Generate group key for similar notifications
   */
  private generateGroupKey(params: CreateNotificationParams): string {
    // Group by type and entity
    if (params.entityType && params.entityId) {
      return `${params.type}-${params.entityType}-${params.entityId}`;
    }
    return `${params.type}-${params.userId}`;
  }

  /**
   * Deliver notification to configured channels
   */
  private async deliverNotification(notif: any, preferences: any): Promise<void> {
    const channels = notif.deliveryChannels || ['in_app'];

    // Email delivery
    if (channels.includes('email') && preferences.emailEnabled) {
      try {
        await this.emailService.sendNotificationEmail(
          'user@example.com', // TODO: Get from user record
          notif.title,
          notif.message,
          notif.actionUrl
        );

        await this.getDb()
          .update(notification)
          .set({
            emailSent: true,
            emailSentAt: new Date(),
          })
          .where(eq(notification.id, notif.id));
      } catch (error: any) {
        logger.error('Failed to send notification email', {
          error: error.message,
          notificationId: notif.id,
        });
      }
    }

    // In-app is always delivered (already created in DB)
    // Slack, Teams, etc. would be handled by webhook service
  }

  /**
   * Track notification receipt for analytics
   */
  private async trackReceipt(notificationId: string, userId: string, action: string): Promise<void> {
    try {
      await this.getDb().insert(notificationReceipt).values({
        notificationId,
        userId,
        action,
        device: 'web', // Could be detected from request
      });
    } catch (error: any) {
      // Don't fail notification operations due to analytics errors
      logger.warn('Failed to track receipt', {
        error: error.message,
        notificationId,
      });
    }
  }
}

export default NotificationService;



