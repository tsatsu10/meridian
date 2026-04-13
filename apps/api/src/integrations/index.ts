import { Hono } from 'hono';
import { getDatabase } from '../database/connection';
import { integrationConnectionTable, webhookEndpointTable, users } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import logger from '../utils/logger';

const app = new Hono();

// Available integration providers
const AVAILABLE_INTEGRATIONS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get project notifications in your Slack channels',
    category: 'Communication',
    features: ['Notifications', 'Task updates', 'Project summaries'],
    oauthUrl: '/api/integrations/slack/oauth',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect repositories and sync commits with tasks',
    category: 'Development',
    features: ['Commit tracking', 'PR linking', 'Issue sync'],
    oauthUrl: '/api/integrations/github/oauth',
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Embed Figma designs and prototypes in your projects',
    category: 'Design',
    features: ['Design embeds', 'Version tracking', 'Comments sync'],
    oauthUrl: '/api/integrations/figma/oauth',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send project updates and notifications via email',
    category: 'Communication',
    features: ['Email notifications', 'Calendar invites', 'Task reminders'],
    oauthUrl: '/api/integrations/gmail/oauth',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync project deadlines and meetings with your calendar',
    category: 'Productivity',
    features: ['Deadline sync', 'Meeting integration', 'Time blocking'],
    oauthUrl: '/api/integrations/google-calendar/oauth',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Attach and share files from your Google Drive',
    category: 'Storage',
    features: ['File linking', 'Real-time sync', 'Permission management'],
    oauthUrl: '/api/integrations/google-drive/oauth',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Sync tasks and issues between Meridian and Jira',
    category: 'Project Management',
    features: ['Bidirectional sync', 'Issue tracking', 'Sprint planning'],
    oauthUrl: '/api/integrations/jira/oauth',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Create and join meetings directly from tasks',
    category: 'Communication',
    features: ['Meeting creation', 'Calendar integration', 'Recording links'],
    oauthUrl: '/api/integrations/zoom/oauth',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Store and share project files with Dropbox',
    category: 'Storage',
    features: ['File storage', 'Version control', 'Team folders'],
    oauthUrl: '/api/integrations/dropbox/oauth',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect Meridian with 5000+ apps via Zapier',
    category: 'Automation',
    features: ['Custom workflows', 'Trigger automation', 'Data sync'],
    oauthUrl: '/api/integrations/zapier/setup',
  },
];

