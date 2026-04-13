// Phase 1.2: Optimized Chat Components with Render Optimization
// Target: Reduce re-renders by 60%
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  Hash,
  Users,
  MoreVertical,
  Reply,
  ThumbsUp,
  Wifi,
  WifiOff,
  Type,
  Search,
  Paperclip,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import useWorkspaceStore from '@/store/workspace';
import { useAuth } from '@/components/providers/unified-context-provider';
import { useUnifiedWebSocketSingleton } from '@/hooks/useUnifiedWebSocketSingleton';
import { useMessageCache } from '@/hooks/use-message-cache';
import { VirtualizedMessageContainer } from './virtualized-message-container';

import { logger } from "../../lib/logger";
// Lazy-loaded components for bundle optimization
import {
  AdvancedMessageSearch,
  ChatModals, 
  FilePreview, 
  VideoCall,
  AdvancedSettings,
  MessageAnalytics,
  WorkflowAutomation,
  TaskIntegration,
  FileManagement,
  UserPresence
} from './lazy-chat-components';

interface ChatMainAreaProps {
  selectedChatId: string | null;
  onSelectUser?: (user: any) => void;
  onStartVideoCall?: (chatId: string, participants: string[]) => void;
}

interface SimpleMessage {
  id: string;
  content: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  user: {
    email: string;
    name: string;
  };
  attachments?: any[];
}

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  description?: string;
  memberCount?: number;
}

// Performance measurement utilities
const measureRenderTime = (componentName: string) => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    const renderTime = end - start;
    // Performance monitoring - only log in dev mode
    if (import.meta.env.MODE === 'development') {
      logger.info("🎯 ${componentName} render time: ${renderTime.toFixed(2)}ms");
      
      // Track performance for monitoring
      if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        logger.info("📊 Memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB");
      }
    }
    
    return renderTime;
  };
};

