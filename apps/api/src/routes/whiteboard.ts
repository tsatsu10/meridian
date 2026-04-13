/**
 * Whiteboard Collaboration API Routes
 * Phase 4.2 - Whiteboard Collaboration
 */

import { Hono } from 'hono';
import { WhiteboardService } from '../services/whiteboard/whiteboard-service';
import { logger } from '../services/logging/logger';

const app = new Hono();
const whiteboardService = new WhiteboardService();

/**
 * POST /api/whiteboard
 * Create whiteboard
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      workspaceId,
      projectId,
      taskId,
      videoRoomId,
      name,
      description,
      templateType,
      createdBy,
      width,
      height,
      backgroundColor,
    } = body;

    if (!workspaceId || !name || !createdBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const whiteboard = await whiteboardService.createWhiteboard({
      workspaceId,
      projectId,
      taskId,
      videoRoomId,
      name,
      description,
      templateType,
      createdBy,
      width,
      height,
      backgroundColor,
    });

    return c.json({ whiteboard }, 201);
  } catch (error: any) {
    logger.error('Failed to create whiteboard', { error: error.message });
    return c.json({ error: 'Failed to create whiteboard' }, 500);
  }
});

/**
 * GET /api/whiteboard/:id
 * Get whiteboard with elements
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const whiteboard = await whiteboardService.getWhiteboard(id);
    return c.json({ whiteboard });
  } catch (error: any) {
    logger.error('Failed to get whiteboard', { error: error.message });
    return c.json({ error: 'Failed to get whiteboard' }, 500);
  }
});

/**
 * POST /api/whiteboard/:id/element
 * Add element to whiteboard
 */
app.post('/:id/element', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const body = await c.req.json();
    const {
      elementType,
      userId,
      x,
      y,
      width,
      height,
      rotation,
      strokeColor,
      fillColor,
      strokeWidth,
      opacity,
      pathData,
      content,
      fontSize,
      fontFamily,
      properties,
    } = body;

    if (!elementType || !userId || x === undefined || y === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const element = await whiteboardService.addElement({
      whiteboardId,
      elementType,
      userId,
      x,
      y,
      width,
      height,
      rotation,
      strokeColor,
      fillColor,
      strokeWidth,
      opacity,
      pathData,
      content,
      fontSize,
      fontFamily,
      properties,
    });

    return c.json({ element }, 201);
  } catch (error: any) {
    logger.error('Failed to add element', { error: error.message });
    return c.json({ error: 'Failed to add element' }, 500);
  }
});

/**
 * PUT /api/whiteboard/:id/element/:elementId
 * Update element
 */
app.put('/:id/element/:elementId', async (c) => {
  try {
    const elementId = c.req.param('elementId');
    const body = await c.req.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const element = await whiteboardService.updateElement(elementId, userId, updates);
    return c.json({ element });
  } catch (error: any) {
    logger.error('Failed to update element', { error: error.message });
    return c.json({ error: 'Failed to update element' }, 500);
  }
});

/**
 * DELETE /api/whiteboard/:id/element/:elementId
 * Delete element
 */
app.delete('/:id/element/:elementId', async (c) => {
  try {
    const elementId = c.req.param('elementId');
    const userId = c.req.query('userId');

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    await whiteboardService.deleteElement(elementId, userId);
    return c.json({ message: 'Element deleted' });
  } catch (error: any) {
    logger.error('Failed to delete element', { error: error.message });
    return c.json({ error: 'Failed to delete element' }, 500);
  }
});

/**
 * POST /api/whiteboard/:id/join
 * Join whiteboard
 */
app.post('/:id/join', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const body = await c.req.json();
    const { userId, displayName, role } = body;

    if (!userId || !displayName) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const collaborator = await whiteboardService.joinWhiteboard(
      whiteboardId,
      userId,
      displayName,
      role
    );

    return c.json({ collaborator });
  } catch (error: any) {
    logger.error('Failed to join whiteboard', { error: error.message });
    return c.json({ error: 'Failed to join whiteboard' }, 500);
  }
});

