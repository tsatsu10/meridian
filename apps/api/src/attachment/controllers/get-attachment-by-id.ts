import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { attachmentTable } from "../../database/schema";
import logger from '../../utils/logger';

// @epic-2.1-files: Get specific attachment by ID
async function getAttachmentById(id: string) {
  const db = getDatabase();
  try {
    const attachment = await db.query.attachmentTable.findFirst({
      where: eq(attachmentTable.id, id),
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    logger.debug(`📎 Retrieved attachment: ${attachment.fileName} (${attachment.id})`);
    return attachment;
  } catch (error) {
    logger.error('❌ Get attachment by ID error:', error);
    throw new Error(`Failed to get attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default getAttachmentById; 
