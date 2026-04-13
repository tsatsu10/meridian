// @epic-3.6-communication: File attachment system
import { WebSocketMessage } from '../websocket-server';
import { createId } from '@paralleldrive/cuid2';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import logger from '../../utils/logger';

export interface FileAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
  };
}

class FileHandler {
  private static instance: FileHandler;
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedTypes = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Code
    'text/plain', 'text/markdown', 'application/json',
    'text/javascript', 'text/typescript',
    // Archives
    'application/zip', 'application/x-rar-compressed',
  ]);

  private constructor() {
    // Ensure upload directory exists
    fs.mkdir(this.uploadDir, { recursive: true }).catch(console.error);
  }

  public static getInstance(): FileHandler {
    if (!FileHandler.instance) {
      FileHandler.instance = new FileHandler();
    }
    return FileHandler.instance;
  }

  public async handleFileUpload(file: Buffer, filename: string): Promise<FileAttachment> {
    // Validate file size
    if (file.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Detect file type
    const fileType = await fileTypeFromBuffer(file);
    if (!fileType || !this.allowedTypes.has(fileType.mime)) {
      throw new Error('Unsupported file type');
    }

    // Generate unique filename
    const id = createId();
    const ext = path.extname(filename);
    const safeFilename = `${id}${ext}`;
    const filePath = path.join(this.uploadDir, safeFilename);

    // Save file
    await fs.writeFile(filePath, file);

    // Create attachment object
    const attachment: FileAttachment = {
      id,
      filename,
      size: file.length,
      mimeType: fileType.mime,
      url: `/uploads/${safeFilename}`,
      metadata: {},
    };

    // Generate preview/metadata for supported types
    if (fileType.mime.startsWith('image/')) {
      const metadata = await this.processImage(file, id);
      attachment.thumbnailUrl = metadata.thumbnailUrl;
      attachment.metadata = {
        width: metadata.width,
        height: metadata.height,
      };
    }

    return attachment;
  }

  private async processImage(file: Buffer, id: string): Promise<{
    thumbnailUrl: string;
    width: number;
    height: number;
  }> {
    const image = sharp(file);
    const metadata = await image.metadata();

    // Generate thumbnail
    const thumbnail = await image
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // Save thumbnail
    const thumbnailPath = path.join(this.uploadDir, `${id}_thumb.webp`);
    await fs.writeFile(thumbnailPath, thumbnail);

    return {
      thumbnailUrl: `/uploads/${id}_thumb.webp`,
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }

  public async deleteFile(fileId: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileId);
    const thumbnailPath = path.join(this.uploadDir, `${fileId}_thumb.webp`);

    try {
      await fs.unlink(filePath);
      await fs.unlink(thumbnailPath).catch(() => {}); // Ignore if thumbnail doesn't exist
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }
}

export const fileHandler = FileHandler.getInstance(); 
