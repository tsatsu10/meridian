/**
 * Webhook Service
 * Handle external integrations (Slack, Teams, Discord)
 * Phase 2.2 - Smart Notifications System
 */

import { getDatabase } from '../../database/connection';
import { integrationWebhook } from '../../database/schema/notifications';
import { eq, and } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface WebhookPayload {
  text?: string;
  title?: string;
  message?: string;
  url?: string;
  priority?: string;
  metadata?: any;
}

export class WebhookService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Send notification to webhook
   */
  async sendToWebhook(webhookId: string, payload: WebhookPayload): Promise<void> {
    try {
      // Get webhook configuration
      const [webhook] = await this.getDb()
        .select()
        .from(integrationWebhook)
        .where(and(
          eq(integrationWebhook.id, webhookId),
          eq(integrationWebhook.isEnabled, true)
        ));

      if (!webhook) {
        logger.warn('Webhook not found or disabled', { webhookId });
        return;
      }

      // Format payload based on provider
      const formattedPayload = this.formatPayload(webhook.provider, payload);

      // Send webhook request
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.authToken && { Authorization: `Bearer ${webhook.authToken}` }),
        },
        body: JSON.stringify(formattedPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.statusText}`);
      }

      // Update success tracking
      await this.getDb()
        .update(integrationWebhook)
        .set({
          lastSuccessAt: new Date(),
          failureCount: 0,
        })
        .where(eq(integrationWebhook.id, webhookId));

      logger.info('Webhook sent successfully', {
        webhookId,
        provider: webhook.provider,
      });
    } catch (error: any) {
      logger.error('Failed to send webhook', {
        error: error.message,
        webhookId,
      });

      // Update error tracking
      await this.recordWebhookError(webhookId, error.message);
      throw error;
    }
  }

  /**
   * Send notification to all configured webhooks for a workspace
   */
  async broadcastToWorkspace(
    workspaceId: string,
    notificationType: string,
    payload: WebhookPayload
  ): Promise<void> {
    try {
      // Get all enabled webhooks for this workspace
      const webhooks = await this.getDb()
        .select()
        .from(integrationWebhook)
        .where(and(
          eq(integrationWebhook.workspaceId, workspaceId),
          eq(integrationWebhook.isEnabled, true)
        ));

      const sendPromises = webhooks
        .filter((webhook) => this.shouldSendToWebhook(webhook, notificationType))
        .map((webhook) => this.sendToWebhook(webhook.id, payload));

      await Promise.allSettled(sendPromises);

      logger.info('Broadcast to workspace webhooks complete', {
        workspaceId,
        webhookCount: webhooks.length,
      });
    } catch (error: any) {
      logger.error('Failed to broadcast to workspace', {
        error: error.message,
        workspaceId,
      });
    }
  }

  /**
   * Create a new webhook integration
   */
  async createWebhook(params: {
    workspaceId: string;
    userId: string;
    provider: string;
    name: string;
    description?: string;
    webhookUrl: string;
    authToken?: string;
    notificationTypes?: string[];
    projectIds?: string[];
  }): Promise<any> {
    try {
      const [webhook] = await this.getDb().insert(integrationWebhook).values({
        workspaceId: params.workspaceId,
        userId: params.userId,
        provider: params.provider,
        name: params.name,
        description: params.description,
        webhookUrl: params.webhookUrl,
        authToken: params.authToken,
        notificationTypes: params.notificationTypes || null,
        projectIds: params.projectIds || null,
        isEnabled: true,
        failureCount: 0,
      }).returning();

      logger.info('Webhook created', {
        webhookId: webhook.id,
        provider: params.provider,
      });

      return webhook;
    } catch (error: any) {
      logger.error('Failed to create webhook', {
        error: error.message,
        provider: params.provider,
      });
      throw error;
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, updates: any): Promise<any> {
    try {
      const [updated] = await this.getDb()
        .update(integrationWebhook)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(integrationWebhook.id, webhookId))
        .returning();

      logger.info('Webhook updated', { webhookId });
      return updated;
    } catch (error: any) {
      logger.error('Failed to update webhook', {
        error: error.message,
        webhookId,
      });
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.getDb()
        .delete(integrationWebhook)
        .where(eq(integrationWebhook.id, webhookId));

      logger.info('Webhook deleted', { webhookId });
    } catch (error: any) {
      logger.error('Failed to delete webhook', {
        error: error.message,
        webhookId,
      });
      throw error;
    }
  }

  /**
   * Test webhook connection
   */
  async testWebhook(webhookId: string): Promise<boolean> {
    try {
      await this.sendToWebhook(webhookId, {
        title: 'Test Notification',
        message: 'This is a test notification from Meridian. If you receive this, your webhook is configured correctly!',
        priority: 'normal',
      });

      return true;
    } catch (error: any) {
      logger.error('Webhook test failed', {
        error: error.message,
        webhookId,
      });
      return false;
    }
  }

  /**
   * Get webhooks for a workspace
   */
  async getWorkspaceWebhooks(workspaceId: string): Promise<any[]> {
    try {
      const webhooks = await this.getDb()
        .select()
        .from(integrationWebhook)
        .where(eq(integrationWebhook.workspaceId, workspaceId));

      return webhooks;
    } catch (error: any) {
      logger.error('Failed to get workspace webhooks', {
        error: error.message,
        workspaceId,
      });
      return [];
    }
  }

  // Private helper methods

  /**
   * Format payload based on provider
   */
  private formatPayload(provider: string, payload: WebhookPayload): any {
    switch (provider) {
      case 'slack':
        return this.formatSlackPayload(payload);
      case 'teams':
        return this.formatTeamsPayload(payload);
      case 'discord':
        return this.formatDiscordPayload(payload);
      default:
        return payload; // Generic format
    }
  }

  /**
   * Format payload for Slack
   */
  private formatSlackPayload(payload: WebhookPayload): any {
    const color = this.getPriorityColor(payload.priority || 'normal');

    return {
      text: payload.title || payload.text,
      attachments: [
        {
          color,
          title: payload.title,
          text: payload.message,
          ...(payload.url && {
            actions: [
              {
                type: 'button',
                text: 'View Details',
                url: payload.url,
              },
            ],
          }),
          footer: 'Meridian',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  /**
   * Format payload for Microsoft Teams
   */
  private formatTeamsPayload(payload: WebhookPayload): any {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: payload.title || payload.text,
      themeColor: this.getPriorityColor(payload.priority || 'normal').replace('#', ''),
      title: payload.title,
      text: payload.message,
      ...(payload.url && {
        potentialAction: [
          {
            '@type': 'OpenUri',
            name: 'View Details',
            targets: [{ os: 'default', uri: payload.url }],
          },
        ],
      }),
    };
  }

  /**
   * Format payload for Discord
   */
  private formatDiscordPayload(payload: WebhookPayload): any {
    const color = parseInt(this.getPriorityColor(payload.priority || 'normal').replace('#', ''), 16);

    return {
      embeds: [
        {
          title: payload.title,
          description: payload.message,
          color,
          ...(payload.url && { url: payload.url }),
          footer: {
            text: 'Meridian',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Get color code based on priority
   */
  private getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      low: '#6b7280',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444',
    };
    return colors[priority] || colors.normal;
  }

  /**
   * Check if notification should be sent to this webhook
   */
  private shouldSendToWebhook(webhook: any, notificationType: string): boolean {
    // Check notification type filter
    if (webhook.notificationTypes && Array.isArray(webhook.notificationTypes)) {
      if (!webhook.notificationTypes.includes(notificationType)) {
        return false;
      }
    }

    // If no filters, send all notifications
    return true;
  }

  /**
   * Record webhook error
   */
  private async recordWebhookError(webhookId: string, error: string): Promise<void> {
    try {
      await this.getDb()
        .update(integrationWebhook)
        .set({
          lastErrorAt: new Date(),
          lastError: error,
          failureCount: sql`${integrationWebhook.failureCount} + 1`,
        })
        .where(eq(integrationWebhook.id, webhookId));

      // Disable webhook if too many failures
      const [webhook] = await this.getDb()
        .select()
        .from(integrationWebhook)
        .where(eq(integrationWebhook.id, webhookId));

      if (webhook && webhook.failureCount >= 10) {
        await this.getDb()
          .update(integrationWebhook)
          .set({ isEnabled: false })
          .where(eq(integrationWebhook.id, webhookId));

        logger.warn('Webhook disabled due to repeated failures', {
          webhookId,
          failureCount: webhook.failureCount,
        });
      }
    } catch (err: any) {
      logger.error('Failed to record webhook error', {
        error: err.message,
        webhookId,
      });
    }
  }
}

export default WebhookService;



