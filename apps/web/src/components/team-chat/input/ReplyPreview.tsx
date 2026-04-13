// Reply Preview - Shows which message is being replied to

import React from 'react';
import { Button } from '@/components/ui/button';
import { Reply, X } from 'lucide-react';
import { useChatActions } from '../context/ChatContext';
import type { TeamMessage } from '../types';

interface ReplyPreviewProps {
  message: TeamMessage;
}

/**
 * ReplyPreview - Displays preview of message being replied to
 */
export function ReplyPreview({ message }: ReplyPreviewProps) {
  const { setReplyTo } = useChatActions();

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
        <Reply className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <span className="font-medium text-foreground">
          Replying to {message.authorName || message.userEmail}
        </span>
        <span className="text-muted-foreground truncate">
          {message.content.substring(0, 50)}
          {message.content.length > 50 && '...'}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setReplyTo(null)}
        className="h-6 w-6 p-0 flex-shrink-0"
        aria-label="Cancel reply"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

