/**
 * 📁 File Versioning API
 * 
 * Endpoints for managing file versions:
 * - Create new version
 * - Get version history
 * - Restore previous version
 * - Compare versions
 * - Download specific version
 * - Delete old versions
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { FileVersioningService } from '../../services/file-versioning/version-service';
import { winstonLog } from '../../utils/winston-logger';
import { NotFoundError, ValidationError } from '../../utils/errors';

const fileVersions = new Hono<{
  Variables: {
    userEmail: string;
    userId?: string;
  };
}>();

// Validation schemas
const createVersionSchema = z.object({
  fileId: z.string(),
  changeDescription: z.string().optional(),
  preserveOriginal: z.boolean().optional().default(true),
});

const restoreVersionSchema = z.object({
  versionId: z.string(),
  reason: z.string().optional(),
});

const cleanupVersionsSchema = z.object({
  fileId: z.string(),
  keepCount: z.number().min(1).max(100).optional().default(10),
});

/**
 * POST /api/file-versions/create
 * Create a new version of a file
 */
fileVersions.post(
  '/create',
  zValidator('json', createVersionSchema),
  async (c) => {
    try {
      const { fileId, changeDescription, preserveOriginal } = c.req.valid('json');
      const userId = c.get('userId') || c.get('userEmail');

      const version = await FileVersioningService.createVersion({
        fileId,
        changedBy: userId,
        changeDescription,
        preserveOriginal,
      });

      return c.json({
        success: true,
        version,
        message: `Version ${version.version} created successfully`,
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        return c.json({ error: error.message }, error.statusCode);
      }
      
      winstonLog.error('Create version failed', { error });
      return c.json({ error: 'Failed to create version' }, 500);
    }
  }
);

/**
 * GET /api/file-versions/:fileId/history
 * Get version history for a file
 */
fileVersions.get('/:fileId/history', async (c) => {
  try {
    const fileId = c.req.param('fileId');
    const limit = parseInt(c.req.query('limit') || '50');

    const history = await FileVersioningService.getVersionHistory(fileId, limit);

    return c.json({
      success: true,
      versions: history,
      count: history.length,
      fileId,
    });

  } catch (error) {
    winstonLog.error('Get version history failed', { error });
    return c.json({ error: 'Failed to get version history' }, 500);
  }
});

/**
 * GET /api/file-versions/version/:versionId
 * Get specific version details
 */
fileVersions.get('/version/:versionId', async (c) => {
  try {
    const versionId = c.req.param('versionId');

    const version = await FileVersioningService.getVersion(versionId);

    if (!version) {
      return c.json({ error: 'Version not found' }, 404);
    }

    return c.json({
      success: true,
      version,
    });

  } catch (error) {
    winstonLog.error('Get version failed', { error });
    return c.json({ error: 'Failed to get version' }, 500);
  }
});

/**
 * POST /api/file-versions/restore
 * Restore a previous version
 */
fileVersions.post(
  '/restore',
  zValidator('json', restoreVersionSchema),
  async (c) => {
    try {
      const { versionId, reason } = c.req.valid('json');
      const userId = c.get('userId') || c.get('userEmail');

      const restoredVersion = await FileVersioningService.restoreVersion(
        versionId,
        userId,
        reason
      );

      return c.json({
        success: true,
        version: restoredVersion,
        message: `Version ${restoredVersion.version} restored successfully`,
      });

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        return c.json({ error: error.message }, error.statusCode);
      }
      
      winstonLog.error('Restore version failed', { error });
      return c.json({ error: 'Failed to restore version' }, 500);
    }
  }
);

/**
 * GET /api/file-versions/compare
 * Compare two versions
 */
fileVersions.get('/compare', async (c) => {
  try {
    const versionId1 = c.req.query('version1');
    const versionId2 = c.req.query('version2');

    if (!versionId1 || !versionId2) {
      return c.json({ error: 'Both version1 and version2 are required' }, 400);
    }

    const comparison = await FileVersioningService.compareVersions(
      versionId1,
      versionId2
    );

    return c.json({
      success: true,
      comparison,
    });

  } catch (error) {
    winstonLog.error('Compare versions failed', { error });
    return c.json({ error: 'Failed to compare versions' }, 500);
  }
});

/**
 * DELETE /api/file-versions/cleanup
 * Delete old versions (keep most recent N)
 */
fileVersions.delete(
  '/cleanup',
  zValidator('json', cleanupVersionsSchema),
  async (c) => {
    try {
      const { fileId, keepCount } = c.req.valid('json');

      const deletedCount = await FileVersioningService.deleteOldVersions(
        fileId,
        keepCount
      );

      return c.json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} old versions (keeping ${keepCount} most recent)`,
      });

    } catch (error) {
      winstonLog.error('Cleanup versions failed', { error });
      return c.json({ error: 'Failed to cleanup versions' }, 500);
    }
  }
);

/**
 * GET /api/file-versions/:fileId/latest
 * Get latest version for a file
 */
fileVersions.get('/:fileId/latest', async (c) => {
  try {
    const fileId = c.req.param('fileId');

    const history = await FileVersioningService.getVersionHistory(fileId, 1);

    if (history.length === 0) {
      return c.json({ error: 'No versions found' }, 404);
    }

    return c.json({
      success: true,
      version: history[0],
    });

  } catch (error) {
    winstonLog.error('Get latest version failed', { error });
    return c.json({ error: 'Failed to get latest version' }, 500);
  }
});

export default fileVersions;


