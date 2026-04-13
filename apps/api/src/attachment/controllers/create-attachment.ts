import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { attachmentTable, userTable } from "../../database/schema";
import { publishEvent } from "../../events";
import logger from '../../utils/logger';

interface CreateAttachmentData {
  name: string;
  url: string;
  type: string;
  size: number;
  taskId?: string | null;
  commentId?: string | null;
  userEmail: string;
  description?: string | null;
  version?: string;
  parentId?: string | null;
}

// @epic-2.1-files: Create attachment record with notifications
async function createAttachment(data: CreateAttachmentData) {
  try {
    const db = getDatabase();
    // Get user ID from email
    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, data.userEmail))
      .limit(1);

    if (!user) {
      throw new Error(`User not found: ${data.userEmail}`);
    }

    const attachment = (
      await db
        .insert(attachmentTable)
        .values({
          fileName: data.name,          // Use fileName instead of name
          fileUrl: data.url,            // Use fileUrl instead of url
          fileType: data.type,          // Use fileType instead of type
          fileSize: data.size,          // Use fileSize instead of size
          taskId: data.taskId,
          commentId: data.commentId,
          uploadedBy: user.id,          // Use uploadedBy (user ID) instead of userEmail
          metadata: {                   // Store extra fields in metadata JSONB
            description: data.description,
            version: data.version || "1.0",
            parentId: data.parentId,
          },
        })
        .returning()
    ).at(0);

    if (!attachment) {
      throw new Error('Failed to create attachment');
    }

    // @epic-2.1-files: Publish file upload event for notifications
    await publishEvent("file.uploaded", {
      attachmentId: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      uploaderId: attachment.uploadedBy,
      taskId: attachment.taskId,
      commentId: attachment.commentId,
      isNewVersion: !!data.parentId,
      version: data.version || "1.0",
    });

    logger.debug(`📎 Attachment created: ${attachment.fileName} (${attachment.id})`);
    return attachment;
  } catch (error) {
    logger.error('❌ Create attachment error:', error);
    throw new Error(`Failed to create attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default createAttachment; 
