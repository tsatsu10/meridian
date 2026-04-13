// Message Item - Individual message display component

import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Reply } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MessageActions } from './MessageActions';
import { MessageReactions } from './MessageReactions';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { formatMessageTime } from '../utils/timeFormatter';
import { formatTextWithMentions } from '../utils/messageFormatter';
import type { TeamMessage } from '../types';

interface MessageItemProps {
  message: TeamMessage;
}

/**
 * MessageItem - Displays a single message with actions and reactions
 * 
 * Memoized to prevent unnecessary re-renders.
 */
export const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
  const { user } = useAuth();
  const currentEmail = user?.email;
  const isOwnMessage = message.userEmail === currentEmail;
  const isAnnouncement = message.messageType === 'announcement';

  return (
    <div
      data-message-id={message.id}
      className={cn(
        'group flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2'
        // Don't reverse - keep all messages left-aligned
      )}
    >
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          {(message.authorName?.charAt(0) || message.userEmail.charAt(0)).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 space-y-1">
        {/* Message Header */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground">
            {message.authorName || message.userEmail}
          </span>
          <span className="text-muted-foreground">
            {formatMessageTime(message.createdAt)}
          </span>
          {isAnnouncement && (
            <Badge variant="secondary" className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100 border-orange-300">
              <Megaphone className="w-3 h-3 mr-1" />
              📢 Team Announcement
            </Badge>
          )}
          {message.isEdited && (
            <span className="text-muted-foreground italic">(edited)</span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-lg p-3 text-sm transition-colors max-w-[85%]',
            isAnnouncement
              ? 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-2 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100 shadow-md'
              : isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          {/* Reply Preview */}
          {message.replyTo && (
            <div className="mb-2 p-2 rounded bg-black/10 dark:bg-white/10 text-xs border-l-2 border-primary/50">
              <div className="flex items-center gap-1 mb-1 opacity-75">
                <Reply className="w-3 h-3" />
                <span className="font-medium">
                  Replying to {(message.metadata as any)?.replyToAuthor || 'someone'}:
                </span>
              </div>
              <div className="line-clamp-2 opacity-90 italic">
                "{(message.metadata as any)?.replyToContent || 'Previous message'}"
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className="whitespace-pre-wrap break-words">
            {formatTextWithMentions(message.content, user?.userEmail)}
          </div>

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <MessageReactions 
              messageId={message.id}
              reactions={message.reactions} 
            />
          )}
        </div>

        {/* Message Actions (Reply, Edit, Delete, React) */}
        <MessageActions message={message} isOwnMessage={isOwnMessage} />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if message changed
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.reactions.length === nextProps.message.reactions.length &&
    prevProps.message.isEdited === nextProps.message.isEdited &&
    prevProps.message.updatedAt === nextProps.message.updatedAt
  );
});

