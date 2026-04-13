// Advanced File Attachment and Sharing System
import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Paperclip,
  File,
  Image,
  Video,
  Music,
  Archive,
  FileText,
  Download,
  Eye,
  Share2,
  X,
  Check,
  Clock,
  AlertCircle,
  Upload,
  FolderOpen,
  Camera,
  Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/components/providers/unified-context-provider'
import useWorkspaceStore from '@/store/workspace'
import { formatFileSize } from '@/lib/utils/file'

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
  thumbnailUrl?: string
  uploadProgress?: number
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed'
  uploadedAt?: Date
  uploadedBy: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  channelId?: string
  messageId?: string
  metadata?: {
    width?: number
    height?: number
    duration?: number
    pages?: number
  }
}

interface FileAttachmentSystemProps {
  onFileSelect: (files: FileAttachment[]) => void
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  multiple?: boolean
  disabled?: boolean
}

export function FileAttachmentSystem({
  onFileSelect,
  maxFileSize = 50,
  allowedTypes = [],
  multiple = true,
  disabled = false,
}: FileAttachmentSystemProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showPreview, setShowPreview] = useState<FileAttachment | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File type configuration
  const FILE_TYPES = {
    image: {
      icon: Image,
      color: 'text-green-600',
      bg: 'bg-green-50',
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      maxSize: 10, // MB
    },
    video: {
      icon: Video,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      extensions: ['mp4', 'webm', 'ogg', 'avi', 'mov'],
      maxSize: 100, // MB
    },
    audio: {
      icon: Music,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
      maxSize: 20, // MB
    },
    document: {
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
      maxSize: 25, // MB
    },
    archive: {
      icon: Archive,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
      maxSize: 50, // MB
    },
    code: {
      icon: File,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      extensions: ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml'],
      maxSize: 5, // MB
    },
  }

  // Get file type from extension
  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    
    for (const [type, config] of Object.entries(FILE_TYPES)) {
      if (config.extensions.includes(extension)) {
        return { type, ...config }
      }
    }
    
    return {
      type: 'other',
      icon: File,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      maxSize: maxFileSize,
    }
  }

  // formatFileSize now imported from shared utilities

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxFileSize) {
      return `File size exceeds ${maxFileSize}MB limit`
    }

    // Check file type if specified
    if (allowedTypes.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
      if (!allowedTypes.includes(fileExtension)) {
        return `File type .${fileExtension} is not allowed`
      }
    }

    return null
  }

  // Process selected files
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newAttachments: FileAttachment[] = []

    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        console.error(`File validation failed for ${file.name}: ${error}`)
        continue
      }

      const fileType = getFileType(file.name)
      const attachment: FileAttachment = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type || `application/${fileType.type}`,
        size: file.size,
        uploadStatus: 'pending',
        uploadProgress: 0,
        uploadedBy: {
          id: user?.id || '',
          name: user?.name || 'Unknown User',
          email: user?.email || '',
          avatar: user?.avatar || `https://avatar.vercel.sh/${user?.email}`,
        },
        uploadedAt: new Date(),
      }

      // Generate thumbnail for images
      if (fileType.type === 'image') {
        try {
          const thumbnailUrl = await generateImageThumbnail(file)
          attachment.thumbnailUrl = thumbnailUrl
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error)
        }
      }

      newAttachments.push(attachment)
      
      // Simulate file upload
      simulateFileUpload(attachment)
    }

    setSelectedFiles(prev => multiple ? [...prev, ...newAttachments] : newAttachments)
  }, [user, multiple, maxFileSize, allowedTypes])

  // Generate image thumbnail
  const generateImageThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      reader.onload = (e) => {
        img.onload = () => {
          const maxSize = 150
          const ratio = Math.min(maxSize / img.width, maxSize / img.height)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio
          
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Simulate file upload with progress
  const simulateFileUpload = async (attachment: FileAttachment) => {
    const updateProgress = (progress: number, status: FileAttachment['uploadStatus']) => {
      setSelectedFiles(prev => 
        prev.map(file => 
          file.id === attachment.id 
            ? { ...file, uploadProgress: progress, uploadStatus: status }
            : file
        )
      )
    }

    updateProgress(0, 'uploading')
    
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      updateProgress(progress, 'uploading')
    }

    // Simulate success/failure
    const success = Math.random() > 0.1 // 90% success rate
    if (success) {
      updateProgress(100, 'completed')
      // Set a mock URL
      setSelectedFiles(prev => 
        prev.map(file => 
          file.id === attachment.id 
            ? { ...file, url: `https://example.com/files/${attachment.id}` }
            : file
        )
      )
    } else {
      updateProgress(0, 'failed')
    }
  }

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      processFiles(files)
    }
    // Reset input
    event.target.value = ''
  }

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      processFiles(files)
    }
  }, [processFiles])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  // Remove file
  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  // Send files
  const sendFiles = () => {
    const completedFiles = selectedFiles.filter(file => file.uploadStatus === 'completed')
    if (completedFiles.length > 0) {
      onFileSelect(completedFiles)
      setSelectedFiles([])
    }
  }

  // File item component
  const FileItem = ({ file }: { file: FileAttachment }) => {
    const fileTypeInfo = getFileType(file.name)
    const IconComponent = fileTypeInfo.icon

    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        file.uploadStatus === 'completed' && "bg-green-50 border-green-200",
        file.uploadStatus === 'failed' && "bg-red-50 border-red-200",
        file.uploadStatus === 'uploading' && "bg-blue-50 border-blue-200",
        file.uploadStatus === 'pending' && "bg-gray-50 border-gray-200"
      )}>
        {/* File icon/thumbnail */}
        <div className={cn("p-2 rounded-lg", fileTypeInfo.bg)}>
          {file.thumbnailUrl ? (
            <img 
              src={file.thumbnailUrl} 
              alt={file.name}
              className="w-8 h-8 object-cover rounded"
            />
          ) : (
            <IconComponent className={cn("w-5 h-5", fileTypeInfo.color)} />
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <div className="flex items-center gap-2">
              {file.uploadStatus === 'completed' && (
                <Check className="w-4 h-4 text-green-600" />
              )}
              {file.uploadStatus === 'failed' && (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              {file.uploadStatus === 'uploading' && (
                <Clock className="w-4 h-4 text-blue-600 animate-spin" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeFile(file.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)}
            </p>
            {file.uploadStatus === 'uploading' && (
              <span className="text-xs text-blue-600">
                {file.uploadProgress || 0}%
              </span>
            )}
          </div>

          {/* Upload progress */}
          {file.uploadStatus === 'uploading' && (
            <Progress 
              value={file.uploadProgress || 0} 
              className="mt-2 h-1"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* File selection area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
          isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Drop files here or <span className="text-blue-600 font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Maximum {maxFileSize}MB per file
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              <Paperclip className="w-4 h-4 mr-2" />
              Attach
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Browse Files
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mic className="w-4 h-4 mr-2" />
              Record Audio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Selected Files ({selectedFiles.length})
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={sendFiles}
              disabled={selectedFiles.every(f => f.uploadStatus !== 'completed')}
            >
              Send Files
            </Button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map(file => (
              <FileItem key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        onChange={handleFileInputChange}
        accept={allowedTypes.length > 0 ? allowedTypes.map(type => `.${type}`).join(',') : undefined}
      />

      {/* File preview modal */}
      {showPreview && (
        <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{showPreview.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Preview content would go here */}
              <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                <p className="text-gray-500">Preview not available</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {formatFileSize(showPreview.size)} • Uploaded {formatDistanceToNow(showPreview.uploadedAt || new Date(), { addSuffix: true })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}