// GET /api/integrations - List available integrations and their status
app.get('/', async (c) => {
  try {
    const { workspaceId } = c.req.query();
    const userEmail = c.get('userEmail');

    if (!workspaceId) {
      return c.json({ error: 'Missing workspaceId parameter' }, 400);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Fetch connected integrations
    const connections = await db
      .select()
      .from(integrationConnectionTable)
      .where(eq(integrationConnectionTable.workspaceId, workspaceId));

    // Map available integrations with connection status
    const integrationsWithStatus = AVAILABLE_INTEGRATIONS.map(integration => {
      const connection = connections.find(c => c.provider === integration.id);
      return {
        ...integration,
        status: connection ? 'connected' : 'available',
        connectionId: connection?.id || null,
        connectedAt: connection?.createdAt || null,
        setupUrl: integration.oauthUrl,
      };
    });

    logger.debug('[Integrations] Fetched integrations for workspace:', workspaceId);
    return c.json({
      data: integrationsWithStatus,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Integrations] Error fetching integrations:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/integrations/:provider/connect - Connect an integration (OAuth initiation)
app.post('/:provider/connect', async (c) => {
  try {
    const { provider } = c.req.param();
    const body = await c.req.json();
    const { workspaceId, config } = body;
    const userEmail = c.get('userEmail');

    if (!workspaceId) {
      return c.json({ error: 'Missing workspaceId' }, 400);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if integration exists
    const integration = AVAILABLE_INTEGRATIONS.find(i => i.id === provider);
    if (!integration) {
      return c.json({ error: 'Invalid integration provider' }, 400);
    }

    // Check if already connected
    const existing = await db.query.integrationConnectionTable.findFirst({
      where: and(
        eq(integrationConnectionTable.workspaceId, workspaceId),
        eq(integrationConnectionTable.provider, provider)
      ),
    });

    if (existing) {
      return c.json({ error: 'Integration already connected' }, 400);
    }

    // For now, create a "connected" integration without actual OAuth
    // In production, this would redirect to OAuth provider
    const [connection] = await db
      .insert(integrationConnectionTable)
      .values({
        id: createId(),
        name: integration.name,
        provider,
        workspaceId,
        status: 'active',
        config: config || {},
        metadata: {
          connectedBy: user.id,
          connectedByEmail: user.email,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info('[Integrations] Connected integration:', { provider, workspaceId, userId: user.id });

    return c.json({
      data: {
        ...connection,
        message: `${integration.name} connected successfully`,
      },
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Integrations] Error connecting integration:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/integrations/:connectionId - Disconnect an integration
app.delete('/:connectionId', async (c) => {
  try {
    const { connectionId } = c.req.param();
    const userEmail = c.get('userEmail');

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if connection exists
    const connection = await db.query.integrationConnectionTable.findFirst({
      where: eq(integrationConnectionTable.id, connectionId),
    });

    if (!connection) {
      return c.json({ error: 'Integration connection not found' }, 404);
    }

    // Delete the connection
    await db.delete(integrationConnectionTable).where(eq(integrationConnectionTable.id, connectionId));

    logger.info('[Integrations] Disconnected integration:', { connectionId, userId: user.id });

    return c.json({
      success: true,
      message: 'Integration disconnected successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Integrations] Error disconnecting integration:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== WEBHOOKS =====

// GET /api/integrations/webhooks - List webhooks
app.get('/webhooks', async (c) => {
  try {
    const { workspaceId } = c.req.query();
    const userEmail = c.get('userEmail');

    if (!workspaceId) {
      return c.json({ error: 'Missing workspaceId parameter' }, 400);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Fetch webhooks
    const webhooksRaw = await db
      .select()
      .from(webhookEndpointTable)
      .where(eq(webhookEndpointTable.workspaceId, workspaceId))
      .orderBy(desc(webhookEndpointTable.createdAt));

    // Add name from metadata
    const webhooks = webhooksRaw.map(webhook => ({
      ...webhook,
      name: (webhook.metadata as any)?.name || 'Unnamed Webhook',
    }));

    logger.debug('[Webhooks] Fetched webhooks for workspace:', workspaceId);
    return c.json({
      data: webhooks,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Webhooks] Error fetching webhooks:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/integrations/webhooks - Create a webhook
app.post('/webhooks', async (c) => {
  try {
    const body = await c.req.json();
    const { workspaceId, name, url, events } = body;
    const userEmail = c.get('userEmail');

    if (!workspaceId || !name || !url || !events) {
      return c.json({ error: 'Missing required fields: workspaceId, name, url, events' }, 400);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Create webhook
    const [webhook] = await db
      .insert(webhookEndpointTable)
      .values({
        id: createId(),
        url,
        workspaceId,
        events,
        isActive: true,
        metadata: {
          name, // Store name in metadata since schema doesn't have name field
          createdBy: user.id,
          createdByEmail: user.email,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info('[Webhooks] Created webhook:', { name, workspaceId, userId: user.id });

    return c.json({
      data: webhook,
      success: true,
      message: 'Webhook created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Webhooks] Error creating webhook:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/integrations/webhooks/:webhookId - Toggle webhook active status
app.patch('/webhooks/:webhookId', async (c) => {
  try {
    const { webhookId } = c.req.param();
    const body = await c.req.json();
    const { isActive } = body;
    const userEmail = c.get('userEmail');

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Update webhook
    const [webhook] = await db
      .update(webhookEndpointTable)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(webhookEndpointTable.id, webhookId))
      .returning();

    if (!webhook) {
      return c.json({ error: 'Webhook not found' }, 404);
    }

    logger.info('[Webhooks] Updated webhook:', { webhookId, isActive, userId: user.id });

    return c.json({
      data: webhook,
      success: true,
      message: `Webhook ${isActive ? 'enabled' : 'disabled'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Webhooks] Error updating webhook:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/integrations/webhooks/:webhookId - Delete a webhook
app.delete('/webhooks/:webhookId', async (c) => {
  try {
    const { webhookId } = c.req.param();
    const userEmail = c.get('userEmail');

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Delete webhook
    await db.delete(webhookEndpointTable).where(eq(webhookEndpointTable.id, webhookId));

    logger.info('[Webhooks] Deleted webhook:', { webhookId, userId: user.id });

    return c.json({
      success: true,
      message: 'Webhook deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[Webhooks] Error deleting webhook:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
