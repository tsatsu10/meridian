/**
 * File Management Routes
 * API endpoints for file upload, download, and management
 * Phase 0 - Day 4 Implementation
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import multer from 'multer';
import { storageService } from '../services/storage/storage-service';
import { virusScanner } from '../services/storage/virus-scanner';
import { thumbnailGenerator } from '../services/storage/thumbnail-generator';
import { getDatabase } from '../database/connection';
import { files, fileActivityLog, type NewFile, type NewFileActivityLog } from '../database/schema/files';
import { eq, and } from 'drizzle-orm';
import logger from '../utils/logger';

const app = new Hono();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
});

/**
 * POST /api/files/upload
 * Upload a file
 */
app.post(
  '/upload',
  // Multer middleware will be applied at the server level
  zValidator(
    'json',
    z.object({
      workspaceId: z.string(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().optional(),
    })
  ),
  async (c) => {
    try {
      const db = getDatabase();
      // Get user from context (assumes auth middleware)
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = c.req.valid('json');
      const file = c.req.raw as any; // Access uploaded file from request

      if (!file || !file.buffer) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Step 1: Virus scan
      logger.debug('🔍 Scanning file for viruses...');
      const scanResult = await virusScanner.scanBuffer(file.buffer, file.originalname);

      if (!scanResult.isClean) {
        logger.warn(`⚠️  Virus detected: ${scanResult.virusName}`);
        return c.json({
          error: 'File failed virus scan',
          details: scanResult.virusName,
        }, 400);
      }

      logger.debug('✅ File is clean');

      // Step 2: Upload to storage
      logger.debug('📤 Uploading to storage...');
      const uploadResult = await storageService.uploadFile(file, {
        uploadedBy: user.id,
        workspaceId: body.workspaceId,
        projectId: body.projectId,
        taskId: body.taskId,
      });

      if (!uploadResult.success) {
        return c.json({
          error: 'File upload failed',
          details: uploadResult.error,
        }, 500);
      }

      logger.debug('✅ File uploaded to storage');

      // Step 3: Generate thumbnail (if applicable)
      let thumbnailUrl: string | undefined;
      if (thumbnailGenerator.canGenerateThumbnail(file.mimetype)) {
        logger.debug('🖼️  Generating thumbnail...');
        const thumbnailResult = await thumbnailGenerator.generateThumbnail(
          file.buffer,
          file.mimetype,
          file.originalname
        );

        if (thumbnailResult.success && thumbnailResult.buffer) {
          // Upload thumbnail to storage
          const thumbnailUpload = await storageService.uploadFile(
            {
              ...file,
              buffer: thumbnailResult.buffer,
              originalname: `thumb_${file.originalname}`,
              mimetype: `image/${thumbnailResult.format}`,
              size: thumbnailResult.size,
            } as any,
            {
              uploadedBy: user.id,
              workspaceId: body.workspaceId,
            }
          );

          if (thumbnailUpload.success) {
            thumbnailUrl = thumbnailUpload.url;
            logger.debug('✅ Thumbnail generated');
          }
        }
      }

      // Step 4: Save to database
      logger.debug('💾 Saving to database...');
      const [newFile] = await db.insert(files).values({
        fileName: uploadResult.fileName,
        originalName: uploadResult.originalName,
        fileId: uploadResult.fileId,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        extension: uploadResult.fileName.split('.').pop() || '',
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        url: uploadResult.url,
        thumbnailUrl: thumbnailUrl || uploadResult.thumbnailUrl,
        storageKey: uploadResult.key,
        publicId: uploadResult.publicId,
        virusScanStatus: 'clean',
        virusScanResult: scanResult as any,
        scannedAt: new Date(),
        uploadedBy: user.id,
        workspaceId: body.workspaceId,
        projectId: body.projectId,
        taskId: body.taskId,
        description: body.description,
        tags: body.tags,
        isPublic: body.isPublic || false,
      }).returning();

      // Step 5: Log activity
      await db.insert(fileActivityLog).values({
        fileId: newFile.id,
        activityType: 'upload',
        activityDetails: {
          fileName: newFile.originalName,
          size: newFile.size,
          mimeType: newFile.mimeType,
        },
        userId: user.id,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      });

      logger.debug('✅ File upload complete');

      return c.json({
        success: true,
        file: {
          id: newFile.id,
          fileName: newFile.originalName,
          url: newFile.url,
          thumbnailUrl: newFile.thumbnailUrl,
          size: newFile.size,
          mimeType: newFile.mimeType,
          createdAt: newFile.createdAt,
        },
      }, 201);
    } catch (error: any) {
      logger.error('❌ File upload error:', error);
      return c.json({
        error: 'File upload failed',
        details: error.message,
      }, 500);
    }
  }
);

/**
 * GET /api/files/:fileId
 * Get file details
 */
app.get('/:fileId', async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { fileId } = c.req.param();

    const [file] = await db
      .select()
      .from(files)
      .where(and(
        eq(files.id, fileId),
        eq(files.isDeleted, false)
      ))
      .limit(1);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Check access permissions
    // TODO: Implement proper access control
    if (file.uploadedBy !== user.id && !file.isPublic) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Log view activity
    await db.insert(fileActivityLog).values({
      fileId: file.id,
      activityType: 'view',
      userId: user.id,
      ipAddress: c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
    });

    return c.json({ file });
  } catch (error: any) {
    logger.error('❌ Get file error:', error);
    return c.json({ error: 'Failed to get file' }, 500);
  }
});

