// File Message Component for Chat
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  File,
  Image,
  Video,
  Music,
  Archive,
  FileText,
  Download,
  Eye,
  Share2,
  MoreVertical,
  ExternalLink,
  Copy,
  Trash,
  Star,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { formatFileSize } from '@/lib/utils/file'
import { FileAttachment } from './file-attachment-system'

interface FileMessageProps {
  files: FileAttachment[]
  message?: {
    id: string
    content: string
    userEmail: string
    userName: string
    createdAt: string
  }
  onDownload?: (file: FileAttachment) => void
  onPreview?: (file: FileAttachment) => void
  onShare?: (file: FileAttachment) => void
  onDelete?: (file: FileAttachment) => void
  compact?: boolean
}

export function FileMessage({
  files,
  message,
  onDownload,
  onPreview,
  onShare,
  onDelete,
  compact = false,
}: FileMessageProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  // File type configuration
  const FILE_TYPE_CONFIGS = {
    image: {
      icon: Image,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      canPreview: true,
    },
    video: {
      icon: Video,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      canPreview: true,
    },
    audio: {
      icon: Music,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      canPreview: true,
    },
    document: {
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      canPreview: true,
    },
    archive: {
      icon: Archive,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      canPreview: false,
    },
    other: {
      icon: File,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      canPreview: false,
    },
  }

  // Get file type from name
  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image'
    }
    if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(extension)) {
      return 'video'
    }
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension)) {
      return 'audio'
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return 'document'
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return 'archive'
    }
    
    return 'other'
  }

  // formatFileSize now imported from shared utilities

  // Toggle file expansion
  const toggleFileExpansion = (fileId: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  // Handle file actions
  const handleDownload = (file: FileAttachment) => {
    if (file.url) {
      const a = document.createElement('a')
      a.href = file.url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    onDownload?.(file)
  }

  const handleCopyLink = async (file: FileAttachment) => {
    if (file.url) {
      try {
        await navigator.clipboard.writeText(file.url)
        // Could show a toast here
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
    }
  }

  // Single file component
  const FileItem = ({ file, index }: { file: FileAttachment; index: number }) => {
    const fileType = getFileType(file.name) as keyof typeof FILE_TYPE_CONFIGS
    const config = FILE_TYPE_CONFIGS[fileType]
    const IconComponent = config.icon
    const isExpanded = expandedFiles.has(file.id)

    return (
      <div
        className={cn(
          "border rounded-lg overflow-hidden transition-all",
          config.border,
          compact ? "p-2" : "p-3"
        )}
      >
        <div className="flex items-start gap-3">
          {/* File icon/thumbnail */}
          <div className={cn(
            "flex-shrink-0 p-2 rounded-lg",
            config.bg,
            compact ? "p-1.5" : "p-2"
          )}>
            {file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className={cn(
                  "object-cover rounded",
                  compact ? "w-6 h-6" : "w-8 h-8"
                )}
                onClick={() => config.canPreview && onPreview?.(file)}
              />
            ) : (
              <IconComponent
                className={cn(
                  config.color,
                  compact ? "w-4 h-4" : "w-5 h-5"
                )}
              />
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-medium text-gray-900 truncate",
                  compact ? "text-sm" : "text-sm"
                )}>
                  {file.name}
                </h4>
                <p className={cn(
                  "text-gray-500 mt-1",
                  compact ? "text-xs" : "text-sm"
                )}>
                  {formatFileSize(file.size)}
                  {file.uploadedAt && (
                    <> • {formatDistanceToNow(file.uploadedAt, { addSuffix: true })}</>
                  )}
                </p>
                
                {file.uploadedBy && !compact && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={file.uploadedBy.avatar} />
                      <AvatarFallback className="text-xs">
                        {file.uploadedBy.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500">
                      {file.uploadedBy.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {config.canPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onPreview?.(file)}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="w-3 h-3" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {config.canPreview && (
                      <DropdownMenuItem onClick={() => onPreview?.(file)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyLink(file)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShare?.(file)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    {file.url && (
                      <DropdownMenuItem
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Star className="w-4 h-4 mr-2" />
                      Add to Favorites
                    </DropdownMenuItem>
                    {onDelete && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onDelete(file)}
                          className="text-red-600"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded view for images */}
        {isExpanded && fileType === 'image' && file.url && (
          <div className="mt-3 border-t pt-3">
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full h-auto rounded-lg"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}

        {/* Expanded view for videos */}
        {isExpanded && fileType === 'video' && file.url && (
          <div className="mt-3 border-t pt-3">
            <video
              controls
              className="max-w-full h-auto rounded-lg"
              style={{ maxHeight: '300px' }}
            >
              <source src={file.url} type={file.type} />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Expanded view for audio */}
        {isExpanded && fileType === 'audio' && file.url && (
          <div className="mt-3 border-t pt-3">
            <audio controls className="w-full">
              <source src={file.url} type={file.type} />
              Your browser does not support the audio tag.
            </audio>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Message text if provided */}
      {message?.content && (
        <div className="text-sm text-gray-700 mb-3">
          {message.content}
        </div>
      )}

      {/* File attachments */}
      <div className={cn(
        "space-y-2",
        files.length > 3 && "max-h-96 overflow-y-auto"
      )}>
        {files.map((file, index) => (
          <FileItem key={file.id} file={file} index={index} />
        ))}
      </div>

      {/* File count summary */}
      {files.length > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t">
          <span>
            {files.length} file{files.length !== 1 ? 's' : ''} shared
          </span>
          <span>
            Total size: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
          </span>
        </div>
      )}
    </div>
  )
}