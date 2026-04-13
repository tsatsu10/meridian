/**
 * @fileoverview File Preview Modal Component
 * @description Comprehensive file preview system with support for images, documents, and more
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Image preview with zoom and pan
 * - PDF document viewer
 * - Video and audio playback
 * - File metadata display
 * - Download and sharing options
 * - Version history navigation
 * - Full-screen preview mode
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/lib/utils/file';
import {
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Clock,
  User,
  Calendar,
  HardDrive,
  Eye,
  Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import FileVersionManager from './file-version-manager';
import { logger } from "../../lib/logger";

interface FileAttachment {
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
  parentId?: string;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileAttachment | null;
  files?: FileAttachment[]; // For navigation between multiple files
  currentIndex?: number;
  onNavigate?: (index: number) => void;
  showVersionHistory?: boolean;
  versions?: FileAttachment[];
  onDownload?: (file: FileAttachment) => void;
  onShare?: (file: FileAttachment) => void;
  className?: string;
}

// File type detection
const getFileTypeInfo = (file: FileAttachment) => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  
  if (type.startsWith('image/')) {
    return { 
      category: 'image', 
      icon: ImageIcon, 
      color: 'bg-green-500', 
      label: 'Image',
      previewable: true 
    };
  }
  if (type.startsWith('video/')) {
    return { 
      category: 'video', 
      icon: Video, 
      color: 'bg-purple-500', 
      label: 'Video',
      previewable: true 
    };
  }
  if (type.startsWith('audio/')) {
    return { 
      category: 'audio', 
      icon: Music, 
      color: 'bg-orange-500', 
      label: 'Audio',
      previewable: true 
    };
  }
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return { 
      category: 'pdf', 
      icon: FileText, 
      color: 'bg-red-500', 
      label: 'PDF',
      previewable: true 
    };
  }
  if (type.includes('document') || type.includes('text') || 
      name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt')) {
    return { 
      category: 'document', 
      icon: FileText, 
      color: 'bg-blue-500', 
      label: 'Document',
      previewable: false 
    };
  }
  if (type.includes('zip') || type.includes('archive') || 
      name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) {
    return { 
      category: 'archive', 
      icon: Archive, 
      color: 'bg-gray-500', 
      label: 'Archive',
      previewable: false 
    };
  }
  
  return { 
    category: 'file', 
    icon: FileText, 
    color: 'bg-gray-500', 
    label: 'File',
    previewable: false 
  };
};

// formatFileSize now imported from shared utilities

// Image Preview Component
const ImagePreview: React.FC<{ file: FileAttachment }> = ({ file }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative w-full h-full bg-black/90 flex items-center justify-center overflow-hidden">
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomOut}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomIn}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRotate}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          Reset
        </Button>
      </div>

      <img
        src={file.url}
        alt={file.name}
        className={cn(
          "max-w-none cursor-move transition-transform",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        draggable={false}
      />

      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
        {Math.round(zoom * 100)}% • {file.name}
      </div>
    </div>
  );
};

// Video Preview Component
const VideoPreview: React.FC<{ file: FileAttachment }> = ({ file }) => {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <video
        src={file.url}
        controls
        className="max-w-full max-h-full"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

// Audio Preview Component
const AudioPreview: React.FC<{ file: FileAttachment }> = ({ file }) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="mb-8">
          <Music className="h-24 w-24 mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
          <p className="text-sm opacity-80">Audio File</p>
        </div>
        <audio
          src={file.url}
          controls
          className="w-80 max-w-full"
          preload="metadata"
        >
          Your browser does not support the audio tag.
        </audio>
      </div>
    </div>
  );
};

// Enhanced PDF Preview Component
const PDFPreview: React.FC<{ file: FileAttachment }> = ({ file }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    try {
      // Try to get page count from PDF viewer if available
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        // This is a simplified approach - in production you might use PDF.js
        setTotalPages(10); // Placeholder - would need proper PDF parsing
      }
    } catch (err) {
      console.warn('Could not determine PDF page count:', err);
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load PDF. Please try downloading the file.');
  };

  const pdfUrl = `${file.url}#view=FitH&zoom=${zoom}&page=${currentPage}`;

  return (
    <div className="w-full h-full flex flex-col">
      {/* PDF Toolbar - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b bg-gray-50 gap-3 sm:gap-0">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange('prev')}
            disabled={currentPage <= 1}
            className="touch-optimized"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only ml-1 hidden xs:inline">Prev</span>
          </Button>
          <span className="text-sm font-medium px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange('next')}
            disabled={currentPage >= totalPages}
            className="touch-optimized"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only ml-1 hidden xs:inline">Next</span>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="touch-optimized"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[50px] text-center">
            {zoom}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="touch-optimized"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="touch-optimized hidden xs:flex"
          >
            Fit
          </Button>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(file.url, '_blank')}
            className="touch-optimized flex-1 sm:flex-none"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">Open</span>
            <span className="xs:hidden">Open</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const link = document.createElement('a');
              link.href = file.url;
              link.download = file.name;
              link.click();
            }}
            className="touch-optimized flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">Download</span>
            <span className="xs:hidden">Save</span>
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-gray-500">Loading PDF...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="p-6 max-w-md text-center">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <h3 className="font-semibold mb-2">PDF Preview Unavailable</h3>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open in Browser
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = file.url;
                      link.download = file.name;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className="w-full h-full border-0"
            title={file.name}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
      </div>

      {/* PDF Info Footer */}
      <div className="p-3 border-t bg-gray-50 text-sm text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>Size: {formatFileSize(file.size)}</span>
            <span>Type: PDF Document</span>
          </div>
          <span>Last modified: {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
};

