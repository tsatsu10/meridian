/**
 * Notification API Routes
 * Phase 2.2 - Smart Notifications System
 */

import { Hono } from 'hono';
import { NotificationService } from '../services/notifications/notification-service';
import { DigestService } from '../services/notifications/digest-service';
import { WebhookService } from '../services/notifications/webhook-service';
import { AlertRulesEngine } from '../services/notifications/alert-rules-engine';
import { logger } from '../services/logging/logger';

const app = new Hono();

const notificationService = new NotificationService();
const digestService = new DigestService();
const webhookService = new WebhookService();
const alertRulesEngine = new AlertRulesEngine();

// ==================== NOTIFICATIONS ====================

/**
 * GET /api/notifications
 * Get notifications for current user
 */
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');
    const workspaceId = c.req.query('workspaceId');
    const isRead = c.req.query('isRead');
    const type = c.req.query('type');
    const limit = c.req.query('limit');
    const offset = c.req.query('offset');

    if (!userId || !workspaceId) {
      return c.json({ error: 'userId and workspaceId are required' }, 400);
    }

    const result = await notificationService.getNotifications({
      userId,
      workspaceId,
      isRead: isRead ? isRead === 'true' : undefined,
      type: type || undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    return c.json(result);
  } catch (error: any) {
    logger.error('Failed to get notifications', { error: error.message });
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

/**
 * GET /api/notifications/grouped
 * Get grouped notifications
 */
app.get('/grouped', async (c) => {
  try {
    const userId = c.req.query('userId');
    const workspaceId = c.req.query('workspaceId');

    if (!userId || !workspaceId) {
      return c.json({ error: 'userId and workspaceId are required' }, 400);
    }

    const grouped = await notificationService.getGroupedNotifications(userId, workspaceId);
    return c.json(grouped);
  } catch (error: any) {
    logger.error('Failed to get grouped notifications', { error: error.message });
    return c.json({ error: 'Failed to get grouped notifications' }, 500);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
app.get('/unread-count', async (c) => {
  try {
    const userId = c.req.query('userId');
    const workspaceId = c.req.query('workspaceId');

    if (!userId || !workspaceId) {
      return c.json({ error: 'userId and workspaceId are required' }, 400);
    }

    const count = await notificationService.getUnreadCount(userId, workspaceId);
    return c.json({ count });
  } catch (error: any) {
    logger.error('Failed to get unread count', { error: error.message });
    return c.json({ error: 'Failed to get unread count' }, 500);
  }
});

/**
 * POST /api/notifications
 * Create a new notification
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const notification = await notificationService.createNotification(body);
    return c.json(notification, 201);
  } catch (error: any) {
    logger.error('Failed to create notification', { error: error.message });
    return c.json({ error: 'Failed to create notification' }, 500);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
app.put('/:id/read', async (c) => {
  try {
    const notificationId = c.req.param('id');
    const userId = c.req.query('userId');

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    await notificationService.markAsRead(notificationId, userId);
    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to mark as read', { error: error.message });
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 */
app.put('/mark-all-read', async (c) => {
  try {
    const userId = c.req.query('userId');
    const workspaceId = c.req.query('workspaceId');

    if (!userId || !workspaceId) {
      return c.json({ error: 'userId and workspaceId are required' }, 400);
    }

    await notificationService.markAllAsRead(userId, workspaceId);
    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to mark all as read', { error: error.message });
    return c.json({ error: 'Failed to mark all as read' }, 500);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
app.delete('/:id', async (c) => {
  try {
    const notificationId = c.req.param('id');
    const userId = c.req.query('userId');

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    await notificationService.deleteNotification(notificationId, userId);
    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete notification', { error: error.message });
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// ==================== PREFERENCES ====================

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
app.get('/preferences', async (c) => {
  try {
    const userId = c.req.query('userId');
    const workspaceId = c.req.query('workspaceId');

    if (!userId || !workspaceId) {
      return c.json({ error: 'userId and workspaceId are required' }, 400);
    }

    const preferences = await notificationService.getUserPreferences(userId, workspaceId);
    return c.json(preferences);
  } catch (error: any) {
    logger.error('Failed to get preferences', { error: error.message });
    return c.json({ error: 'Failed to get preferences' }, 500);
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
app.put('/preferences', async (c) => {
  try {
    const userId = c.req.query('userId');
    const workspaceId = c.req.query('workspaceId');
    const updates = await c.req.json();

    if (!userId || !workspaceId) {
      return c.json({ error: 'userId and workspaceId are required' }, 400);
    }

    const updated = await notificationService.updatePreferences(userId, workspaceId, updates);
    return c.json(updated);
  } catch (error: any) {
    logger.error('Failed to update preferences', { error: error.message });
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
});

// ==================== DIGESTS ====================

/**
 * POST /api/notifications/digests/daily
 * Trigger daily digest generation (admin/cron only)
 */
app.post('/digests/daily', async (c) => {
  try {
    await digestService.sendDailyDigests();
    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to send daily digests', { error: error.message });
    return c.json({ error: 'Failed to send daily digests' }, 500);
  }
});

/**
 * POST /api/notifications/digests/weekly
 * Trigger weekly digest generation (admin/cron only)
 */
app.post('/digests/weekly', async (c) => {
  try {
    await digestService.sendWeeklyDigests();
    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to send weekly digests', { error: error.message });
    return c.json({ error: 'Failed to send weekly digests' }, 500);
  }
});

/**
 * GET /api/notifications/digests/history
 * Get digest history for user
 */
app.get('/digests/history', async (c) => {
  try {
    const userId = c.req.query('userId');
    const workspaceId = c.req.query('workspaceId');
    const type = c.req.query('type');

    if (!userId || !workspaceId) {
      return c.json({ error: 'userId and workspaceId are required' }, 400);
    }

    const history = await digestService.getDigestHistory(userId, workspaceId, type);
    return c.json({ history });
  } catch (error: any) {
    logger.error('Failed to get digest history', { error: error.message });
    return c.json({ error: 'Failed to get digest history' }, 500);
  }
});

// ==================== WEBHOOKS ====================

/**
 * GET /api/notifications/webhooks
 * Get webhooks for workspace
 */
app.get('/webhooks', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const webhooks = await webhookService.getWorkspaceWebhooks(workspaceId);
    return c.json({ webhooks });
  } catch (error: any) {
    logger.error('Failed to get webhooks', { error: error.message });
    return c.json({ error: 'Failed to get webhooks' }, 500);
  }
});

/**
 * POST /api/notifications/webhooks
 * Create a new webhook
 */
app.post('/webhooks', async (c) => {
  try {
    const body = await c.req.json();
    const webhook = await webhookService.createWebhook(body);
    return c.json(webhook, 201);
  } catch (error: any) {
    logger.error('Failed to create webhook', { error: error.message });
    return c.json({ error: 'Failed to create webhook' }, 500);
  }
});

/**
 * PUT /api/notifications/webhooks/:id
 * Update webhook
 */
app.put('/webhooks/:id', async (c) => {
  try {
    const webhookId = c.req.param('id');
    const updates = await c.req.json();
    
    const updated = await webhookService.updateWebhook(webhookId, updates);
    return c.json(updated);
  } catch (error: any) {
    logger.error('Failed to update webhook', { error: error.message });
    return c.json({ error: 'Failed to update webhook' }, 500);
  }
});

/**
 * DELETE /api/notifications/webhooks/:id
 * Delete webhook
 */
app.delete('/webhooks/:id', async (c) => {
  try {
    const webhookId = c.req.param('id');
    await webhookService.deleteWebhook(webhookId);
    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete webhook', { error: error.message });
    return c.json({ error: 'Failed to delete webhook' }, 500);
  }
});

/**
 * POST /api/notifications/webhooks/:id/test
 * Test webhook connection
 */
app.post('/webhooks/:id/test', async (c) => {
  try {
    const webhookId = c.req.param('id');
    const success = await webhookService.testWebhook(webhookId);
    return c.json({ success });
  } catch (error: any) {
    logger.error('Failed to test webhook', { error: error.message });
    return c.json({ error: 'Failed to test webhook', success: false }, 500);
  }
});

// ==================== ALERT RULES ====================

/**
 * GET /api/notifications/rules
 * Get alert rules for workspace
 */
app.get('/rules', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const isEnabled = c.req.query('isEnabled');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const rules = await alertRulesEngine.getWorkspaceRules(
      workspaceId,
      isEnabled ? isEnabled === 'true' : undefined
    );
    return c.json({ rules });
  } catch (error: any) {
    logger.error('Failed to get rules', { error: error.message });
    return c.json({ error: 'Failed to get rules' }, 500);
  }
});

/**
 * POST /api/notifications/rules
 * Create a new alert rule
 */
app.post('/rules', async (c) => {
  try {
    const body = await c.req.json();
    const rule = await alertRulesEngine.createRule(body);
    return c.json(rule, 201);
  } catch (error: any) {
    logger.error('Failed to create rule', { error: error.message });
    return c.json({ error: 'Failed to create rule' }, 500);
  }
});

/**
 * PUT /api/notifications/rules/:id
 * Update alert rule
 */
app.put('/rules/:id', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const updates = await c.req.json();
    
    const updated = await alertRulesEngine.updateRule(ruleId, updates);
    return c.json(updated);
  } catch (error: any) {
    logger.error('Failed to update rule', { error: error.message });
    return c.json({ error: 'Failed to update rule' }, 500);
  }
});

/**
 * DELETE /api/notifications/rules/:id
 * Delete alert rule
 */
app.delete('/rules/:id', async (c) => {
  try {
    const ruleId = c.req.param('id');
    await alertRulesEngine.deleteRule(ruleId);
    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete rule', { error: error.message });
    return c.json({ error: 'Failed to delete rule' }, 500);
  }
});

/**
 * POST /api/notifications/rules/test
 * Test rule conditions without saving
 */
app.post('/rules/test', async (c) => {
  try {
    const { conditions, testEntity } = await c.req.json();
    const result = await alertRulesEngine.testRule(conditions, testEntity);
    return c.json(result);
  } catch (error: any) {
    logger.error('Failed to test rule', { error: error.message });
    return c.json({ error: 'Failed to test rule' }, 500);
  }
});

export default app;


