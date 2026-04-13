/**
 * File Storage Service
 * Unified interface for cloud storage (AWS S3, Cloudinary, Local)
 * Phase 0 - Day 4 Implementation
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import logger from '../../utils/logger';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export interface StorageConfig {
  provider: 'local' | 's3' | 'cloudinary';
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  uploadDir?: string; // for local storage
  // AWS S3 config
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  // Cloudinary config
  cloudinaryName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  publicId?: string; // For Cloudinary
  key?: string; // For S3
  error?: string;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  workspaceId: string;
  projectId?: string;
  taskId?: string;
}

export class StorageService {
  private config: StorageConfig;
  private s3Client: any;
  private cloudinary: any;

  constructor(config: StorageConfig) {
    this.config = config;
    this.initializeProvider();
  }

  /**
   * Initialize storage provider
   */
  private async initializeProvider() {
    switch (this.config.provider) {
      case 's3':
        await this.initializeS3();
        break;
      case 'cloudinary':
        await this.initializeCloudinary();
        break;
      case 'local':
        await this.initializeLocal();
        break;
      default:
        throw new Error(`Unknown storage provider: ${this.config.provider}`);
    }
  }

  /**
   * Initialize AWS S3
   */
  private async initializeS3() {
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      
      this.s3Client = new S3Client({
        region: this.config.s3Region || process.env.AWS_REGION,
        credentials: {
          accessKeyId: this.config.s3AccessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: this.config.s3SecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
      
      logger.debug('✅ AWS S3 client initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize S3:', error);
      throw new Error('S3 initialization failed');
    }
  }

  /**
   * Initialize Cloudinary
   */
  private async initializeCloudinary() {
    try {
      const cloudinary = await import('cloudinary');
      
      this.cloudinary = cloudinary.v2;
      this.cloudinary.config({
        cloud_name: this.config.cloudinaryName || process.env.CLOUDINARY_CLOUD_NAME,
        api_key: this.config.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY,
        api_secret: this.config.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET,
      });
      
      logger.debug('✅ Cloudinary client initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Cloudinary:', error);
      throw new Error('Cloudinary initialization failed');
    }
  }

  /**
   * Initialize local storage
   */
  private async initializeLocal() {
    const uploadDir = this.config.uploadDir || path.join(process.cwd(), 'uploads');
    
    try {
      await mkdir(uploadDir, { recursive: true });
      await mkdir(path.join(uploadDir, 'thumbnails'), { recursive: true });
      logger.debug(`✅ Local storage initialized at: ${uploadDir}`);
    } catch (error) {
      logger.error('❌ Failed to initialize local storage:', error);
      throw new Error('Local storage initialization failed');
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate safe file name
   */
  private generateSafeFileName(originalName: string, fileId: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 50);
    return `${fileId}_${baseName}${ext}`;
  }

  /**
   * Validate file
   */
  private validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = (this.config.maxFileSize / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      };
    }

    // Check mime type
    if (this.config.allowedMimeTypes.length > 0) {
      const isAllowed = this.config.allowedMimeTypes.some(type => {
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return file.mimetype.startsWith(category);
        }
        return file.mimetype === type;
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `File type ${file.mimetype} is not allowed`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    file: Express.Multer.File,
    metadata: Partial<FileMetadata>
  ): Promise<UploadResult> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      } as UploadResult;
    }

    // Generate file identifiers
    const fileId = this.generateFileId();
    const fileName = this.generateSafeFileName(file.originalname, fileId);

    try {
      switch (this.config.provider) {
        case 's3':
          return await this.uploadToS3(file, fileId, fileName, metadata);
        case 'cloudinary':
          return await this.uploadToCloudinary(file, fileId, fileName, metadata);
        case 'local':
          return await this.uploadToLocal(file, fileId, fileName, metadata);
        default:
          throw new Error('No storage provider configured');
      }
    } catch (error: any) {
      logger.error('❌ Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      } as UploadResult;
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(
    file: Express.Multer.File,
    fileId: string,
    fileName: string,
    metadata: Partial<FileMetadata>
  ): Promise<UploadResult> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const key = `uploads/${metadata.workspaceId}/${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: this.config.s3Bucket || process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        fileId,
        originalName: file.originalname,
        uploadedBy: metadata.uploadedBy || '',
        workspaceId: metadata.workspaceId || '',
      },
    });

    await this.s3Client.send(command);
    
    const url = `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;
    
    logger.debug(`✅ File uploaded to S3: ${fileName}`);
    
    return {
      success: true,
      fileId,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      key,
    };
  }

  /**
   * Upload to Cloudinary
   */
  private async uploadToCloudinary(
    file: Express.Multer.File,
    fileId: string,
    fileName: string,
    metadata: Partial<FileMetadata>
  ): Promise<UploadResult> {
    // Convert buffer to base64 data URI
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    const uploadResult = await this.cloudinary.uploader.upload(dataUri, {
      public_id: fileId,
      folder: `meridian/${metadata.workspaceId}`,
      resource_type: 'auto',
      context: {
        originalName: file.originalname,
        uploadedBy: metadata.uploadedBy || '',
        workspaceId: metadata.workspaceId || '',
      },
    });
    
    logger.debug(`✅ File uploaded to Cloudinary: ${fileName}`);
    
    return {
      success: true,
      fileId,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: uploadResult.secure_url,
      thumbnailUrl: uploadResult.eager?.[0]?.secure_url,
      publicId: uploadResult.public_id,
    };
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(
    file: Express.Multer.File,
    fileId: string,
    fileName: string,
    metadata: Partial<FileMetadata>
  ): Promise<UploadResult> {
    const uploadDir = this.config.uploadDir || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, fileName);
    
    await writeFile(filePath, file.buffer);
    
    const url = `/uploads/${fileName}`;
    
    logger.debug(`✅ File uploaded locally: ${fileName}`);
    
    return {
      success: true,
      fileId,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    };
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileId: string, fileName: string): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 's3':
          return await this.deleteFromS3(fileName);
        case 'cloudinary':
          return await this.deleteFromCloudinary(fileId);
        case 'local':
          return await this.deleteFromLocal(fileName);
        default:
          return false;
      }
    } catch (error) {
      logger.error('❌ Delete error:', error);
      return false;
    }
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(fileName: string): Promise<boolean> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    
    const command = new DeleteObjectCommand({
      Bucket: this.config.s3Bucket || process.env.AWS_S3_BUCKET,
      Key: fileName,
    });

    await this.s3Client.send(command);
    logger.debug(`✅ File deleted from S3: ${fileName}`);
    return true;
  }

  /**
   * Delete from Cloudinary
   */
  private async deleteFromCloudinary(publicId: string): Promise<boolean> {
    await this.cloudinary.uploader.destroy(publicId);
    logger.debug(`✅ File deleted from Cloudinary: ${publicId}`);
    return true;
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(fileName: string): Promise<boolean> {
    const uploadDir = this.config.uploadDir || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, fileName);
    
    await unlink(filePath);
    logger.debug(`✅ File deleted locally: ${fileName}`);
    return true;
  }

  /**
   * Get signed URL for private files (S3 only)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    if (this.config.provider !== 's3') {
      return null;
    }

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      
      const command = new GetObjectCommand({
        Bucket: this.config.s3Bucket || process.env.AWS_S3_BUCKET,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('❌ Failed to generate signed URL:', error);
      return null;
    }
  }
}

// Export default storage service instance
export const createStorageService = (config?: Partial<StorageConfig>): StorageService => {
  const defaultConfig: StorageConfig = {
    provider: (process.env.STORAGE_PROVIDER as any) || 'local',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/*',
      'video/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/*',
    ],
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    s3Region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
    cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME,
  };

  return new StorageService({ ...defaultConfig, ...config });
};

export const storageService = createStorageService();


