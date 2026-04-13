/**
 * Enhanced Chat API Routes
 * Phase 4.3 - Enhanced Chat Features
 */

import { Hono } from 'hono';
import { EnhancedChatService } from '../services/chat/enhanced-chat-service';
import { logger } from '../services/logging/logger';

const app = new Hono();
const chatService = new EnhancedChatService();

/**
 * POST /api/chat/thread
 * Create message thread
 */
app.post('/thread', async (c) => {
  try {
    const body = await c.req.json();
    const { channelId, parentMessageId, title, createdBy } = body;

    if (!channelId || !parentMessageId || !createdBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const thread = await chatService.createThread({
      channelId,
      parentMessageId,
      title,
      createdBy,
    });

    return c.json({ thread }, 201);
  } catch (error: any) {
    logger.error('Failed to create thread', { error: error.message });
    return c.json({ error: 'Failed to create thread' }, 500);
  }
});

/**
 * GET /api/chat/thread/:id
 * Get thread with messages
 */
app.get('/thread/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');

    const thread = await chatService.getThread(id, limit);
    return c.json({ thread });
  } catch (error: any) {
    logger.error('Failed to get thread', { error: error.message });
    return c.json({ error: 'Failed to get thread' }, 500);
  }
});

/**
 * POST /api/chat/thread/:id/message
 * Add message to thread
 */
app.post('/thread/:id/message', async (c) => {
  try {
    const threadId = c.req.param('id');
    const body = await c.req.json();
    const {
      userId,
      content,
      contentHtml,
      messageType,
      voiceUrl,
      voiceDuration,
      attachments,
      mentions,
    } = body;

    if (!userId || !content) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const message = await chatService.addThreadMessage({
      threadId,
      userId,
      content,
      contentHtml,
      messageType,
      voiceUrl,
      voiceDuration,
      attachments,
      mentions,
    });

    return c.json({ message }, 201);
  } catch (error: any) {
    logger.error('Failed to add thread message', { error: error.message });
    return c.json({ error: 'Failed to add thread message' }, 500);
  }
});

/**
 * PUT /api/chat/thread/:id/resolve
 * Resolve thread
 */
app.put('/thread/:id/resolve', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const thread = await chatService.resolveThread(id, userId);
    return c.json({ thread });
  } catch (error: any) {
    logger.error('Failed to resolve thread', { error: error.message });
    return c.json({ error: 'Failed to resolve thread' }, 500);
  }
});

/**
 * POST /api/chat/pin
 * Pin message
 */
app.post('/pin', async (c) => {
  try {
    const body = await c.req.json();
    const { channelId, messageId, userId, note, expiresAt } = body;

    if (!channelId || !messageId || !userId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const pin = await chatService.pinMessage(
      channelId,
      messageId,
      userId,
      note,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return c.json({ pin }, 201);
  } catch (error: any) {
    logger.error('Failed to pin message', { error: error.message });
    return c.json({ error: 'Failed to pin message' }, 500);
  }
});

/**
 * DELETE /api/chat/pin/:id
 * Unpin message
 */
app.delete('/pin/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await chatService.unpinMessage(id);
    return c.json({ message: 'Message unpinned' });
  } catch (error: any) {
    logger.error('Failed to unpin message', { error: error.message });
    return c.json({ error: 'Failed to unpin message' }, 500);
  }
});

/**
 * GET /api/chat/pins/:channelId
 * Get pinned messages
 */
app.get('/pins/:channelId', async (c) => {
  try {
    const channelId = c.req.param('channelId');
    const pins = await chatService.getPinnedMessages(channelId);
    return c.json({ pins });
  } catch (error: any) {
    logger.error('Failed to get pinned messages', { error: error.message });
    return c.json({ error: 'Failed to get pinned messages' }, 500);
  }
});

/**
 * POST /api/chat/reaction
 * Add reaction
 */
app.post('/reaction', async (c) => {
  try {
    const body = await c.req.json();
    const { messageId, userId, emoji } = body;

    if (!messageId || !userId || !emoji) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const reaction = await chatService.addReaction(messageId, userId, emoji);
    return c.json({ reaction }, 201);
  } catch (error: any) {
    logger.error('Failed to add reaction', { error: error.message });
    return c.json({ error: 'Failed to add reaction' }, 500);
  }
});

/**
 * DELETE /api/chat/reaction
 * Remove reaction
 */
app.delete('/reaction', async (c) => {
  try {
    const body = await c.req.json();
    const { messageId, userId, emoji } = body;

    if (!messageId || !userId || !emoji) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    await chatService.removeReaction(messageId, userId, emoji);
    return c.json({ message: 'Reaction removed' });
  } catch (error: any) {
    logger.error('Failed to remove reaction', { error: error.message });
    return c.json({ error: 'Failed to remove reaction' }, 500);
  }
});

