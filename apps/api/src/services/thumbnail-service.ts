// @epic-3.1-messaging: Thumbnail generation service for file previews
// @persona-sarah: PM needs quick file previews for efficient collaboration
// @persona-david: Team lead needs visual file identification

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createId } from '@paralleldrive/cuid2';
import logger from '../utils/logger';

// Try to import canvas with fallback for development
let createCanvas: any;
let loadImage: any;
let registerFont: any;
let canvasAvailable = false;

try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
  registerFont = canvas.registerFont;
  canvasAvailable = true;
  logger.info('✅ Canvas module loaded successfully for thumbnail generation').catch(console.error);
} catch (error) {
  // Silently handle Canvas module unavailability in development
  logger.debug('🔄 Using fallback thumbnail generation (Canvas module not available)');
  canvasAvailable = false;
  
  // Prevent error from propagating
  if (typeof window === 'undefined' && !process.env.NODE_ENV?.includes('production')) {
    // In development, suppress the error details to avoid console spam
  }
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

export interface ThumbnailResult {
  thumbnailPath: string;
  originalPath: string;
  width: number;
  height: number;
  format: string;
  size: number;
  metadata?: {
    originalWidth?: number;
    originalHeight?: number;
    duration?: number; // for videos
    pages?: number; // for PDFs
  };
}

export interface FilePreviewInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  isPreviewable: boolean;
  metadata?: Record<string, any>;
}

class ThumbnailService {
  private thumbnailsDir: string;
  private previewsDir: string;
  
