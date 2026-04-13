/**
 * 🐙 GitHub Integration Router
 * 
 * Complete API for GitHub integration:
 * - OAuth connection
 * - Repository connection
 * - Issue/PR syncing
 * - Webhook handling
 * - Bi-directional sync
 * 
 * @epic-3.2-integrations
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { GitHubIntegration } from './services/github-integration';
import { connectGitHubRepo } from './controllers/github/connect-repo';
import { syncGitHubIssues } from './controllers/github/sync-issues';
import { winstonLog } from '../utils/winston-logger';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import crypto from 'crypto';

const github = new Hono<{
  Variables: {
    userEmail: string;
    userId?: string;
    workspaceId?: string;
  };
}>();

// Validation schemas
const webhookSchema = z.object({
  action: z.string(),
  issue: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().optional(),
    state: z.string(),
    html_url: z.string(),
  }).optional(),
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().optional(),
    state: z.string(),
    html_url: z.string(),
  }).optional(),
  sender: z.object({
    login: z.string(),
  }),
}).passthrough(); // Allow additional fields

const manualSyncSchema = z.object({
  projectId: z.string(),
  owner: z.string(),
  repo: z.string(),
  syncPRs: z.boolean().optional().default(false),
});

/**
 * POST /api/integrations/github/connect
 * Connect GitHub repository to project
 */
github.post('/connect', connectGitHubRepo);

/**
 * POST /api/integrations/github/sync
 * Manually trigger sync of GitHub issues/PRs
 */
github.post(
  '/sync',
  zValidator('json', manualSyncSchema),
  syncGitHubIssues
);

/**
 * POST /api/integrations/github/webhook
 * Handle incoming GitHub webhooks
 */
github.post('/webhook', async (c) => {
  try {
    const payload = await c.req.json();
    const signature = c.req.header('x-hub-signature-256');
    const workspaceId = c.req.query('workspaceId');

    if (!signature) {
      throw new UnauthorizedError('Missing GitHub signature');
    }

    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required in query params');
    }

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
      
      if (signature !== digest) {
        winstonLog.security('Invalid GitHub webhook signature', {
          workspaceId,
          event: payload.action,
        });
        throw new UnauthorizedError('Invalid webhook signature');
      }
    }

    // Handle webhook
    await GitHubIntegration.handleWebhook(workspaceId, payload, signature);

    winstonLog.info('GitHub webhook processed', {
      workspaceId,
      action: payload.action,
      issueNumber: payload.issue?.number || payload.pull_request?.number,
    });

    return c.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    winstonLog.error('GitHub webhook processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof UnauthorizedError || error instanceof ValidationError) {
      return c.json({ error: error.message }, error.statusCode);
    }

    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

/**
 * GET /api/integrations/github/repos
 * List connected GitHub repositories
 */
github.get('/repos', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId') || c.get('workspaceId');
    
    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    const db = await import('../database/connection').then(m => m.getDatabase());
    const connections = await db.query.integrationConnectionTable.findMany({
      where: (t: any, { eq, and }: any) => and(
        eq(t.workspaceId, workspaceId),
        eq(t.integrationId, 'github'),
        eq(t.isActive, true)
      ),
    });

    const repos = connections.map(conn => {
      const config = typeof conn.configuration === 'string'
        ? JSON.parse(conn.configuration)
        : conn.configuration;

      return {
        id: conn.id,
        projectId: conn.projectId,
        repositoryName: config.repositoryName,
        repositoryUrl: config.repositoryUrl,
        syncIssues: config.syncIssues,
        syncPullRequests: config.syncPullRequests,
        autoCreateTasks: config.autoCreateTasks,
        lastSyncedAt: conn.lastSyncedAt,
        createdAt: conn.createdAt,
      };
    });

    return c.json({
      success: true,
      repositories: repos,
      count: repos.length,
    });

  } catch (error) {
    winstonLog.error('Failed to list GitHub repositories', { error });
    return c.json({ error: 'Failed to list repositories' }, 500);
  }
});

/**
 * DELETE /api/integrations/github/disconnect/:connectionId
 * Disconnect GitHub repository
 */
github.delete('/disconnect/:connectionId', async (c) => {
  try {
    const connectionId = c.req.param('connectionId');
    const userId = c.get('userId');

    const db = await import('../database/connection').then(m => m.getDatabase());
    
    // Soft delete connection
    await db.update(db.select().from(db.schema.integrationConnectionTable))
      .set({
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userId,
      })
      .where((t: any) => t.id === connectionId);

    winstonLog.info('GitHub repository disconnected', {
      connectionId,
      userId,
    });

    return c.json({
      success: true,
      message: 'GitHub repository disconnected',
    });

  } catch (error) {
    winstonLog.error('Failed to disconnect repository', { error });
    return c.json({ error: 'Failed to disconnect repository' }, 500);
  }
});

/**
 * GET /api/integrations/github/sync-status/:projectId
 * Get sync status for a project
 */
github.get('/sync-status/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const workspaceId = c.req.query('workspaceId');

    const db = await import('../database/connection').then(m => m.getDatabase());
    const connection = await db.query.integrationConnectionTable.findFirst({
      where: (t: any, { eq, and }: any) => and(
        eq(t.projectId, projectId),
        eq(t.integrationId, 'github'),
        eq(t.isActive, true)
      ),
    });

    if (!connection) {
      return c.json({
        success: true,
        connected: false,
        syncStatus: null,
      });
    }

    const config = typeof connection.configuration === 'string'
      ? JSON.parse(connection.configuration)
      : connection.configuration;

    return c.json({
      success: true,
      connected: true,
      syncStatus: {
        repositoryName: config.repositoryName,
        lastSyncedAt: connection.lastSyncedAt,
        syncIssues: config.syncIssues,
        syncPullRequests: config.syncPullRequests,
        autoCreateTasks: config.autoCreateTasks,
      },
    });

  } catch (error) {
    winstonLog.error('Failed to get sync status', { error });
    return c.json({ error: 'Failed to get sync status' }, 500);
  }
});

export default github;

