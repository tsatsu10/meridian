/**
 * File Serving Module
 * 
 * Serves uploaded files from local storage or proxies cloud storage
 * 
 * @epic-3.1-messaging: File serving for chat attachments
 */

import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import fs from 'fs';
import { fileStorageService } from '../../services/file-storage.service.js';
import logger from '../../utils/logger';

const files = new Hono();

/**
 * GET /api/files/:subdir/:filename
 * Serve file from local storage
 */
files.get('/:subdir/:filename', async (c) => {
  try {
    const subdir = c.req.param('subdir');
    const filename = c.req.param('filename');

    // Validate subdirectory to prevent directory traversal
    const allowedSubdirs = ['images', 'videos', 'documents', 'others'];
    if (!allowedSubdirs.includes(subdir)) {
      return c.json({ error: 'Invalid directory' }, 400);
    }

    // Get file path
    const filePath = fileStorageService.getFilePath(filename, subdir);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.txt': 'text/plain',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers
    c.header('Content-Type', contentType);
    c.header('Content-Length', fileBuffer.length.toString());
    c.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Support range requests for video/audio
    const range = c.req.header('range');
    if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileBuffer.length - 1;
      const chunksize = (end - start) + 1;
      const chunk = fileBuffer.slice(start, end + 1);

      c.status(206);
      c.header('Content-Range', `bytes ${start}-${end}/${fileBuffer.length}`);
      c.header('Accept-Ranges', 'bytes');
      c.header('Content-Length', chunksize.toString());
      
      return c.body(chunk);
    }

    return c.body(fileBuffer);
  } catch (error: any) {
    logger.error('File serving error:', error);
    return c.json({ error: 'Failed to serve file' }, 500);
  }
});

/**
 * GET /api/files/download/:subdir/:filename
 * Download file (forces download instead of inline display)
 */
files.get('/download/:subdir/:filename', async (c) => {
  try {
    const subdir = c.req.param('subdir');
    const filename = c.req.param('filename');

    const allowedSubdirs = ['images', 'videos', 'documents', 'others'];
    if (!allowedSubdirs.includes(subdir)) {
      return c.json({ error: 'Invalid directory' }, 400);
    }

    const filePath = fileStorageService.getFilePath(filename, subdir);

    if (!fs.existsSync(filePath)) {
      return c.json({ error: 'File not found' }, 404);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    c.header('Content-Type', contentType);
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Content-Length', fileBuffer.length.toString());

    return c.body(fileBuffer);
  } catch (error: any) {
    logger.error('File download error:', error);
    return c.json({ error: 'Failed to download file' }, 500);
  }
});

export default files;


