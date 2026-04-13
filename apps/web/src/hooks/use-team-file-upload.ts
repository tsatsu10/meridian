// Phase 2: File Upload Frontend Hooks
// Complete file management system for team messaging

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from '@/lib/toast';
import { fetchApi } from "@/lib/fetch";
import { useCallback, useState } from "react";
import { formatFileSize } from '@/lib/utils/file';

// Types
export interface TeamFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  messageContent: string;
  messageId: string;
  downloadUrl: string;
  previewUrl?: string;
}

export interface FileUploadData {
  teamId: string;
  file: File;
  messageContent?: string;
}

export interface FilesResponse {
  success: boolean;
  data: {
    files: TeamFile[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed',
  'video/mp4', 'video/quicktime',
  'audio/mpeg', 'audio/wav',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Hook for uploading team files
export function useUploadTeamFile() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  return useMutation({
    mutationFn: async (data: FileUploadData) => {
      const { teamId, file, messageContent } = data;

      // Validate file
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed`);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of 50MB`);
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', teamId);
      if (messageContent) {
        formData.append('messageContent', messageContent);
      }

      // Track upload progress
      const uploadId = `${teamId}-${Date.now()}`;
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/team/${teamId}/files`, {
          method: 'POST',
          body: formData});

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        
        // Clear upload progress
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[uploadId];
          return updated;
        });

        return result;
      } catch (error) {
        // Clear upload progress on error
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[uploadId];
          return updated;
        });
        throw error;
      }
    },
    onSuccess: (result, variables) => {
      // Invalidate team messages to show new file message
      queryClient.invalidateQueries({ queryKey: ["team-messages", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-files", variables.teamId] });
      
      toast.success(`File "${result.data.attachment.fileName}" uploaded successfully`);
    },
    onError: (error: any) => {
      console.error("Failed to upload file:", error);
      toast.error(error.message || "Failed to upload file");
    }
  });
}

// Hook for getting team files
export function useTeamFiles(
  teamId: string,
  options: {
    page?: number;
    limit?: number;
    category?: string;
    enabled?: boolean;
  } = {}
) {
  const { page = 1, limit = 20, category, enabled = true } = options;

  return useQuery({
    queryKey: ["team-files", teamId, { page, limit, category }],
    queryFn: async (): Promise<FilesResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (category) {
        params.append('category', category);
      }

      const response = await fetchApi(`/team/${teamId}/files?${params}`);
      return response;
    },
    enabled: enabled && !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for file download
export function useDownloadFile() {
  return useCallback(async (attachmentId: string, fileName: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/team/files/${attachmentId}/download`,
        {}
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`File "${fileName}" downloaded`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  }, []);
}

// Hook for file validation
export function useFileValidation() {
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type "${file.type}" is not allowed`
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of 50MB`
      };
    }

    return { isValid: true };
  }, []);

  const getFileCategory = useCallback((mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
    if (mimeType.includes('zip')) return 'archive';
    return 'other';
  }, []);

  return {
    validateFile,
    getFileCategory,
    formatFileSize,
    allowedTypes: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE
  };
}

// Hook for drag and drop file handling
export function useFileDrop(onFilesDropped: (files: File[]) => void) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFilesDropped(droppedFiles);
    }
  }, [onFilesDropped]);

  return {
    isDragOver,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  };
}

// Hook for real-time file events
export function useTeamFileEvents(teamId: string, onFileEvent?: (event: any) => void) {
  // This would integrate with the WebSocket system
  // For now, we'll use React Query invalidation as a fallback
  
  const queryClient = useQueryClient();

  const handleFileUploaded = useCallback((data: any) => {
    // Invalidate queries to refresh file list
    queryClient.invalidateQueries({ queryKey: ["team-files", teamId] });
    queryClient.invalidateQueries({ queryKey: ["team-messages", teamId] });
    
    // Show notification
    toast.success(`${data.userEmail} uploaded: ${data.fileName}`);
    
    // Call custom handler if provided
    onFileEvent?.(data);
  }, [teamId, queryClient, onFileEvent]);

  const handleFileDeleted = useCallback((data: any) => {
    // Invalidate queries to refresh file list
    queryClient.invalidateQueries({ queryKey: ["team-files", teamId] });
    
    // Show notification
    toast.info(`File "${data.fileName}" was deleted`);
    
    // Call custom handler if provided
    onFileEvent?.(data);
  }, [teamId, queryClient, onFileEvent]);

  // TODO: Connect to actual WebSocket events when available
  // useEffect(() => {
  //   const socket = getWebSocketConnection();
  //   socket.on('file:uploaded', handleFileUploaded);
  //   socket.on('file:deleted', handleFileDeleted);
  //   
  //   return () => {
  //     socket.off('file:uploaded', handleFileUploaded);
  //     socket.off('file:deleted', handleFileDeleted);
  //   };
  // }, [handleFileUploaded, handleFileDeleted]);

  return {
    handleFileUploaded,
    handleFileDeleted
  };
}