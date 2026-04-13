import { eq, and, isNull, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { attachmentTable } from "../../database/schema";
import logger from '../../utils/logger';

// @epic-2.1-files: Get attachments for task or comment
async function getAttachments(taskId?: string | null, commentId?: string | null) {
  try {
    let whereCondition;
    
    if (taskId) {
      whereCondition = and(
        eq(attachmentTable.taskId, taskId),
        isNull(attachmentTable.commentId)
      );
    } else if (commentId) {
      whereCondition = and(
        eq(attachmentTable.commentId, commentId),
        isNull(attachmentTable.taskId)
      );
    } else {
      throw new Error('Either taskId or commentId must be provided');
    }

    const db = getDatabase();
    const attachments = await db
      .select()
      .from(attachmentTable)
      .where(whereCondition)
      .orderBy(desc(attachmentTable.createdAt));

    logger.debug(`📎 Retrieved ${attachments.length} attachments for ${taskId ? 'task' : 'comment'}: ${taskId || commentId}`);
    // Ensure we always return an array
    return Array.isArray(attachments) ? attachments : [];
  } catch (error) {
    logger.error('❌ Get attachments error:', error);
    // Return empty array instead of throwing error to prevent frontend crashes
    return [];
  }
}

export default getAttachments; 
