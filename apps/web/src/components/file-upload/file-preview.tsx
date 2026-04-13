import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { FileAnnotations } from './file-annotations';

interface FilePreviewProps {
  attachment: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  onClose: () => void;
  className?: string;
}

// @epic-2.1-files: Enhanced file preview component with annotations
export function FilePreview({ attachment, onClose, className }: FilePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');
  const isPDF = attachment.type === 'application/pdf';
  const isText = attachment.type.startsWith('text/') || attachment.type.includes('json');

  // For unsupported file types, don't show loading
  const isUnsupportedType = !isImage && !isVideo && !isAudio && !isPDF && !isText;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadSuccess = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleLoadError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const renderPreview = () => {
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl mb-4">
            ⚠️
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to load preview</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">The file could not be previewed</p>
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
            Download File
          </Button>
        </div>
      );
    }

    if (isImage) {
      return (
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-w-full max-h-full object-contain rounded-lg"
          onLoad={handleLoadSuccess}
          onError={handleLoadError}
        />
      );
    }

    if (isVideo) {
      return (
        <video
          src={attachment.url}
          controls
          className="max-w-full max-h-full rounded-lg"
          onLoadedData={handleLoadSuccess}
          onError={handleLoadError}
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    if (isAudio) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl mb-4">
            🎵
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{attachment.name}</h3>
          <audio
            src={attachment.url}
            controls
            className="w-full max-w-md"
            onLoadedData={handleLoadSuccess}
            onError={handleLoadError}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    if (isPDF) {
      return (
        <iframe
          src={`${attachment.url}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-600"
          title={attachment.name}
          onLoad={handleLoadSuccess}
          onError={handleLoadError}
        />
      );
    }

    if (isText) {
      return (
        <iframe
          src={attachment.url}
          className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white"
          title={attachment.name}
          onLoad={handleLoadSuccess}
          onError={handleLoadError}
        />
      );
    }

    // Fallback for unsupported file types
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-16 h-16 bg-gray-500 rounded-lg flex items-center justify-center text-white text-2xl mb-4">
          📁
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{attachment.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Preview not available for this file type</p>
        <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
          Download File
        </Button>
      </div>
    );
  };

  // Set loading to false immediately for unsupported types
  useEffect(() => {
    if (isUnsupportedType) {
      setIsLoading(false);
    }
  }, [isUnsupportedType]);

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4",
        className
      )}
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {attachment.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {attachment.type} • {(attachment.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className="text-xs"
            >
              💬 {showAnnotations ? 'Hide' : 'Show'} Comments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs"
            >
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              <div className="w-4 h-4 flex items-center justify-center text-gray-500 font-bold">✕</div>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview Content */}
          <div className={cn("flex-1 p-4 overflow-hidden", showAnnotations && "border-r border-gray-200 dark:border-gray-700")}>
            {isLoading && !isUnsupportedType && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <div className={cn("h-full flex items-center justify-center", isLoading && !isUnsupportedType && "hidden")}>
              {renderPreview()}
            </div>
          </div>

          {/* Annotations Panel */}
          {showAnnotations && (
            <div className="w-96 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
              <FileAnnotations 
                attachmentId={attachment.id}
                className="p-4 h-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilePreview; 