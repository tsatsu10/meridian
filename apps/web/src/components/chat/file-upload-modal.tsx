// @epic-3.1-messaging: File Upload Modal Component
// @persona-lisa: Designer needs easy file sharing with version control
// @persona-sarah: PM needs to share documents and assets

import React, { useState, useRef, useCallback } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  X, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music,
  Archive,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
  channelId?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

interface FileWithPreview extends File {
  preview?: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  channelId,
  maxSize = 50, // 50MB default
  allowedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf', '.doc', '.docx', '.zip']
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-red-500" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (type.includes('zip') || type.includes('compressed')) return <Archive className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }
    
    // Check file type if restrictions exist
    if (allowedTypes.length > 0) {
      const isAllowed = allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.includes('*')) {
          const category = type.split('/')[0];
          return file.type.startsWith(category);
        }
        return file.type === type;
      });
      
      if (!isAllowed) {
        return 'File type not allowed';
      }
    }
    
    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: FileWithPreview[] = [];
    
    Array.from(newFiles).forEach((file) => {
      const error = validateFile(file);
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.status = error ? 'error' : 'pending';
      fileWithPreview.error = error || undefined;
      fileWithPreview.progress = 0;
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      
      validFiles.push(fileWithPreview);
    });
    
    setFiles(prev => [...prev, ...validFiles]);
  }, [maxSize, allowedTypes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadSingleFile = async (file: FileWithPreview): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    if (channelId) formData.append('channelId', channelId);

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev => prev.map(f => 
            f === file ? { ...f, progress } : f
          ));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles(prev => prev.map(f => 
            f === file ? { ...f, status: 'success' as const } : f
          ));
          resolve();
        } else {
          const error = `Upload failed: ${xhr.statusText}`;
          setFiles(prev => prev.map(f => 
            f === file ? { ...f, status: 'error' as const, error } : f
          ));
          reject(new Error(error));
        }
      });

      xhr.addEventListener('error', () => {
        const error = 'Network error during upload';
        setFiles(prev => prev.map(f => 
          f === file ? { ...f, status: 'error' as const, error } : f
        ));
        reject(new Error(error));
      });

      // TODO: Replace with actual backend endpoint
      // For now, this will fail gracefully since the endpoint doesn't exist yet
      xhr.open('POST', `${API_BASE_URL}/upload`);
      xhr.setRequestHeader('credentials', 'include');
      xhr.send(formData);
    });
  };

  const retryUpload = async (file: FileWithPreview) => {
    setFiles(prev => prev.map(f => 
      f === file ? { ...f, status: 'pending' as const, error: undefined, progress: 0 } : f
    ));
    
    try {
      setFiles(prev => prev.map(f => 
        f === file ? { ...f, status: 'uploading' as const } : f
      ));
      await uploadSingleFile(file);
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const handleUpload = async () => {
    const validFiles = files.filter(f => f.status !== 'error');
    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload files in parallel with progress tracking
      const uploadPromises = validFiles.map(async (file) => {
        setFiles(prev => prev.map(f => 
          f === file ? { ...f, status: 'uploading' as const } : f
        ));
        
        try {
          await uploadSingleFile(file);
        } catch (error) {
          // Error already handled in uploadSingleFile
          throw error;
        }
      });

      await Promise.allSettled(uploadPromises);

      const successCount = files.filter(f => f.status === 'success').length;
      const failCount = files.filter(f => f.status === 'error').length;

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to upload ${failCount} file(s)`);
      }

      // Call the callback function
      await onUpload(validFiles);

      // Close after success if all files uploaded
      if (failCount === 0) {
        setTimeout(() => {
          handleClose();
        }, 500);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Cleanup previews
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setCaption('');
    setIsUploading(false);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to share with the team. Max size: {maxSize}MB per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Caption Field */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a message with your files..."
                className="resize-none"
                rows={2}
                disabled={isUploading}
              />
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
            )}
          >
            <Upload className={cn(
              "w-10 h-10 mx-auto mb-3",
              isDragging ? "text-blue-500" : "text-slate-400"
            )} />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supported: Images, Videos, Documents, Archives (Max {maxSize}MB each)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              accept={allowedTypes.join(',')}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-white dark:bg-slate-700 flex items-center justify-center">
                        {getFileIcon(file)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      {file.status === 'success' && (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(file.size)}
                      </p>
                      {file.error && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {file.error}
                        </p>
                      )}
                    </div>
                    {file.status === 'uploading' && file.progress !== undefined && (
                      <Progress value={file.progress} className="mt-2 h-1" />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Retry Button for Failed Uploads */}
                    {file.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryUpload(file);
                        }}
                        title="Retry upload"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {/* Remove Button */}
                    {file.status !== 'uploading' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading || files.every(f => f.status === 'error')}
          >
            {isUploading ? 'Uploading...' : `Upload ${files.filter(f => f.status !== 'error').length} file(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;

