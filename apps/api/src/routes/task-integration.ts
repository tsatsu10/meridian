// @epic-3.7-task-integration: Task integration routes
import { Context } from "hono";
import { Hono } from "hono";
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import type { UserRole } from '../types/rbac';
import TaskIntegrationHandler from '../realtime/controllers/task-integration-handler';
import logger from '../utils/logger';

interface TaskIntegrationContext extends Context {
  get(key: "userEmail"): string;
  get(key: "userId"): string;
  get(key: "userRole"): UserRole;
}

const router = new Hono();
const taskIntegrationHandler = TaskIntegrationHandler.getInstance();

// Helper function to ensure string parameters
function ensureString(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

// Create a task-specific channel
router.post(
  '/tasks/:taskId/channel',
  auth,
  requireRole('workspace-manager' as UserRole, true),
  async (c: TaskIntegrationContext) => {
    try {
      const taskId = ensureString(c.req.param('taskId'), 'Task ID');
      const body = await c.req.json();
      const channelId = ensureString(body.channelId, 'Channel ID');

      await taskIntegrationHandler.createTaskChannel(taskId, channelId);
      return c.json({ message: 'Task channel created successfully' }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        return c.json({ error: error.message }, 400);
      }
      logger.error('Error creating task channel:', error);
      return c.json({ error: 'Failed to create task channel' }, 500);
    }
  }
);

// Get task channel
router.get(
  '/tasks/:taskId/channel',
  auth,
  async (c: TaskIntegrationContext) => {
    try {
      const taskId = ensureString(c.req.param('taskId'), 'Task ID');
      const channelId = await taskIntegrationHandler.getTaskChannel(taskId);

      if (channelId) {
        return c.json({ channelId });
      } else {
        return c.json({ error: 'Task channel not found' }, 404);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        return c.json({ error: error.message }, 400);
      }
      logger.error('Error getting task channel:', error);
      return c.json({ error: 'Failed to get task channel' }, 500);
    }
  }
);

// Create a task comment
router.post(
  '/tasks/:taskId/comments',
  auth,
  async (c: TaskIntegrationContext) => {
    try {
      const taskId = ensureString(c.req.param('taskId'), 'Task ID');
      const body = await c.req.json();
      const messageId = ensureString(body.messageId, 'Message ID');
      const { parentCommentId } = body;

      const comment = await taskIntegrationHandler.createTaskComment(
        taskId,
        messageId,
        parentCommentId
      );

      return c.json(comment, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        return c.json({ error: error.message }, 400);
      }
      logger.error('Error creating task comment:', error);
      return c.json({ error: 'Failed to create task comment' }, 500);
    }
  }
);

// Get task comments
router.get(
  '/tasks/:taskId/comments',
  auth,
  async (c: TaskIntegrationContext) => {
    try {
      const taskId = ensureString(c.req.param('taskId'), 'Task ID');
      const comments = await taskIntegrationHandler.getTaskComments(taskId);
      return c.json(comments);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        return c.json({ error: error.message }, 400);
      }
      logger.error('Error getting task comments:', error);
      return c.json({ error: 'Failed to get task comments' }, 500);
    }
  }
);

// Resolve a task comment
router.patch(
  '/tasks/comments/:commentId/resolve',
  auth,
  async (c: TaskIntegrationContext) => {
    try {
      const commentId = ensureString(c.req.param('commentId'), 'Comment ID');
      const userEmail = ensureString(c.get("userEmail"), 'User email');

      await taskIntegrationHandler.resolveComment(commentId, userEmail);
      return c.json({ message: 'Comment resolved successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        return c.json({ error: error.message }, 400);
      }
      logger.error('Error resolving comment:', error);
      return c.json({ error: 'Failed to resolve comment' }, 500);
    }
  }
);

export default router; 