  constructor() {
    this.thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    this.previewsDir = path.join(process.cwd(), 'uploads', 'previews');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      await fs.mkdir(this.previewsDir, { recursive: true });
    } catch (error) {
      logger.error('❌ Error creating thumbnail directories:', error);
    }
  }

  /**
   * Generate thumbnail for various file types
   */
  async generateThumbnail(
    filePath: string, 
    fileType: string,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    const defaultOptions: Required<ThumbnailOptions> = {
      width: 200,
      height: 200,
      quality: 85,
      format: 'jpeg',
      maintainAspectRatio: true,
      ...options
    };

    const thumbnailId = createId();
    const thumbnailFileName = `${thumbnailId}.${defaultOptions.format}`;
    const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFileName);

    try {
      switch (true) {
        case fileType.startsWith('image/'):
          return await this.generateImageThumbnail(filePath, thumbnailPath, defaultOptions);
        
        case fileType === 'application/pdf':
          return await this.generatePDFThumbnail(filePath, thumbnailPath, defaultOptions);
        
        case fileType.startsWith('video/'):
          return await this.generateVideoThumbnail(filePath, thumbnailPath, defaultOptions);
        
        case this.isDocumentType(fileType):
          return await this.generateDocumentThumbnail(filePath, thumbnailPath, defaultOptions, fileType);
        
        default:
          return await this.generateGenericThumbnail(filePath, thumbnailPath, defaultOptions, fileType);
      }
    } catch (error) {
      logger.error('❌ Error generating thumbnail:', error);
      // Generate fallback thumbnail
      return await this.generateGenericThumbnail(filePath, thumbnailPath, defaultOptions, fileType);
    }
  }

  /**
   * Generate thumbnail for images
   */
  private async generateImageThumbnail(
    imagePath: string,
    thumbnailPath: string,
    options: Required<ThumbnailOptions>
  ): Promise<ThumbnailResult> {
    const metadata = await sharp(imagePath).metadata();
    
    let processor = sharp(imagePath);
    
    if (options.maintainAspectRatio) {
      processor = processor.resize(options.width, options.height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    } else {
      processor = processor.resize(options.width, options.height);
    }

    // Apply format-specific optimizations
    switch (options.format) {
      case 'jpeg':
        processor = processor.jpeg({ quality: options.quality });
        break;
      case 'png':
        processor = processor.png({ quality: options.quality });
        break;
      case 'webp':
        processor = processor.webp({ quality: options.quality });
        break;
    }

    await processor.toFile(thumbnailPath);
    
    const thumbnailStats = await fs.stat(thumbnailPath);
    const thumbnailMetadata = await sharp(thumbnailPath).metadata();

    return {
      thumbnailPath,
      originalPath: imagePath,
      width: thumbnailMetadata.width || options.width,
      height: thumbnailMetadata.height || options.height,
      format: options.format,
      size: thumbnailStats.size,
      metadata: {
        originalWidth: metadata.width,
        originalHeight: metadata.height
      }
    };
  }

  /**
   * Generate thumbnail for PDF files
   */
  private async generatePDFThumbnail(
    pdfPath: string,
    thumbnailPath: string,
    options: Required<ThumbnailOptions>
  ): Promise<ThumbnailResult> {
    if (!canvasAvailable) {
      return this.generateFallbackThumbnail(pdfPath, thumbnailPath, options, 'PDF');
    }

    // For now, create a generic PDF thumbnail
    // In production, you'd use pdf-poppler or similar library
    const canvas = createCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d');

    // PDF icon background
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(0, 0, options.width, options.height);

    // PDF text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PDF', options.width / 2, options.height / 2 + 8);

    // Add smaller file icon
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    const margin = 20;
    ctx.strokeRect(margin, margin, options.width - 2 * margin, options.height - 2 * margin);

    const buffer = canvas.toBuffer('image/jpeg', { quality: options.quality / 100 });
    await fs.writeFile(thumbnailPath, buffer);
    
    const stats = await fs.stat(thumbnailPath);

    return {
      thumbnailPath,
      originalPath: pdfPath,
      width: options.width,
      height: options.height,
      format: options.format,
      size: stats.size,
      metadata: {
        pages: 1 // Would be extracted from actual PDF in production
      }
    };
  }

  /**
   * Generate thumbnail for video files
   */
  private async generateVideoThumbnail(
    videoPath: string,
    thumbnailPath: string,
    options: Required<ThumbnailOptions>
  ): Promise<ThumbnailResult> {
    if (!canvasAvailable) {
      return this.generateFallbackThumbnail(videoPath, thumbnailPath, options, 'VIDEO');
    }

    // For now, create a generic video thumbnail
    // In production, you'd use ffmpeg to extract frame
    const canvas = createCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d');

    // Video icon background
    ctx.fillStyle = '#4444ff';
    ctx.fillRect(0, 0, options.width, options.height);

    // Play button
    ctx.fillStyle = 'white';
    ctx.beginPath();
    const centerX = options.width / 2;
    const centerY = options.height / 2;
    const size = 30;
    ctx.moveTo(centerX - size/2, centerY - size/2);
    ctx.lineTo(centerX + size/2, centerY);
    ctx.lineTo(centerX - size/2, centerY + size/2);
    ctx.closePath();
    ctx.fill();

    const buffer = canvas.toBuffer('image/jpeg', { quality: options.quality / 100 });
    await fs.writeFile(thumbnailPath, buffer);
    
    const stats = await fs.stat(thumbnailPath);

    return {
      thumbnailPath,
      originalPath: videoPath,
      width: options.width,
      height: options.height,
      format: options.format,
      size: stats.size,
      metadata: {
        duration: 0 // Would be extracted from actual video in production
      }
    };
  }

  /**
   * Generate thumbnail for document files
   */
  private async generateDocumentThumbnail(
    docPath: string,
    thumbnailPath: string,
    options: Required<ThumbnailOptions>,
    mimeType: string
  ): Promise<ThumbnailResult> {
    let extension = 'DOC';
    
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      extension = 'XLS';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      extension = 'PPT';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      extension = 'DOC';
    }

    if (!canvasAvailable) {
      return this.generateFallbackThumbnail(docPath, thumbnailPath, options, extension);
    }

    const canvas = createCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d');

    // Document icon background
    let backgroundColor = '#44aa44';
    
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      backgroundColor = '#44aa44';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      backgroundColor = '#aa4444';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      backgroundColor = '#4444aa';
    }

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, options.width, options.height);

    // Document text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(extension, options.width / 2, options.height / 2 + 6);

    // Add document lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    const lineSpacing = 8;
    const startY = options.height / 2 + 20;
    for (let i = 0; i < 3; i++) {
      const y = startY + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(options.width - 20, y);
      ctx.stroke();
    }

    const buffer = canvas.toBuffer('image/jpeg', { quality: options.quality / 100 });
    await fs.writeFile(thumbnailPath, buffer);
    
    const stats = await fs.stat(thumbnailPath);

    return {
      thumbnailPath,
      originalPath: docPath,
      width: options.width,
      height: options.height,
      format: options.format,
      size: stats.size
    };
  }

  /**
   * Generate generic thumbnail for unsupported file types
   */
  private async generateGenericThumbnail(
    filePath: string,
    thumbnailPath: string,
    options: Required<ThumbnailOptions>,
    mimeType: string
  ): Promise<ThumbnailResult> {
    const extension = path.extname(filePath).slice(1).toUpperCase() || 'FILE';
    
    if (!canvasAvailable) {
      return this.generateFallbackThumbnail(filePath, thumbnailPath, options, extension);
    }

    const canvas = createCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d');

    // Generic file background
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, options.width, options.height);

    // File extension
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(extension, options.width / 2, options.height / 2 + 4);

    // File icon
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    const margin = 15;
    ctx.strokeRect(margin, margin, options.width - 2 * margin, options.height - 2 * margin);

    const buffer = canvas.toBuffer('image/jpeg', { quality: options.quality / 100 });
    await fs.writeFile(thumbnailPath, buffer);
    
    const stats = await fs.stat(thumbnailPath);

    return {
      thumbnailPath,
      originalPath: filePath,
      width: options.width,
      height: options.height,
      format: options.format,
      size: stats.size
    };
  }

  /**
   * Generate fallback thumbnail using Sharp when Canvas is not available
   */
  private async generateFallbackThumbnail(
    filePath: string,
    thumbnailPath: string,
    options: Required<ThumbnailOptions>,
    label: string
  ): Promise<ThumbnailResult> {
    // Create a simple solid color thumbnail using Sharp
    const svg = `
      <svg width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#666666"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" dy=".3em">${label}</text>
      </svg>
    `;

    const buffer = Buffer.from(svg);
    
    let processor = sharp(buffer);
    
    // Apply format-specific optimizations
    switch (options.format) {
      case 'jpeg':
        processor = processor.jpeg({ quality: options.quality });
        break;
      case 'png':
        processor = processor.png({ quality: options.quality });
        break;
      case 'webp':
        processor = processor.webp({ quality: options.quality });
        break;
    }

    await processor.toFile(thumbnailPath);
    
    const stats = await fs.stat(thumbnailPath);

    return {
      thumbnailPath,
      originalPath: filePath,
      width: options.width,
      height: options.height,
      format: options.format,
      size: stats.size
    };
  }

  /**
   * Check if file type is a document
   */
  private isDocumentType(mimeType: string): boolean {
    const documentTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf'
    ];
    return documentTypes.includes(mimeType);
  }

  /**
   * Get file preview information
   */
  async getFilePreviewInfo(filePath: string, mimeType: string): Promise<FilePreviewInfo> {
    const id = createId();
    const stats = await fs.stat(filePath);
    const originalName = path.basename(filePath);

    const isPreviewable = this.isPreviewableType(mimeType);
    let thumbnailUrl: string | undefined;
    let previewUrl: string | undefined;

    if (isPreviewable) {
      try {
        const thumbnail = await this.generateThumbnail(filePath, mimeType);
        thumbnailUrl = `/api/files/thumbnail/${path.basename(thumbnail.thumbnailPath)}`;
        
        if (mimeType.startsWith('image/')) {
          previewUrl = `/api/files/preview/${originalName}`;
        }
      } catch (error) {
        logger.error('❌ Error generating preview info:', error);
      }
    }

    return {
      id,
      originalName,
      mimeType,
      size: stats.size,
      thumbnailUrl,
      previewUrl,
      isPreviewable,
      metadata: {}
    };
  }

  /**
   * Check if file type is previewable
   */
  private isPreviewableType(mimeType: string): boolean {
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
      'application/json'
    ];
    return previewableTypes.includes(mimeType) || this.isDocumentType(mimeType);
  }

  /**
   * Clean up old thumbnails
   */
  async cleanupThumbnails(maxAge: number = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const files = await fs.readdir(this.thumbnailsDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.thumbnailsDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          logger.info(`🗑️ Cleaned up old thumbnail: ${file}`);
        }
      }
    } catch (error) {
      logger.error('❌ Error cleaning up thumbnails:', error);
    }
  }

  /**
   * Get thumbnail path by filename
   */
  getThumbnailPath(filename: string): string {
    return path.join(this.thumbnailsDir, filename);
  }

  /**
   * Get preview path by filename
   */
  getPreviewPath(filename: string): string {
    return path.join(this.previewsDir, filename);
  }
}

export default new ThumbnailService();

