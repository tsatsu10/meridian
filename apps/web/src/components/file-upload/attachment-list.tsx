import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { formatDistanceToNow } from 'date-fns';
import FilePreview from './file-preview';
import VersionHistory from './version-history';

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

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: { name?: string; description?: string }) => void;
  onNewVersion?: (id: string, file: File) => void;
  className?: string;
  isLoading?: boolean;
}

// @epic-2.1-files: File type icons and validation
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) {
    return <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">📷</div>;
  }
  if (type.startsWith('video/')) {
    return <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">🎬</div>;
  }
  if (type.startsWith('audio/')) {
    return <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">🎵</div>;
  }
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) {
    return <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">📄</div>;
  }
  return <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">📁</div>;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isImageFile = (type: string) => type.startsWith('image/');

// @epic-2.1-files: Attachment list component with preview and management
export function AttachmentList({
  attachments,
  onDelete,
  onUpdate,
  onNewVersion,
  className,
  isLoading
}: AttachmentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [versionHistoryAttachment, setVersionHistoryAttachment] = useState<Attachment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Ensure attachments is always an array
  const safeAttachments = Array.isArray(attachments) ? attachments : [];

  // Early error handling - if attachments is not an array, show error state
  if (attachments !== undefined && attachments !== null && !Array.isArray(attachments)) {
    console.error('AttachmentList received non-array attachments:', attachments);
    return (
      <div className={cn("text-center py-8 text-red-500 dark:text-red-400", className)}>
        <div className="w-12 h-12 mx-auto mb-3 bg-red-200 dark:bg-red-700 rounded-lg flex items-center justify-center text-xl">⚠️</div>
        <p className="text-sm">Error loading attachments</p>
        <p className="text-xs mt-1">Expected array, received: {typeof attachments}</p>
      </div>
    );
  }

  const handleEdit = (attachment: Attachment) => {
    setEditingId(attachment.id);
    setEditName(attachment.name);
    setEditDescription(attachment.description || '');
  };

  const handleSaveEdit = () => {
    if (editingId && onUpdate) {
      onUpdate(editingId, {
        name: editName,
        description: editDescription,
      });
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewVersion = (attachment: Attachment) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = attachment.type;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onNewVersion) {
        onNewVersion(attachment.id, file);
      }
    };
    input.click();
  };

  // @epic-2.1-files: Filter and search attachments
  const filteredAttachments = useMemo(() => {
    let filtered = safeAttachments;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(attachment => {
        switch (filterType) {
          case 'images':
            return attachment.type.startsWith('image/');
          case 'documents':
            return attachment.type.includes('pdf') || attachment.type.includes('document') || attachment.type.includes('text');
          case 'videos':
            return attachment.type.startsWith('video/');
          case 'audio':
            return attachment.type.startsWith('audio/');
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(attachment =>
        attachment.name.toLowerCase().includes(query) ||
        attachment.description?.toLowerCase().includes(query) ||
        attachment.userEmail.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [safeAttachments, filterType, searchQuery]);
  
  if (safeAttachments.length === 0) {
    if (isLoading) {
      return (
        <div className={cn("text-center py-8 text-gray-500 dark:text-gray-400", className)}>
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 bg-gray-400 dark:bg-gray-500 rounded animate-spin">⏳</div>
          </div>
          <p className="text-sm">Loading attachments...</p>
        </div>
      );
    }
    
    return (
      <div className={cn("text-center py-8 text-gray-500 dark:text-gray-400", className)}>
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xl">📎</div>
        <p className="text-sm">No attachments yet</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* @epic-2.1-files: Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search files by name, description, or uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-shrink-0">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Files</option>
            <option value="images">Images</option>
            <option value="documents">Documents</option>
            <option value="videos">Videos</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      {(searchQuery || filterType !== 'all') && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAttachments.length} of {safeAttachments.length} files
          {searchQuery && ` matching "${searchQuery}"`}
          {filterType !== 'all' && ` (${filterType})`}
        </div>
      )}

      <div className="space-y-3">
        {filteredAttachments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xl">📎</div>
            <p className="text-sm">
              {searchQuery || filterType !== 'all' ? 'No attachments match your filters' : 'No attachments yet'}
            </p>
            {(searchQuery || filterType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 mt-2"
              >
                Clear filters
              </button>
            )}
                </div>
        ) : (
          filteredAttachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
        >
          {/* File Icon */}
          <div className="flex-shrink-0">
            {getFileIcon(attachment.type)}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            {editingId === attachment.id ? (
              // Edit Mode
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="File name"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Description (optional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {attachment.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>v{attachment.version}</span>
                    <span>•</span>
                    <span>{formatFileSize(attachment.size)}</span>
                  </div>
                </div>

                {attachment.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {attachment.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Uploaded by {attachment.userEmail.split('@')[0]} • {' '}
                    {formatDistanceToNow(new Date(attachment.createdAt))} ago
                  </span>
                </div>

                {/* File Preview */}
                {isImageFile(attachment.type) && (
                  <div className="mt-3">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-w-xs max-h-32 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewAttachment(attachment)}
                    />
                  </div>
                )}
                
                {/* Preview Button for Non-Images */}
                {!isImageFile(attachment.type) && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewAttachment(attachment)}
                      className="text-xs"
                    >
                      Preview
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {editingId !== attachment.id && (
            <div className="flex-shrink-0 flex flex-col gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(attachment)}
                className="text-xs"
              >
                Download
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(attachment)}
                className="text-xs"
              >
                Edit
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleNewVersion(attachment)}
                className="text-xs"
              >
                New Version
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVersionHistoryAttachment(attachment)}
                className="text-xs"
              >
                History
              </Button>
              
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(attachment.id)}
                  className="text-xs text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
          ))
        )}
      </div>

      {/* Enhanced File Preview Modal */}
      {previewAttachment && (
        <FilePreview
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Version History Modal */}
      {versionHistoryAttachment && (
        <VersionHistory
          attachments={safeAttachments}
          currentAttachmentId={versionHistoryAttachment.id}
          onVersionSelect={(version) => {
            // Could trigger a callback to parent component
          }}
          onClose={() => setVersionHistoryAttachment(null)}
        />
      )}
    </div>
  );
}

export default AttachmentList; 