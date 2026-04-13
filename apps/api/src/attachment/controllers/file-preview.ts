// @epic-3.1-messaging: File preview endpoints for thumbnails and previews
// @persona-sarah: PM needs quick file previews for efficient collaboration
// @persona-david: Team lead needs visual file identification

import { Context } from "hono";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import ThumbnailService from "../../services/thumbnail-service";
import { getMimeType } from "../utils/file-utils";
import logger from '../../utils/logger';

const previewRequestSchema = z.object({
  width: z.string().optional().transform(val => val ? parseInt(val) : 200),
  height: z.string().optional().transform(val => val ? parseInt(val) : 200),
  quality: z.string().optional().transform(val => val ? parseInt(val) : 85),
  format: z.enum(['jpeg', 'png', 'webp']).optional().default('jpeg')
});

/**
 * Generate and serve file thumbnail
 */
export async function generateThumbnail(c: Context) {
  try {
    const fileId = c.req.param('fileId');
    const queryParams = previewRequestSchema.parse(c.req.query());
    
    if (!fileId) {
      return c.json({ error: 'File ID is required' }, 400);
    }

    // Get file path from uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileId);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file mime type
    const mimeType = await getMimeType(filePath);
    
    // Generate thumbnail
    const thumbnail = await ThumbnailService.generateThumbnail(filePath, mimeType, {
      width: queryParams.width,
      height: queryParams.height,
      quality: queryParams.quality,
      format: queryParams.format
    });

    // Serve thumbnail file
    const thumbnailBuffer = await fs.readFile(thumbnail.thumbnailPath);
    
    c.header('Content-Type', `image/${thumbnail.format}`);
    c.header('Content-Length', thumbnail.size.toString());
    c.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    c.header('ETag', `"${fileId}-${queryParams.width}x${queryParams.height}"`);
    
    return c.body(thumbnailBuffer);

  } catch (error) {
    logger.error('❌ Error generating thumbnail:', error);
    return c.json({ 
      error: 'Failed to generate thumbnail',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * Serve file thumbnail by thumbnail ID
 */
export async function serveThumbnail(c: Context) {
  try {
    const thumbnailId = c.req.param('thumbnailId');
    
    if (!thumbnailId) {
      return c.json({ error: 'Thumbnail ID is required' }, 400);
    }

    const thumbnailPath = ThumbnailService.getThumbnailPath(thumbnailId);
    
    // Check if thumbnail exists
    try {
      await fs.access(thumbnailPath);
    } catch {
      return c.json({ error: 'Thumbnail not found' }, 404);
    }

    // Serve thumbnail
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    const mimeType = await getMimeType(thumbnailPath);
    
    c.header('Content-Type', mimeType);
    c.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    c.header('ETag', `"${thumbnailId}"`);
    
    return c.body(thumbnailBuffer);

  } catch (error) {
    logger.error('❌ Error serving thumbnail:', error);
    return c.json({ 
      error: 'Failed to serve thumbnail',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * Get file preview information
 */
export async function getFilePreviewInfo(c: Context) {
  try {
    const fileId = c.req.param('fileId');
    
    if (!fileId) {
      return c.json({ error: 'File ID is required' }, 400);
    }

    // Get file path from uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileId);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file mime type and preview info
    const mimeType = await getMimeType(filePath);
    const previewInfo = await ThumbnailService.getFilePreviewInfo(filePath, mimeType);
    
    return c.json({
      success: true,
      fileInfo: previewInfo
    });

  } catch (error) {
    logger.error('❌ Error getting file preview info:', error);
    return c.json({ 
      error: 'Failed to get file preview info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * Serve file preview (full size optimized for viewing)
 */
export async function serveFilePreview(c: Context) {
  try {
    const fileId = c.req.param('fileId');
    const maxWidth = parseInt(c.req.query('maxWidth') || '1200');
    const maxHeight = parseInt(c.req.query('maxHeight') || '800');
    const quality = parseInt(c.req.query('quality') || '90');
    
    if (!fileId) {
      return c.json({ error: 'File ID is required' }, 400);
    }

    // Get file path from uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileId);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file mime type
    const mimeType = await getMimeType(filePath);
    
    // For images, potentially resize for preview
    if (mimeType.startsWith('image/')) {
      const preview = await ThumbnailService.generateThumbnail(filePath, mimeType, {
        width: maxWidth,
        height: maxHeight,
        quality,
        format: 'jpeg',
        maintainAspectRatio: true
      });

      const previewBuffer = await fs.readFile(preview.thumbnailPath);
      
      c.header('Content-Type', `image/${preview.format}`);
      c.header('Content-Length', preview.size.toString());
      c.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache
      
      return c.body(previewBuffer);
    }
    
    // For other file types, serve original file
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    
    c.header('Content-Type', mimeType);
    c.header('Content-Length', stats.size.toString());
    c.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    c.header('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    
    return c.body(fileBuffer);

  } catch (error) {
    logger.error('❌ Error serving file preview:', error);
    return c.json({ 
      error: 'Failed to serve file preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * Get file metadata for preview
 */
export async function getFileMetadata(c: Context) {
  try {
    const fileId = c.req.param('fileId');
    
    if (!fileId) {
      return c.json({ error: 'File ID is required' }, 400);
    }

    // Get file path from uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileId);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file stats and metadata
    const stats = await fs.stat(filePath);
    const mimeType = await getMimeType(filePath);
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(fileName);
    
    let additionalMetadata = {};
    
    // Get image-specific metadata if it's an image
    if (mimeType.startsWith('image/')) {
      try {
        const sharp = require('sharp');
        const imageMetadata = await sharp(filePath).metadata();
        additionalMetadata = {
          width: imageMetadata.width,
          height: imageMetadata.height,
          format: imageMetadata.format,
          density: imageMetadata.density,
          hasAlpha: imageMetadata.hasAlpha,
          orientation: imageMetadata.orientation
        };
      } catch (error) {
        logger.warn('Could not extract image metadata:', error);
      }
    }
    
    return c.json({
      success: true,
      metadata: {
        fileName,
        fileExtension,
        mimeType,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isPreviewable: isPreviewableType(mimeType),
        ...additionalMetadata
      }
    });

  } catch (error) {
    logger.error('❌ Error getting file metadata:', error);
    return c.json({ 
      error: 'Failed to get file metadata',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * Batch generate thumbnails for multiple files
 */
export async function batchGenerateThumbnails(c: Context) {
  try {
    const userEmail = c.get('userEmail');
    const { fileIds, options } = await c.req.json();
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: 'File IDs array is required' }, 400);
    }

    if (fileIds.length > 50) {
      return c.json({ error: 'Maximum 50 files allowed per batch' }, 400);
    }

    const results = [];
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    for (const fileId of fileIds) {
      try {
        const filePath = path.join(uploadsDir, fileId);
        
        // Check if file exists
        await fs.access(filePath);
        
        // Get file mime type
        const mimeType = await getMimeType(filePath);
        
        // Generate thumbnail
        const thumbnail = await ThumbnailService.generateThumbnail(filePath, mimeType, options);
        
        results.push({
          fileId,
          success: true,
          thumbnailUrl: `/api/files/thumbnail/${path.basename(thumbnail.thumbnailPath)}`,
          metadata: thumbnail.metadata
        });
        
      } catch (error) {
        results.push({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return c.json({
      success: true,
      results,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

  } catch (error) {
    logger.error('❌ Error in batch thumbnail generation:', error);
    return c.json({ 
      error: 'Failed to generate thumbnails',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * Helper function to check if file type is previewable
 */
function isPreviewableType(mimeType: string): boolean {
  const previewableTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'text/plain',
    'text/csv',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  return previewableTypes.includes(mimeType);
}

