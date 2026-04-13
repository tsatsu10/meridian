import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { formatDistanceToNow } from 'date-fns';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  description?: string;
  version: string;
  parentId?: string;
  userEmail: string;
  createdAt: string;
}

interface VersionHistoryProps {
  attachments: Attachment[];
  currentAttachmentId: string;
  onVersionSelect?: (attachment: Attachment) => void;
  onClose: () => void;
  className?: string;
}

// @epic-2.1-files: Version history component
export function VersionHistory({
  attachments,
  currentAttachmentId,
  onVersionSelect,
  onClose,
  className
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string>(currentAttachmentId);

  // Group attachments by version family
  const currentAttachment = attachments.find(a => a.id === currentAttachmentId);
  const parentId = currentAttachment?.parentId || currentAttachmentId;
  
  // Get all versions of this file (including the original)
  const versions = attachments.filter(a => 
    a.id === parentId || a.parentId === parentId
  ).sort((a, b) => parseFloat(b.version) - parseFloat(a.version));

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleVersionSelect = (attachment: Attachment) => {
    setSelectedVersion(attachment.id);
    onVersionSelect?.(attachment);
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
        className
      )}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Version History
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            <div className="w-4 h-4 flex items-center justify-center text-gray-500 font-bold">✕</div>
          </Button>
        </div>

        {/* Version List */}
        <div className="flex-1 overflow-y-auto p-4">
          {versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedVersion === version.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                  onClick={() => handleVersionSelect(version)}
                >
                  {/* Version Badge */}
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 
                        ? "bg-green-500 text-white" 
                        : "bg-gray-500 text-white"
                    )}>
                      v{version.version}
                    </div>
                  </div>

                  {/* Version Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {version.name}
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full">
                            Latest
                          </span>
                        )}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(version.size)}
                      </span>
                    </div>

                    {version.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {version.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Uploaded by {version.userEmail.split('@')[0]} • {' '}
                        {formatDistanceToNow(new Date(version.createdAt))} ago
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(version);
                      }}
                      className="text-xs"
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{versions.length} version{versions.length !== 1 ? 's' : ''} available</span>
            {selectedVersion !== currentAttachmentId && (
              <Button
                size="sm"
                onClick={() => {
                  const selected = versions.find(v => v.id === selectedVersion);
                  if (selected) {
                    onVersionSelect?.(selected);
                    onClose();
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Use This Version
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionHistory; 