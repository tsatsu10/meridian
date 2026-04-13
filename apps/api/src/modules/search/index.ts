// @epic-3.1-messaging: Search API - Global search across messages, channels, and users
// @persona-sarah: PM needs to quickly find messages and channels
// @persona-david: Team lead needs to search team communications

import { Hono } from 'hono';
import { getDatabase } from '../../database/connection';
import { messagesTable, channelTable, users, workspaceUserTable } from '../../database/schema';
import { sql, ilike, or, and, eq } from 'drizzle-orm';
import { auth } from '../../middlewares/auth';
import logger from '../../utils/logger';

const search = new Hono();

// Apply authentication middleware
search.use("*", auth);

/**
 * Global search endpoint
 * Searches across messages, channels, and users in a workspace
 * 
 * Query Parameters:
 * - q: Search query string (required)
 * - workspaceId: Workspace ID to search in (required)
 * - type: Filter by result type (optional: 'message' | 'channel' | 'user')
 * - limit: Max results per type (optional, default: 10)
 */
search.get('/', async (c) => {
  try {
    const query = c.req.query('q');
    const workspaceId = c.req.query('workspaceId');
    const type = c.req.query('type');
    const limit = parseInt(c.req.query('limit') || '10', 10);
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    // Validation
    if (!query || query.trim() === '') {
      return c.json({ error: 'Search query is required' }, 400);
    }

    if (!workspaceId) {
      return c.json({ error: 'Workspace ID is required' }, 400);
    }

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase();
    const results: any[] = [];
    const searchPattern = `%${query}%`;

    // Search messages (if not filtered to other types)
    if (!type || type === 'message') {
      try {
        const messageResults = await db
          .select({
            id: messagesTable.id,
            type: sql<string>`'message'`,
            title: sql<string>`CONCAT(COALESCE(${users.name}, 'User'), ':')`,
            content: messagesTable.content,
            description: sql<string>`CONCAT('in #', COALESCE(${channelTable.name}, 'channel'))`,
            channelId: messagesTable.channelId,
            channelName: channelTable.name,
            authorName: users.name,
            authorEmail: users.email,
            userEmail: sql<string>`${users.email}`,
            createdAt: messagesTable.createdAt,
          })
          .from(messagesTable)
          .leftJoin(channelTable, eq(messagesTable.channelId, channelTable.id))
          .leftJoin(users, eq(messagesTable.userId, users.id))
          .where(
            and(
              eq(channelTable.workspaceId, workspaceId),
              ilike(messagesTable.content, searchPattern)
            )
          )
          .orderBy(sql`${messagesTable.createdAt} DESC`)
          .limit(limit);

        results.push(...messageResults);
      } catch (error) {
        logger.error('Error searching messages:', error);
        // Continue with other search types even if messages fail
      }
    }

    // Search channels (if not filtered to other types)
    if (!type || type === 'channel') {
      try {
        const channelResults = await db
          .select({
            id: channelTable.id,
            type: sql<string>`'channel'`,
            title: channelTable.name,
            description: channelTable.description,
            channelId: channelTable.id,
            createdAt: channelTable.createdAt,
          })
          .from(channelTable)
          .where(
            and(
              eq(channelTable.workspaceId, workspaceId),
              or(
                ilike(channelTable.name, searchPattern),
                ilike(channelTable.description, searchPattern)
              )
            )
          )
          .orderBy(sql`${channelTable.name} ASC`)
          .limit(limit);

        results.push(...channelResults);
      } catch (error) {
        logger.error('Error searching channels:', error);
      }
    }

    // Search users in workspace (if not filtered to other types)
    if (!type || type === 'user') {
      try {
        const userResults = await db
          .select({
            id: users.id,
            type: sql<string>`'user'`,
            title: users.name,
            description: users.email,
            userEmail: users.email,
            createdAt: users.createdAt,
          })
          .from(users)
          .innerJoin(workspaceUserTable, eq(users.id, workspaceUserTable.userId))
          .where(
            and(
              eq(workspaceUserTable.workspaceId, workspaceId),
              or(
                ilike(users.name, searchPattern),
                ilike(users.email, searchPattern)
              )
            )
          )
          .orderBy(sql`${users.name} ASC`)
          .limit(limit);

        results.push(...userResults);
      } catch (error) {
        logger.error('Error searching users:', error);
      }
    }

    // Sort results by relevance (exact matches first, then by date)
    const sortedResults = results.sort((a, b) => {
      const aExact = a.title?.toLowerCase() === query.toLowerCase();
      const bExact = b.title?.toLowerCase() === query.toLowerCase();
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by date if both are exact or neither are
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      
      return 0;
    });

    return c.json({
      results: sortedResults,
      query,
      totalResults: sortedResults.length,
      workspaceId,
    }, 200);

  } catch (error: any) {
    logger.error('Search API error:', error);
    return c.json({ 
      error: 'Failed to perform search', 
      message: error.message 
    }, 500);
  }
});

/**
 * Search within a specific channel
 * 
 * Query Parameters:
 * - q: Search query string (required)
 * - limit: Max results (optional, default: 20)
 */
search.get('/channel/:channelId', async (c) => {
  try {
    const channelId = c.req.param('channelId');
    const query = c.req.query('q');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const userId = c.get('userId');

    if (!query) {
      return c.json({ error: 'Search query is required' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDatabase();
    const searchPattern = `%${query}%`;

    const messageResults = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        authorId: messagesTable.userId,
        createdAt: messagesTable.createdAt,
        isEdited: messagesTable.isEdited,
        reactions: messagesTable.reactions,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(messagesTable)
      .leftJoin(users, eq(messagesTable.userId, users.id))
      .where(
        and(
          eq(messagesTable.channelId, channelId),
          ilike(messagesTable.content, searchPattern)
        )
      )
      .orderBy(sql`${messagesTable.createdAt} DESC`)
      .limit(limit);

    return c.json({
      results: messageResults,
      query,
      totalResults: messageResults.length,
      channelId,
    }, 200);

  } catch (error: any) {
    logger.error('Channel search error:', error);
    return c.json({ 
      error: 'Failed to search channel', 
      message: error.message 
    }, 500);
  }
});

export default search;


