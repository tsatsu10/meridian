/**
 * 🔄 Sync GitHub Issues Controller
 * 
 * Syncs GitHub issues and PRs with Meridian tasks
 * @epic-3.2-integrations
 */

import { HTTPException } from 'hono/http-exception';
import { GitHubIntegration } from '../../services/github-integration';
import { winstonLog } from '../../../utils/winston-logger';
import { ValidationError, NotFoundError } from '../../../utils/errors';
import { parseIntegrationJsonField } from '../../../lib/parse-integration-json';

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
          eq(t.provider, 'github'),
          eq(t.status, 'active')
        ),
      });

      if (!connection || !connection.credentials) {
        throw new NotFoundError('GitHub integration not connected');
      }

      const creds = parseIntegrationJsonField(connection.credentials);
      const fromStore = creds.accessToken;
      token = typeof fromStore === 'string' ? fromStore : undefined;
    }

    if (!token) {
      throw new ValidationError('GitHub access token required');
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

  } catch (error: unknown) {
    winstonLog.error('GitHub sync failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status);
    }

    return c.json({ 
      error: 'Failed to sync GitHub issues',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}; 
