/**
 * 🔗 Outbound Webhook Service
 * 
 * Sends webhooks to external systems when events occur in Meridian:
 * - Task created/updated/completed
 * - Project status changes
 * - User assignments
 * - Custom events
 * 
 * Features:
 * - HMAC-SHA256 signature
 * - Automatic retries with exponential backoff
 * - Delivery tracking
 * - Webhook management API
 */

import crypto from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { getDatabase } from '../../database/connection';
import { eq, and } from 'drizzle-orm';
import { winstonLog } from '../../utils/winston-logger';
import { monitoringService } from '../monitoring/monitoring-service';

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  workspaceId: string;
  projectId?: string;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  webhookId: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  createdAt: Date;
}

/**
 * Webhook Service
 */
export class WebhookService {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  private static generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    return 'sha256=' + hmac.update(payload).digest('hex');
  }

  /**
   * Send webhook to external URL
   */
  private static async sendWebhook(
    url: string,
    payload: WebhookPayload,
    secret?: string
  ): Promise<{
    success: boolean;
    status?: number;
    body?: string;
    error?: string;
  }> {
    try {
      const payloadString = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Meridian-Webhook/1.0',
        'X-Meridian-Event': payload.event,
        'X-Meridian-Webhook-ID': payload.webhookId,
        'X-Meridian-Timestamp': payload.timestamp,
      };

      // Add signature if secret provided
      if (secret) {
        headers['X-Meridian-Signature'] = this.generateSignature(payloadString, secret);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseBody = await response.text();

      return {
        success: response.ok,
        status: response.status,
        body: responseBody.substring(0, 500), // Limit stored response
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deliver webhook with retry logic
   */
  static async deliverWebhook(
    webhookConfig: WebhookConfig,
    event: string,
    data: any
  ): Promise<WebhookDelivery> {
    const deliveryId = createId();
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      webhookId: webhookConfig.id,
    };

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId: webhookConfig.id,
      event,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      createdAt: new Date(),
    };

    // Try to deliver with retries
    for (let attempt = 0; attempt < this.MAX_ATTEMPTS; attempt++) {
      delivery.attempts = attempt + 1;
      delivery.lastAttemptAt = new Date();

      winstonLog.debug('Sending webhook', {
        webhookId: webhookConfig.id,
        event,
        attempt: attempt + 1,
        url: webhookConfig.url,
      });

      const result = await this.sendWebhook(
        webhookConfig.url,
        payload,
        webhookConfig.secret
      );

      delivery.responseStatus = result.status;
      delivery.responseBody = result.body;
      delivery.error = result.error;

      if (result.success) {
        delivery.status = 'success';
        
        winstonLog.info('Webhook delivered successfully', {
          webhookId: webhookConfig.id,
          event,
          attempt: attempt + 1,
          status: result.status,
        });

        monitoringService.increment('webhooks.delivered', 1, {
          event,
          status: 'success',
        });

        break;
      } else {
        winstonLog.warn('Webhook delivery failed', {
          webhookId: webhookConfig.id,
          event,
          attempt: attempt + 1,
          error: result.error,
          status: result.status,
        });

        // Wait before retry (except on last attempt)
        if (attempt < this.MAX_ATTEMPTS - 1) {
          const delay = this.RETRY_DELAYS[attempt] || 15000;
          delivery.nextRetryAt = new Date(Date.now() + delay);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max attempts reached
          delivery.status = 'failed';
          
          winstonLog.error('Webhook delivery failed permanently', {
            webhookId: webhookConfig.id,
            event,
            attempts: this.MAX_ATTEMPTS,
            lastError: result.error,
          });

          monitoringService.increment('webhooks.delivered', 1, {
            event,
            status: 'failed',
          });
        }
      }
    }

    // Store delivery record (would go to database in production)
    // For now, just log
    winstonLog.verbose('Webhook delivery record', delivery);

    return delivery;
  }

  /**
   * Trigger webhook for event
   */
  static async triggerWebhook(
    workspaceId: string,
    event: string,
    data: any,
    projectId?: string
  ): Promise<{
    triggered: number;
    successful: number;
    failed: number;
  }> {
    const db = getDatabase();

    try {
      // Get webhooks subscribed to this event
      const webhooks = await this.getWebhooksForEvent(workspaceId, event, projectId);

      if (webhooks.length === 0) {
        winstonLog.debug('No webhooks configured for event', {
          workspaceId,
          event,
          projectId,
        });
        return { triggered: 0, successful: 0, failed: 0 };
      }

      winstonLog.info('Triggering webhooks', {
        workspaceId,
        event,
        webhookCount: webhooks.length,
      });

      // Deliver to all webhooks in parallel
      const deliveries = await Promise.all(
        webhooks.map(webhook => this.deliverWebhook(webhook, event, data))
      );

      const successful = deliveries.filter(d => d.status === 'success').length;
      const failed = deliveries.filter(d => d.status === 'failed').length;

      return {
        triggered: webhooks.length,
        successful,
        failed,
      };

    } catch (error) {
      winstonLog.error('Failed to trigger webhooks', {
        workspaceId,
        event,
        error: error instanceof Error ? error.message : String(error),
      });

      return { triggered: 0, successful: 0, failed: 0 };
    }
  }

  /**
   * Get webhooks for specific event
   */
  private static async getWebhooksForEvent(
    workspaceId: string,
    event: string,
    projectId?: string
  ): Promise<WebhookConfig[]> {
    // This would query a webhookConfigurations table
    // For now, return empty array (would be implemented with proper schema)
    
    winstonLog.debug('Fetching webhooks for event', {
      workspaceId,
      event,
      projectId,
    });

    // Placeholder: In production, query from database
    // const configs = await db.query.webhookConfigurations.findMany({
    //   where: and(
    //     eq(webhookConfigurations.workspaceId, workspaceId),
    //     eq(webhookConfigurations.isActive, true),
    //     sql`${webhookConfigurations.events}::jsonb ? ${event}`
    //   ),
    // });

    return [];
  }

  /**
   * Verify incoming webhook signature
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export default WebhookService;


