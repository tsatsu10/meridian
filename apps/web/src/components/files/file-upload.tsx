/**
 * File Upload Component
 * Drag-and-drop file uploader with progress tracking
 * Phase 0 - Day 4 Implementation
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, File, Image, Video, FileText } from 'lucide-react';

interface FileUploadProps {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedFileTypes?: string[];
}

interface UploadedFile {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export function FileUpload({
  workspaceId,
  projectId,
  taskId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 10, // 10MB
  acceptedFileTypes = [],
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    if (acceptedFileTypes.length > 0) {
      const isAccepted = acceptedFileTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.split('/')[0]);
        }
        return file.type === type;
      });

      if (!isAccepted) {
        return 'File type not allowed';
      }
    }

    return null;
  };

  const uploadFile = async (fileWithProgress: FileWithProgress, index: number) => {
    const formData = new FormData();
    formData.append('file', fileWithProgress.file);
    formData.append('workspaceId', workspaceId);
    if (projectId) formData.append('projectId', projectId);
    if (taskId) formData.append('taskId', taskId);

    try {
      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, progress } : f
          ));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          setFiles(prev => prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  status: 'success' as const,
                  progress: 100,
                  uploadedFile: response.file,
                }
              : f
          ));
        } else {
          const error = JSON.parse(xhr.responseText);
          setFiles(prev => prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  status: 'error' as const,
                  error: error.error || 'Upload failed',
                }
              : f
          ));
          if (onUploadError) onUploadError(error.error || 'Upload failed');
        }
      });

      // Handle error
      xhr.addEventListener('error', () => {
        setFiles(prev => prev.map((f, i) =>
          i === index
            ? { ...f, status: 'error' as const, error: 'Upload failed' }
            : f
        ));
        if (onUploadError) onUploadError('Upload failed');
      });

      // Send request
      xhr.open('POST', '/api/files/upload');
      xhr.send(formData);
    } catch (error: any) {
      setFiles(prev => prev.map((f, i) =>
        i === index
          ? { ...f, status: 'error' as const, error: error.message }
          : f
      ));
      if (onUploadError) onUploadError(error.message);
    }
  };

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Check max files limit
    if (files.length + fileArray.length > maxFiles) {
      if (onUploadError) {
        onUploadError(`Maximum ${maxFiles} files allowed`);
      }
      return;
    }

    // Validate and add files
    const validatedFiles: FileWithProgress[] = fileArray
      .map(file => {
        const error = validateFile(file);
        return {
          file,
          progress: 0,
          status: error ? ('error' as const) : ('pending' as const),
          error,
        };
      });

    setFiles(prev => [...prev, ...validatedFiles]);

    // Start uploading valid files
    const startIndex = files.length;
    validatedFiles.forEach((fileWithProgress, index) => {
      if (fileWithProgress.status === 'pending') {
        uploadFile(fileWithProgress, startIndex + index);
      }
    });
  }, [files.length, maxFiles, workspaceId, projectId, taskId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    const successfulUploads = files
      .filter(f => f.status === 'success' && f.uploadedFile)
      .map(f => f.uploadedFile!);

    if (onUploadComplete && successfulUploads.length > 0) {
      onUploadComplete(successfulUploads);
    }

    setFiles([]);
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          accept={acceptedFileTypes.join(',')}
          className="hidden"
        />

        <Upload className={`
          w-12 h-12 mx-auto mb-4 transition-colors
          ${isDragging
            ? 'text-purple-600 dark:text-purple-400'
            : 'text-gray-400 dark:text-gray-500'
          }
        `} />

        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          or click to browse
        </p>

        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          <p>Maximum {maxFiles} files • Up to {maxFileSize}MB each</p>
          {acceptedFileTypes.length > 0 && (
            <p className="mt-1">
              Accepted: {acceptedFileTypes.map(t => t.split('/')[1] || t).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Files ({files.length})
            </h3>
            {files.some(f => f.status === 'success') && (
              <button
                onClick={handleComplete}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
              >
                Done
              </button>
            )}
          </div>

          {files.map((fileWithProgress, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start gap-3">
                {/* File Icon */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                  ${fileWithProgress.status === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : fileWithProgress.status === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  }
                `}>
                  {fileWithProgress.status === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : fileWithProgress.status === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    getFileIcon(fileWithProgress.file.type)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {fileWithProgress.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(fileWithProgress.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {fileWithProgress.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 transition-all duration-300"
                          style={{ width: `${fileWithProgress.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {fileWithProgress.progress}%
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {fileWithProgress.status === 'error' && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {fileWithProgress.error}
                    </p>
                  )}

                  {/* Success Message */}
                  {fileWithProgress.status === 'success' && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Upload complete
                    </p>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

