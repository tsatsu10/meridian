/**
 * File Storage Service
 * 
 * Provides abstraction for file storage with support for:
 * - Local file system (development)
 * - Amazon S3 (production)
 * - Cloudflare R2 (production alternative)
 * 
 * @epic-3.1-messaging: File sharing and attachments for team collaboration
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import logger from '../utils/logger';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  path: string;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'r2';
  localPath?: string;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  r2Config?: {
    accountId: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

class FileStorageService {
  private config: StorageConfig;
  private uploadDir: string;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      provider: config?.provider || 'local',
      localPath: config?.localPath || path.join(process.cwd(), 'uploads'),
      ...config,
    };

    this.uploadDir = this.config.localPath || path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    if (this.config.provider === 'local') {
      try {
        await mkdir(this.uploadDir, { recursive: true });
        
        // Create subdirectories for organization
        const subdirs = ['images', 'videos', 'documents', 'others'];
        await Promise.all(
          subdirs.map(subdir => 
            mkdir(path.join(this.uploadDir, subdir), { recursive: true })
          )
        );
      } catch (error) {
        logger.error('Error creating upload directory:', error);
      }
    }
  }

  /**
   * Generate unique filename
   */
  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    
    return `${timestamp}-${randomString}-${sanitizedBaseName}${extension}`;
  }

  /**
   * Get subdirectory based on file type
   */
  private getSubdirectory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return 'documents';
    }
    return 'others';
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadedFile> {
    const fileName = this.generateUniqueFilename(originalName);
    const subdir = this.getSubdirectory(mimeType);
    
    if (this.config.provider === 'local') {
      return this.uploadToLocal(fileBuffer, fileName, originalName, mimeType, subdir);
    } else if (this.config.provider === 's3') {
      return this.uploadToS3(fileBuffer, fileName, originalName, mimeType, subdir);
    } else if (this.config.provider === 'r2') {
      return this.uploadToR2(fileBuffer, fileName, originalName, mimeType, subdir);
    }

    throw new Error(`Unsupported storage provider: ${this.config.provider}`);
  }

  /**
   * Upload to local file system
   */
  private async uploadToLocal(
    fileBuffer: Buffer,
    fileName: string,
    originalName: string,
    mimeType: string,
    subdir: string
  ): Promise<UploadedFile> {
    const filePath = path.join(this.uploadDir, subdir, fileName);
    
    try {
      await writeFile(filePath, fileBuffer);

      const fileId = crypto.randomBytes(16).toString('hex');
      
      return {
        id: fileId,
        fileName,
        originalName,
        fileSize: fileBuffer.length,
        mimeType,
        url: `/api/files/${subdir}/${fileName}`, // Relative URL for serving
        path: filePath,
      };
    } catch (error) {
      logger.error('Error uploading file to local storage:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload to Amazon S3
   * TODO: Implement S3 upload when needed
   */
  private async uploadToS3(
    fileBuffer: Buffer,
    fileName: string,
    originalName: string,
    mimeType: string,
    subdir: string
  ): Promise<UploadedFile> {
    // TODO: Implement S3 upload
    // const s3 = new S3Client({ region: this.config.s3Config!.region, ... });
    // const command = new PutObjectCommand({ ... });
    // await s3.send(command);
    
    throw new Error('S3 upload not implemented yet. Install @aws-sdk/client-s3 first.');
  }

  /**
   * Upload to Cloudflare R2
   * TODO: Implement R2 upload when needed
   */
  private async uploadToR2(
    fileBuffer: Buffer,
    fileName: string,
    originalName: string,
    mimeType: string,
    subdir: string
  ): Promise<UploadedFile> {
    // TODO: Implement R2 upload (uses S3-compatible API)
    // R2 is S3-compatible, so similar to S3 implementation
    
    throw new Error('R2 upload not implemented yet. Install @aws-sdk/client-s3 first.');
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    if (this.config.provider === 'local') {
      try {
        await unlink(filePath);
      } catch (error) {
        logger.error('Error deleting file:', error);
      }
    } else if (this.config.provider === 's3') {
      // TODO: Implement S3 delete
    } else if (this.config.provider === 'r2') {
      // TODO: Implement R2 delete
    }
  }

  /**
   * Get file path for serving
   */
  getFilePath(fileName: string, subdir: string): string {
    if (this.config.provider === 'local') {
      return path.join(this.uploadDir, subdir, fileName);
    }
    throw new Error('getFilePath only supported for local storage');
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      if (type.includes('*')) {
        const category = type.split('/')[0];
        return mimeType.startsWith(category);
      }
      return mimeType === type;
    });
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService({
  provider: 'local', // Default to local for development
  localPath: path.join(process.cwd(), 'uploads'),
});

export default fileStorageService;


