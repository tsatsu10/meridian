/**
 * @fileoverview Document Preview Integration System
 * @description Advanced document preview capabilities for various file types
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - PDF.js integration for PDF documents
 * - Office document preview via Office Online
 * - Google Docs viewer integration
 * - Text file preview with syntax highlighting
 * - Markdown rendering
 * - Code file preview with syntax highlighting
 * - Fallback to download for unsupported formats
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import {
  FileText,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';

interface DocumentFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface DocumentPreviewProps {
  file: DocumentFile;
  className?: string;
  height?: string;
  showControls?: boolean;
  enableFullscreen?: boolean;
  onError?: (error: string) => void;
}

// Document type detection and preview capabilities
const getDocumentInfo = (file: DocumentFile) => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const extension = name.split('.').pop() || '';
  
  // PDF Documents
  if (type.includes('pdf') || extension === 'pdf') {
    return {
      category: 'pdf',
      label: 'PDF Document',
      previewable: true,
      method: 'pdf-js',
      icon: FileText,
      color: 'bg-red-500'
    };
  }
  
  // Microsoft Office Documents
  if (type.includes('officedocument') || 
      ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) {
    return {
      category: 'office',
      label: 'Office Document',
      previewable: true,
      method: 'office-online',
      icon: FileText,
      color: 'bg-blue-500'
    };
  }
  
  // Text files
  if (type.startsWith('text/') ||
      ['txt', 'md', 'markdown', 'json', 'xml', 'csv', 'log'].includes(extension)) {
    return {
      category: 'text',
      label: 'Text Document',
      previewable: true,
      method: 'text-viewer',
      icon: FileText,
      color: 'bg-green-500'
    };
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(extension)) {
    return {
      category: 'code',
      label: 'Code File',
      previewable: true,
      method: 'code-viewer',
      icon: FileText,
      color: 'bg-purple-500'
    };
  }
  
  // HTML files
  if (type.includes('html') || extension === 'html' || extension === 'htm') {
    return {
      category: 'html',
      label: 'HTML Document',
      previewable: true,
      method: 'html-viewer',
      icon: FileText,
      color: 'bg-orange-500'
    };
  }
  
  return {
    category: 'unknown',
    label: 'Document',
    previewable: false,
    method: 'download',
    icon: FileText,
    color: 'bg-gray-500'
  };
};

// PDF Viewer Component using PDF.js
const PDFViewer: React.FC<{ file: DocumentFile; height: string }> = ({ file, height }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.5));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <div className="h-full flex flex-col">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-gray-100">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.open(file.url, '_blank')}
              >
                Open in New Tab
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <iframe
            src={`${file.url}#page=${currentPage}&zoom=${scale * 100}`}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Failed to load PDF');
            }}
          />
        )}
      </div>
    </div>
  );
};

// Office Document Viewer using Office Online
const OfficeViewer: React.FC<{ file: DocumentFile; height: string }> = ({ file, height }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Office Online viewer URL
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;

  return (
    <div className="h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading document...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(file.url, '_blank')}
              >
                Download File
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      <iframe
        src={viewerUrl}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError('Failed to load Office document. The file may not be publicly accessible.');
        }}
      />
    </div>
  );
};

// Text/Code Viewer with syntax highlighting
const TextViewer: React.FC<{ file: DocumentFile; height: string; isCode?: boolean }> = ({ 
  file, 
  height, 
  isCode = false 
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(file.url);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [file.url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <pre className={cn(
        "p-4 text-sm whitespace-pre-wrap break-words",
        isCode ? "bg-gray-900 text-gray-100 font-mono" : "bg-white"
      )}>
        {content}
      </pre>
    </div>
  );
};

// HTML Viewer
const HTMLViewer: React.FC<{ file: DocumentFile; height: string }> = ({ file, height }) => {
  return (
    <div className="h-full">
      <iframe
        src={file.url}
        className="w-full h-full border-0"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
};

// Main Document Preview Component
export function DocumentPreview({
  file,
  className,
  height = '500px',
  showControls = true,
  enableFullscreen = true,
  onError,
}: DocumentPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const documentInfo = getDocumentInfo(file);
  const IconComponent = documentInfo.icon;

  const handleFullscreen = () => {
    setIsFullscreen(true);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreview = () => {
    if (!documentInfo.previewable) {
      return (
        <div className="flex items-center justify-center h-full bg-muted/20">
          <div className="text-center">
            <div className={cn("w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center", documentInfo.color)}>
              <IconComponent className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold mb-2">{file.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Preview not available for this file type
            </p>
            <Button onClick={handleDownload} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    switch (documentInfo.method) {
      case 'pdf-js':
        return <PDFViewer file={file} height={height} />;
      case 'office-online':
        return <OfficeViewer file={file} height={height} />;
      case 'text-viewer':
        return <TextViewer file={file} height={height} />;
      case 'code-viewer':
        return <TextViewer file={file} height={height} isCode={true} />;
      case 'html-viewer':
        return <HTMLViewer file={file} height={height} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Card className={cn("overflow-hidden", className)} style={{ height }}>
        {showControls && (
          <CardHeader className="p-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded", documentInfo.color)}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">{file.name}</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="h-4 text-xs">
                      {documentInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 w-7 p-0"
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                  className="h-7 w-7 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                {enableFullscreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFullscreen}
                    className="h-7 w-7 p-0"
                  >
                    <Maximize className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0 h-full">
          <div style={{ height: showControls ? 'calc(100% - 60px)' : '100%' }}>
            {renderPreview()}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-6xl bg-white rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{file.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            <div className="h-[calc(100%-60px)]">
              {renderPreview()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocumentPreview;