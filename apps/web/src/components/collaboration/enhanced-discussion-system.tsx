// @epic-3.4-teams: Enhanced Real-time Discussion System with Threading and AI Insights and Permissions
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useAuth } from '@/components/providers/unified-context-provider';
import { useCollaborationPermissions } from '@/hooks/useCollaborationPermissions';
import useWorkspaceStore from '@/store/workspace';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare,
  Reply,
  Heart,
  Star,
  Pin,
  MoreVertical,
  Send,
  Edit,
  Trash2,
  Users,
  Clock,
  Search,
  Filter,
  TrendingUp,
  Bookmark,
  Flag,
  AtSign,
  Hash,
  Smile,
  Paperclip,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Zap,
  Brain,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export interface DiscussionMessage {
  id: string;
  content: string;
  authorEmail: string;
  authorName: string;
  authorAvatar?: string;
  parentId?: string; // For threading
  threadLevel: number;
  timestamp: Date;
  lastEdited?: Date;
  reactions: Record<string, string[]>; // emoji -> array of user emails
  mentions: string[]; // mentioned user emails
  tags: string[]; // hashtags
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  status: 'draft' | 'published' | 'edited' | 'deleted';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isPinned: boolean;
  isResolved: boolean;
  metadata: {
    readBy: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    aiSummary?: string;
    relatedTopics?: string[];
  };
}

export interface DiscussionThread {
  id: string;
  title?: string;
  messages: DiscussionMessage[];
  participants: string[];
  isLocked: boolean;
  isArchived: boolean;
  lastActivity: Date;
  messageCount: number;
  resolvedCount: number;
  tags: string[];
}

export interface DiscussionRoom {
  id: string;
  name: string;
  description?: string;
  type: 'general' | 'task' | 'project' | 'team' | 'announcement' | 'support';
  resourceId?: string; // linked task/project ID
  participants: string[];
  moderators: string[];
  threads: DiscussionThread[];
  settings: {
    allowAnonymous: boolean;
    requireModeration: boolean;
    autoArchive: boolean;
    aiInsights: boolean;
  };
}

interface EnhancedDiscussionSystemProps {
  roomId: string;
  resourceType?: 'task' | 'project' | 'team' | 'general';
  resourceId?: string;
  initialRoom?: Partial<DiscussionRoom>;
  showAIInsights?: boolean;
  showThreading?: boolean;
  showReactions?: boolean;
  showPresence?: boolean;
  maxMessages?: number;
  className?: string;
}

