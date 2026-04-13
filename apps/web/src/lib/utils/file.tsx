/**
 * Shared File Utilities
 * Consolidates duplicate file-related functions across the codebase
 */
import React from 'react';

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export interface FileValidationOptions {
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate file against size and type constraints
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFile(file: File, options: FileValidationOptions = {}): FileValidationResult {
  const { maxFileSize = 10, allowedTypes, allowedExtensions } = options;

  // Check file size (convert MB to bytes)
  if (file.size > maxFileSize * 1024 * 1024) {
    return {
      isValid: false,
      error: `File size exceeds ${maxFileSize}MB limit`
    };
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      };
    }
  }

  // Check file extension
  if (allowedExtensions && allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File extension .${extension} is not allowed`
      };
    }
  }

  return { isValid: true };
}

/**
 * Get file icon based on file type
 * @param type - MIME type of the file
 * @returns React element representing the file icon
 */
export function getFileIcon(type: string) {
  if (type.startsWith('image/')) {
    return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">📷</div>;
  }
  if (type.startsWith('video/')) {
    return <div className="w-4 h-4 bg-purple-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">🎬</div>;
  }
  if (type.startsWith('audio/')) {
    return <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">🎵</div>;
  }
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) {
    return <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">📄</div>;
  }
  return <div className="w-4 h-4 bg-gray-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">📁</div>;
}

/**
 * Get file extension from filename
 * @param filename - Name of the file
 * @returns File extension (without dot) or empty string
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is an image
 * @param type - MIME type of the file
 * @returns True if file is an image
 */
export function isImageFile(type: string): boolean {
  return type.startsWith('image/');
}

/**
 * Check if file is a video
 * @param type - MIME type of the file
 * @returns True if file is a video
 */
export function isVideoFile(type: string): boolean {
  return type.startsWith('video/');
}

/**
 * Check if file is audio
 * @param type - MIME type of the file
 * @returns True if file is audio
 */
export function isAudioFile(type: string): boolean {
  return type.startsWith('audio/');
}

/**
 * Check if file is a document
 * @param type - MIME type of the file
 * @returns True if file is a document
 */
export function isDocumentFile(type: string): boolean {
  return type.includes('pdf') ||
         type.includes('document') ||
         type.includes('text') ||
         type.includes('spreadsheet') ||
         type.includes('presentation');
}

/**
 * Get file category for grouping/filtering
 * @param type - MIME type of the file
 * @returns File category
 */
export function getFileCategory(type: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (isImageFile(type)) return 'image';
  if (isVideoFile(type)) return 'video';
  if (isAudioFile(type)) return 'audio';
  if (isDocumentFile(type)) return 'document';
  return 'other';
}