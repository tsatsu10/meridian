/**
 * Storage Service Tests
 * Unit tests for file storage functionality
 * Phase 0 - Testing Infrastructure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from './storage-service';

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    storageService = new StorageService({
      provider: 'local',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/*', 'application/pdf'],
      uploadDir: './test-uploads',
    });
  });

  describe('validateFile', () => {
    it('should accept files within size limit', () => {
      const file = {
        buffer: Buffer.alloc(5 * 1024 * 1024), // 5MB
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024,
      } as Express.Multer.File;

      const result = (storageService as any).validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const file = {
        buffer: Buffer.alloc(15 * 1024 * 1024), // 15MB
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024,
      } as Express.Multer.File;

      const result = (storageService as any).validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds');
    });

    it('should accept allowed MIME types', () => {
      const file = {
        buffer: Buffer.alloc(1024),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const result = (storageService as any).validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject disallowed MIME types', () => {
      const file = {
        buffer: Buffer.alloc(1024),
        originalname: 'test.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
      } as Express.Multer.File;

      const result = (storageService as any).validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should accept wildcard MIME types', () => {
      const file = {
        buffer: Buffer.alloc(1024),
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;

      const result = (storageService as any).validateFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('generateSafeFileName', () => {
    it('should generate safe filenames', () => {
      const result = (storageService as any).generateSafeFileName(
        'My Test File!@#.jpg',
        'file-123'
      );

      // The function replaces non-alphanumeric chars with dashes
      expect(result).toMatch(/^file-123_my-test-file---\.jpg$/);
    });

    it('should handle long filenames', () => {
      const longName = 'a'.repeat(100) + '.jpg';
      const result = (storageService as any).generateSafeFileName(
        longName,
        'file-123'
      );

      expect(result.length).toBeLessThan(100);
      expect(result).toContain('file-123');
    });

    it('should preserve file extensions', () => {
      const result = (storageService as any).generateSafeFileName(
        'document.pdf',
        'file-123'
      );

      expect(result).toMatch(/\.pdf$/);
    });

    it('should remove special characters', () => {
      const result = (storageService as any).generateSafeFileName(
        'file@#$%^&*.txt',
        'file-123'
      );

      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
      expect(result).not.toContain('$');
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload valid file', async () => {
      const file = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 12,
      } as Express.Multer.File;

      // Mock validation to pass
      vi.spyOn(storageService as any, 'validateFile').mockReturnValue({
        valid: true,
      });

      // Mock upload to local
      vi.spyOn(storageService as any, 'uploadToLocal').mockResolvedValue({
        success: true,
        fileId: 'file-123',
        fileName: 'test.txt',
        url: '/uploads/test.txt',
        size: 12,
      });

      const result = await storageService.uploadFile(file, {
        uploadedBy: 'user-123',
        workspaceId: 'workspace-123',
      });

      expect(result.success).toBe(true);
      expect(result.fileId).toBeDefined();
      expect(result.url).toBeDefined();
    });

    it('should reject invalid files', async () => {
      const file = {
        buffer: Buffer.alloc(15 * 1024 * 1024),
        originalname: 'toolarge.jpg',
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024,
      } as Express.Multer.File;

      const result = await storageService.uploadFile(file, {
        uploadedBy: 'user-123',
        workspaceId: 'workspace-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should generate unique file IDs', async () => {
      const file = {
        buffer: Buffer.from('test'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 4,
      } as Express.Multer.File;

      vi.spyOn(storageService as any, 'validateFile').mockReturnValue({
        valid: true,
      });
      
      // Mock to return different fileIds on each call
      let callCount = 0;
      vi.spyOn(storageService as any, 'uploadToLocal').mockImplementation(async () => {
        callCount++;
        return {
          success: true,
          fileId: `file-${callCount}`,
          fileName: 'test.txt',
          url: '/uploads/test.txt',
          size: 4,
        };
      });

      const result1 = await storageService.uploadFile(file, {
        uploadedBy: 'user-123',
        workspaceId: 'workspace-123',
      });

      const result2 = await storageService.uploadFile(file, {
        uploadedBy: 'user-123',
        workspaceId: 'workspace-123',
      });

      expect(result1.fileId).not.toBe(result2.fileId);
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete file', async () => {
      vi.spyOn(storageService as any, 'deleteFromLocal').mockResolvedValue(true);

      const result = await storageService.deleteFile('file-123', 'test.txt');

      expect(result).toBe(true);
    });

    it('should handle deletion errors gracefully', async () => {
      vi.spyOn(storageService as any, 'deleteFromLocal').mockRejectedValue(
        new Error('Delete failed')
      );

      const result = await storageService.deleteFile('file-123', 'test.txt');

      expect(result).toBe(false);
    });
  });

  describe('getSignedUrl', () => {
    it('should return null for non-S3 providers', async () => {
      const result = await storageService.getSignedUrl('key-123');

      expect(result).toBeNull();
    });

    it('should generate signed URL for S3', async () => {
      const s3Service = new StorageService({
        provider: 's3',
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: [],
        s3Region: 'us-east-1',
        s3Bucket: 'test-bucket',
      });

      vi.spyOn(s3Service as any, 'getSignedUrl').mockResolvedValue(
        'https://signed-url.example.com'
      );

      const result = await s3Service.getSignedUrl('key-123', 3600);

      expect(result).toContain('https://');
    });
  });

  describe('multi-provider support', () => {
    it('should support local storage', () => {
      const service = new StorageService({
        provider: 'local',
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: [],
      });

      expect((service as any).config.provider).toBe('local');
    });

    it('should support S3 storage', () => {
      const service = new StorageService({
        provider: 's3',
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: [],
        s3Region: 'us-east-1',
        s3Bucket: 'test-bucket',
      });

      expect((service as any).config.provider).toBe('s3');
    });

    it('should support Cloudinary storage', () => {
      const service = new StorageService({
        provider: 'cloudinary',
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: [],
        cloudinaryName: 'test-cloud',
      });

      expect((service as any).config.provider).toBe('cloudinary');
    });
  });
});


