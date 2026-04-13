import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreVertical, 
  Reply, 
  Edit3, 
  Trash2, 
  Copy, 
  Flag,
  Heart,
  MessageSquare,
  Clock,
  Check,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAccessibility } from '@/hooks/useAccessibility';
import { formatDistanceToNow } from 'date-fns';

interface AccessibleMessageItemProps {
  message: {
    id: string;
    content: string;
    author: {
      name: string;
      avatar?: string;
      id: string;
    };
    timestamp: Date;
    edited?: boolean;
    editedAt?: Date;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    reactions?: Array<{
      emoji: string;
      count: number;
      users: string[];
      hasReacted: boolean;
    }>;
    attachments?: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      url: string;
    }>;
    threadReplies?: number;
  };
  isOwn?: boolean;
  isHighlighted?: boolean;
  showAvatar?: boolean;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onCopy?: (content: string) => void;
  onFlag?: (messageId: string) => void;
  onOpenThread?: (messageId: string) => void;
  className?: string;
}

export function AccessibleMessageItem({
  message,
  isOwn = false,
  isHighlighted = false,
  showAvatar = true,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onCopy,
  onFlag,
  onOpenThread,
  className
}: AccessibleMessageItemProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { announce, focusManager, animationUtils } = useAccessibility({
    announceMessages: true,
    enableKeyboardShortcuts: true
  });

  // Announce new messages to screen readers
  useEffect(() => {
    if (isHighlighted && message) {
      const announcement = `New message from ${message.author.name}: ${message.content}`;
      announce(announcement, 'polite');
    }
  }, [isHighlighted, message, announce]);

  // Format timestamp for screen readers
  const getAccessibleTimestamp = () => {
    const relativeTime = formatDistanceToNow(message.timestamp, { addSuffix: true });
    const absoluteTime = message.timestamp.toLocaleString();
    return `${relativeTime}, ${absoluteTime}`;
  };

  // Get message status description for screen readers
  const getStatusDescription = () => {
    switch (message.status) {
      case 'sending':
        return 'Message sending';
      case 'sent':
        return 'Message sent';
      case 'delivered':
        return 'Message delivered';
      case 'read':
        return 'Message read';
      case 'failed':
        return 'Message failed to send';
      default:
        return '';
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (event.target === messageRef.current) {
          event.preventDefault();
          setShowActions(!showActions);
        }
        break;
        
      case 'Escape':
        setShowActions(false);
        messageRef.current?.focus();
        break;
        
      case 'r':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onReply?.(message.id);
          announce('Reply dialog opened', 'assertive');
        }
        break;
        
      case 'e':
        if ((event.ctrlKey || event.metaKey) && isOwn) {
          event.preventDefault();
          onEdit?.(message.id);
          announce('Edit mode activated', 'assertive');
        }
        break;
        
      case 'c':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onCopy?.(message.content);
          announce('Message copied to clipboard', 'assertive');
        }
        break;
        
      case 't':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onOpenThread?.(message.id);
          announce('Thread opened', 'assertive');
        }
        break;
    }
  };

  // Handle action execution with announcements
  const handleAction = (action: () => void, announcement: string) => {
    action();
    announce(announcement, 'assertive');
    setShowActions(false);
    messageRef.current?.focus();
  };

  const messageActions = [
    {
      icon: Reply,
      label: 'Reply to message',
      action: () => onReply?.(message.id),
      shortcut: 'Ctrl+R',
      available: !!onReply
    },
    {
      icon: Edit3,
      label: 'Edit message',
      action: () => onEdit?.(message.id),
      shortcut: 'Ctrl+E',
      available: !!onEdit && isOwn
    },
    {
      icon: Copy,
      label: 'Copy message',
      action: () => onCopy?.(message.content),
      shortcut: 'Ctrl+C',
      available: !!onCopy
    },
    {
      icon: MessageSquare,
      label: `Open thread (${message.threadReplies || 0} replies)`,
      action: () => onOpenThread?.(message.id),
      shortcut: 'Ctrl+T',
      available: !!onOpenThread
    },
    {
      icon: Flag,
      label: 'Report message',
      action: () => onFlag?.(message.id),
      shortcut: '',
      available: !!onFlag && !isOwn
    },
    {
      icon: Trash2,
      label: 'Delete message',
      action: () => onDelete?.(message.id),
      shortcut: 'Delete',
      available: !!onDelete && isOwn,
      destructive: true
    }
  ].filter(action => action.available);

  return (
    <div
      ref={messageRef}
      className={cn(
        "group relative p-4 rounded-lg transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "hover:bg-muted/50",
        isHighlighted && "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500",
        isOwn && "ml-auto max-w-[80%]",
        !isOwn && "mr-auto max-w-[80%]",
        className
      )}
      tabIndex={0}
      role="article"
      aria-label={`Message from ${message.author.name} at ${getAccessibleTimestamp()}`}
      aria-describedby={`message-content-${message.id} message-status-${message.id}`}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onFocus={() => setShowActions(true)}
      onBlur={(e) => {
        // Keep actions visible if focus moves to an action button
        if (!actionsRef.current?.contains(e.relatedTarget as Node)) {
          setShowActions(false);
        }
      }}
    >
      {/* Message Header */}
      <div className="flex items-start gap-3 mb-2">
        {showAvatar && !isOwn && (
          <div className="flex-shrink-0">
            {message.author.avatar ? (
              <img
                src={message.author.avatar}
                alt={`${message.author.name}'s avatar`}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium"
                aria-label={`${message.author.name}'s avatar`}
              >
                {message.author.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">
              {message.author.name}
            </span>
            
            <time 
              className="text-xs text-muted-foreground"
              dateTime={message.timestamp.toISOString()}
              title={message.timestamp.toLocaleString()}
            >
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </time>
            
            {message.edited && (
              <Badge 
                variant="outline" 
                className="text-xs"
                title={`Edited ${message.editedAt ? formatDistanceToNow(message.editedAt, { addSuffix: true }) : ''}`}
              >
                edited
              </Badge>
            )}
            
            {/* Message Status */}
            <div 
              id={`message-status-${message.id}`}
              className="flex items-center"
              aria-label={getStatusDescription()}
            >
              {message.status === 'sending' && (
                <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />
              )}
              {message.status === 'sent' && (
                <Check className="w-3 h-3 text-muted-foreground" />
              )}
              {message.status === 'delivered' && (
                <CheckCheck className="w-3 h-3 text-muted-foreground" />
              )}
              {message.status === 'read' && (
                <CheckCheck className="w-3 h-3 text-blue-500" />
              )}
              {message.status === 'failed' && (
                <AlertCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div
        id={`message-content-${message.id}`}
        className="text-sm text-foreground leading-relaxed mb-2"
        role="text"
      >
        {message.content}
      </div>

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div 
          className="space-y-2 mb-2"
          role="group"
          aria-label={`${message.attachments.length} attachment${message.attachments.length !== 1 ? 's' : ''}`}
        >
          {message.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-2 bg-muted rounded border"
              role="button"
              tabIndex={0}
              aria-label={`Download ${attachment.name}, ${attachment.type}, ${attachment.size} bytes`}
            >
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {attachment.type.split('/')[1]?.toUpperCase().slice(0, 3) || 'FILE'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div 
          className="flex flex-wrap gap-1 mb-2"
          role="group"
          aria-label="Message reactions"
        >
          {message.reactions.map((reaction, index) => (
            <button
              key={index}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                reaction.hasReacted 
                  ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700" 
                  : "bg-muted border-border hover:bg-muted/80"
              )}
              onClick={() => onReact?.(message.id, reaction.emoji)}
              aria-label={`${reaction.hasReacted ? 'Remove' : 'Add'} ${reaction.emoji} reaction. ${reaction.count} people reacted.`}
              aria-pressed={reaction.hasReacted}
            >
              <span role="img" aria-hidden="true">{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Thread Replies */}
      {message.threadReplies && message.threadReplies > 0 && (
        <button
          className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          onClick={() => onOpenThread?.(message.id)}
          aria-label={`View thread with ${message.threadReplies} replies`}
        >
          <MessageSquare className="w-3 h-3" />
          <span>{message.threadReplies} replies</span>
        </button>
      )}

      {/* Message Actions */}
      <div
        ref={actionsRef}
        className={cn(
          "absolute top-2 right-2 flex items-center gap-1 bg-background border rounded-lg shadow-sm p-1 transition-all duration-200",
          showActions && animationUtils.shouldAnimate() 
            ? "opacity-100 scale-100" 
            : "opacity-0 scale-95 pointer-events-none",
          !animationUtils.shouldAnimate() && showActions && "opacity-100"
        )}
        role="toolbar"
        aria-label="Message actions"
        aria-hidden={!showActions}
      >
        {messageActions.map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              action.destructive && "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            )}
            onClick={() => handleAction(action.action, `${action.label} executed`)}
            aria-label={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
            title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
          >
            <action.icon className="w-4 h-4" />
          </Button>
        ))}
        
        {/* More Actions Menu */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="More message actions"
          aria-haspopup="menu"
          aria-expanded={isExpanded}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Keyboard shortcuts help (screen reader only) */}
      <div className="sr-only">
        Available keyboard shortcuts: 
        Ctrl+R to reply, 
        {isOwn && 'Ctrl+E to edit, '}
        Ctrl+C to copy, 
        Ctrl+T to open thread,
        Enter or Space to show actions
      </div>
    </div>
  );
}