// Priority 1: Memoized Chat Components with Performance Measurement
const OptimizedChatMainArea = React.memo(({ selectedChatId, onSelectUser, onStartVideoCall }: ChatMainAreaProps) => {
  const renderTimer = useRef<(() => number) | null>(null);
  const { workspace } = useWorkspaceStore();
  const { user } = useAuth();
  
  // Phase 3A: Enhanced state management with caching and real-time features
  const messageCache = useMessageCache({
    maxCacheSize: 2000,
    pageSize: 50,
    enablePersistence: true,
  });
  
  const [newMessage, setNewMessage] = useState('');
  const [channelInfo, setChannelInfo] = useState<Channel | null>(null);
  const [replyingTo, setReplyingTo] = useState<SimpleMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [createTaskModal, setCreateTaskModal] = useState<{ isOpen: boolean; suggestion: any }>({
    isOpen: false,
    suggestion: null
  });
  const [enhancedTaskModal, setEnhancedTaskModal] = useState<{ isOpen: boolean; suggestion: any }>({
    isOpen: false,
    suggestion: null
  });

  // Performance measurement on mount
  useEffect(() => {
    renderTimer.current = measureRenderTime('OptimizedChatMainArea');
    return () => {
      if (renderTimer.current) {
        const renderTime = renderTimer.current();
        // Track render performance
        if (renderTime > 5 && import.meta.env.MODE === 'development') {
          console.warn(`⚠️ Slow render detected: ${renderTime.toFixed(2)}ms`);
        }
      }
    };
  }, []);

  // Memoized callbacks to prevent infinite re-renders
  const memoizedCallbacks = useMemo(() => ({
    onSelectUser: useCallback(onSelectUser || (() => {}), [onSelectUser]),
    onStartVideoCall: useCallback(onStartVideoCall || (() => {}), [onStartVideoCall])
  }), [onSelectUser, onStartVideoCall]);

  // Optimized WebSocket handlers with useCallback
  const handleMessage = useCallback((message: any) => {
    // Message received - no logging needed in production
    if (message.data?.message) {
      messageCache.addMessage(message.data.message);
    }
  }, [messageCache]);

  const handleTyping = useCallback((data: any) => {
    // User typing indicator
    setTypingUsers(prev => new Set([...prev, data.userEmail]));
  }, []);

  const handleStopTyping = useCallback((data: any) => {
    // User stopped typing
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userEmail);
      return newSet;
    });
  }, []);

  const handleUserJoined = useCallback((data: any) => {
    // User joined channel
  }, []);

  const handleUserLeft = useCallback((data: any) => {
    // User left channel
  }, []);

  const handleConnect = useCallback(() => {
    // Connected to WebSocket server
  }, []);

  const handleDisconnect = useCallback(() => {
    // Disconnected from WebSocket server
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('❌ Optimized Chat: Unified WebSocket error:', error);
  }, []);

  // Use the singleton unified WebSocket hook
  const unifiedWS = useUnifiedWebSocketSingleton({
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    enabled: !!selectedChatId,
    onMessage: handleMessage,
    onTypingStart: handleTyping,
    onTypingStop: handleStopTyping,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError
  });

  // Optimized message sending with useCallback
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedChatId) return;
    
    const messageData = {
      content: newMessage.trim(),
      channelId: selectedChatId,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    };

    // Send via WebSocket
    if (unifiedWS.socket) {
      unifiedWS.socket.emit('chat:send_message', messageData);
    }

    setNewMessage('');
    setReplyingTo(null);
  }, [newMessage, selectedChatId, user?.email, unifiedWS.socket]);

  // Optimized typing handler with useCallback
  const handleTypingChange = useCallback((value: string) => {
    setNewMessage(value);
    
    if (!selectedChatId) return;

    if (value && !isTyping) {
      setIsTyping(true);
      if (unifiedWS.socket) {
        unifiedWS.socket.emit('chat:typing_start', { channelId: selectedChatId });
      }
    } else if (!value && isTyping) {
      setIsTyping(false);
      if (unifiedWS.socket) {
        unifiedWS.socket.emit('chat:typing_stop', { channelId: selectedChatId });
      }
    }
  }, [selectedChatId, isTyping, unifiedWS.socket]);

  // Optimized key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Memoized channel icon
  const getChannelIcon = useCallback((type: string) => {
    return type === 'public' ? <Hash className="h-4 w-4" /> : <Users className="h-4 w-4" />;
  }, []);

  // Memoized message rendering
  const renderMessage = useCallback((message: SimpleMessage) => {
    return (
      <div key={message.id} className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.userEmail}`} />
          <AvatarFallback>{message.userName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{message.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="mt-1 text-sm">
            {message.content}
          </div>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment) => (
                <FilePreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  // Memoized scroll to bottom function
  const scrollToBottom = useCallback(() => {
    // Implementation for scrolling to bottom
  }, []);

  // Memoized suggestion dismissal
  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
  }, []);

  // Memoized task creation
  const handleCreateTask = useCallback((suggestion: any) => {
    setCreateTaskModal({ isOpen: true, suggestion });
  }, []);

  // Memoized enhanced task creation
  const handleEnhancedTaskCreation = useCallback((suggestion: any) => {
    setEnhancedTaskModal({ isOpen: true, suggestion });
  }, []);

  // Memoized reply handling
  const handleReply = useCallback((message: SimpleMessage) => {
    setReplyingTo(message);
  }, []);

  // Memoized filter change
  const handleFilterChange = useCallback((query: string) => {
    setFilterQuery(query);
  }, []);

  // Memoized channel info
  const channelDisplayInfo = useMemo(() => {
    if (!channelInfo) return null;
    return {
      name: channelInfo.name,
      description: channelInfo.description,
      memberCount: channelInfo.memberCount,
      type: channelInfo.type
    };
  }, [channelInfo]);

  // Memoized typing indicator
  const typingIndicator = useMemo(() => {
    if (typingUsers.size === 0) return null;
    const typingList = Array.from(typingUsers).join(', ');
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground p-2">
        <Type className="h-4 w-4 animate-pulse" />
        <span>{typingList} {typingUsers.size === 1 ? 'is' : 'are'} typing...</span>
      </div>
    );
  }, [typingUsers]);

  // Memoized connection status
  const connectionStatus = useMemo(() => {
    return unifiedWS.connectionState.isConnected ? (
      <div className="flex items-center space-x-2 text-green-600">
        <Wifi className="h-4 w-4" />
        <span className="text-sm">Connected</span>
      </div>
    ) : (
      <div className="flex items-center space-x-2 text-red-600">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm">Disconnected</span>
      </div>
    );
  }, [unifiedWS.connectionState.isConnected]);

  if (!selectedChatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Hash className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No Chat Selected</h3>
            <p className="text-muted-foreground">Select a chat to start messaging</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          {channelDisplayInfo && (
            <>
              {getChannelIcon(channelDisplayInfo.type)}
              <div>
                <h2 className="font-semibold">{channelDisplayInfo.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {channelDisplayInfo.memberCount} members
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {connectionStatus}
          <Button
            variant="outline"
            size="sm"
            onClick={() => memoizedCallbacks.onStartVideoCall(selectedChatId, [])}
          >
            <Users className="h-4 w-4 mr-2" />
            Video Call
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <VirtualizedMessageContainer
          messages={messageCache.getMessages(selectedChatId)}
          renderMessage={renderMessage}
          onScrollToBottom={scrollToBottom}
        />
        {typingIndicator}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        {replyingTo && (
          <div className="mb-2 p-2 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Replying to {replyingTo.userName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm truncate">{replyingTo.content}</p>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => handleTypingChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lazy-loaded modals and components */}
      <ChatModals
        isOpen={createTaskModal.isOpen}
        onClose={() => setCreateTaskModal({ isOpen: false, suggestion: null })}
        suggestion={createTaskModal.suggestion}
      />
      
      <AdvancedMessageSearch 
        query={filterQuery}
        onQueryChange={handleFilterChange}
      />
      
      <MessageAnalytics channelId={selectedChatId} />
      
      <WorkflowAutomation channelId={selectedChatId} />
      
      <TaskIntegration channelId={selectedChatId} />
      
      <FileManagement channelId={selectedChatId} />
      
      <UserPresence channelId={selectedChatId} />
      
      <AdvancedSettings />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return prevProps.selectedChatId === nextProps.selectedChatId;
});

OptimizedChatMainArea.displayName = 'OptimizedChatMainArea';

export default OptimizedChatMainArea; 