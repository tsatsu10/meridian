// @epic-3.1-messaging: User Presence Tracking
// @persona-sarah: PM needs to see who's online for quick communication
// @persona-david: Team lead needs to know team availability

import { Hono } from 'hono';
import logger from '../../utils/logger';

const presence = new Hono();

// Update user's last seen timestamp (called periodically from client)
presence.post('/heartbeat', async (c) => {
  try {
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    
    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import('../../database/connection');
    const { users } = await import('../../database/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = getDatabase();

    // Update last seen timestamp
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, userId));

    return c.json({ success: true, lastSeen: new Date().toISOString() }, 200);
  } catch (error: any) {
    logger.error('Error updating presence:', error);
    return c.json({ error: error.message || 'Failed to update presence' }, 500);
  }
});

// Get online status for specific users
presence.post('/status', async (c) => {
  try {
    const userId = c.get('userId');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ error: 'User IDs array required' }, 400);
    }

    const { getDatabase } = await import('../../database/connection');
    const { users } = await import('../../database/schema');
    const { inArray } = await import('drizzle-orm');
    
    const db = getDatabase();

    // Get last seen for requested users
    const usersData = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        lastSeen: users.lastSeen,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    // Calculate online status (online if last seen within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const statuses = usersData.map(user => ({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      isOnline: user.lastSeen ? new Date(user.lastSeen) > fiveMinutesAgo : false,
      lastSeen: user.lastSeen,
    }));

    return c.json(statuses, 200);
  } catch (error: any) {
    logger.error('Error fetching presence status:', error);
    return c.json({ error: error.message || 'Failed to fetch presence status' }, 500);
  }
});

// Get all online users in workspace
presence.get('/online', async (c) => {
  try {
    const userId = c.get('userId');
    const workspaceId = c.req.query('workspaceId');
    
    if (!userId || !workspaceId) {
      return c.json({ error: 'Unauthorized or missing workspace ID' }, 401);
    }

    const { getDatabase } = await import('../../database/connection');
    const { users, workspaceUserTable } = await import('../../database/schema');
    const { eq, and, gte } = await import('drizzle-orm');
    
    const db = getDatabase();

    // Get users who were active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        lastSeen: users.lastSeen,
      })
      .from(users)
      .innerJoin(workspaceUserTable, eq(users.id, workspaceUserTable.userId))
      .where(
        and(
          eq(workspaceUserTable.workspaceId, workspaceId),
          gte(users.lastSeen, fiveMinutesAgo)
        )
      );

    return c.json({
      count: onlineUsers.length,
      users: onlineUsers.map(user => ({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        userAvatar: user.avatar,
        lastSeen: user.lastSeen,
        isOnline: true,
      })),
    }, 200);
  } catch (error: any) {
    logger.error('Error fetching online users:', error);
    return c.json({ error: error.message || 'Failed to fetch online users' }, 500);
  }
});

export default presence;


