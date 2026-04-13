/**
 * @fileoverview Message Attachments Component
 * @description Display and manage file attachments within chat messages
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Inline image previews with thumbnails
 * - File type recognition and icons
 * - Click-to-preview functionality
 * - Download and sharing options
 * - Grid layout for multiple attachments
 * - Responsive design for mobile
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  MoreHorizontal,
  Play
} from 'lucide-react';
import { FilePreviewModal } from './file-preview-modal';
import { formatFileSize } from '@/lib/utils/file';
// Temporarily comment out problematic imports
// import { generateThumbnail, getFilePreviewUrl } from '@/fetchers/attachment/get-attachments';

// Create placeholder functions
const generateThumbnail = (fileId: string, options?: any) => `/api/attachment/file/${fileId}/thumbnail`;
const getFilePreviewUrl = (fileId: string, options?: any) => `/api/attachment/file/${fileId}/preview`;

interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: Date;
  userEmail: string;
  userName?: string;
  description?: string;
  version?: string;
  thumbnailUrl?: string;
}

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  className?: string;
  maxPreviewSize?: number; // Maximum size for inline preview (in bytes)
  showDownload?: boolean;
  showPreview?: boolean;
  compact?: boolean; // Compact mode for smaller displays
  onDownload?: (attachment: MessageAttachment) => void;
  onPreview?: (attachment: MessageAttachment) => void;
}

// File type detection with enhanced metadata
const getFileTypeInfo = (attachment: MessageAttachment) => {
  const type = attachment.type.toLowerCase();
  const name = attachment.name.toLowerCase();
  
  if (type.startsWith('image/')) {
    return { 
      category: 'image', 
      icon: ImageIcon, 
      color: 'bg-green-500', 
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      label: 'Image',
      previewable: true,
      showInline: true
    };
  }
  if (type.startsWith('video/')) {
    return { 
      category: 'video', 
      icon: Video, 
      color: 'bg-purple-500', 
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      label: 'Video',
      previewable: true,
      showInline: true
    };
  }
  if (type.startsWith('audio/')) {
    return { 
      category: 'audio', 
      icon: Music, 
      color: 'bg-orange-500', 
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      label: 'Audio',
      previewable: true,
      showInline: false
    };
  }
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return { 
      category: 'pdf', 
      icon: FileText, 
      color: 'bg-red-500', 
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      label: 'PDF',
      previewable: true,
      showInline: false
    };
  }
  if (type.includes('document') || type.includes('text') || 
      name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt')) {
    return { 
      category: 'document', 
      icon: FileText, 
      color: 'bg-blue-500', 
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      label: 'Document',
      previewable: false,
      showInline: false
    };
  }
  if (type.includes('zip') || type.includes('archive') || 
      name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) {
    return { 
      category: 'archive', 
      icon: Archive, 
      color: 'bg-gray-500', 
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-50',
      label: 'Archive',
      previewable: false,
      showInline: false
    };
  }
  
  return { 
    category: 'file', 
    icon: FileText, 
    color: 'bg-gray-500', 
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    label: 'File',
    previewable: false,
    showInline: false
  };
};

// formatFileSize now imported from shared utilities

// Single attachment component
const AttachmentItem: React.FC<{
  attachment: MessageAttachment;
  compact?: boolean;
  maxPreviewSize?: number;
  showDownload?: boolean;
  showPreview?: boolean;
  onClick?: () => void;
  onDownload?: () => void;
}> = ({ 
  attachment, 
  compact = false, 
  maxPreviewSize = 5 * 1024 * 1024, // 5MB
  showDownload = true,
  showPreview = true,
  onClick,
  onDownload 
}) => {
  const fileInfo = getFileTypeInfo(attachment);
  const IconComponent = fileInfo.icon;
  const shouldShowInlinePreview = fileInfo.showInline && 
    attachment.size <= maxPreviewSize &&
    fileInfo.category === 'image';

  // Handle download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle external open
  const handleExternalOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(attachment.url, '_blank');
  };

  if (shouldShowInlinePreview && !compact) {
    // Inline image preview
    return (
      <div className="max-w-sm">
        <div
          className="relative group cursor-pointer rounded-lg overflow-hidden border bg-card"
          onClick={onClick}
        >
          <img
            src={attachment.thumbnailUrl || attachment.url}
            alt={attachment.name}
            className="w-full h-auto max-h-64 object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              {showPreview && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white text-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {showDownload && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white text-black"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* File info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-white text-sm font-medium truncate">{attachment.name}</p>
            <p className="text-white/80 text-xs">{formatFileSize(attachment.size)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (fileInfo.category === 'video' && !compact) {
    // Video preview with thumbnail
    return (
      <div className="max-w-sm">
        <div
          className="relative group cursor-pointer rounded-lg overflow-hidden border bg-card"
          onClick={onClick}
        >
          <div className="relative">
            {attachment.thumbnailUrl ? (
              <img
                src={attachment.thumbnailUrl}
                alt={attachment.name}
                className="w-full h-auto max-h-64 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Video className="h-16 w-16 text-white opacity-80" />
              </div>
            )}
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 rounded-full p-4 group-hover:bg-black/70 transition-colors">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </div>
          </div>

          {/* File info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-white text-sm font-medium truncate">{attachment.name}</p>
            <p className="text-white/80 text-xs">{formatFileSize(attachment.size)}</p>
          </div>
        </div>
      </div>
    );
  }

  // File card for non-previewable files or compact mode
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md group",
        compact ? "p-0" : "",
        fileInfo.bgColor
      )}
      onClick={onClick}
    >
      <CardContent className={cn("flex items-center gap-3", compact ? "p-3" : "p-4")}>
        <div className={cn("p-2 rounded-lg flex-shrink-0", fileInfo.color)}>
          <IconComponent className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate", compact ? "text-sm" : "text-base")}>
            {attachment.name}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="h-5 text-xs">
              {fileInfo.label}
            </Badge>
            <span>{formatFileSize(attachment.size)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {showPreview && fileInfo.previewable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {showDownload && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleExternalOpen}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function MessageAttachments({
  attachments,
  className,
  maxPreviewSize = 5 * 1024 * 1024, // 5MB
  showDownload = true,
  showPreview = true,
  compact = false,
  onDownload,
  onPreview,
}: MessageAttachmentsProps) {
  const [previewFile, setPreviewFile] = useState<MessageAttachment | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [enhancedAttachments, setEnhancedAttachments] = useState<MessageAttachment[]>(attachments);

  // Enhance attachments with thumbnail URLs
  useEffect(() => {
    const enhanceAttachments = async () => {
      const enhanced = await Promise.all(
        attachments.map(async (attachment) => {
          // If thumbnail already exists, use it
          if (attachment.thumbnailUrl) {
            return attachment;
          }

          const fileInfo = getFileTypeInfo(attachment);
          
          // Generate thumbnail for previewable files
          if (fileInfo.previewable && fileInfo.showInline) {
            try {
              const thumbnailUrl = generateThumbnail(attachment.id, {
                width: 300,
                height: 300,
                quality: 85,
                format: 'jpeg'
              });
              
              return { ...attachment, thumbnailUrl };
            } catch (error) {
              // Failed to generate thumbnail - using default
            }
          }

          return attachment;
        })
      );
      
      setEnhancedAttachments(enhanced);
    };

    enhanceAttachments();
  }, [attachments]);

  // Organize attachments by type for better layout
  const { images, videos, files } = useMemo(() => {
    const images: MessageAttachment[] = [];
    const videos: MessageAttachment[] = [];
    const files: MessageAttachment[] = [];

    enhancedAttachments.forEach(attachment => {
      const fileInfo = getFileTypeInfo(attachment);
      if (fileInfo.category === 'image') {
        images.push(attachment);
      } else if (fileInfo.category === 'video') {
        videos.push(attachment);
      } else {
        files.push(attachment);
      }
    });

    return { images, videos, files };
  }, [enhancedAttachments]);

  const handlePreview = (attachment: MessageAttachment, index: number) => {
    setPreviewFile(attachment);
    setCurrentPreviewIndex(index);
    onPreview?.(attachment);
  };

  const handleDownloadFile = (attachment: MessageAttachment) => {
    onDownload?.(attachment);
  };

  if (enhancedAttachments.length === 0) return null;

  return (
    <div className={cn("mt-2 space-y-3", className)}>
      {/* Images grid */}
      {images.length > 0 && (
        <div className={cn(
          "grid gap-2",
          images.length === 1 ? "grid-cols-1" :
          images.length === 2 ? "grid-cols-2" :
          images.length === 3 ? "grid-cols-3" :
          "grid-cols-2 sm:grid-cols-3"
        )}>
          {images.map((attachment, index) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              compact={compact}
              maxPreviewSize={maxPreviewSize}
              showDownload={showDownload}
              showPreview={showPreview}
              onClick={() => handlePreview(attachment, index)}
              onDownload={() => handleDownloadFile(attachment)}
            />
          ))}
        </div>
      )}

      {/* Videos grid */}
      {videos.length > 0 && (
        <div className={cn(
          "grid gap-2",
          videos.length === 1 ? "grid-cols-1" :
          "grid-cols-1 sm:grid-cols-2"
        )}>
          {videos.map((attachment, index) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              compact={compact}
              maxPreviewSize={maxPreviewSize}
              showDownload={showDownload}
              showPreview={showPreview}
              onClick={() => handlePreview(attachment, images.length + index)}
              onDownload={() => handleDownloadFile(attachment)}
            />
          ))}
        </div>
      )}

      {/* Other files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((attachment, index) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              compact={compact}
              maxPreviewSize={maxPreviewSize}
              showDownload={showDownload}
              showPreview={showPreview}
              onClick={() => handlePreview(attachment, images.length + videos.length + index)}
              onDownload={() => handleDownloadFile(attachment)}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        files={enhancedAttachments}
        currentIndex={currentPreviewIndex}
        onNavigate={setCurrentPreviewIndex}
        onDownload={handleDownloadFile}
      />
    </div>
  );
}

export default MessageAttachments;