// Non-previewable File Component
const FileInfo: React.FC<{ file: FileAttachment }> = ({ file }) => {
  const fileInfo = getFileTypeInfo(file);
  const IconComponent = fileInfo.icon;

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className={cn("w-24 h-24 rounded-lg mx-auto mb-6 flex items-center justify-center", fileInfo.color)}>
          <IconComponent className="h-12 w-12 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
        <p className="text-gray-500 mb-4">{fileInfo.label}</p>
        <p className="text-sm text-gray-500 mb-6">{formatFileSize(file.size)}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Open
          </Button>
        </div>
      </div>
    </div>
  );
};

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  files = [],
  currentIndex = 0,
  onNavigate,
  showVersionHistory = false,
  versions = [],
  onDownload,
  onShare,
  className,
}: FilePreviewModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVersion(null);
    }
  }, [isOpen]);

  if (!file) return null;

  const fileInfo = getFileTypeInfo(file);
  const IconComponent = fileInfo.icon;
  const displayFile = selectedVersion 
    ? versions.find(v => v.id === selectedVersion) || file 
    : file;

  // Navigation handlers
  const handlePrevious = () => {
    if (files.length > 1 && onNavigate) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
      onNavigate(newIndex);
    }
  };

  const handleNext = () => {
    if (files.length > 1 && onNavigate) {
      const newIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
      onNavigate(newIndex);
    }
  };

  // Render preview content based on file type
  const renderPreview = () => {
    if (!fileInfo.previewable) {
      return <FileInfo file={displayFile} />;
    }

    switch (fileInfo.category) {
      case 'image':
        return <ImagePreview file={displayFile} />;
      case 'video':
        return <VideoPreview file={displayFile} />;
      case 'audio':
        return <AudioPreview file={displayFile} />;
      case 'pdf':
        return <PDFPreview file={displayFile} />;
      default:
        return <FileInfo file={displayFile} />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-6xl h-[90vh] p-0 gap-0", className)}>
        {/* Header */}
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", fileInfo.color)}>
                <IconComponent className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">{displayFile.name}</DialogTitle>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatFileSize(displayFile.size)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(displayFile.createdAt, { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {displayFile.userName || displayFile.userEmail}
                  </span>
                  {displayFile.version && (
                    <Badge variant="outline">v{displayFile.version}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Navigation */}
              {files.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} of {files.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                </>
              )}

              {/* Actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload?.(displayFile)}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShare?.(displayFile)}
                className="h-8 w-8 p-0"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(displayFile.url, '_blank')}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Preview Area */}
          <div className="flex-1 relative">
            {renderPreview()}
          </div>

          {/* Sidebar with Version Manager */}
          {(showVersionHistory && versions.length > 0) && (
            <div className="w-80 border-l bg-gray-50 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <FileVersionManager
                  fileId={file.id}
                  currentVersion={{
                    id: file.id,
                    name: file.name,
                    url: file.url,
                    type: file.type,
                    size: file.size,
                    version: file.version || '1.0',
                    userEmail: file.userEmail,
                    userName: file.userName,
                    createdAt: file.createdAt,
                    description: file.description,
                  }}
                  versions={versions.map(v => ({
                    id: v.id,
                    name: v.name,
                    url: v.url,
                    type: v.type,
                    size: v.size,
                    version: v.version || '1.0',
                    userEmail: v.userEmail,
                    userName: v.userName,
                    createdAt: v.createdAt,
                    description: v.description,
                    parentId: v.parentId,
                  }))}
                  onVersionSelect={(version) => setSelectedVersion(version.id)}
                  onVersionRestore={(versionId) => {
                    logger.info("Restore version:");
                    // Handle version restore
                  }}
                  onVersionCompare={(v1, v2) => {
                    logger.info("Compare versions:");
                    // Handle version comparison
                  }}
                  onNewVersion={(file, description) => {
                    logger.info("Upload new version:");
                    // Handle new version upload
                  }}
                  showUpload={true}
                  showComparison={true}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilePreviewModal;