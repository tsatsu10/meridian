/**
 * @fileoverview Thread View Component
 * @description Complete thread management UI with sidebar/modal view, replies, and navigation
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Thread sidebar and modal views
 * - Reply interface with rich text editing
 * - Thread navigation and participant management
 * - Real-time thread updates
 * - Thread notifications and status
 * - File attachments in thread replies
 * - Thread archiving and resolution
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/cn';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Smile,
  Users,
  Bell,
  BellOff,
  Pin,
  Archive,
  CheckCircle,
  Clock,
  Hash,
  MoreVertical,
  Reply,
  ArrowLeft,
  Settings,
  AtSign,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useAuth } from '@/components/providers/unified-context-provider';
import MessageAttachments from './message-attachments';
import ChatFileUpload from './chat-file-upload';
import EmojiPicker from '@/components/ui/emoji-picker';

interface ThreadMessage {
  id: string;
  content: string;
  messageType: 'text' | 'file' | 'system' | 'thread_reply';
  userEmail: string;
  userName?: string;
  parentMessageId: string;
  attachments?: string;
  reactions?: string;
  mentions?: string;
  createdAt: Date;
  isEdited?: boolean;
  editedAt?: Date;
}

interface ThreadData {
  id: string; // parent message ID
  originalMessage: {
    id: string;
    content: string;
    userEmail: string;
    userName?: string;
    createdAt: Date;
    attachments?: string;
    reactions?: string;
    channelId: string;
  };
  replies: ThreadMessage[];
  participants: {
    userEmail: string;
    userName?: string;
    lastReadAt: Date;
    joinedAt: Date;
  }[];
  status: 'open' | 'resolved' | 'archived';
  isSubscribed: boolean;
  unreadCount: number;
  lastActivity: Date;
  metadata: {
    totalReplies: number;
    totalParticipants: number;
    isFollowing: boolean;
    notificationSettings: {
      allReplies: boolean;
      mentionsOnly: boolean;
      disabled: boolean;
    };
  };
}

interface ThreadViewProps {
  threadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'sidebar' | 'modal';
  className?: string;
  onNavigateToMessage?: (messageId: string, channelId: string) => void;
}

// Thread Reply Component
const ThreadReply: React.FC<{
  reply: ThreadMessage;
  currentUserEmail: string;
  onReaction?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}> = ({ reply, currentUserEmail, onReaction, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOwnMessage = reply.userEmail === currentUserEmail;

  const handleReaction = useCallback((emoji: string) => {
    onReaction?.(reply.id, emoji);
  }, [onReaction, reply.id]);

  return (
    <div
      className={cn(
        "group p-3 hover:bg-muted/30 transition-colors rounded-lg",
        isOwnMessage && "bg-muted/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-7 h-7">
          <AvatarFallback className="text-xs">
            {reply.userName?.charAt(0) || reply.userEmail.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {reply.userName || reply.userEmail}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
            </span>
            {reply.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          <div className="text-sm mb-1">
            {reply.content}
          </div>

          {/* Attachments */}
          {reply.attachments && (
            <div className="mt-2">
              <MessageAttachments
                attachments={JSON.parse(reply.attachments)}
                compact={true}
                showDownload={true}
                showPreview={true}
              />
            </div>
          )}

          {/* Reactions */}
          {reply.reactions && (
            <div className="flex items-center gap-1 mt-2">
              {JSON.parse(reply.reactions).map((reaction: any, index: number) => (
                <button
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs hover:bg-muted/80"
                  onClick={() => handleReaction(reaction.emoji)}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {isHovered && (
            <div className="flex items-center gap-1 mt-2">
              <EmojiPicker
                onEmojiSelect={handleReaction}
                trigger={
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <Smile className="w-3 h-3 mr-1" />
                    React
                  </Button>
                }
              />
              
              {isOwnMessage && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(reply.id)}
                    className="h-6 px-2 text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete?.(reply.id)}
                    className="h-6 px-2 text-xs text-red-600"
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Thread Participants Component
const ThreadParticipants: React.FC<{
  participants: ThreadData['participants'];
  className?: string;
}> = ({ participants, className }) => {
  const [showAll, setShowAll] = useState(false);
  const displayParticipants = showAll ? participants : participants.slice(0, 3);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Participants ({participants.length})
        </h4>
        {participants.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="h-6 text-xs"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {displayParticipants.map((participant) => (
          <div key={participant.userEmail} className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {participant.userName?.charAt(0) || participant.userEmail.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {participant.userName || participant.userEmail}
              </p>
              <p className="text-xs text-muted-foreground">
                Last read {formatDistanceToNow(participant.lastReadAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Thread Notification Settings Component
const ThreadNotificationSettings: React.FC<{
  settings: ThreadData['metadata']['notificationSettings'];
  onSettingsChange: (settings: ThreadData['metadata']['notificationSettings']) => void;
}> = ({ settings, onSettingsChange }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">All replies</span>
          <Button
            variant={settings.allReplies ? "default" : "outline"}
            size="sm"
            onClick={() => onSettingsChange({
              ...settings,
              allReplies: !settings.allReplies,
              mentionsOnly: false,
              disabled: false
            })}
            className="h-7"
          >
            {settings.allReplies ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Mentions only</span>
          <Button
            variant={settings.mentionsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => onSettingsChange({
              ...settings,
              allReplies: false,
              mentionsOnly: !settings.mentionsOnly,
              disabled: false
            })}
            className="h-7"
          >
            {settings.mentionsOnly ? <AtSign className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Disabled</span>
          <Button
            variant={settings.disabled ? "default" : "outline"}
            size="sm"
            onClick={() => onSettingsChange({
              ...settings,
              allReplies: false,
              mentionsOnly: false,
              disabled: !settings.disabled
            })}
            className="h-7"
          >
            {settings.disabled ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Thread View Component
export function ThreadView({
  threadId,
  isOpen,
  onClose,
  mode = 'sidebar',
  className,
  onNavigateToMessage,
}: ThreadViewProps) {
  const { user } = useAuth();
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [newReply, setNewReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time updates
  const webSocket = useUnifiedWebSocket({
    userEmail: user?.email || '',
    workspaceId: '', // This should come from context
    enabled: !!user?.email && isOpen,
    onMessage: (message) => {
      if (message.type === 'thread_reply' && message.channelId === threadId) {
        // Handle new thread reply
        fetchThreadData();
      }
    },
  });

  // Fetch thread data
  const fetchThreadData = useCallback(async () => {
    if (!threadId) return;

    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockThreadData: ThreadData = {
        id: threadId,
        originalMessage: {
          id: threadId,
          content: "Hey team, I wanted to discuss the new feature implementation. What are your thoughts on the current approach?",
          userEmail: 'alice@example.com',
          userName: 'Alice Smith',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          channelId: 'general',
        },
        replies: [
          {
            id: 'reply-1',
            content: "I think the approach looks good overall. Just have a few questions about the database schema.",
            messageType: 'thread_reply',
            userEmail: 'bob@example.com',
            userName: 'Bob Johnson',
            parentMessageId: threadId,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
          {
            id: 'reply-2',
            content: "Agreed with Bob. Also, should we consider adding validation for the new fields?",
            messageType: 'thread_reply',
            userEmail: user?.email || 'current@example.com',
            userName: 'Current User',
            parentMessageId: threadId,
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
          },
        ],
        participants: [
          {
            userEmail: 'alice@example.com',
            userName: 'Alice Smith',
            lastReadAt: new Date(Date.now() - 10 * 60 * 1000),
            joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
          {
            userEmail: 'bob@example.com',
            userName: 'Bob Johnson',
            lastReadAt: new Date(Date.now() - 5 * 60 * 1000),
            joinedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
          {
            userEmail: user?.email || 'current@example.com',
            userName: 'Current User',
            lastReadAt: new Date(),
            joinedAt: new Date(Date.now() - 30 * 60 * 1000),
          },
        ],
        status: 'open',
        isSubscribed: true,
        unreadCount: 0,
        lastActivity: new Date(Date.now() - 30 * 60 * 1000),
        metadata: {
          totalReplies: 2,
          totalParticipants: 3,
          isFollowing: true,
          notificationSettings: {
            allReplies: true,
            mentionsOnly: false,
            disabled: false,
          },
        },
      };

      setThreadData(mockThreadData);
    } catch (error) {
      console.error('Failed to fetch thread data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, user?.email]);

  // Load thread data when opened
  useEffect(() => {
    if (isOpen && threadId) {
      fetchThreadData();
    }
  }, [isOpen, threadId, fetchThreadData]);

  // Auto-scroll to bottom when new replies are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [threadData?.replies]);

  // Handle sending reply
  const handleSendReply = async () => {
    if (!newReply.trim() && attachedFiles.length === 0) return;
    if (!threadId || !user?.email) return;

    setIsSending(true);
    try {
      // Mock sending reply - replace with actual API call
      const newReplyData: ThreadMessage = {
        id: `reply-${Date.now()}`,
        content: newReply.trim(),
        messageType: 'thread_reply',
        userEmail: user.email,
        userName: user.name || user.email,
        parentMessageId: threadId,
        attachments: attachedFiles.length > 0 ? JSON.stringify(attachedFiles) : undefined,
        createdAt: new Date(),
      };

      // Add to thread data
      if (threadData) {
        setThreadData({
          ...threadData,
          replies: [...threadData.replies, newReplyData],
          lastActivity: new Date(),
          metadata: {
            ...threadData.metadata,
            totalReplies: threadData.metadata.totalReplies + 1,
          },
        });
      }

      setNewReply('');
      setAttachedFiles([]);
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle file uploads
  const handleFilesUploaded = (files: any[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  // Handle thread status change
  const handleStatusChange = async (status: ThreadData['status']) => {
    if (!threadData) return;

    try {
      setThreadData({
        ...threadData,
        status,
      });
      // API call to update status
    } catch (error) {
      console.error('Failed to update thread status:', error);
    }
  };

  // Handle notification settings change
  const handleNotificationSettingsChange = (settings: ThreadData['metadata']['notificationSettings']) => {
    if (!threadData) return;

    setThreadData({
      ...threadData,
      metadata: {
        ...threadData.metadata,
        notificationSettings: settings,
      },
    });
    // API call to update settings
  };

  // Stable emoji select callback to prevent infinite re-renders
  const handleReplyEmojiSelect = useCallback((emoji: string) => {
    setNewReply(prev => prev + emoji);
  }, []);

  if (!threadData && !isLoading) {
    return null;
  }

  const content = (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            {mode === 'modal' ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          </Button>
          
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-sm">Thread</h3>
              <p className="text-xs text-muted-foreground">
                {threadData?.metadata.totalReplies || 0} replies • {threadData?.metadata.totalParticipants || 0} participants
              </p>
            </div>
          </div>

          <Badge variant={
            threadData?.status === 'resolved' ? 'default' :
            threadData?.status === 'archived' ? 'secondary' : 'outline'
          }>
            {threadData?.status || 'open'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange(threadData?.status === 'resolved' ? 'open' : 'resolved')}
            className="h-8 w-8 p-0"
          >
            {threadData?.status === 'resolved' ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Original Message */}
      {threadData && (
        <div className="p-4 border-b bg-muted/20">
          <div className="flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-sm">
                {threadData.originalMessage.userName?.charAt(0) || threadData.originalMessage.userEmail.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {threadData.originalMessage.userName || threadData.originalMessage.userEmail}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(threadData.originalMessage.createdAt, { addSuffix: true })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToMessage?.(threadData.originalMessage.id, threadData.originalMessage.channelId)}
                  className="h-5 px-2 text-xs"
                >
                  <Hash className="w-3 h-3 mr-1" />
                  View in channel
                </Button>
              </div>
              
              <div className="text-sm">
                {threadData.originalMessage.content}
              </div>

              {threadData.originalMessage.attachments && (
                <div className="mt-2">
                  <MessageAttachments
                    attachments={JSON.parse(threadData.originalMessage.attachments)}
                    compact={true}
                    showDownload={true}
                    showPreview={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Thread Replies */}
        <div className="flex-1 flex flex-col">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {threadData?.replies.map((reply) => (
                  <ThreadReply
                    key={reply.id}
                    reply={reply}
                    currentUserEmail={user?.email || ''}
                    onReaction={(messageId, emoji) => {
                      // Handle message reaction
                    }}
                    onEdit={(messageId) => {
                      // Handle message edit
                    }}
                    onDelete={(messageId) => {
                      // Handle message delete
                    }}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Reply Input */}
          <div className="border-t p-4">
            {attachedFiles.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">
                        {file.name || `File ${index + 1}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                        className="h-4 w-4 p-0 hover:bg-red-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  placeholder="Reply to thread..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  className="min-h-[40px] resize-none"
                  disabled={isSending}
                />
              </div>

              <div className="flex items-center gap-1">
                <ChatFileUpload
                  channelId={threadId || ''}
                  onFilesUploaded={handleFilesUploaded}
                  onUploadError={(error) => console.error('Upload error:', error)}
                  maxFileSize={10}
                  maxFiles={5}
                  disabled={isSending}
                />

                <EmojiPicker
                  onEmojiSelect={handleReplyEmojiSelect}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                  }
                />

                <Button
                  onClick={handleSendReply}
                  disabled={(!newReply.trim() && attachedFiles.length === 0) || isSending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        {showSettings && threadData && (
          <div className="w-80 border-l bg-muted/30 p-4 space-y-4">
            <ThreadParticipants participants={threadData.participants} />
            
            <Separator />
            
            <ThreadNotificationSettings
              settings={threadData.metadata.notificationSettings}
              onSettingsChange={handleNotificationSettingsChange}
            />

            <Separator />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Thread Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('resolved')}
                  className="w-full justify-start"
                  disabled={threadData.status === 'resolved'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('archived')}
                  className="w-full justify-start"
                  disabled={threadData.status === 'archived'}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Thread
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className={cn(
      "h-full bg-background border-l",
      !isOpen && "hidden",
      className
    )}>
      {content}
    </div>
  );
}

export default ThreadView;