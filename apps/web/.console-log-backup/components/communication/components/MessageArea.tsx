// @epic-3.5-communication: Modular message area with threading and reactions
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  MessageSquare, 
  Pin, 
  Copy,
  Edit,
  Trash,
  Reply,
  Smile,
  Heart,
  ThumbsUp,
  Star
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Message } from "@/hooks/use-messages";
import { CommunicationPermissions } from "../MainCommunicationInterface";
import { formatDistanceToNow } from "date-fns";

interface MessageAreaProps {
  messages: Message[];
  channelId: string | null;
  threadId?: string | null;
  userPermissions: CommunicationPermissions;
  onSelectThread?: (threadId: string | null) => void;
  className?: string;
}

interface MessageItemProps {
  message: Message;
  userPermissions: CommunicationPermissions;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
}

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '😀', '🎉', '🚀', '👎'];

export function MessageArea({
  messages,
  channelId,
  threadId,
  userPermissions,
  onSelectThread,
  className
}: MessageAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setIsAtBottom(atBottom);
  };

  // Handle message actions
  const handleReply = (message: Message) => {
    onSelectThread?.(message.id);
  };

  const handleEdit = (message: Message) => {
    // Implement edit functionality
    console.log('Edit message:', message.id);
  };

  const handleDelete = (messageId: string) => {
    // Implement delete functionality
    console.log('Delete message:', messageId);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    // Implement reaction functionality
    console.log('React to message:', messageId, emoji);
  };

  const handlePin = (messageId: string) => {
    // Implement pin functionality
    console.log('Pin message:', messageId);
  };

  if (!channelId) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/20", className)}>
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Channel</h3>
          <p>Choose a channel from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isFirstInGroup = index === 0 || 
              messages[index - 1].userEmail !== message.userEmail ||
              (new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime()) > 5 * 60 * 1000; // 5 minutes

            return (
              <MessageItem
                key={message.id}
                message={message}
                userPermissions={userPermissions}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReaction={handleReaction}
                onPin={handlePin}
                isFirstInGroup={isFirstInGroup}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <div className="absolute bottom-20 right-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              setIsAtBottom(true);
            }}
            className="rounded-full shadow-lg"
          >
            ↓ New messages
          </Button>
        </div>
      )}
    </div>
  );
}

function MessageItem({ 
  message, 
  userPermissions, 
  onReply, 
  onEdit, 
  onDelete, 
  onReaction, 
  onPin,
  isFirstInGroup = true 
}: MessageItemProps & { isFirstInGroup?: boolean }) {
  const [showReactions, setShowReactions] = useState(false);

  // Parse reactions
  const reactions = message.reactions ? 
    (typeof message.reactions === 'string' ? JSON.parse(message.reactions) : message.reactions) : [];

  // Get user initials for avatar
  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className={cn(
      "group relative flex space-x-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors",
      !isFirstInGroup && "mt-1"
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isFirstInGroup ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.userEmail}`} />
            <AvatarFallback className="text-xs">
              {getInitials(message.userEmail)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center">
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        {isFirstInGroup && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-sm">
              {message.userName || message.userEmail.split('@')[0]}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {message.isEdited && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                edited
              </Badge>
            )}
            {message.isPinned && (
              <Pin className="h-3 w-3 text-orange-500" />
            )}
          </div>
        )}

        {/* Message Text */}
        <div className="text-sm text-foreground break-words">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded border">
                <div className="text-sm">
                  📎 {attachment.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {reactions.map((reaction: any, index: number) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-muted"
                onClick={() => onReaction?.(message.id, reaction.emoji)}
              >
                {reaction.emoji} {reaction.users?.length || 0}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Message Actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1">
          {/* Quick Reactions */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowReactions(!showReactions)}
            >
              <Smile className="h-3 w-3" />
            </Button>
            
            {showReactions && (
              <div className="absolute bottom-full right-0 mb-1 p-2 bg-background border rounded-lg shadow-lg z-10">
                <div className="flex space-x-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-base hover:bg-muted"
                      onClick={() => {
                        onReaction?.(message.id, emoji);
                        setShowReactions(false);
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reply */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onReply?.(message)}
          >
            <Reply className="h-3 w-3" />
          </Button>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                <Copy className="h-3 w-3 mr-2" />
                Copy
              </DropdownMenuItem>
              
              {userPermissions.canPinMessages && (
                <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                  <Pin className="h-3 w-3 mr-2" />
                  {message.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
              )}
              
              {message.userEmail === 'current-user' && (
                <>
                  <DropdownMenuItem onClick={() => onEdit?.(message)}>
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(message.id)} className="text-red-600">
                    <Trash className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Click outside to close reactions */}
      {showReactions && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowReactions(false)}
        />
      )}
    </div>
  );
} 