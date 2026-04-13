/**
 * Thumbnail Generator Service
 * Generates thumbnails for images and videos
 * Phase 0 - Day 4 Implementation
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import logger from '../../utils/logger';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const execPromise = promisify(exec);

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ThumbnailResult {
  success: boolean;
  buffer?: Buffer;
  url?: string;
  width: number;
  height: number;
  format: string;
  size: number;
  error?: string;
}

export class ThumbnailGenerator {
  private defaultOptions: ThumbnailOptions = {
    width: 300,
    height: 300,
    quality: 80,
    format: 'jpeg',
    fit: 'cover',
  };

  private outputDir: string;

  constructor() {
    this.outputDir = process.env.THUMBNAIL_DIR || path.join(process.cwd(), 'uploads', 'thumbnails');
    this.initialize();
  }

  /**
   * Initialize thumbnail generator
   */
  private async initialize() {
    try {
      await mkdir(this.outputDir, { recursive: true });
      logger.debug('✅ Thumbnail generator initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize thumbnail generator:', error);
    }
  }

  /**
   * Generate thumbnail from image buffer
   */
  async generateFromImage(
    buffer: Buffer,
    options?: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let sharpInstance = sharp(buffer);

      // Get original metadata
      const metadata = await sharpInstance.metadata();

      // Resize image
      sharpInstance = sharpInstance.resize({
        width: opts.width,
        height: opts.height,
        fit: opts.fit as any,
        withoutEnlargement: true,
      });

      // Convert format and set quality
      switch (opts.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality: opts.quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ compressionLevel: 9 });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: opts.quality });
          break;
      }

      // Generate thumbnail buffer
      const thumbnailBuffer = await sharpInstance.toBuffer();
      const thumbnailInfo = await sharp(thumbnailBuffer).metadata();

      logger.debug(`✅ Thumbnail generated: ${thumbnailInfo.width}x${thumbnailInfo.height}`);

      return {
        success: true,
        buffer: thumbnailBuffer,
        width: thumbnailInfo.width || opts.width || 300,
        height: thumbnailInfo.height || opts.height || 300,
        format: opts.format || 'jpeg',
        size: thumbnailBuffer.length,
      };
    } catch (error: any) {
      logger.error('❌ Failed to generate thumbnail:', error);
      return {
        success: false,
        error: error.message,
        width: 0,
        height: 0,
        format: '',
        size: 0,
      };
    }
  }

  /**
   * Generate thumbnail from video (requires ffmpeg)
   */
  async generateFromVideo(
    videoPath: string,
    options?: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Check if ffmpeg is available
      const ffmpegAvailable = await this.checkFfmpegAvailability();
      if (!ffmpegAvailable) {
        throw new Error('ffmpeg is not available');
      }

      // Generate temp image from video at 1 second
      const tempImagePath = path.join(
        this.outputDir,
        `temp_${Date.now()}.jpg`
      );

      await execPromise(
        `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${tempImagePath}"`
      );

      // Read the generated image
      const imageBuffer = fs.readFileSync(tempImagePath);

      // Delete temp file
      fs.unlinkSync(tempImagePath);

      // Generate thumbnail from the image
      const result = await this.generateFromImage(imageBuffer, opts);

      logger.debug('✅ Video thumbnail generated');
      return result;
    } catch (error: any) {
      logger.error('❌ Failed to generate video thumbnail:', error);
      return {
        success: false,
        error: error.message,
        width: 0,
        height: 0,
        format: '',
        size: 0,
      };
    }
  }

  /**
   * Generate thumbnail from PDF (requires imagemagick or similar)
   */
  async generateFromPDF(
    pdfPath: string,
    options?: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Check if ImageMagick is available
      const imageMagickAvailable = await this.checkImageMagickAvailability();
      if (!imageMagickAvailable) {
        throw new Error('ImageMagick is not available');
      }

      // Generate temp image from PDF first page
      const tempImagePath = path.join(
        this.outputDir,
        `temp_${Date.now()}.jpg`
      );

      await execPromise(
        `convert "${pdfPath}[0]" -resize ${opts.width}x${opts.height} "${tempImagePath}"`
      );

      // Read the generated image
      const imageBuffer = fs.readFileSync(tempImagePath);

      // Delete temp file
      fs.unlinkSync(tempImagePath);

      // Generate thumbnail from the image
      const result = await this.generateFromImage(imageBuffer, opts);

      logger.debug('✅ PDF thumbnail generated');
      return result;
    } catch (error: any) {
      logger.error('❌ Failed to generate PDF thumbnail:', error);
      return {
        success: false,
        error: error.message,
        width: 0,
        height: 0,
        format: '',
        size: 0,
      };
    }
  }

  /**
   * Generate thumbnail based on mime type
   */
  async generateThumbnail(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
    options?: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    // Image files
    if (mimeType.startsWith('image/')) {
      return await this.generateFromImage(fileBuffer, options);
    }

    // Video files (requires saving to temp file)
    if (mimeType.startsWith('video/')) {
      const tempPath = path.join(this.outputDir, `temp_${Date.now()}_${fileName}`);
      await writeFile(tempPath, fileBuffer);
      const result = await this.generateFromVideo(tempPath, options);
      fs.unlinkSync(tempPath);
      return result;
    }

    // PDF files (requires saving to temp file)
    if (mimeType === 'application/pdf') {
      const tempPath = path.join(this.outputDir, `temp_${Date.now()}_${fileName}`);
      await writeFile(tempPath, fileBuffer);
      const result = await this.generateFromPDF(tempPath, options);
      fs.unlinkSync(tempPath);
      return result;
    }

    // Unsupported file type
    return {
      success: false,
      error: `Thumbnail generation not supported for ${mimeType}`,
      width: 0,
      height: 0,
      format: '',
      size: 0,
    };
  }

  /**
   * Generate multiple thumbnail sizes
   */
  async generateMultipleSizes(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<Map<string, ThumbnailResult>> {
    const sizes = new Map<string, ThumbnailResult>();

    // Small thumbnail (150x150)
    sizes.set(
      'small',
      await this.generateThumbnail(buffer, mimeType, fileName, {
        width: 150,
        height: 150,
      })
    );

    // Medium thumbnail (300x300)
    sizes.set(
      'medium',
      await this.generateThumbnail(buffer, mimeType, fileName, {
        width: 300,
        height: 300,
      })
    );

    // Large thumbnail (600x600)
    sizes.set(
      'large',
      await this.generateThumbnail(buffer, mimeType, fileName, {
        width: 600,
        height: 600,
      })
    );

    return sizes;
  }

  /**
   * Check if ffmpeg is available
   */
  private async checkFfmpegAvailability(): Promise<boolean> {
    try {
      await execPromise('which ffmpeg');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if ImageMagick is available
   */
  private async checkImageMagickAvailability(): Promise<boolean> {
    try {
      await execPromise('which convert');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save thumbnail to file
   */
  async saveThumbnail(
    buffer: Buffer,
    fileName: string
  ): Promise<string> {
    const filePath = path.join(this.outputDir, fileName);
    await writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * Check if thumbnail can be generated for mime type
   */
  canGenerateThumbnail(mimeType: string): boolean {
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType === 'application/pdf'
    );
  }
}

// Export singleton instance
export const thumbnailGenerator = new ThumbnailGenerator();


