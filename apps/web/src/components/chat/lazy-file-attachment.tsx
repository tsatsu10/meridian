// Lazy Loading File Attachment Component for Performance Optimization
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from "../../lib/logger";
// Remove duplicate import - formatBytes is defined locally

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
  thumbnailUrl?: string
  uploadedBy: string
  uploadedAt: string
  messageId: string
}

interface LazyFileAttachmentProps {
  file: FileAttachment
  onDownload?: (file: FileAttachment) => void
  onPreview?: (file: FileAttachment) => void
  onShare?: (file: FileAttachment) => void
  onDelete?: (file: FileAttachment) => void
  className?: string
  compact?: boolean
  lazyLoad?: boolean
  intersectionThreshold?: number
}

interface FilePreviewState {
  isLoading: boolean
  error: string | null
  content: string | null
  isVisible: boolean
}

// File type icons mapping
const getFileIcon = (fileType: string, size: string = "w-5 h-5") => {
  const type = fileType.toLowerCase()
  
  if (type.startsWith('image/')) {
    return <Image className={size} />
  } else if (type.startsWith('video/')) {
    return <Video className={size} />
  } else if (type.startsWith('audio/')) {
    return <Music className={size} />
  } else if (type.includes('pdf') || type.includes('document')) {
    return <FileText className={size} />
  } else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
    return <Archive className={size} />
  } else {
    return <File className={size} />
  }
}

// File type color mapping
const getFileTypeColor = (fileType: string) => {
  const type = fileType.toLowerCase()
  
  if (type.startsWith('image/')) {
    return 'bg-green-100 text-green-800 border-green-200'
  } else if (type.startsWith('video/')) {
    return 'bg-purple-100 text-purple-800 border-purple-200'
  } else if (type.startsWith('audio/')) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  } else if (type.includes('pdf')) {
    return 'bg-red-100 text-red-800 border-red-200'
  } else if (type.includes('document') || type.includes('text')) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  } else if (type.includes('zip') || type.includes('archive')) {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  } else {
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function LazyFileAttachment({
  file,
  onDownload,
  onPreview,
  onShare,
  onDelete,
  className,
  compact = false,
  lazyLoad = true,
  intersectionThreshold = 0.1,
}: LazyFileAttachmentProps) {
  const [isVisible, setIsVisible] = useState(!lazyLoad)
  const [isLoaded, setIsLoaded] = useState(!lazyLoad)
  const [isLoading, setIsLoading] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewState, setPreviewState] = useState<FilePreviewState>({
    isLoading: false,
    error: null,
    content: null,
    isVisible: false,
  })
  
  const elementRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazyLoad || isVisible) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            loadFileData()
          }
        })
      },
      {
        threshold: intersectionThreshold,
        rootMargin: '50px',
      }
    )

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [lazyLoad, isVisible, intersectionThreshold])

  // Load file data (thumbnail, metadata, etc.)
  const loadFileData = useCallback(async () => {
    if (isLoaded || isLoading) return

    setIsLoading(true)
    try {
      // Simulate API call to load file metadata and thumbnail
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Generate thumbnail for images
      if (file.type.startsWith('image/') && file.url) {
        setThumbnail(file.thumbnailUrl || file.url)
      }
      
      setIsLoaded(true)
    } catch (error) {
      console.error('Failed to load file data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [file, isLoaded, isLoading])

  // Load file data when visible (for lazy loading)
  useEffect(() => {
    if (isVisible && !isLoaded) {
      loadFileData()
    }
  }, [isVisible, isLoaded, loadFileData])

  // Load preview content
  const loadPreview = useCallback(async () => {
    if (previewState.isLoading || previewState.content) return

    setPreviewState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Simulate loading preview content
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let content = null
      if (file.type.startsWith('text/') || file.type.includes('json')) {
        content = `Preview content for ${file.name}\n\nThis is a simulated preview of the file content.`
      } else if (file.type.startsWith('image/')) {
        content = file.url || file.thumbnailUrl
      }
      
      setPreviewState(prev => ({
        ...prev,
        isLoading: false,
        content,
        isVisible: true,
      }))
    } catch (error) {
      setPreviewState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load preview',
      }))
    }
  }, [file, previewState.isLoading, previewState.content])

  // Handle file actions
  const handleDownload = () => {
    onDownload?.(file)
    // In a real app, this would trigger the actual download
    logger.info("Downloading file:")
  }

  const handlePreview = () => {
    onPreview?.(file)
    setPreviewOpen(true)
    loadPreview()
  }

  const handleShare = () => {
    onShare?.(file)
    // Copy file URL to clipboard
    if (file.url) {
      navigator.clipboard.writeText(file.url)
    }
  }

  const handleCopyLink = () => {
    if (file.url) {
      navigator.clipboard.writeText(file.url)
    }
  }

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      onDelete?.(file)
    }
  }

  // Skeleton loader for lazy loading
  if (!isVisible || (lazyLoad && isLoading)) {
    return (
      <div ref={elementRef} className={cn("p-3 border rounded-lg", className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    )
  }

  // Compact view for inline attachments
  if (compact) {
    return (
      <div ref={elementRef} className={cn(
        "inline-flex items-center gap-2 px-2 py-1 border rounded text-sm",
        getFileTypeColor(file.type),
        className
      )}>
        {getFileIcon(file.type, "w-4 h-4")}
        <span className="font-medium truncate max-w-32">{file.name}</span>
        <span className="text-xs opacity-75">{formatBytes(file.size)}</span>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="h-6 w-6 p-0"
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-6 w-6 p-0"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
    )
  }

  // Full file attachment card
  return (
    <>
      <div ref={elementRef} className={cn(
        "border rounded-lg p-4 hover:shadow-sm transition-shadow",
        getFileTypeColor(file.type),
        className
      )}>
        <div className="flex items-start gap-3">
          {/* File thumbnail or icon */}
          <div className="flex-shrink-0">
            {thumbnail && file.type.startsWith('image/') ? (
              <img
                src={thumbnail}
                alt={file.name}
                className="w-12 h-12 object-cover rounded border"
                loading="lazy"
                onError={() => setThumbnail(null)}
              />
            ) : (
              <div className="w-12 h-12 flex items-center justify-center bg-white/50 rounded border">
                {getFileIcon(file.type)}
              </div>
            )}
          </div>
          
          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{file.name}</h4>
              <Badge variant="secondary" className="text-xs">
                {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-xs opacity-75">
              <span>{formatBytes(file.size)}</span>
              <span>•</span>
              <span>by {file.uploadedBy}</span>
              <span>•</span>
              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              className="h-8 px-2"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon(file.type)}
              {file.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {previewState.isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-3">Loading preview...</span>
              </div>
            )}

            {previewState.error && (
              <div className="flex items-center justify-center py-12 text-red-600">
                <AlertCircle className="w-6 h-6 mr-2" />
                {previewState.error}
              </div>
            )}

            {previewState.content && file.type.startsWith('image/') && (
              <div className="flex justify-center">
                <img
                  src={previewState.content}
                  alt={file.name}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
            )}

            {previewState.content && file.type.startsWith('text/') && (
              <pre className="p-4 bg-gray-50 rounded text-sm whitespace-pre-wrap font-mono">
                {previewState.content}
              </pre>
            )}

            {previewState.content && !file.type.startsWith('image/') && !file.type.startsWith('text/') && (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <File className="w-12 h-12 mb-4" />
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm">This file type cannot be previewed in the browser</p>
                  <Button onClick={handleDownload} className="mt-4">
                    <Download className="w-4 h-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Utility function for file size formatting (if not already available)
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export type { FileAttachment, LazyFileAttachmentProps }