// File Attachment List - Shows files to be uploaded

import React from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X } from 'lucide-react';
import { useChatActions } from '../context/ChatContext';
import { formatFileSize } from '@/lib/utils/file';

interface FileAttachmentListProps {
  files: File[];
}

/**
 * FileAttachmentList - Displays selected files before upload
 */
export function FileAttachmentList({ files }: FileAttachmentListProps) {
  const { removeFile } = useChatActions();

  if (files.length === 0) return null;

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Files to upload ({files.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Remove all files
            files.forEach((_, index) => removeFile(index));
          }}
          className="h-6 px-2 text-xs"
        >
          Clear all
        </Button>
      </div>

      <div className="space-y-1">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between bg-background rounded p-2"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} • {file.type.split('/')[0] || 'file'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFile(index)}
              className="h-6 w-6 p-0 flex-shrink-0"
              aria-label={`Remove ${file.name}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

