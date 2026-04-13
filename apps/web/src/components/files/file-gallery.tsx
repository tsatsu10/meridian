/**
 * File Gallery Component
 * Display and manage uploaded files
 * Phase 0 - Day 4 Implementation
 */

import { useState, useEffect } from 'react';
import { Download, Trash2, ExternalLink, Image, Video, File, FileText, MoreVertical } from 'lucide-react';

interface FileItem {
  id: string;
  fileName: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: string;
}

interface FileGalleryProps {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  onFileDelete?: (fileId: string) => void;
  viewMode?: 'grid' | 'list';
}

export function FileGallery({
  workspaceId,
  projectId,
  taskId,
  onFileDelete,
  viewMode = 'grid',
}: FileGalleryProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let url = `/api/files/workspace/${workspaceId}`;
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (taskId) params.append('taskId', taskId);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [workspaceId, projectId, taskId]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (onFileDelete) onFileDelete(fileId);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button
          onClick={fetchFiles}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
        <p className="text-gray-600 dark:text-gray-400">No files yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Upload files to get started
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative">
              {file.thumbnailUrl ? (
                <img
                  src={file.thumbnailUrl}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 dark:text-gray-500">
                  {getFileIcon(file.mimeType)}
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => window.open(file.url, '_blank')}
                  className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="View"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* File Info */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={file.originalName}>
                {file.originalName}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(file.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            {/* Thumbnail/Icon */}
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
              {file.thumbnailUrl ? (
                <img
                  src={file.thumbnailUrl}
                  alt={file.originalName}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-gray-400 dark:text-gray-500">
                  {getFileIcon(file.mimeType)}
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {file.originalName}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(file.createdAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(file.url, '_blank')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="View"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownload(file)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(file.id)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

