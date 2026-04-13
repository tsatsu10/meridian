// @epic-3.6-communication: Message item component with thread support
import React, { useState } from 'react';
import { MessageSquare, Reply, MoreHorizontal, Pin, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    messageType: 'text' | 'file' | 'system' | 'thread_reply';
    userEmail: string;
    userName?: string;
    parentMessageId?: string;
    mentions?: string;
    reactions?: string;
    attachments?: string;
    isEdited?: boolean;
    editedAt?: Date;
    isPinned?: boolean;
    createdAt: Date;
    // Thread UI fields
    threadMessageCount?: number;
    threadParticipantCount?: number;
    threadLastReplyAt?: Date;
    threadPreview?: string;
    threadStatus?: 'open' | 'resolved' | 'archived';
  };
  currentUserEmail: string;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onThread?: (messageId: string) => void;
  className?: string;
}

export default function MessageItem({
  message,
  currentUserEmail,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onThread,
  className
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  const isOwnMessage = message.userEmail === currentUserEmail;
  const hasThread = message.threadMessageCount && message.threadMessageCount > 0;

  return (
    <div
      className={cn(
        "group relative p-4 hover:bg-muted/50 transition-colors",
        isOwnMessage && "bg-muted/20",
        message.isPinned && "bg-yellow-50 border-l-4 border-l-yellow-400",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin indicator */}
      {message.isPinned && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            <Pin className="w-3 h-3 mr-1" />
            Pinned
          </Badge>
        </div>
      )}

      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-sm">
            {message.userName?.charAt(0) || message.userEmail.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">{message.userName || message.userEmail}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {message.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
            {message.messageType === 'thread_reply' && (
              <Badge variant="outline" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                Reply
              </Badge>
            )}
          </div>

          <div 
            className="text-sm mb-2"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          {/* Thread indicator */}
          {hasThread && (
            <div 
              className="flex items-center space-x-2 p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onThread?.(message.id)}
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{message.threadMessageCount} replies</span>
                  <span>•</span>
                  <span>{message.threadParticipantCount} participants</span>
                  {message.threadLastReplyAt && (
                    <>
                      <span>•</span>
                      <span>Last reply {formatDistanceToNow(new Date(message.threadLastReplyAt), { addSuffix: true })}</span>
                    </>
                  )}
                </div>
                {message.threadPreview && (
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {message.threadPreview}
                  </div>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={cn("text-xs", {
                  'bg-green-100 text-green-800 border-green-200': message.threadStatus === 'resolved',
                  'bg-gray-100 text-gray-800 border-gray-200': message.threadStatus === 'archived',
                  'bg-blue-100 text-blue-800 border-blue-200': message.threadStatus === 'open',
                })}
              >
                {message.threadStatus || 'open'}
              </Badge>
            </div>
          )}

          {/* Message actions */}
          {isHovered && (
            <div className="flex items-center space-x-1 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply?.(message.id)}
                className="h-6 px-2 text-xs"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
              
              {hasThread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onThread?.(message.id)}
                  className="h-6 px-2 text-xs"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Thread
                </Button>
              )}

              {isOwnMessage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(message.id)}>
                      <Edit className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete?.(message.id)}>
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {!isOwnMessage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                      <Pin className="w-3 h-3 mr-2" />
                      {message.isPinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 