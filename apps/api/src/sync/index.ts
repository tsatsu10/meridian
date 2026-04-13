import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { auth } from '../middlewares/auth';
import { getDatabase } from "../database/connection";
import { taskTable, projectTable, timeEntryTable } from '../database/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import logger from '../utils/logger';

const sync = new Hono();

// Sync status endpoint
sync.get('/status', auth, async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'Workspace ID is required' }, 400);
    }

    // Get last sync time from user preferences or default to 0
    const lastSyncTime = parseInt(c.req.query('lastSyncTime') || '0');

    // Get counts of data since last sync
    const [projectCount, taskCount, timeEntryCount] = await Promise.all([
      db.select({ count: sql`count(*)` })
        .from(projectTable)
        .where(and(
          eq(projectTable.workspaceId, workspaceId),
          gte(projectTable.updatedAt, new Date(lastSyncTime))
        )),
      db.select({ count: sql`count(*)` })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(and(
          eq(projectTable.workspaceId, workspaceId),
          gte(taskTable.createdAt, new Date(lastSyncTime))
        )),
      db.select({ count: sql`count(*)` })
        .from(timeEntryTable)
        .where(gte(timeEntryTable.createdAt, new Date(lastSyncTime)))
    ]);

    return c.json({
      status: 'success',
      data: {
        lastSyncTime: Date.now(),
        pendingChanges: {
          projects: projectCount[0]?.count || 0,
          tasks: taskCount[0]?.count || 0,
          timeEntries: timeEntryCount[0]?.count || 0
        }
      }
    });
  } catch (error) {
    logger.error('Sync status error:', error);
    return c.json({ error: 'Failed to get sync status' }, 500);
  }
});

// Upload offline changes
const UploadChangesSchema = z.object({
  entity: z.enum(['tasks', 'projects', 'timeEntries']),
  changes: z.array(z.object({
    id: z.string(),
    type: z.enum(['create', 'update', 'delete']),
    data: z.any(),
    timestamp: z.number()
  }))
});

sync.post('/upload', auth, zValidator('json', UploadChangesSchema), async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    const { entity, changes } = c.req.valid('json');

    const results = [];

    for (const change of changes) {
      try {
        switch (entity) {
          case 'tasks':
            if (change.type === 'create') {
              const result = await db.insert(taskTable).values(change.data);
              results.push({ id: change.id, status: 'success' });
            } else if (change.type === 'update') {
              await db.update(taskTable).set(change.data).where(eq(taskTable.id, change.data.id));
              results.push({ id: change.id, status: 'success' });
            } else if (change.type === 'delete') {
              await db.delete(taskTable).where(eq(taskTable.id, change.data.id));
              results.push({ id: change.id, status: 'success' });
            }
            break;

          case 'projects':
            if (change.type === 'create') {
              const result = await db.insert(projectTable).values(change.data);
              results.push({ id: change.id, status: 'success' });
            } else if (change.type === 'update') {
              await db.update(projectTable).set(change.data).where(eq(projectTable.id, change.data.id));
              results.push({ id: change.id, status: 'success' });
            } else if (change.type === 'delete') {
              await db.delete(projectTable).where(eq(projectTable.id, change.data.id));
              results.push({ id: change.id, status: 'success' });
            }
            break;

          case 'timeEntries':
            if (change.type === 'create') {
              const result = await db.insert(timeEntryTable).values(change.data);
              results.push({ id: change.id, status: 'success' });
            } else if (change.type === 'update') {
              await db.update(timeEntryTable).set(change.data).where(eq(timeEntryTable.id, change.data.id));
              results.push({ id: change.id, status: 'success' });
            } else if (change.type === 'delete') {
              await db.delete(timeEntryTable).where(eq(timeEntryTable.id, change.data.id));
              results.push({ id: change.id, status: 'success' });
            }
            break;
        }
      } catch (error) {
        logger.error(`Failed to process change ${change.id}:`, error);
        results.push({ id: change.id, status: 'error', error: String(error) });
      }
    }

    return c.json({
      status: 'success',
      results
    });
  } catch (error) {
    logger.error('Upload changes error:', error);
    return c.json({ error: 'Failed to upload changes' }, 500);
  }
});

// Download server changes
sync.get('/download', auth, async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    const workspaceId = c.req.query('workspaceId');
    const entity = c.req.query('entity');
    const lastSyncTime = parseInt(c.req.query('lastSyncTime') || '0');

    if (!workspaceId || !entity) {
      return c.json({ error: 'Workspace ID and entity are required' }, 400);
    }

    let data = [];

    switch (entity) {
      case 'tasks':
        data = await db.select()
          .from(taskTable)
          .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
          .where(and(
            eq(projectTable.workspaceId, workspaceId),
            gte(taskTable.createdAt, new Date(lastSyncTime))
          ));
        break;

      case 'projects':
        data = await db.select()
          .from(projectTable)
          .where(and(
            eq(projectTable.workspaceId, workspaceId),
            gte(projectTable.updatedAt, new Date(lastSyncTime))
          ));
        break;

      case 'timeEntries':
        data = await db.select()
          .from(timeEntryTable)
          .where(gte(timeEntryTable.createdAt, new Date(lastSyncTime)));
        break;

      default:
        return c.json({ error: 'Invalid entity type' }, 400);
    }

    return c.json({
      status: 'success',
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Download changes error:', error);
    return c.json({ error: 'Failed to download changes' }, 500);
  }
});

// Conflict resolution endpoint
const ConflictResolutionSchema = z.object({
  entity: z.enum(['tasks', 'projects', 'timeEntries']),
  conflicts: z.array(z.object({
    id: z.string(),
    serverVersion: z.any(),
    clientVersion: z.any(),
    resolution: z.enum(['server', 'client', 'merge'])
  }))
});

sync.post('/conflicts', auth, zValidator('json', ConflictResolutionSchema), async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    const { entity, conflicts } = c.req.valid('json');

    const results = [];

    for (const conflict of conflicts) {
      try {
        let resolvedData;

        switch (conflict.resolution) {
          case 'server':
            resolvedData = conflict.serverVersion;
            break;
          case 'client':
            resolvedData = conflict.clientVersion;
            break;
          case 'merge':
            // Simple merge strategy - combine properties, server wins on conflicts
            resolvedData = {
              ...conflict.clientVersion,
              ...conflict.serverVersion,
              updatedAt: new Date()
            };
            break;
        }

        // Update the database with resolved data
        switch (entity) {
          case 'tasks':
            await db.update(taskTable).set(resolvedData).where(eq(taskTable.id, conflict.id));
            break;
          case 'projects':
            await db.update(projectTable).set(resolvedData).where(eq(projectTable.id, conflict.id));
            break;
          case 'timeEntries':
            await db.update(timeEntryTable).set(resolvedData).where(eq(timeEntryTable.id, conflict.id));
            break;
        }

        results.push({ id: conflict.id, status: 'resolved' });
      } catch (error) {
        logger.error(`Failed to resolve conflict ${conflict.id}:`, error);
        results.push({ id: conflict.id, status: 'error', error: error.message });
      }
    }

    return c.json({
      status: 'success',
      results
    });
  } catch (error) {
    logger.error('Conflict resolution error:', error);
    return c.json({ error: 'Failed to resolve conflicts' }, 500);
  }
});

export default sync; 

