/**
 * Digest Service
 * Generate and send daily/weekly notification digests
 * Phase 2.2 - Smart Notifications System
 */

import { getDatabase } from '../../database/connection';
import { 
  notification, 
  notificationPreference,
  notificationDigest 
} from '../../database/schema/notifications';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { EmailService } from '../email/email-service';
import { logger } from '../logging/logger';

interface DigestSummary {
  tasks_assigned: number;
  tasks_completed: number;
  comments: number;
  mentions: number;
  kudos: number;
  deadlines: number;
  [key: string]: number;
}

export class DigestService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  private getDb() {
    return getDatabase();
  }

  /**
   * Generate and send daily digests for all users
   */
  async sendDailyDigests(): Promise<void> {
    try {
      logger.info('Starting daily digest generation');

      // Get all users with daily digest enabled
      const usersWithDigest = await this.getDb()
        .select()
        .from(notificationPreference)
        .where(eq(notificationPreference.dailyDigestEnabled, true));

      let successCount = 0;
      let errorCount = 0;

      for (const userPref of usersWithDigest) {
        try {
          // Check if it's the right time for this user's digest
          const now = new Date();
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          if (currentTime !== userPref.dailyDigestTime) {
            continue; // Not time for this user yet
          }

          await this.generateDailyDigest(userPref.userId, userPref.workspaceId);
          successCount++;
        } catch (error: any) {
          errorCount++;
          logger.error('Failed to send daily digest', {
            error: error.message,
            userId: userPref.userId,
          });
        }
      }

      logger.info('Daily digest generation complete', {
        success: successCount,
        errors: errorCount,
      });
    } catch (error: any) {
      logger.error('Failed to send daily digests', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate and send daily digest for a specific user
   */
  async generateDailyDigest(userId: string, workspaceId: string): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      // Get notifications from last 24 hours
      const notifications = await this.getDb()
        .select()
        .from(notification)
        .where(and(
          eq(notification.userId, userId),
          eq(notification.workspaceId, workspaceId),
          gte(notification.createdAt, yesterday),
          lte(notification.createdAt, now)
        ));

      if (notifications.length === 0) {
        logger.info('No notifications for daily digest', { userId });
        return;
      }

      // Generate summary
      const summary = this.generateSummary(notifications);

      // Create digest record
      const [digest] = await this.getDb().insert(notificationDigest).values({
        userId,
        workspaceId,
        type: 'daily',
        periodStart: yesterday,
        periodEnd: now,
        notificationCount: notifications.length,
        summary,
      }).returning();

      // Send email
      await this.sendDigestEmail(userId, 'daily', notifications, summary);

      // Mark digest as sent
      await this.getDb()
        .update(notificationDigest)
        .set({
          emailSent: true,
          emailSentAt: new Date(),
        })
        .where(eq(notificationDigest.id, digest.id));

      logger.info('Daily digest sent', {
        userId,
        digestId: digest.id,
        notificationCount: notifications.length,
      });
    } catch (error: any) {
      logger.error('Failed to generate daily digest', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate and send weekly digests for all users
   */
  async sendWeeklyDigests(): Promise<void> {
    try {
      logger.info('Starting weekly digest generation');

      const today = new Date();
      const dayOfWeek = today.getDay();

      // Get users who want digest on this day
      const usersWithDigest = await this.getDb()
        .select()
        .from(notificationPreference)
        .where(and(
          eq(notificationPreference.weeklyDigestEnabled, true),
          eq(notificationPreference.weeklyDigestDay, dayOfWeek)
        ));

      let successCount = 0;
      let errorCount = 0;

      for (const userPref of usersWithDigest) {
        try {
          await this.generateWeeklyDigest(userPref.userId, userPref.workspaceId);
          successCount++;
        } catch (error: any) {
          errorCount++;
          logger.error('Failed to send weekly digest', {
            error: error.message,
            userId: userPref.userId,
          });
        }
      }

      logger.info('Weekly digest generation complete', {
        success: successCount,
        errors: errorCount,
      });
    } catch (error: any) {
      logger.error('Failed to send weekly digests', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate and send weekly digest for a specific user
   */
  async generateWeeklyDigest(userId: string, workspaceId: string): Promise<void> {
    try {
      const now = new Date();
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Get notifications from last 7 days
      const notifications = await this.getDb()
        .select()
        .from(notification)
        .where(and(
          eq(notification.userId, userId),
          eq(notification.workspaceId, workspaceId),
          gte(notification.createdAt, lastWeek),
          lte(notification.createdAt, now)
        ));

      if (notifications.length === 0) {
        logger.info('No notifications for weekly digest', { userId });
        return;
      }

      // Generate summary
      const summary = this.generateSummary(notifications);

      // Create digest record
      const [digest] = await this.getDb().insert(notificationDigest).values({
        userId,
        workspaceId,
        type: 'weekly',
        periodStart: lastWeek,
        periodEnd: now,
        notificationCount: notifications.length,
        summary,
      }).returning();

      // Send email
      await this.sendDigestEmail(userId, 'weekly', notifications, summary);

      // Mark digest as sent
      await this.getDb()
        .update(notificationDigest)
        .set({
          emailSent: true,
          emailSentAt: new Date(),
        })
        .where(eq(notificationDigest.id, digest.id));

      logger.info('Weekly digest sent', {
        userId,
        digestId: digest.id,
        notificationCount: notifications.length,
      });
    } catch (error: any) {
      logger.error('Failed to generate weekly digest', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get digest history for a user
   */
  async getDigestHistory(userId: string, workspaceId: string, type?: string): Promise<any[]> {
    try {
      const conditions = [
        eq(notificationDigest.userId, userId),
        eq(notificationDigest.workspaceId, workspaceId),
      ];

      if (type) {
        conditions.push(eq(notificationDigest.type, type));
      }

      const digests = await this.getDb()
        .select()
        .from(notificationDigest)
        .where(and(...conditions))
        .orderBy(sql`${notificationDigest.createdAt} DESC`)
        .limit(30);

      return digests;
    } catch (error: any) {
      logger.error('Failed to get digest history', {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  // Private helper methods

  /**
   * Generate summary from notifications
   */
  private generateSummary(notifications: any[]): DigestSummary {
    const summary: DigestSummary = {
      tasks_assigned: 0,
      tasks_completed: 0,
      comments: 0,
      mentions: 0,
      kudos: 0,
      deadlines: 0,
    };

    for (const notif of notifications) {
      const type = notif.type;

      if (type === 'task_assigned') {
        summary.tasks_assigned++;
      } else if (type === 'task_completed') {
        summary.tasks_completed++;
      } else if (type === 'comment_reply' || type === 'comment_added') {
        summary.comments++;
      } else if (type === 'comment_mention') {
        summary.mentions++;
      } else if (type === 'kudos_received') {
        summary.kudos++;
      } else if (type === 'deadline_approaching') {
        summary.deadlines++;
      }

      // Track all types
      if (!summary[type]) {
        summary[type] = 0;
      }
      summary[type]++;
    }

    return summary;
  }

  /**
   * Send digest email
   */
  private async sendDigestEmail(
    userId: string,
    type: 'daily' | 'weekly',
    notifications: any[],
    summary: DigestSummary
  ): Promise<void> {
    try {
      // TODO: Get user email from user record
      const userEmail = 'user@example.com';

      // Build digest HTML
      const digestHtml = this.buildDigestHtml(type, notifications, summary);

      const subject = type === 'daily' 
        ? `Your Daily Digest - ${notifications.length} updates`
        : `Your Weekly Digest - ${notifications.length} updates`;

      await this.emailService.sendEmail({
        to: userEmail,
        subject,
        html: digestHtml,
        text: this.buildDigestText(type, notifications, summary),
      });

      logger.info('Digest email sent', { userId, type });
    } catch (error: any) {
      logger.error('Failed to send digest email', {
        error: error.message,
        userId,
        type,
      });
      throw error;
    }
  }

  /**
   * Build digest HTML email
   */
  private buildDigestHtml(type: string, notifications: any[], summary: DigestSummary): string {
    const period = type === 'daily' ? 'past 24 hours' : 'past week';

    let summaryHtml = '<ul>';
    if (summary.tasks_assigned > 0) {
      summaryHtml += `<li><strong>${summary.tasks_assigned}</strong> tasks assigned</li>`;
    }
    if (summary.tasks_completed > 0) {
      summaryHtml += `<li><strong>${summary.tasks_completed}</strong> tasks completed</li>`;
    }
    if (summary.comments > 0) {
      summaryHtml += `<li><strong>${summary.comments}</strong> new comments</li>`;
    }
    if (summary.mentions > 0) {
      summaryHtml += `<li><strong>${summary.mentions}</strong> mentions</li>`;
    }
    if (summary.kudos > 0) {
      summaryHtml += `<li><strong>${summary.kudos}</strong> kudos received 🎉</li>`;
    }
    summaryHtml += '</ul>';

    let notificationsHtml = '';
    for (const notif of notifications.slice(0, 10)) {
      notificationsHtml += `
        <div style="padding: 15px; border-bottom: 1px solid #eee;">
          <strong>${notif.title}</strong>
          <p>${notif.message}</p>
          ${notif.actionUrl ? `<a href="${notif.actionUrl}" style="color: #3b82f6;">View Details</a>` : ''}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 Your ${type === 'daily' ? 'Daily' : 'Weekly'} Digest</h1>
            <p>Here's what happened in the ${period}</p>
          </div>
          <div class="content">
            <div class="summary">
              <h2>Summary</h2>
              ${summaryHtml}
            </div>
            <h2>Recent Notifications</h2>
            ${notificationsHtml}
            ${notifications.length > 10 ? `<p style="text-align: center; margin-top: 20px;"><em>...and ${notifications.length - 10} more</em></p>` : ''}
          </div>
          <div class="footer">
            <p>You're receiving this digest because you have notifications enabled.</p>
            <p><a href="#" style="color: #3b82f6;">Manage your notification preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build digest plain text version
   */
  private buildDigestText(type: string, notifications: any[], summary: DigestSummary): string {
    const period = type === 'daily' ? 'past 24 hours' : 'past week';

    let text = `YOUR ${type.toUpperCase()} DIGEST\n\n`;
    text += `Here's what happened in the ${period}:\n\n`;
    text += `SUMMARY:\n`;
    if (summary.tasks_assigned > 0) text += `- ${summary.tasks_assigned} tasks assigned\n`;
    if (summary.tasks_completed > 0) text += `- ${summary.tasks_completed} tasks completed\n`;
    if (summary.comments > 0) text += `- ${summary.comments} new comments\n`;
    if (summary.mentions > 0) text += `- ${summary.mentions} mentions\n`;
    if (summary.kudos > 0) text += `- ${summary.kudos} kudos received\n`;

    text += `\n\nRECENT NOTIFICATIONS:\n\n`;
    for (const notif of notifications.slice(0, 10)) {
      text += `${notif.title}\n`;
      text += `${notif.message}\n`;
      if (notif.actionUrl) {
        text += `View: ${notif.actionUrl}\n`;
      }
      text += `\n---\n\n`;
    }

    return text;
  }
}

export default DigestService;



