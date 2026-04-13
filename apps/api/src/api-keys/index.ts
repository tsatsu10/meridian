import { Hono } from 'hono';
import { getDatabase } from '../database/connection';
import { apiKeyTable, users } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import logger from '../utils/logger';

const app = new Hono();

// Helper: Generate a secure API key
function generateSecureApiKey(): { key: string; hash: string } {
  const key = `meridian_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash };
}

// Helper: Hash an API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// GET /api/api-keys - List all API keys for a workspace
app.get('/', async (c) => {
  try {
    const { workspaceId } = c.req.query();
    const userEmail = c.get('userEmail');

    if (!workspaceId) {
      return c.json({ error: 'Missing workspaceId parameter' }, 400);
    }
    if (!userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Fetch API keys for workspace
    const keys = await db
      .select({
        id: apiKeyTable.id,
        name: apiKeyTable.name,
        provider: apiKeyTable.provider,
        scopes: apiKeyTable.scopes,
        lastUsed: apiKeyTable.lastUsed,
        isActive: apiKeyTable.isActive,
        expiresAt: apiKeyTable.expiresAt,
        createdAt: apiKeyTable.createdAt,
        // Don't return the actual key hash for security
      })
      .from(apiKeyTable)
      .where(eq(apiKeyTable.workspaceId, workspaceId))
      .orderBy(desc(apiKeyTable.createdAt));

    // Calculate status for each key
    const keysWithStatus = keys.map(key => ({
      ...key,
      status: (!key.isActive || (key.expiresAt && new Date(key.expiresAt) < new Date())) ? 'inactive' : 'active',
      lastUsed: key.lastUsed ? formatLastUsed(new Date(key.lastUsed)) : 'Never',
    }));

    logger.debug('[API Keys] Fetched keys for workspace:', workspaceId);
    return c.json({
      data: keysWithStatus,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[API Keys] Error fetching keys:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/api-keys - Generate a new API key
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { workspaceId, name, scopes, expiresAt } = body;
    const userEmail = c.get('userEmail');

    if (!workspaceId || !name) {
      return c.json({ error: 'Missing required fields: workspaceId, name' }, 400);
    }
    if (!userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Generate secure API key
    const { key, hash } = generateSecureApiKey();

    // Create API key record
    const [newKey] = await db
      .insert(apiKeyTable)
      .values({
        id: createId(),
        name,
        key: hash, // Store hashed version
        workspaceId,
        scopes: scopes || ['read'],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info('[API Keys] Created new API key:', { name, workspaceId, userId: user.id });

    // Return the plain key ONLY once - user must save it
    return c.json({
      data: {
        ...newKey,
        key, // Plain text key (only returned this once!)
        status: 'active',
        lastUsed: 'Never',
      },
      success: true,
      message: 'API key created successfully. Save this key now - it will not be shown again!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[API Keys] Error creating key:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/api-keys/:keyId - Update API key (toggle active, update scopes, etc.)
app.patch('/:keyId', async (c) => {
  try {
    const { keyId } = c.req.param();
    const body = await c.req.json();
    const { name, scopes, isActive, expiresAt } = body;
    const userEmail = c.get('userEmail');

    if (!userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if key exists
    const existing = await db.query.apiKey.findFirst({
      where: eq(apiKeyTable.id, keyId),
    });

    if (!existing) {
      return c.json({ error: 'API key not found' }, 404);
    }

    // Update the key
    const [updated] = await db
      .update(apiKeyTable)
      .set({
        name: name || existing.name,
        scopes: scopes || existing.scopes,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(apiKeyTable.id, keyId))
      .returning();

    if (!updated) {
      return c.json({ error: 'Update failed' }, 500);
    }

    logger.info('[API Keys] Updated API key:', { keyId, userId: user.id });

    return c.json({
      data: {
        ...updated,
        status: !updated.isActive || (updated.expiresAt && new Date(updated.expiresAt) < new Date()) ? 'inactive' : 'active',
        lastUsed: updated.lastUsed ? formatLastUsed(new Date(updated.lastUsed)) : 'Never',
      },
      success: true,
      message: 'API key updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[API Keys] Error updating key:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/api-keys/:keyId - Delete/revoke an API key
app.delete('/:keyId', async (c) => {
  try {
    const { keyId } = c.req.param();
    const userEmail = c.get('userEmail');

    if (!userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase();

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if key exists
    const existing = await db.query.apiKey.findFirst({
      where: eq(apiKeyTable.id, keyId),
    });

    if (!existing) {
      return c.json({ error: 'API key not found' }, 404);
    }

    // Delete the key
    await db.delete(apiKeyTable).where(eq(apiKeyTable.id, keyId));

    logger.info('[API Keys] Deleted API key:', { keyId, userId: user.id });

    return c.json({
      success: true,
      message: 'API key deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[API Keys] Error deleting key:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Helper function to format last used timestamp
function formatLastUsed(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export default app;