/**
 * GET /api/files/workspace/:workspaceId
 * List files in workspace
 */
app.get('/workspace/:workspaceId', async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { workspaceId } = c.req.param();
    const projectId = c.req.query('projectId');
    const taskId = c.req.query('taskId');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = db
      .select()
      .from(files)
      .where(and(
        eq(files.workspaceId, workspaceId),
        eq(files.isDeleted, false)
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(files.createdAt);

    // Add filters
    if (projectId) {
      query = query.where(eq(files.projectId, projectId)) as any;
    }
    if (taskId) {
      query = query.where(eq(files.taskId, taskId)) as any;
    }

    const fileList = await query;

    return c.json({
      files: fileList,
      pagination: {
        limit,
        offset,
        total: fileList.length,
      },
    });
  } catch (error: any) {
    logger.error('❌ List files error:', error);
    return c.json({ error: 'Failed to list files' }, 500);
  }
});

/**
 * DELETE /api/files/:fileId
 * Delete a file
 */
app.delete('/:fileId', async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { fileId } = c.req.param();

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Check permissions
    if (file.uploadedBy !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Soft delete in database
    await db
      .update(files)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
      })
      .where(eq(files.id, fileId));

    // Delete from storage (optional - can be done by background job)
    if (process.env.DELETE_FROM_STORAGE === 'true') {
      await storageService.deleteFile(file.fileId, file.fileName);
    }

    // Log activity
    await db.insert(fileActivityLog).values({
      fileId: file.id,
      activityType: 'delete',
      userId: user.id,
      ipAddress: c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
    });

    return c.json({ success: true });
  } catch (error: any) {
    logger.error('❌ Delete file error:', error);
    return c.json({ error: 'Failed to delete file' }, 500);
  }
});

/**
 * GET /api/files/:fileId/download
 * Download a file
 */
app.get('/:fileId/download', async (c) => {
  try {
    const db = getDatabase();
    const user = c.get('user');
    const { fileId } = c.req.param();

    const [file] = await db
      .select()
      .from(files)
      .where(and(
        eq(files.id, fileId),
        eq(files.isDeleted, false)
      ))
      .limit(1);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Check access permissions
    if (!file.isPublic && (!user || file.uploadedBy !== user.id)) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Log download activity
    await db.insert(fileActivityLog).values({
      fileId: file.id,
      activityType: 'download',
      userId: user?.id,
      ipAddress: c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
    });

    // For S3, get signed URL
    if (file.storageProvider === 's3' && file.storageKey) {
      const signedUrl = await storageService.getSignedUrl(file.storageKey, 3600);
      if (signedUrl) {
        return c.redirect(signedUrl);
      }
    }

    // For other providers, redirect to public URL
    return c.redirect(file.url);
  } catch (error: any) {
    logger.error('❌ Download file error:', error);
    return c.json({ error: 'Failed to download file' }, 500);
  }
});

export default app;



