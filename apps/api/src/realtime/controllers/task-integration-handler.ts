// @epic-3.7-task-integration: Task integration handler
import { getDatabase } from '../../database/connection';
import { taskChannelTable as taskChannels, taskCommentTable as taskComments } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import logger from '../../utils/logger';

class TaskIntegrationHandler {
  private static instance: TaskIntegrationHandler;

  private constructor() {}

  public static getInstance(): TaskIntegrationHandler {
    if (!TaskIntegrationHandler.instance) {
      TaskIntegrationHandler.instance = new TaskIntegrationHandler();
    }
    return TaskIntegrationHandler.instance;
  }

  /**
   * Creates a new task channel
   * @param taskId - The ID of the task
   * @param channelId - The ID of the channel to associate with the task
   */
  public async createTaskChannel(taskId: string, channelId: string) {
    const db = getDatabase();
    const now = new Date();
    await db.insert(taskChannels).values({
      id: createId(),
      taskId,
      channelId,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Gets the channel ID associated with a task
   * @param taskId - The ID of the task
   * @returns The channel ID if found, null otherwise
   */
  public async getTaskChannel(taskId: string): Promise<string | null> {
    const db = getDatabase();
    try {
      const result = await db
        .select({ channelId: taskChannels.channelId })
        .from(taskChannels)
        .where(eq(taskChannels.taskId, taskId))
        .limit(1)
        .get();

      return result?.channelId ?? null;
    } catch (error) {
      logger.error('Error getting task channel:', error);
      throw new Error('Failed to get task channel');
    }
  }

  /**
   * Creates a new task comment
   * @param taskId - The ID of the task
   * @param messageId - The ID of the message to associate with the comment
   * @param parentCommentId - Optional ID of the parent comment
   * @returns The created task comment
   */
  public async createTaskComment(taskId: string, messageId: string, parentCommentId?: string) {
    const db = getDatabase();
    const now = new Date();
    const comment = await db
      .insert(taskComments)
      .values({
        id: createId(),
        taskId,
        messageId,
        parentCommentId,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    if (!comment) {
      throw new Error('Failed to create task comment');
    }

    return comment;
  }

  /**
   * Gets all comments for a task
   * @param taskId - The ID of the task
   * @returns Array of task comments
   */
  public async getTaskComments(taskId: string) {
    const db = getDatabase();
    return db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(taskComments.createdAt)
      .all();
  }

  /**
   * Resolves a task comment
   * @param commentId - The ID of the comment to resolve
   * @param userEmail - The email of the user resolving the comment
   */
  public async resolveComment(commentId: string, userEmail: string) {
    const db = getDatabase();
    const now = new Date();
    await db
      .update(taskComments)
      .set({
        resolvedAt: now,
        resolvedBy: userEmail,
        updatedAt: now,
      })
      .where(eq(taskComments.id, commentId));
  }
}

export default TaskIntegrationHandler; 
