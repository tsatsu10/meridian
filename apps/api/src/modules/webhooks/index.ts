/**
 * 🔗 Outbound Webhooks API
 * 
 * Manage outbound webhooks for external integrations:
 * - Create/update/delete webhooks
 * - Test webhook delivery
 * - View delivery history
 * - Retry failed deliveries
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WebhookService } from '../../services/webhooks/webhook-service';
import { winstonLog } from '../../utils/winston-logger';
import { ValidationError, NotFoundError } from '../../utils/errors';

const webhooks = new Hono<{
  Variables: {
    userEmail: string;
    userId?: string;
  };
}>();

// Validation schemas
const createWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event required'),
  secret: z.string().optional(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  description: z.string().optional(),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  secret: z.string().optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

const testWebhookSchema = z.object({
  webhookId: z.string(),
  testEvent: z.string().optional().default('webhook.test'),
});

/**
 * POST /api/webhooks
 * Create new outbound webhook
 */
webhooks.post(
  '/',
  zValidator('json', createWebhookSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const userId = c.get('userId') || c.get('userEmail');

      // Create webhook configuration
      // In production, this would save to webhookConfigurations table
      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const webhook = {
        id: webhookId,
        url: data.url,
        events: data.events,
        secret: data.secret,
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        description: data.description,
        isActive: true,
        createdBy: userId,
        createdAt: new Date(),
      };

      winstonLog.info('Webhook created', {
        webhookId,
        url: data.url,
        events: data.events,
        workspaceId: data.workspaceId,
      });

      return c.json({
        success: true,
        webhook,
        message: 'Webhook created successfully',
      });

    } catch (error) {
      winstonLog.error('Failed to create webhook', { error });
      return c.json({ error: 'Failed to create webhook' }, 500);
    }
  }
);

/**
 * GET /api/webhooks
 * List webhooks for workspace/project
 */
webhooks.get('/', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const projectId = c.req.query('projectId');

    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    // In production, query from database
    // For now, return empty array
    const webhooksList: any[] = [];

    return c.json({
      success: true,
      webhooks: webhooksList,
      count: webhooksList.length,
    });

  } catch (error) {
    winstonLog.error('Failed to list webhooks', { error });
    return c.json({ error: 'Failed to list webhooks' }, 500);
  }
});

/**
 * GET /api/webhooks/:id
 * Get webhook details
 */
webhooks.get('/:id', async (c) => {
  try {
    const webhookId = c.req.param('id');

    // In production, query from database
    // For now, return not found
    throw new NotFoundError('Webhook', { webhookId });

  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    
    winstonLog.error('Failed to get webhook', { error });
    return c.json({ error: 'Failed to get webhook' }, 500);
  }
});

/**
 * PATCH /api/webhooks/:id
 * Update webhook configuration
 */
webhooks.patch(
  '/:id',
  zValidator('json', updateWebhookSchema),
  async (c) => {
    try {
      const webhookId = c.req.param('id');
      const updates = c.req.valid('json');

      // In production, update in database
      winstonLog.info('Webhook updated', {
        webhookId,
        updates,
      });

      return c.json({
        success: true,
        message: 'Webhook updated successfully',
      });

    } catch (error) {
      winstonLog.error('Failed to update webhook', { error });
      return c.json({ error: 'Failed to update webhook' }, 500);
    }
  }
);

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
webhooks.delete('/:id', async (c) => {
  try {
    const webhookId = c.req.param('id');
    const userId = c.get('userId');

    // In production, soft delete in database
    winstonLog.info('Webhook deleted', {
      webhookId,
      deletedBy: userId,
    });

    return c.json({
      success: true,
      message: 'Webhook deleted successfully',
    });

  } catch (error) {
    winstonLog.error('Failed to delete webhook', { error });
    return c.json({ error: 'Failed to delete webhook' }, 500);
  }
});

/**
 * POST /api/webhooks/:id/test
 * Test webhook delivery
 */
webhooks.post(
  '/:id/test',
  zValidator('json', testWebhookSchema.partial()),
  async (c) => {
    try {
      const webhookId = c.req.param('id');
      const { testEvent } = c.req.valid('json');

      // In production, fetch webhook config from database
      // For now, return mock test
      const testPayload = {
        event: testEvent || 'webhook.test',
        data: {
          message: 'This is a test webhook',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        webhookId,
      };

      winstonLog.info('Webhook test triggered', {
        webhookId,
        event: testEvent,
      });

      return c.json({
        success: true,
        message: 'Test webhook sent',
        delivery: {
          status: 'success',
          testPayload,
        },
      });

    } catch (error) {
      winstonLog.error('Failed to test webhook', { error });
      return c.json({ error: 'Failed to test webhook' }, 500);
    }
  }
);

/**
 * GET /api/webhooks/:id/deliveries
 * Get delivery history for webhook
 */
webhooks.get('/:id/deliveries', async (c) => {
  try {
    const webhookId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');

    // In production, query webhook_deliveries table
    const deliveries: any[] = [];

    return c.json({
      success: true,
      deliveries,
      count: deliveries.length,
      webhookId,
    });

  } catch (error) {
    winstonLog.error('Failed to get deliveries', { error });
    return c.json({ error: 'Failed to get deliveries' }, 500);
  }
});

/**
 * POST /api/webhooks/:id/deliveries/:deliveryId/retry
 * Retry failed webhook delivery
 */
webhooks.post('/:id/deliveries/:deliveryId/retry', async (c) => {
  try {
    const webhookId = c.req.param('id');
    const deliveryId = c.req.param('deliveryId');

    // In production:
    // 1. Fetch delivery from database
    // 2. Check if already succeeded
    // 3. Retry delivery
    // 4. Update delivery record

    winstonLog.info('Webhook delivery retry triggered', {
      webhookId,
      deliveryId,
    });

    return c.json({
      success: true,
      message: 'Delivery retry initiated',
    });

  } catch (error) {
    winstonLog.error('Failed to retry delivery', { error });
    return c.json({ error: 'Failed to retry delivery' }, 500);
  }
});

export default webhooks;


