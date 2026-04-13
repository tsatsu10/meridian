/**
 * File Upload Module
 * 
 * Handles file uploads for:
 * - Chat attachments
 * - Task attachments
 * - Project files
 * - User avatars
 * 
 * @epic-3.1-messaging: File sharing in chat
 * @persona-lisa: Designer needs to share files with version control
 * @persona-sarah: PM needs to share documents
 */

import { Hono } from 'hono';
import multer from 'multer';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../../database/connection.js';
import { attachments } from '../../database/schema.js';
import { fileStorageService } from '../../services/file-storage.service.js';
import { z } from 'zod';
import logger from '../../utils/logger.js';
import { sanitizeFileName } from '../../lib/universal-sanitization';
import { checkRateLimit, RATE_LIMITS } from '../../middlewares/chat-rate-limiter';
import { captureException } from '../../services/monitoring/sentry';

const upload = new Hono();

// Configure multer for memory storage
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
      'image/*',
      'video/*',
      'audio/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
    ];

    const isAllowed = fileStorageService.validateFileType(
      file.mimetype,
      allowedMimeTypes
    );

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// Upload schema for validation
const uploadSchema = z.object({
  caption: z.string().optional(),
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  workspaceId: z.string().optional(),
});

/**
 * POST /api/upload
 * Upload one or more files
 */
upload.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 🔒 SECURITY: Rate limit file uploads (5 per minute)
    try {
      await checkRateLimit(user.id, RATE_LIMITS.FILE_UPLOAD);
    } catch (rateLimitError) {
      logger.warn('File upload rate limit exceeded', { userId: user.id });
      return c.json({ error: 'Too many file uploads. Please wait a moment.' }, 429);
    }

    // Use multer middleware
    await new Promise((resolve, reject) => {
      multerUpload.array('file', 10)(c.req.raw as any, {} as any, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Access uploaded files
    const files = (c.req.raw as any).files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return c.json({ error: 'No files uploaded' }, 400);
    }

    // Parse and validate form data
    const formData = await c.req.formData();
    const caption = formData.get('caption')?.toString();
    const channelId = formData.get('channelId')?.toString();
    const messageId = formData.get('messageId')?.toString();
    const taskId = formData.get('taskId')?.toString();
    const projectId = formData.get('projectId')?.toString();
    const workspaceId = formData.get('workspaceId')?.toString();

    const uploadedFiles = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file size
        if (!fileStorageService.validateFileSize(file.size, 50)) {
          logger.error(`File ${file.originalname} exceeds size limit`);
          continue;
        }

        // 🔒 SECURITY: Sanitize file name (prevent path traversal)
        const sanitizedOriginalName = sanitizeFileName(file.originalname);
        
        // Upload file to storage
        const uploadedFile = await fileStorageService.uploadFile(
          file.buffer,
          sanitizedOriginalName,
          file.mimetype
        );

        // Save attachment record to database
        const db = getDatabase();
        const [attachment] = await db.insert(attachments).values({
          fileName: sanitizeFileName(uploadedFile.fileName),
          fileSize: uploadedFile.fileSize,
          fileType: uploadedFile.mimeType,
          fileUrl: uploadedFile.url,
          caption: caption || null,
          channelId: channelId || null,
          messageId: messageId || null,
          taskId: taskId || null,
          projectId: projectId || null,
          workspaceId: workspaceId || null,
          uploadedBy: user.id,
          metadata: {
            originalName: uploadedFile.originalName,
            uploadedAt: new Date().toISOString(),
          },
        }).returning();

        uploadedFiles.push({
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          fileType: attachment.fileType,
          fileUrl: attachment.fileUrl,
          thumbnailUrl: attachment.thumbnailUrl,
          caption: attachment.caption,
          createdAt: attachment.createdAt,
        });
      } catch (error) {
        logger.error(`Error uploading file ${file.originalname}:`, error);
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return c.json({ error: 'Failed to upload files' }, 500);
    }

    return c.json({
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles,
    }, 200);
  } catch (error: any) {
    logger.error('Upload error:', error);
    
    // 📊 SENTRY: Capture file upload errors
    captureException(error, {
      feature: 'file_upload',
      action: 'upload_files',
      userId: c.get('user')?.id,
      fileCount: files?.length,
    });
    
    return c.json({ error: error.message || 'Failed to upload files' }, 500);
  }
});

/**
 * GET /api/upload/:id
 * Get attachment details by ID
 */
upload.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const db = getDatabase();
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id));

    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    return c.json({ attachment }, 200);
  } catch (error: any) {
    logger.error('Get attachment error:', error);
    return c.json({ error: 'Failed to get attachment' }, 500);
  }
});

/**
 * DELETE /api/upload/:id
 * Delete attachment
 */
upload.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const db = getDatabase();
    
    // Get attachment to check ownership
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id));

    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    // Check if user owns the attachment or has permission
    if (attachment.uploadedBy !== user.id) {
      // TODO: Add workspace admin check
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Delete from storage
    try {
      await fileStorageService.deleteFile(attachment.fileUrl);
    } catch (error) {
      logger.warn('Failed to delete file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await db.delete(attachments).where(eq(attachments.id, id));

    return c.json({ message: 'Attachment deleted successfully' }, 200);
  } catch (error: any) {
    logger.error('Delete attachment error:', error);
    return c.json({ error: 'Failed to delete attachment' }, 500);
  }
});

export default upload;


