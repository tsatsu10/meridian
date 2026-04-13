// @epic-3.1-messaging: Chat WebSocket Hook - Phase 1 Frontend Integration
// @persona-sarah: PM needs real-time messaging capabilities
// @persona-david: Team lead needs reliable message delivery and team communication

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface ChatMessage {
  type: 'message' | 'typing' | 'stop_typing' | 'join_channel' | 'leave_channel' | 'presence' | 'ping' | 'pong' | 'message_delivered' | 'message_read' | 'user_joined' | 'user_left' | 'channels' | 'recent_messages' | 'error';
  data: any;
  timestamp: number;
  userEmail?: string;
  channelId?: string;
  messageId?: string;
}

export interface ChatConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastPing: number | null;
}

export interface TypingUser {
  userEmail: string;
  channelId: string;
  timestamp: number;
}

export interface UseChatWebSocketOptions {
  userEmail: string;
  workspaceId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (user: TypingUser) => void;
  onStopTyping?: (user: TypingUser) => void;
  onUserJoined?: (userEmail: string, channelId: string) => void;
  onUserLeft?: (userEmail: string, channelId: string) => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface ChatWebSocketAPI {
  // Connection state
  connectionState: ChatConnectionState;
  
  // Channel management
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  
  // Messaging
  sendMessage: (channelId: string, content: string, options?: {
    messageType?: 'text' | 'file' | 'system';
    parentMessageId?: string;
    mentions?: string[];
    attachments?: any[];
  }) => void;
  
  // Typing indicators
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  
  // Message status
  markMessageAsRead: (channelId: string, messageId: string) => void;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Utility
  isTyping: (channelId: string) => string[]; // Returns list of users typing in channel
}

export function useChatWebSocket(options: UseChatWebSocketOptions): ChatWebSocketAPI {
  const {
    userEmail,
    workspaceId,
    onMessage,
    onTyping,
    onStopTyping,
    onUserJoined,
    onUserLeft,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const queryClient = useQueryClient();

  // Connection state
  const [connectionState, setConnectionState] = useState<ChatConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastPing: null,
  });

