import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';

interface FileUploadProps {
  taskId?: string;
  commentId?: string;
  onUploadComplete?: (attachments: any[]) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  multiple?: boolean;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

// @epic-2.1-files: File type icons and validation
const getFileIcon = (type: string) => {
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
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const validateFile = (file: File, maxFileSize: number, allowedTypes?: string[]): string | null => {
  // Check file size (convert MB to bytes)
  if (file.size > maxFileSize * 1024 * 1024) {
    return `File size exceeds ${maxFileSize}MB limit`;
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
      return `File type ${file.type} is not allowed`;
    }
  }
  
  return null;
};

// @epic-2.1-files: Main file upload component with drag & drop and progress
export function FileUpload({
  taskId,
  commentId,
  onUploadComplete,
  onUploadError,
  maxFileSize = 10, // 10MB default
  allowedTypes,
  multiple = true,
  className
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    // Validate files first
    for (const file of fileArray) {
      const validationError = validateFile(file, maxFileSize, allowedTypes);
      if (validationError) {
        onUploadError?.(validationError);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      // Create uploading file entries with progress tracking
      const uploadingEntries: UploadingFile[] = validFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploadingFiles(prev => [...prev, ...uploadingEntries]);

      // Simulate upload progress and pass to parent
      for (const entry of uploadingEntries) {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => 
            prev.map(f => 
              f.id === entry.id && f.progress < 90 
                ? { ...f, progress: f.progress + Math.random() * 20 }
                : f
            )
          );
        }, 200);

        // Complete the upload after a short delay
        setTimeout(() => {
          clearInterval(progressInterval);
          setUploadingFiles(prev => 
            prev.map(f => 
              f.id === entry.id 
                ? { ...f, progress: 100, status: 'success' as const }
                : f
            )
          );

          // Remove from uploading list after success animation
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.id !== entry.id));
          }, 1000);
        }, 1000 + Math.random() * 1000);
      }

      // Pass files to parent for actual upload
      const fileData = validFiles.map(file => ({ file }));
      onUploadComplete?.(fileData);
    }
  }, [maxFileSize, allowedTypes, onUploadComplete, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  const removeUploadingFile = useCallback((id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragOver 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-8 h-8 mx-auto mb-2 bg-gray-400 rounded-lg flex items-center justify-center text-white text-lg">⬆️</div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Drag and drop files here, or click to select
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {allowedTypes ? `Allowed: ${allowedTypes.join(', ')}` : 'All file types allowed'} 
          {' • '}Max size: {maxFileSize}MB
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={allowedTypes?.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? 's' : ''}...
          </h4>
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-shrink-0">
                {getFileIcon(uploadingFile.file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(uploadingFile.file.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={uploadingFile.progress} 
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-gray-500 min-w-[3rem] text-right">
                    {Math.round(uploadingFile.progress)}%
                  </span>
                </div>
                {uploadingFile.status === 'success' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✅ Upload complete
                  </p>
                )}
                {uploadingFile.status === 'error' && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ❌ {uploadingFile.error || 'Upload failed'}
                  </p>
                )}
              </div>
              {uploadingFile.status === 'error' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="text-xs"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload; 