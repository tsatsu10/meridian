// @epic-3.1-messaging: File utilities for type detection and handling
// @persona-sarah: PM needs reliable file handling
// @persona-david: Team lead needs consistent file operations

import path from 'path';
import logger from '../../utils/logger';

/**
 * Get MIME type from file path (extension-based; avoids undeclared native sniffing deps).
 */
export async function getMimeType(filePath: string): Promise<string> {
  try {
    return getMimeTypeFromExtension(path.extname(filePath));
  } catch (error) {
    logger.warn('❌ Error resolving MIME type, using octet-stream:', error);
    return 'application/octet-stream';
  }
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const ext = extension.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    
    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.oga': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.odp': 'application/vnd.oasis.opendocument.presentation',
    
    // Text
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.ts': 'text/plain',
    '.md': 'text/markdown',
    '.yml': 'text/yaml',
    '.yaml': 'text/yaml',
    
    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.bz2': 'application/x-bzip2',
    
    // Other
    '.exe': 'application/vnd.microsoft.portable-executable',
    '.dmg': 'application/x-apple-diskimage',
    '.iso': 'application/x-iso9660-image'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a video
 */
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Check if file is an audio file
 */
export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if file is a document
 */
export function isDocumentFile(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'text/plain',
    'text/csv',
    'application/json'
  ];
  return documentTypes.includes(mimeType);
}

/**
 * Check if file is previewable in browser
 */
export function isPreviewableFile(mimeType: string): boolean {
  return isImageFile(mimeType) || 
         isVideoFile(mimeType) || 
         isAudioFile(mimeType) || 
         mimeType === 'application/pdf' ||
         mimeType === 'text/plain' ||
         mimeType === 'text/csv' ||
         mimeType === 'application/json';
}

/**
 * Get file category based on MIME type
 */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other' {
  if (isImageFile(mimeType)) return 'image';
  if (isVideoFile(mimeType)) return 'video';
  if (isAudioFile(mimeType)) return 'audio';
  if (isDocumentFile(mimeType)) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('compress')) {
    return 'archive';
  }
  return 'other';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * Get filename without extension
 */
export function getBaseName(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .trim();
}

/**
 * Generate unique filename to prevent collisions
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const baseName = getBaseName(originalName);
  
  return `${sanitizeFilename(baseName)}_${timestamp}_${random}${extension}`;
}

