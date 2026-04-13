import { eq } from "drizzle-orm";
import { unlink } from "fs/promises";
import { join } from "path";
import { getDatabase } from "../../database/connection";
import { attachmentTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

function resolveUploadDiskPath(fileUrl: string): string | null {
  const uploadsDir = join(process.cwd(), "uploads");
  let pathPart = fileUrl;
  try {
    if (fileUrl.includes("://")) {
      pathPart = new URL(fileUrl).pathname;
    }
  } catch {
    return null;
  }
  const marker = "/uploads/";
  const i = pathPart.indexOf(marker);
  if (i === -1) {
    return null;
  }
  const after = pathPart.slice(i + marker.length);
  return join(uploadsDir, after);
}

// @epic-2.1-files: Delete attachment and file
async function deleteAttachment(id: string, userEmail: string) {
  const db = getDatabase();
  try {
    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user) {
      throw new Error(`User not found: ${userEmail}`);
    }

    // First check if attachment exists and user has permission
    const existingAttachment = await db.query.attachmentTable.findFirst({
      where: eq(attachmentTable.id, id),
    });

    if (!existingAttachment) {
      throw new Error('Attachment not found');
    }

    if (existingAttachment.uploadedBy !== user.id) {
      throw new Error('Permission denied: You can only delete your own attachments');
    }

    // Delete from database first
    await db.delete(attachmentTable).where(eq(attachmentTable.id, id));

    // Try to delete the physical file
    try {
      const filePath = resolveUploadDiskPath(existingAttachment.fileUrl);
      if (filePath) {
        await unlink(filePath);
        logger.debug(`🗑️ File deleted: ${filePath}`);
      } else {
        logger.warn(`⚠️ Could not resolve disk path for attachment URL: ${existingAttachment.fileUrl}`);
      }
    } catch (fileError) {
      logger.warn(`⚠️ Could not delete file: ${existingAttachment.fileUrl}`, fileError);
      // Don't throw error if file deletion fails - database record is already deleted
    }

    logger.debug(`📎 Attachment deleted: ${existingAttachment.fileName} (${existingAttachment.id})`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Delete attachment error:', error);
    throw new Error(`Failed to delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default deleteAttachment; 
