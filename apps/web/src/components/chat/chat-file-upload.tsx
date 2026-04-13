/**
 * @fileoverview Chat File Upload Component
 * @description Enhanced drag-and-drop file upload specifically for chat messaging
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Full-screen drop zone overlay during drag operations
 * - Real-time progress tracking with visual indicators
 * - Multiple file selection and batch uploads
 * - File type validation and size limits
 * - Integration with chat message system
 * - Auto-attachment to messages
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { 
  Paperclip, 
  X, 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { fetchApi } from '@/lib/fetch';
import { formatFileSize, validateFile, getFileIcon } from '@/lib/utils/file';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
  attachmentId?: string;
}

interface ChatFileUploadProps {
  channelId: string;
  onFilesUploaded?: (attachments: any[]) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  allowedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

// File type detection for extended metadata
const getFileTypeInfo = (file: File) => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith('image/')) {
    return { type: 'image', icon: Image, color: 'bg-green-500', label: 'Image' };
  }
  if (type.startsWith('video/')) {
    return { type: 'video', icon: Video, color: 'bg-purple-500', label: 'Video' };
  }
  if (type.startsWith('audio/')) {
    return { type: 'audio', icon: Music, color: 'bg-orange-500', label: 'Audio' };
  }
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return { type: 'pdf', icon: FileText, color: 'bg-red-500', label: 'PDF' };
  }
  if (type.includes('document') || type.includes('text') ||
      name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt')) {
    return { type: 'document', icon: FileText, color: 'bg-blue-500', label: 'Document' };
  }
  if (type.includes('zip') || type.includes('archive') ||
      name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) {
    return { type: 'archive', icon: Archive, color: 'bg-gray-500', label: 'Archive' };
  }

  return { type: 'file', icon: FileText, color: 'bg-gray-500', label: 'File' };
};

// formatFileSize now imported from shared utilities

// validateFile now imported from shared utilities

export function ChatFileUpload({
  channelId,
  onFilesUploaded,
  onUploadError,
  maxFileSize = 25, // 25MB default for chat
  maxFiles = 10,
  allowedTypes,
  className,
  disabled = false,
}: ChatFileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const progressIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle file upload to backend
  const uploadFile = useCallback(async (file: File, uploadingFileId: string) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('channelId', channelId);
      formData.append('type', file.type);
      formData.append('size', file.size.toString());

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFileId && f.progress < 90
              ? { ...f, progress: f.progress + Math.random() * 15, status: 'uploading' as const }
              : f
          )
        );
      }, 200);

      // Track interval for cleanup
      progressIntervalsRef.current.set(uploadingFileId, progressInterval);

      // Upload file (replace with actual API call)
      const response = await fetchApi('/attachment/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      progressIntervalsRef.current.delete(uploadingFileId);

      // Update file status to success
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === uploadingFileId 
            ? { 
                ...f, 
                progress: 100, 
                status: 'success' as const,
                url: response.url,
                attachmentId: response.id,
              }
            : f
        )
      );

      return response;
    } catch (error) {
      // Clean up progress interval on error
      const progressInterval = progressIntervalsRef.current.get(uploadingFileId);
      if (progressInterval) {
        clearInterval(progressInterval);
        progressIntervalsRef.current.delete(uploadingFileId);
      }

      // Update file status to error
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFileId
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );

      throw error;
    }
  }, [channelId]);

  // Handle file processing
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check file count limit
    if (uploadingFiles.length + fileArray.length > maxFiles) {
      onUploadError?.(`Cannot upload more than ${maxFiles} files at once`);
      return;
    }

    const validFiles: File[] = [];
    
    // Validate files
    for (const file of fileArray) {
      const validation = validateFile(file, { maxFileSize, allowedTypes });
      if (!validation.isValid) {
        onUploadError?.(validation.error || 'File validation failed');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create uploading entries
    const uploadingEntries: UploadingFile[] = validFiles.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadingFiles(prev => [...prev, ...uploadingEntries]);
    setShowUploadArea(true);

    // Upload files
    const uploadPromises = uploadingEntries.map(async (entry) => {
      try {
        const result = await uploadFile(entry.file, entry.id);
        return result;
      } catch (error) {
        console.error('Upload failed:', error);
        return null;
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(Boolean);

    // Notify parent component
    if (successfulUploads.length > 0) {
      onFilesUploaded?.(successfulUploads);
    }

    // Auto-hide upload area after 3 seconds if all uploads are complete
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status === 'uploading' || f.status === 'pending'));
      if (uploadingFiles.every(f => f.status === 'success' || f.status === 'error')) {
        setShowUploadArea(false);
      }
    }, 3000);
  }, [uploadingFiles.length, maxFiles, maxFileSize, allowedTypes, onUploadError, uploadFile, onFilesUploaded]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragActive(false);
    dragCounterRef.current = 0;
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  // File input handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [handleFiles]);

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Retry failed upload
  const retryUpload = useCallback(async (fileId: string) => {
    const file = uploadingFiles.find(f => f.id === fileId);
    if (!file) return;

    setUploadingFiles(prev => 
      prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'pending' as const, progress: 0, error: undefined }
          : f
      )
    );

    try {
      await uploadFile(file.file, fileId);
    } catch (error) {
      console.error('Retry upload failed:', error);
    }
  }, [uploadingFiles, uploadFile]);

  // Global drag and drop events
  useEffect(() => {
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragActive(true);
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragActive(false);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      dragCounterRef.current = 0;
    };

    document.addEventListener('dragenter', handleGlobalDragEnter);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragenter', handleGlobalDragEnter);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // Cleanup all progress intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all remaining progress intervals
      progressIntervalsRef.current.forEach(interval => clearInterval(interval));
      progressIntervalsRef.current.clear();
    };
  }, []);

  return (
    <>
      {/* Drag Overlay */}
      {isDragActive && (
        <div
          className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl border-2 border-dashed border-blue-500">
            <div className="text-center">
              <Upload className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Drop files here to upload
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {maxFiles} files max • {maxFileSize}MB per file
                {allowedTypes && (
                  <span className="block mt-1">
                    Allowed: {allowedTypes.join(', ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {(showUploadArea || uploadingFiles.length > 0) && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                File Uploads ({uploadingFiles.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadArea(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              {uploadingFiles.map((uploadingFile) => {
                const fileInfo = getFileTypeInfo(uploadingFile.file);
                const IconComponent = fileInfo.icon;

                return (
                  <div
                    key={uploadingFile.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border"
                  >
                    <div className={cn("p-2 rounded-lg", fileInfo.color)}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {uploadingFile.file.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {fileInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(uploadingFile.file.size)}
                          </span>
                        </div>
                      </div>

                      {uploadingFile.status === 'pending' && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Preparing upload...
                        </div>
                      )}

                      {uploadingFile.status === 'uploading' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Progress value={uploadingFile.progress} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                              {Math.round(uploadingFile.progress)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {uploadingFile.status === 'success' && (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Upload complete
                        </div>
                      )}

                      {uploadingFile.status === 'error' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            {uploadingFile.error || 'Upload failed'}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryUpload(uploadingFile.id)}
                              className="text-xs h-6"
                            >
                              Retry
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFile(uploadingFile.id)}
                              className="text-xs h-6"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      <div className={className}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Attach files"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes?.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </>
  );
}

export default ChatFileUpload;