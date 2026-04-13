// @epic-3.1-messaging: Unified WebSocket Hook - Robust client inspired by gorilla/websocket reliability
// @persona-sarah: PM needs reliable real-time messaging and collaboration
// @persona-david: Team lead needs robust communication infrastructure

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@/constants/urls';

export interface ChatMessage {
  type: 'message' | 'typing' | 'stop_typing' | 'join_channel' | 'leave_channel' | 
        'presence' | 'ping' | 'pong' | 'message_delivered' | 'message_read' | 
        'user_joined' | 'user_left' | 'channels' | 'recent_messages' | 'error';
  data: any;
  timestamp: number;
  userEmail?: string;
  channelId?: string;
  messageId?: string;
}

export interface RealtimeMessage {
  type: 'presence' | 'cursor' | 'session' | 'sync' | 'task_updated' | 'comment_created' | 'file_uploaded';
  data: any;
  timestamp: number;
  userEmail?: string;
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastPing: number | null;
  reconnectAttempts: number;
}

export interface UserPresence {
  userEmail: string;
  presence: 'online' | 'away' | 'busy' | 'offline';
  currentPage?: string;
  lastSeen: Date;
}

export interface TypingUser {
  userEmail: string;
  channelId: string;
  timestamp: number;
}

export interface UnifiedWebSocketOptions {
  userEmail: string;
  workspaceId: string;
  enabled?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  
  // Chat event handlers
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (user: TypingUser) => void;
  onStopTyping?: (user: TypingUser) => void;
  onUserJoined?: (userEmail: string, channelId: string) => void;
  onUserLeft?: (userEmail: string, channelId: string) => void;
  
  // Real-time event handlers
  onPresenceUpdate?: (users: UserPresence[]) => void;
  onCursorUpdate?: (cursor: any) => void;
  onTaskUpdate?: (data: any) => void;
  onCommentUpdate?: (data: any) => void;
  onFileUpdate?: (data: any) => void;
  
  // System event handlers
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onChannelAccessDenied?: (channelId: string) => void;
}

export interface UnifiedWebSocketAPI {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  socket: Socket | null;
  
  // Chat functionality
  sendMessage: (channelId: string, content: string, options?: {
    messageType?: 'text' | 'file' | 'system';
    parentMessageId?: string;
    mentions?: string[];
    attachments?: any[];
  }) => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  markMessageAsRead: (channelId: string, messageId: string) => void;
  getTypingUsers: (channelId: string) => string[];
  
