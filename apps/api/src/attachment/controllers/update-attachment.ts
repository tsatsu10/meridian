import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { attachmentTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

interface UpdateAttachmentData {
  name?: string;
  description?: string;
  userEmail: string;
}

// @epic-2.1-files: Update attachment metadata
async function updateAttachment(id: string, data: UpdateAttachmentData) {
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

    // First check if attachment exists and user has permission
    const existingAttachment = await db.query.attachmentTable.findFirst({
      where: eq(attachmentTable.id, id),
    });

    if (!existingAttachment) {
      throw new Error('Attachment not found');
    }

    if (existingAttachment.uploadedBy !== user.id) {
      throw new Error('Permission denied: You can only update your own attachments');
    }

    const updateData: any = { updatedAt: new Date() };

    // Update fileName in schema
    if (data.name !== undefined) {
      updateData.fileName = data.name;
    }

    // Update description in metadata JSONB
    if (data.description !== undefined) {
      const currentMetadata = existingAttachment.metadata || {};
      updateData.metadata = {
        ...currentMetadata,
        description: data.description,
      };
    }

    const result = await db.update(attachmentTable)
      .set(updateData)
      .where(eq(attachmentTable.id, id))
      .returning();

    const attachment = result[0];
    if (!attachment) {
      throw new Error('Failed to update attachment');
    }

    logger.debug(`📎 Attachment updated: ${attachment.fileName} (${attachment.id})`);
    return attachment;
  } catch (error) {
    logger.error('❌ Update attachment error:', error);
    throw new Error(`Failed to update attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default updateAttachment; 