/**
 * POST /api/whiteboard/:id/leave
 * Leave whiteboard
 */
app.post('/:id/leave', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    await whiteboardService.leaveWhiteboard(whiteboardId, userId);
    return c.json({ message: 'Left whiteboard' });
  } catch (error: any) {
    logger.error('Failed to leave whiteboard', { error: error.message });
    return c.json({ error: 'Failed to leave whiteboard' }, 500);
  }
});

/**
 * PUT /api/whiteboard/:id/cursor
 * Update cursor position
 */
app.put('/:id/cursor', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const body = await c.req.json();
    const { userId, cursorX, cursorY } = body;

    if (!userId || cursorX === undefined || cursorY === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    await whiteboardService.updateCursor(whiteboardId, userId, cursorX, cursorY);
    return c.json({ message: 'Cursor updated' });
  } catch (error: any) {
    return c.json({ error: 'Failed to update cursor' }, 500);
  }
});

/**
 * POST /api/whiteboard/:id/comment
 * Add comment
 */
app.post('/:id/comment', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const body = await c.req.json();
    const { userId, content, x, y, elementId } = body;

    if (!userId || !content || x === undefined || y === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const comment = await whiteboardService.addComment(
      whiteboardId,
      userId,
      content,
      x,
      y,
      elementId
    );

    return c.json({ comment }, 201);
  } catch (error: any) {
    logger.error('Failed to add comment', { error: error.message });
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

/**
 * GET /api/whiteboard/:id/comments
 * Get comments
 */
app.get('/:id/comments', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const comments = await whiteboardService.getComments(whiteboardId);
    return c.json({ comments });
  } catch (error: any) {
    logger.error('Failed to get comments', { error: error.message });
    return c.json({ error: 'Failed to get comments' }, 500);
  }
});

/**
 * POST /api/whiteboard/:id/template
 * Create template from whiteboard
 */
app.post('/:id/template', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const body = await c.req.json();
    const { userId, name, description, category } = body;

    if (!userId || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const template = await whiteboardService.createTemplate(
      whiteboardId,
      userId,
      name,
      description,
      category
    );

    return c.json({ template }, 201);
  } catch (error: any) {
    logger.error('Failed to create template', { error: error.message });
    return c.json({ error: 'Failed to create template' }, 500);
  }
});

/**
 * GET /api/whiteboard/templates
 * Get templates
 */
app.get('/templates', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const templates = await whiteboardService.getTemplates(workspaceId);
    return c.json({ templates });
  } catch (error: any) {
    logger.error('Failed to get templates', { error: error.message });
    return c.json({ error: 'Failed to get templates' }, 500);
  }
});

/**
 * POST /api/whiteboard/:id/export
 * Export whiteboard
 */
app.post('/:id/export', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const body = await c.req.json();
    const { userId, format, resolution } = body;

    if (!userId || !format) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (!['png', 'jpg', 'pdf', 'svg'].includes(format)) {
      return c.json({ error: 'Invalid format' }, 400);
    }

    const exportRecord = await whiteboardService.exportWhiteboard(
      whiteboardId,
      userId,
      format,
      resolution
    );

    return c.json({ export: exportRecord }, 201);
  } catch (error: any) {
    logger.error('Failed to export whiteboard', { error: error.message });
    return c.json({ error: 'Failed to export whiteboard' }, 500);
  }
});

/**
 * GET /api/whiteboard/:id/history
 * Get history
 */
app.get('/:id/history', async (c) => {
  try {
    const whiteboardId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');

    const history = await whiteboardService.getHistory(whiteboardId, limit);
    return c.json({ history });
  } catch (error: any) {
    logger.error('Failed to get history', { error: error.message });
    return c.json({ error: 'Failed to get history' }, 500);
  }
});

export default app;