export function EnhancedDiscussionSystem({
  roomId,
  resourceType = 'general',
  resourceId,
  initialRoom,
  showAIInsights = true,
  showThreading = true,
  showReactions = true,
  showPresence = true,
  maxMessages = 100,
  className = ''
}: EnhancedDiscussionSystemProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Discussion state
  const [room, setRoom] = useState<DiscussionRoom>({
    id: roomId,
    name: `Discussion - ${resourceType}`,
    type: resourceType as any,
    resourceId,
    participants: [],
    moderators: [],
    threads: [],
    settings: {
      allowAnonymous: false,
      requireModeration: false,
      autoArchive: true,
      aiInsights: showAIInsights
    },
    ...initialRoom
  });

  const [currentThread, setCurrentThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Message composition state
  const [newMessage, setNewMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'announcement' | 'question'>('text');

  // UI state
  const [selectedView, setSelectedView] = useState<'messages' | 'threads' | 'insights'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'unread' | 'mentions' | 'pinned'>('all');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Refs
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  const { connectionState, sendMessage, startTyping, stopTyping } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    onMessage: handleIncomingMessage,
    onTyping: handleTypingStart,
    onStopTyping: handleTypingStop
  });

  // Handle incoming messages
  function handleIncomingMessage(data: any) {
    if (data.channelId !== roomId) return;

    const message: DiscussionMessage = {
      id: data.messageId,
      content: data.content,
      authorEmail: data.userEmail,
      authorName: data.userName || data.userEmail.split('@')[0],
      authorAvatar: data.userAvatar,
      parentId: data.parentId,
      threadLevel: data.threadLevel || 0,
      timestamp: new Date(data.timestamp),
      reactions: data.reactions || {},
      mentions: extractMentions(data.content),
      tags: extractTags(data.content),
      status: 'published',
      priority: data.priority || 'normal',
      isPinned: false,
      isResolved: false,
      metadata: {
        readBy: [data.userEmail],
        sentiment: analyzeSentiment(data.content)
      }
    };

    setMessages(prev => [...prev, message].slice(-maxMessages));
    scrollToBottom();
  }

  // Handle typing indicators
  function handleTypingStart(data: any) {
    if (data.channelId === roomId && data.userEmail !== user?.email) {
      setTypingUsers(prev => new Set(prev.add(data.userEmail)));
    }
  }

  function handleTypingStop(data: any) {
    if (data.channelId === roomId) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userEmail);
        return newSet;
      });
    }
  }

  // Utility functions
  const extractMentions = (content: string): string[] => {
    const mentions = content.match(/@\[([^\]]+)\]/g);
    return mentions ? mentions.map(m => m.slice(2, -1)) : [];
  };

  const extractTags = (content: string): string[] => {
    const tags = content.match(/#\w+/g);
    return tags ? tags.map(t => t.slice(1)) : [];
  };

  const analyzeSentiment = (content: string): 'positive' | 'neutral' | 'negative' => {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'awesome', 'love', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'wrong', 'problem'];

    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !connectionState.isConnected) return;

    const tempId = `temp-${Date.now()}`;
    const message: DiscussionMessage = {
      id: tempId,
      content: newMessage.trim(),
      authorEmail: user?.email || '',
      authorName: user?.name || user?.email?.split('@')[0] || '',
      authorAvatar: user?.avatar,
      parentId: replyToMessage,
      threadLevel: replyToMessage ? 1 : 0,
      timestamp: new Date(),
      reactions: {},
      mentions: extractMentions(newMessage),
      tags: extractTags(newMessage),
      status: 'published',
      priority: 'normal',
      isPinned: false,
      isResolved: false,
      metadata: {
        readBy: [user?.email || ''],
        sentiment: analyzeSentiment(newMessage)
      }
    };

    // Optimistic update
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyToMessage(null);
    scrollToBottom();

    // Send via WebSocket
    sendMessage(roomId, newMessage.trim(), {
      messageType: messageType,
      parentMessageId: replyToMessage,
      mentions: message.mentions,
      attachments: []
    });

    // Stop typing indicator
    stopTyping(roomId);
  }, [newMessage, connectionState.isConnected, replyToMessage, messageType, user, sendMessage, stopTyping, roomId]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!connectionState.isConnected) return;

    startTyping(roomId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(roomId);
    }, 3000);
  }, [connectionState.isConnected, startTyping, stopTyping, roomId]);

  // Add reaction
  const addReaction = useCallback((messageId: string, emoji: string) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = { ...msg.reactions };
          if (!reactions[emoji]) reactions[emoji] = [];

          const userIndex = reactions[emoji].indexOf(user?.email || '');
          if (userIndex === -1) {
            reactions[emoji].push(user?.email || '');
          } else {
            reactions[emoji].splice(userIndex, 1);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          }

          return { ...msg, reactions };
        }
        return msg;
      })
    );
  }, [user?.email]);

  // Toggle thread expansion
  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Filter messages
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    switch (filterBy) {
      case 'unread':
        filtered = filtered.filter(msg => !msg.metadata.readBy.includes(user?.email || ''));
        break;
      case 'mentions':
        filtered = filtered.filter(msg => msg.mentions.includes(user?.email || ''));
        break;
      case 'pinned':
        filtered = filtered.filter(msg => msg.isPinned);
        break;
    }

    return filtered;
  }, [messages, searchQuery, filterBy, user?.email]);

  // Group messages by thread
  const threadedMessages = useMemo(() => {
    if (!showThreading) return filteredMessages;

    const threads: Record<string, DiscussionMessage[]> = {};
    const topLevel: DiscussionMessage[] = [];

    filteredMessages.forEach(msg => {
      if (msg.parentId) {
        if (!threads[msg.parentId]) threads[msg.parentId] = [];
        threads[msg.parentId].push(msg);
      } else {
        topLevel.push(msg);
      }
    });

    return { topLevel, threads };
  }, [filteredMessages, showThreading]);

  // Render message
  const renderMessage = (message: DiscussionMessage, isThread: boolean = false) => {
    const isOwnMessage = message.authorEmail === user?.email;
    const threadMessages = showThreading && !isThread ? (threadedMessages as any).threads[message.id] || [] : [];
    const isExpanded = expandedThreads.has(message.id);

    return (
      <div key={message.id} className={cn("space-y-2", isThread && "ml-8 border-l-2 border-gray-200 pl-4")}>
        <div className={cn(
          "flex items-start space-x-3 p-3 rounded-lg transition-colors",
          isOwnMessage ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
        )}>
          <Avatar className="w-8 h-8">
            <AvatarImage src={message.authorAvatar} />
            <AvatarFallback className="text-xs">
              {message.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{message.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </span>
              {message.priority !== 'normal' && (
                <Badge variant="outline" className="text-xs">
                  {message.priority}
                </Badge>
              )}
              {message.isPinned && <Pin className="w-3 h-3 text-yellow-600" />}
              {message.isResolved && <CheckCircle className="w-3 h-3 text-green-600" />}
            </div>

            <div className="mt-1">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Tags */}
              {message.tags.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {message.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Mentions */}
              {message.mentions.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  <AtSign className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-600">
                    Mentioned {message.mentions.length} user{message.mentions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Reactions */}
              {showReactions && Object.keys(message.reactions).length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {Object.entries(message.reactions).map(([emoji, users]) => (
                    <Button
                      key={emoji}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => addReaction(message.id, emoji)}
                    >
                      {emoji} {users.length}
                    </Button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-2 mt-2">
                {showThreading && !isThread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyToMessage(message.id)}
                    className="h-6 px-2 text-xs"
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                )}

                {showReactions && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addReaction(message.id, '👍')}
                      className="h-6 px-2 text-xs"
                    >
                      <Heart className="w-3 h-3" />
                    </Button>
                  </>
                )}

                {isOwnMessage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingMessage(message.id);
                      setEditContent(message.content);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thread messages */}
        {showThreading && threadMessages.length > 0 && (
          <div className="ml-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleThread(message.id)}
              className="text-xs"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {threadMessages.length} repl{threadMessages.length === 1 ? 'y' : 'ies'}
            </Button>

            {isExpanded && (
              <div className="space-y-2 mt-2">
                {threadMessages.map(threadMsg => renderMessage(threadMsg, true))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <TooltipProvider>
      <Card className={cn("w-full h-[600px] flex flex-col", className)}>
        <CardHeader className="flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>{room.name}</span>
              {connectionState.isConnected && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Live
                </Badge>
              )}
            </CardTitle>

            {showPresence && onlineUsers.size > 0 && (
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">{onlineUsers.size} online</span>
              </div>
            )}
          </div>

          <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="threads">Threads</TabsTrigger>
              {showAIInsights && <TabsTrigger value="insights">Insights</TabsTrigger>}
            </TabsList>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterBy} onValueChange={(value) => setFilterBy(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="mentions">Mentions</SelectItem>
                  <SelectItem value="pinned">Pinned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Tabs>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          <TabsContent value="messages" className="flex-1 flex flex-col m-0">
            {/* Messages area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {Array.isArray(filteredMessages) ? (
                  filteredMessages.map(message => renderMessage(message))
                ) : (
                  (filteredMessages as any).topLevel.map((message: any) => renderMessage(message))
                )}

                {/* Typing indicators */}
                {typingUsers.size > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span>
                      {Array.from(typingUsers).join(', ')}
                      {typingUsers.size === 1 ? ' is' : ' are'} typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply indicator */}
            {replyToMessage && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    Replying to message
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyToMessage(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Message input */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={replyToMessage ? "Write a reply..." : "Type your message..."}
                    className="min-h-[40px] max-h-32 resize-none"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach file</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Smile className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add emoji</TooltipContent>
                  </Tooltip>

                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !connectionState.isConnected}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="threads" className="flex-1 p-4 m-0">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Thread view coming soon</p>
            </div>
          </TabsContent>

          {showAIInsights && (
            <TabsContent value="insights" className="flex-1 p-4 m-0">
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">AI insights coming soon</p>
              </div>
            </TabsContent>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}