  // Typing users state
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());

  // Create WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Use the unified WebSocket server on port 1338
      const wsUrl = `ws://localhost:1338?userEmail=${encodeURIComponent(userEmail)}&workspaceId=${encodeURIComponent(workspaceId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {setConnectionState({
          isConnected: true,
          isConnecting: false,
          error: null,
          lastPing: Date.now(),
        });
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: ChatMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {setConnectionState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: event.code !== 1000 ? `Connection closed: ${event.reason}` : null,
        }));

        // Auto-reconnect if enabled and not manually closed
        if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoffreconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('💬 Chat WebSocket error:', error);
        const errorMessage = 'WebSocket connection failed';
        setConnectionState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      const errorMessage = 'Failed to create WebSocket connection';
      setConnectionState(prev => ({ ...prev, error: errorMessage, isConnecting: false }));
      onError?.(errorMessage);
    }
  }, [userEmail, workspaceId, autoReconnect, reconnectDelay, maxReconnectAttempts, onError]);

  // Handle incoming messages
  const handleMessage = useCallback((message: ChatMessage) => {
    switch (message.type) {
      case 'message':
        onMessage?.(message);
        // Invalidate queries to refresh message lists
        if (message.channelId) {
          queryClient.invalidateQueries({ queryKey: ['messages', message.channelId] });
        }
        break;

      case 'typing':
        if (message.data?.userEmail && message.channelId) {
          handleTypingStart(message.channelId, message.data.userEmail);
          onTyping?.({
            userEmail: message.data.userEmail,
            channelId: message.channelId,
            timestamp: message.timestamp,
          });
        }
        break;

      case 'stop_typing':
        if (message.data?.userEmail && message.channelId) {
          handleTypingStop(message.channelId, message.data.userEmail);
          onStopTyping?.({
            userEmail: message.data.userEmail,
            channelId: message.channelId,
            timestamp: message.timestamp,
          });
        }
        break;

      case 'user_joined':
        if (message.data?.userEmail && message.channelId) {
          onUserJoined?.(message.data.userEmail, message.channelId);
        }
        break;

      case 'user_left':
        if (message.data?.userEmail && message.channelId) {
          onUserLeft?.(message.data.userEmail, message.channelId);
        }
        break;

      case 'channels':
        // Update channels cache
        queryClient.setQueryData(['channels', workspaceId], message.data.channels);
        break;

      case 'recent_messages':
        // Update messages cache
        if (message.data?.channelId) {
          queryClient.setQueryData(['messages', message.data.channelId], message.data.messages);
        }
        break;

      case 'message_delivered':
        // Handle delivery confirmationbreak;

      case 'message_read':
        // Handle read receipts
        if (message.channelId && message.messageId) {
          queryClient.invalidateQueries({ queryKey: ['messages', message.channelId] });
        }
        break;

      case 'pong':
        setConnectionState(prev => ({ ...prev, lastPing: Date.now() }));
        break;

      case 'error':
        console.error('💬 Chat server error:', message.data);
        onError?.(message.data?.error || 'Unknown error');
        break;

      default:}
  }, [onMessage, onTyping, onStopTyping, onUserJoined, onUserLeft, onError, queryClient, workspaceId]);

  // Typing indicator management
  const handleTypingStart = useCallback((channelId: string, userEmail: string) => {
    setTypingUsers(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(channelId)) {
        newMap.set(channelId, new Set());
      }
      newMap.get(channelId)!.add(userEmail);
      return newMap;
    });

    // Auto-clear typing after 3 seconds
    const timeoutKey = `${channelId}:${userEmail}`;
    if (typingTimeoutRef.current.has(timeoutKey)) {
      clearTimeout(typingTimeoutRef.current.get(timeoutKey)!);
    }
    
    const timeout = setTimeout(() => {
      handleTypingStop(channelId, userEmail);
    }, 3000);
    
    typingTimeoutRef.current.set(timeoutKey, timeout);
  }, []);

  const handleTypingStop = useCallback((channelId: string, userEmail: string) => {
    setTypingUsers(prev => {
      const newMap = new Map(prev);
      const channelUsers = newMap.get(channelId);
      if (channelUsers) {
        channelUsers.delete(userEmail);
        if (channelUsers.size === 0) {
          newMap.delete(channelId);
        }
      }
      return newMap;
    });

    // Clear timeout
    const timeoutKey = `${channelId}:${userEmail}`;
    if (typingTimeoutRef.current.has(timeoutKey)) {
      clearTimeout(typingTimeoutRef.current.get(timeoutKey)!);
      typingTimeoutRef.current.delete(timeoutKey);
    }
  }, []);

  // Send message to WebSocket
  const sendMessage = useCallback((message: ChatMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('💬 WebSocket not connected, cannot send message');
    }
  }, []);

  // API methods
  const joinChannel = useCallback((channelId: string) => {
    sendMessage({
      type: 'join_channel',
      data: { channelId },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  const leaveChannel = useCallback((channelId: string) => {
    sendMessage({
      type: 'leave_channel',
      data: { channelId },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  const sendChatMessage = useCallback((
    channelId: string, 
    content: string, 
    options: {
      messageType?: 'text' | 'file' | 'system';
      parentMessageId?: string;
      mentions?: string[];
      attachments?: any[];
    } = {}
  ) => {
    sendMessage({
      type: 'message',
      data: {
        channelId,
        content,
        messageType: options.messageType || 'text',
        parentMessageId: options.parentMessageId,
        mentions: options.mentions,
        attachments: options.attachments,
      },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  const startTyping = useCallback((channelId: string) => {
    sendMessage({
      type: 'typing',
      data: { channelId },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  const stopTyping = useCallback((channelId: string) => {
    sendMessage({
      type: 'stop_typing',
      data: { channelId },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  const markMessageAsRead = useCallback((channelId: string, messageId: string) => {
    sendMessage({
      type: 'message_read',
      data: { channelId, messageId },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear all typing timeouts
    for (const timeout of typingTimeoutRef.current.values()) {
      clearTimeout(timeout);
    }
    typingTimeoutRef.current.clear();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastPing: null,
    });
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  const isTyping = useCallback((channelId: string): string[] => {
    return Array.from(typingUsers.get(channelId) || []);
  }, [typingUsers]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionState,
    joinChannel,
    leaveChannel,
    sendMessage: sendChatMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    connect,
    disconnect,
    reconnect,
    isTyping,
  };
} 