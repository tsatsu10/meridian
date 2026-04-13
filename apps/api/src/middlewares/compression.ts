/**
 * Response Compression Middleware
 * Compress responses to reduce bandwidth
 * Phase 1 - Performance Optimization
 */

import { MiddlewareHandler } from 'hono';
import { compress as honoCompress } from 'hono/compress';
import { Logger } from '../services/logging/logger';

interface CompressionOptions {
  threshold?: number;      // Minimum size to compress (bytes)
  level?: number;          // Compression level (0-9)
  excludePatterns?: RegExp[];
  excludeMimeTypes?: string[];
}

/**
 * Compression middleware
 */
export function compression(options: CompressionOptions = {}): MiddlewareHandler {
  const {
    threshold = 1024,     // 1KB default
    excludePatterns = [
      /^\/api\/health/,
      /^\/api\/files\/download/,  // Already compressed
    ],
    excludeMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/zip',
      'application/gzip',
      'application/x-compressed',
    ],
  } = options;

  return async (c, next) => {
    const path = c.req.path;

    // Skip compression for excluded paths
    if (excludePatterns.some(pattern => pattern.test(path))) {
      return next();
    }

    // Store original response
    await next();

    try {
      const contentType = c.res.headers.get('Content-Type') || '';
      const contentLength = parseInt(c.res.headers.get('Content-Length') || '0');

      // Skip if content type should not be compressed
      if (excludeMimeTypes.some(type => contentType.includes(type))) {
        return;
      }

      // Skip if response is too small
      if (contentLength > 0 && contentLength < threshold) {
        return;
      }

      // Apply compression using Hono's built-in compress
      const compressionMiddleware = honoCompress();
      return compressionMiddleware(c, next);
    } catch (error) {
      Logger.error('Compression failed', error, { path });
      // Return uncompressed response on error
      return;
    }
  };
}

/**
 * Conditional compression based on content type
 */
export function smartCompression(): MiddlewareHandler {
  return compression({
    threshold: 1024,       // 1KB
    level: 6,              // Balanced compression
    excludeMimeTypes: [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      
      // Videos
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      
      // Audio
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/webm',
      
      // Already compressed
      'application/zip',
      'application/gzip',
      'application/x-gzip',
      'application/x-compressed',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
      'application/pdf',  // Usually already compressed
    ],
  });
}

/**
 * Aggressive compression for API responses
 */
export function apiCompression(): MiddlewareHandler {
  return compression({
    threshold: 512,        // 512 bytes
    level: 9,              // Maximum compression
    excludePatterns: [
      /^\/api\/health/,
      /^\/api\/files/,
    ],
  });
}

/**
 * Log compression stats
 */
export function compressionLogger(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = Date.now();
    const path = c.req.path;

    await next();

    try {
      const contentEncoding = c.res.headers.get('Content-Encoding');
      const contentLength = parseInt(c.res.headers.get('Content-Length') || '0');
      const duration = Date.now() - startTime;

      if (contentEncoding && contentLength > 0) {
        Logger.performance(
          'Response compressed',
          contentLength,
          'bytes',
          {
            path,
            encoding: contentEncoding,
            duration,
          }
        );
      }
    } catch (error) {
      // Ignore logging errors
    }
  };
}

export default compression;


