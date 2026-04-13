// Message Actions - Reply, Edit, Delete, React buttons

import React from 'react';
import { Button } from '@/components/ui/button';
import { Reply, Edit, Trash2 } from 'lucide-react';
import { useChatActions, useChatState } from '../context/ChatContext';
import { EmojiPicker } from '../reactions/EmojiPicker';
import type { TeamMessage } from '../types';

interface MessageActionsProps {
  message: TeamMessage;
  isOwnMessage: boolean;
}

/**
 * MessageActions - Action buttons for messages
 * 
 * Shows on hover: Reply, React, Edit (own), Delete (own)
 */
export function MessageActions({ message, isOwnMessage }: MessageActionsProps) {
  const { ui } = useChatState();
  const actions = useChatActions();

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Reply (for all messages) */}
      {!isOwnMessage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => actions.setReplyTo(message)}
          className="h-7 px-2 text-xs"
          aria-label="Reply to message"
        >
          <Reply className="w-3 h-3 mr-1" />
          Reply
        </Button>
      )}

      {/* React (for all messages) */}
      <EmojiPicker
        onEmojiSelect={(emoji) => actions.addReaction(message.id, emoji)}
        open={ui.showEmojiPicker === message.id}
        onOpenChange={(open) => actions.showEmojiPicker(open ? message.id : null)}
      />

      {/* Edit (own messages only) */}
      {isOwnMessage && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.startEditingMessage(message.id, message.content)}
            className="h-7 px-2 text-xs hover:bg-primary/10"
            aria-label="Edit message"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>

          {/* Delete (own messages only) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.startDeletingMessage(message.id)}
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            aria-label="Delete message"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </>
      )}
    </div>
  );
}