  // Real-time collaboration
  updatePresence: (status: 'online' | 'away' | 'busy', currentPage?: string) => void;
  updateCursor: (x: number, y: number, elementId?: string, resourceId?: string) => void;
  joinResource: (resourceId: string, resourceType: string) => void;
  leaveResource: (resourceId: string) => void;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useUnifiedWebSocket(options: UnifiedWebSocketOptions): UnifiedWebSocketAPI {
  // ✅ Early validation - prevent any initialization if params are invalid
  const isValidParams = options.userEmail && 
                        options.workspaceId && 
                        options.userEmail !== '' && 
                        options.workspaceId !== '' &&
                        options.userEmail !== 'undefined' &&
                        options.workspaceId !== 'undefined' &&
                        !options.userEmail.includes('example.com') &&
                        !options.workspaceId.includes('demo-workspace');
  
  // Store options and handlers in refs to avoid effect loops
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isConnectingRef = useRef(false); // Prevent double connection in strict mode
  const queryClient = useQueryClient();

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastPing: null,
    reconnectAttempts: 0,
  });

  // Typing users state
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  // Stable connect/disconnect using refs
  const connect = useCallback(() => {
    const {
      enabled,
      userEmail,
      workspaceId,
      autoReconnect,
      maxReconnectAttempts,
    } = optionsRef.current;
    
    // ✅ Guard: Don't connect if missing or invalid required params
    if (!enabled || 
        !userEmail || 
        !workspaceId || 
        userEmail === '' ||
        workspaceId === '' ||
        userEmail === 'undefined' || 
        workspaceId === 'undefined' ||
        userEmail.includes('example.com') ||
        workspaceId.includes('demo-workspace')) {
      console.debug('🔌 WebSocket connection skipped: Invalid params', { userEmail, workspaceId, enabled });
      return;
    }

    // If already connected, don't reconnect
    if (socketRef.current?.connected) {
      return;
    }

    // Prevent double connection in React Strict Mode
    if (isConnectingRef.current) {
      console.debug('🔄 Connection already in progress, skipping duplicate attempt');
      return;
    }

    // Clean up any existing socket that's not connected before creating a new one
    if (socketRef.current && !socketRef.current.connected) {
      try {
        const oldSocket = socketRef.current;
        oldSocket.removeAllListeners();
        // Only disconnect if socket was trying to connect, otherwise just clear it
        if (oldSocket.active) {
          oldSocket.disconnect();
        }
      } catch (error) {
        // Ignore cleanup errors
        console.debug('Cleanup during connect:', error);
      }
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // 🔒 SECURITY: Get session token from multiple sources (cookie is httpOnly, so try localStorage fallback)
      const getSessionToken = () => {
        // Method 1: Try localStorage (development fallback - token is returned in sign-in response)
        const localStorageToken = localStorage.getItem('sessionToken');
        if (localStorageToken) {
          console.log('✅ Session token found in localStorage');
          return localStorageToken.trim();
        }
        
        // Method 2: Try cookie (might work in development if not httpOnly)
        const cookies = document.cookie.split(';');
        const sessionCookie = cookies.find(c => c.trim().startsWith('session='));
        const cookieToken = sessionCookie ? sessionCookie.split('=')[1].trim() : undefined;
        
        if (cookieToken) {
          console.log('✅ Session token found in cookie');
          return cookieToken;
        }
        
        // Debug logging - no token found
        console.error('❌ No session token found in any source');
        console.error('Available cookies:', cookies.map(c => c.trim().split('=')[0]));
        console.error('localStorage sessionToken:', localStorageToken ? 'exists' : 'missing');
        console.warn('💡 Note: Session cookie may be httpOnly (not accessible to JS). Try localStorage fallback.');
        
        return undefined;
      };

      const sessionToken = getSessionToken();
      
      if (!sessionToken) {
        console.error('❌ No session token found - user must be logged in');
        console.error('💡 WebSocket requires authentication. Please ensure you are logged in.');
        setConnectionState(prev => ({ 
          ...prev, 
          error: 'No session token. Please log in and refresh the page.',
          isConnecting: false 
        }));
        isConnectingRef.current = false;
        return;
      }

      // 🔒 SECURITY: Send auth token, NOT userEmail (prevents impersonation)
      const socket = io(WS_URL, {
        auth: {
          token: sessionToken, // ✅ Session token for server validation
        },
        query: { 
          workspaceId // ✅ Only workspace ID in query (userEmail comes from validated token)
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: autoReconnect,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        withCredentials: true, // ✅ Send cookies with WebSocket
      });

      socketRef.current = socket;
      setSocketInstance(socket);

      // Connection events
      socket.on('connect', () => {
        isConnectingRef.current = false; // Reset flag on successful connection
        setConnectionState({
          isConnected: true,
          isConnecting: false,
          error: null,
          lastPing: Date.now(),
          reconnectAttempts: 0,
        });
        optionsRef.current.onConnect?.();
      });

      socket.on('connected', (data) => {
        // Handle initial connection data if needed
      });

      socket.on('disconnect', (reason) => {
        isConnectingRef.current = false; // Reset flag on disconnect
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: reason !== 'io client disconnect' ? `Disconnected: ${reason}` : null,
        }));
        setSocketInstance(null);
        optionsRef.current.onDisconnect?.();
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        isConnectingRef.current = false; // Reset flag on error
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: `Connection failed: ${error.message}`,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));
        setSocketInstance(null);
        optionsRef.current.onError?.(`Connection failed: ${error.message}`);
      });

      // Chat message handlers
      socket.on('chat:message', (message: ChatMessage) => {
        optionsRef.current.onMessage?.(message);
        
        // Update query cache for messages
        if (message.channelId) {
          queryClient.invalidateQueries({ queryKey: ['messages', message.channelId] });
        }
      });

      socket.on('chat:channels', (data) => {
        // Update channels cache
        queryClient.setQueryData(['channels', workspaceId], data.channels);
      });

      socket.on('chat:recent_messages', (data) => {
        // Update messages cache
        if (data.channelId) {
          queryClient.setQueryData(['messages', data.channelId], data.messages);
        }
      });

      socket.on('chat:message_delivered', (data) => {
        // Handle message delivery confirmation
      });

      // Typing indicators
      socket.on('chat:typing', (data) => {
        if (data.type === 'typing' && data.channelId && data.data?.userEmail) {
          handleTypingStart(data.channelId, data.data.userEmail);
          optionsRef.current.onTyping?.({
            userEmail: data.data.userEmail,
            channelId: data.channelId,
            timestamp: data.timestamp,
          });
        } else if (data.type === 'stop_typing' && data.channelId && data.data?.userEmail) {
          handleTypingStop(data.channelId, data.data.userEmail);
          optionsRef.current.onStopTyping?.({
            userEmail: data.data.userEmail,
            channelId: data.channelId,
            timestamp: data.timestamp,
          });
        }
      });

      // User join/leave events
      socket.on('chat:user_event', (data) => {
        if (data.type === 'user_joined' && data.data?.userEmail && data.channelId) {
          optionsRef.current.onUserJoined?.(data.data.userEmail, data.channelId);
        } else if (data.type === 'user_left' && data.data?.userEmail && data.channelId) {
          optionsRef.current.onUserLeft?.(data.data.userEmail, data.channelId);
        }
      });

      // Real-time collaboration handlers
      socket.on('realtime:presence', (data) => {
        optionsRef.current.onPresenceUpdate?.([data]);
      });

      socket.on('realtime:presence_list', (data) => {
        optionsRef.current.onPresenceUpdate?.(data.users);
      });

      socket.on('realtime:cursor', (data) => {
        optionsRef.current.onCursorUpdate?.(data);
      });

      socket.on('realtime:sync', (data) => {
        switch (data.type) {
          case 'task_updated':
            optionsRef.current.onTaskUpdate?.(data.data);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            break;
          case 'comment_created':
            optionsRef.current.onCommentUpdate?.(data.data);
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            break;
          case 'file_uploaded':
            optionsRef.current.onFileUpdate?.(data.data);
            queryClient.invalidateQueries({ queryKey: ['attachments'] });
            break;
        }
      });

      socket.on('realtime:broadcast', (data) => {
        // Handle general broadcasts
      });

      // System events
      socket.on('ping', () => {
        setConnectionState(prev => ({ ...prev, lastPing: Date.now() }));
        socket.emit('pong');
      });

      socket.on('pong', (data) => {
        setConnectionState(prev => ({ ...prev, lastPing: data.timestamp }));
      });

      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        
        // Handle specific error types
        if (error.error === 'Access denied to channel') {
          console.warn('⚠️ Channel access denied - user may need to join channel first');
          // Attempt to join the channel if it's a public channel access issue
          optionsRef.current.onChannelAccessDenied?.(error.channelId);
        } else if (error.error === 'Authentication failed') {
          console.error('🔒 Authentication failed - redirecting to login');
          setConnectionState(prev => ({ ...prev, isAuthenticated: false }));
        }
        
        optionsRef.current.onError?.(error.error || 'Unknown error');
      });

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to create connection',
      }));
      optionsRef.current.onError?.('Failed to create connection');
    }
  }, []);

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

  // Emit helper
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('🔗 Cannot emit event: WebSocket not connected');
    }
  }, []);

  // Chat API methods
  const sendMessage = useCallback((
    channelId: string, 
    content: string, 
    options: {
      messageType?: 'text' | 'file' | 'system';
      parentMessageId?: string;
      mentions?: string[];
      attachments?: any[];
    } = {}
  ) => {
    emit('chat:message', {
      channelId,
      content,
      messageType: options.messageType || 'text',
      parentMessageId: options.parentMessageId,
      mentions: options.mentions,
      attachments: options.attachments,
    });
  }, [emit]);

  const joinChannel = useCallback((channelId: string) => {
    emit('chat:join_channel', { channelId });
  }, [emit]);

  const leaveChannel = useCallback((channelId: string) => {
    emit('chat:leave_channel', { channelId });
  }, [emit]);

  const startTyping = useCallback((channelId: string) => {
    emit('chat:typing', { channelId });
  }, [emit]);

  const stopTyping = useCallback((channelId: string) => {
    emit('chat:stop_typing', { channelId });
  }, [emit]);

  const markMessageAsRead = useCallback((channelId: string, messageId: string) => {
    emit('chat:mark_read', { channelId, messageId });
  }, [emit]);

  const getTypingUsers = useCallback((channelId: string): string[] => {
    return Array.from(typingUsers.get(channelId) || []);
  }, [typingUsers]);

  // Real-time collaboration API methods
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy', currentPage?: string) => {
    emit('realtime:presence', { status, currentPage });
  }, [emit]);

  const updateCursor = useCallback((x: number, y: number, elementId?: string, resourceId?: string) => {
    emit('realtime:cursor', { x, y, elementId, resourceId });
  }, [emit]);

  const joinResource = useCallback((resourceId: string, resourceType: string) => {
    emit('realtime:session', { resourceId, resourceType, action: 'join' });
  }, [emit]);

  const leaveResource = useCallback((resourceId: string) => {
    emit('realtime:session', { resourceId, action: 'leave' });
  }, [emit]);

  // Connection management
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

    // CRITICAL: Safely disconnect socket if it exists
    if (socketRef.current) {
      const socket = socketRef.current;
      
      // Safely clean up socket regardless of connection state
      try {
        // Remove all listeners first to prevent event handler errors
        socket.removeAllListeners();
        
        // Only disconnect if socket is actually connected
        // Avoid calling disconnect() on sockets that never connected (prevents "closed before connection established" errors)
        if (socket.connected) {
          socket.disconnect();
        } else {
          // Socket not connected - check if it's in a connecting state
          // Use safe property access to avoid errors
          const manager = (socket as any).io;
          if (manager && typeof manager.readyState === 'string') {
            const readyState = manager.readyState;
            // Only try to disconnect if socket is actually open or opening
            if (readyState === 'open' || readyState === 'opening') {
              try {
                socket.disconnect();
              } catch (disconnectError) {
                // Socket may have closed between check and disconnect call - safe to ignore
                console.debug('Cleanup: Error during disconnect on opening socket', disconnectError);
              }
            }
          }
          // If socket never connected and is not opening, just let it be - it will clean up automatically
        }
      } catch (error) {
        // Ignore errors during cleanup - socket may already be closed
        console.debug('Cleanup: Socket cleanup error (safe to ignore)', error);
      }
      
      socketRef.current = null;
    }

    isConnectingRef.current = false;
    setSocketInstance(null);

    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastPing: null,
      reconnectAttempts: 0,
    });
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Auto-connect and cleanup - use empty deps to prevent re-connection loops
  useEffect(() => {
    const { enabled, userEmail, workspaceId } = optionsRef.current;
    
    // ✅ Only connect if we have valid, real parameters
    if (enabled && isValidParams) {
      connect();
    } else {
      console.debug('🔌 WebSocket auto-connect skipped', { enabled, isValidParams, userEmail, workspaceId });
    }

    return () => {
      // CRITICAL: Always disconnect and cleanup all resources on unmount
      // This prevents memory leaks from accumulated socket listeners and timeouts
      disconnect();
      isConnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidParams]);

  return {
    connectionState,
    isConnected: connectionState.isConnected,
    socket: socketInstance,
    sendMessage,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
    markMessageAsRead,
    getTypingUsers,
    updatePresence,
    updateCursor,
    joinResource,
    leaveResource,
    connect,
    disconnect,
    reconnect,
  };
} 