/**
 * GET /api/chat/reactions/:messageId
 * Get message reactions
 */
app.get('/reactions/:messageId', async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const reactions = await chatService.getReactions(messageId);
    return c.json({ reactions });
  } catch (error: any) {
    logger.error('Failed to get reactions', { error: error.message });
    return c.json({ error: 'Failed to get reactions' }, 500);
  }
});

/**
 * POST /api/chat/voice
 * Create voice message
 */
app.post('/voice', async (c) => {
  try {
    const body = await c.req.json();
    const { messageId, userId, fileUrl, duration, fileSize, waveformData } = body;

    if (!messageId || !userId || !fileUrl || !duration) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const voice = await chatService.createVoiceMessage(
      messageId,
      userId,
      fileUrl,
      duration,
      fileSize,
      waveformData
    );

    return c.json({ voice }, 201);
  } catch (error: any) {
    logger.error('Failed to create voice message', { error: error.message });
    return c.json({ error: 'Failed to create voice message' }, 500);
  }
});

/**
 * GET /api/chat/search
 * Search messages
 */
app.get('/search', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const query = c.req.query('query');
    const channelId = c.req.query('channelId');
    const limit = parseInt(c.req.query('limit') || '20');

    if (!workspaceId || !query) {
      return c.json({ error: 'workspaceId and query are required' }, 400);
    }

    const results = await chatService.searchMessages(workspaceId, query, channelId, limit);
    return c.json({ results });
  } catch (error: any) {
    logger.error('Failed to search messages', { error: error.message });
    return c.json({ error: 'Failed to search messages' }, 500);
  }
});

/**
 * POST /api/chat/summary
 * Generate AI summary
 */
app.post('/summary', async (c) => {
  try {
    const body = await c.req.json();
    const { channelId, summaryType, startDate, endDate } = body;

    if (!channelId || !summaryType || !startDate || !endDate) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const summary = await chatService.generateSummary(
      channelId,
      summaryType,
      new Date(startDate),
      new Date(endDate)
    );

    return c.json({ summary }, 201);
  } catch (error: any) {
    logger.error('Failed to generate summary', { error: error.message });
    return c.json({ error: 'Failed to generate summary' }, 500);
  }
});

/**
 * GET /api/chat/summaries
 * Get summaries
 */
app.get('/summaries', async (c) => {
  try {
    const channelId = c.req.query('channelId');
    const threadId = c.req.query('threadId');
    const limit = parseInt(c.req.query('limit') || '10');

    const summaries = await chatService.getSummaries(channelId, threadId, limit);
    return c.json({ summaries });
  } catch (error: any) {
    logger.error('Failed to get summaries', { error: error.message });
    return c.json({ error: 'Failed to get summaries' }, 500);
  }
});

/**
 * POST /api/chat/read
 * Mark as read
 */
app.post('/read', async (c) => {
  try {
    const body = await c.req.json();
    const { messageId, userId, threadId } = body;

    if (!messageId || !userId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    await chatService.markAsRead(messageId, userId, threadId);
    return c.json({ message: 'Marked as read' });
  } catch (error: any) {
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
});

/**
 * POST /api/chat/draft
 * Save draft
 */
app.post('/draft', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, content, contentHtml, channelId, threadId, attachments } = body;

    if (!userId || !content) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const draft = await chatService.saveDraft(
      userId,
      content,
      contentHtml,
      channelId,
      threadId,
      attachments
    );

    return c.json({ draft });
  } catch (error: any) {
    logger.error('Failed to save draft', { error: error.message });
    return c.json({ error: 'Failed to save draft' }, 500);
  }
});

/**
 * GET /api/chat/draft
 * Get draft
 */
app.get('/draft', async (c) => {
  try {
    const userId = c.req.query('userId');
    const channelId = c.req.query('channelId');
    const threadId = c.req.query('threadId');

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const draft = await chatService.getDraft(userId, channelId, threadId);
    return c.json({ draft });
  } catch (error: any) {
    logger.error('Failed to get draft', { error: error.message });
    return c.json({ error: 'Failed to get draft' }, 500);
  }
});

/**
 * DELETE /api/chat/draft/:id
 * Delete draft
 */
app.delete('/draft/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await chatService.deleteDraft(id);
    return c.json({ message: 'Draft deleted' });
  } catch (error: any) {
    logger.error('Failed to delete draft', { error: error.message });
    return c.json({ error: 'Failed to delete draft' }, 500);
  }
});

export default app;


