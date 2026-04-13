/**
 * 🔄 Sync GitHub Issues Controller
 * 
 * Syncs GitHub issues and PRs with Meridian tasks
 * @epic-3.2-integrations
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { GitHubIntegration } from '../../services/github-integration';
import { winstonLog } from '../../../utils/winston-logger';
import { ValidationError, NotFoundError } from '../../../utils/errors';

const syncSchema = z.object({
  projectId: z.string(),
  owner: z.string(),
  repo: z.string(),
  accessToken: z.string().optional(), // Use stored token if not provided
  syncPRs: z.boolean().optional().default(false),
});

export const syncGitHubIssues = async (c: any) => {
  try {
    const { projectId, owner, repo, accessToken, syncPRs } = c.req.valid('json');
    const workspaceId = c.req.query('workspaceId') || c.get('workspaceId');
    const userId = c.get('userId');

    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    // Use provided token or fetch from integration connection
    let token = accessToken;
    
    if (!token) {
      const db = await import('../../../database/connection').then(m => m.getDatabase());
      const connection = await db.query.integrationConnectionTable.findFirst({
        where: (t: any, { eq, and }: any) => and(
          eq(t.workspaceId, workspaceId),
          eq(t.integrationId, 'github'),
          eq(t.isActive, true)
        ),
      });

      if (!connection || !connection.credentials) {
        throw new NotFoundError('GitHub integration not connected');
      }

      token = typeof connection.credentials === 'string' 
        ? JSON.parse(connection.credentials).accessToken
        : connection.credentials.accessToken;
    }

    // Sync issues
    const result = await GitHubIntegration.syncRepositoryIssues(
      workspaceId,
      projectId,
      owner,
      repo,
      token
    );

    // Log sync operation
    winstonLog.info('GitHub issues synced', {
      workspaceId,
      projectId,
      owner,
      repo,
      createdTasks: result.createdTasks,
      updatedTasks: result.updatedTasks,
      userId,
    });

    return c.json({
      success: true,
      result,
      message: `Synced ${result.totalIssues} issues (${result.createdTasks} created, ${result.updatedTasks} updated)`,
    });

  } catch (error) {
    winstonLog.error('GitHub sync failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return c.json({ error: error.message }, error.statusCode);
    }

    return c.json({ 
      error: 'Failed to sync GitHub issues',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}; 
