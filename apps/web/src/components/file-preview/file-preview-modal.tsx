// @epic-3.1-messaging: File preview modal for comprehensive file viewing
// @persona-sarah: PM needs quick file previews for efficient collaboration
// @persona-david: Team lead needs visual file identification

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Copy,
  Share,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/utils/file';

export interface FilePreviewData {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  isPreviewable: boolean;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    [key: string]: any;
  };
  uploadedBy?: string;
  uploadedAt?: string;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FilePreviewData | null;
  onDownload?: (file: FilePreviewData) => void;
  onShare?: (file: FilePreviewData) => void;
  className?: string;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  onDownload,
  onShare,
  className
}: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Reset state when modal opens/closes or file changes
  useEffect(() => {
    if (isOpen && file) {
      setZoom(100);
      setRotation(0);
      setIsFullscreen(false);
      setImageError(false);
      setVideoError(false);
    }
  }, [isOpen, file]);

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const isPDF = file.type === 'application/pdf';
  const isText = file.type.startsWith('text/') || file.type === 'application/json';

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleFullscreen = () => setIsFullscreen(!isFullscreen);

  // formatFileSize now imported from shared utilities

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="w-4 h-4" />;
    if (isVideo) return <Video className="w-4 h-4" />;
    if (isAudio) return <Music className="w-4 h-4" />;
    if (isPDF || file.type.includes('document')) return <FileText className="w-4 h-4" />;
    if (file.type.includes('zip') || file.type.includes('archive')) return <Archive className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getFileCategory = () => {
    if (isImage) return 'image';
    if (isVideo) return 'video';
    if (isAudio) return 'audio';
    if (isPDF) return 'document';
    if (isText) return 'text';
    return 'file';
  };

  const renderPreviewContent = () => {
    if (!file.isPreviewable && !file.previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center mb-4">
            {getFileIcon()}
          </div>
          <h3 className="text-lg font-medium mb-2">Preview not available</h3>
          <p className="text-sm text-center mb-4">
            This file type cannot be previewed in the browser.
          </p>
          <Button 
            onClick={() => onDownload?.(file)}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download to view
          </Button>
        </div>
      );
    }

    // Image preview
    if (isImage && file.previewUrl && !imageError) {
      return (
        <div className="relative flex items-center justify-center min-h-96">
          <img
            src={file.previewUrl}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />
          
          {/* Image controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 25}
              className="w-8 h-8 p-0"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 300}
              className="w-8 h-8 p-0"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRotate}
              className="w-8 h-8 p-0"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFullscreen}
              className="w-8 h-8 p-0"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom indicator */}
          {zoom !== 100 && (
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary">{zoom}%</Badge>
            </div>
          )}
        </div>
      );
    }

    // Video preview
    if (isVideo && file.previewUrl && !videoError) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <video
            controls
            className="max-w-full max-h-[70vh]"
            onError={() => setVideoError(true)}
          >
            <source src={file.previewUrl} type={file.type} />
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // Audio preview
    if (isAudio && file.previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center mb-6">
            <Music className="w-12 h-12 text-muted-foreground" />
          </div>
          <audio controls className="w-full max-w-md">
            <source src={file.previewUrl} type={file.type} />
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // PDF preview (would need PDF.js in production)
    if (isPDF && file.previewUrl) {
      return (
        <div className="h-96 w-full">
          <iframe
            src={`${file.previewUrl}#toolbar=1`}
            className="w-full h-full border-0"
            title={file.name}
          />
        </div>
      );
    }

    // Text file preview
    if (isText && file.previewUrl) {
      return (
        <div className="h-96">
          <iframe
            src={file.previewUrl}
            className="w-full h-full border-0 bg-background"
            title={file.name}
          />
        </div>
      );
    }

    // Fallback to thumbnail
    if (file.thumbnailUrl) {
      return (
        <div className="flex items-center justify-center h-96">
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className="max-w-xs max-h-xs object-contain"
          />
        </div>
      );
    }

    // Ultimate fallback
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center mb-4">
          {getFileIcon()}
        </div>
        <h3 className="text-lg font-medium mb-2">No preview available</h3>
        <p className="text-sm text-center">
          Click download to view this file.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "max-w-4xl max-h-[90vh] overflow-hidden",
          isFullscreen && "max-w-[95vw] max-h-[95vh]",
          className
        )}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 pr-8">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <div className="truncate">{file.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {getFileCategory()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                {file.metadata?.width && file.metadata?.height && (
                  <span className="text-xs text-muted-foreground">
                    {file.metadata.width} × {file.metadata.height}
                  </span>
                )}
                {file.metadata?.duration && (
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(file.metadata.duration / 60)}:{(file.metadata.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
          
          {/* Action buttons */}
          <div className="absolute top-4 right-12 flex items-center gap-2">
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(file)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare(file)}
                className="gap-2"
              >
                <Share className="w-4 h-4" />
                Share
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(file.url, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </Button>
          </div>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {/* Preview content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {renderPreviewContent()}
          </ScrollArea>
        </div>

        {/* File metadata */}
        {file.metadata && Object.keys(file.metadata).length > 0 && (
          <>
            <Separator className="flex-shrink-0" />
            <div className="flex-shrink-0 p-4 bg-muted/30">
              <h4 className="font-medium mb-2 text-sm">File Information</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {file.uploadedBy && (
                  <div>
                    <span className="font-medium">Uploaded by:</span> {file.uploadedBy}
                  </div>
                )}
                {file.uploadedAt && (
                  <div>
                    <span className="font-medium">Uploaded:</span> {new Date(file.uploadedAt).toLocaleDateString()}
                  </div>
                )}
                {file.metadata.pages && (
                  <div>
                    <span className="font-medium">Pages:</span> {file.metadata.pages}
                  </div>
                )}
                <div>
                  <span className="font-medium">Type:</span> {file.type}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FilePreviewModal;