import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createId } from "@paralleldrive/cuid2";
import logger from '../../utils/logger';

interface UploadResult {
  url: string;
  path: string;
  filename: string;
}

// @epic-2.1-files: File upload handler with organized storage and validation
async function uploadFile(file: File, userEmail: string): Promise<UploadResult> {
  try {
    // Validate file size (25MB limit)
    const maxFileSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxFileSize) {
      throw new Error(`File size exceeds limit. Maximum allowed: ${maxFileSize / (1024 * 1024)}MB`);
    }

    // Validate file type (basic security check)
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'text/', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
      'application/zip', 'application/x-zip-compressed'
    ];
    
    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType) {
      throw new Error(`File type not allowed: ${file.type}`);
    }

    // Validate file name
    if (!file.name || file.name.trim() === '') {
      throw new Error('File name is required');
    }

    // Sanitize user email for directory name
    const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");
    
    // Create uploads directory structure
    const uploadsDir = join(process.cwd(), "uploads");
    const userDir = join(uploadsDir, sanitizedEmail);
    const dateStr = new Date().toISOString().split('T')[0] || 'unknown-date';
    const dateDir = join(userDir, dateStr);
    
    // Ensure directories exist
    await mkdir(dateDir, { recursive: true });
    
    // Generate unique filename with sanitized original name
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueId = createId();
    const filename = `${uniqueId}_${sanitizedName}`;
    const filePath = join(dateDir, filename);
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write file to disk
    await writeFile(filePath, buffer);
    
    // Generate URL (relative to uploads directory)
    const relativePath = filePath.replace(uploadsDir, '').replace(/\\/g, '/');
    
    // Use environment variable for base URL, fallback to relative path for same-domain deployment
    const storageUrl = process.env.STORAGE_URL || process.env.API_BASE_URL;
    const url = storageUrl 
      ? `${storageUrl}/uploads${relativePath}` 
      : `/uploads${relativePath}`; // Relative URL for same domain or development
    
    logger.debug(`📁 File uploaded: ${file.name} -> ${url} (${(file.size / 1024).toFixed(1)}KB)`);
    
    return {
      url,
      path: filePath,
      filename
    };
  } catch (error) {
    logger.error('❌ File upload error:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default uploadFile; 
