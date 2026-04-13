import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@/constants/urls';
import { useAuthStore } from '@/store/consolidated/auth';
import { logger } from "../lib/logger";

// Phase 1.1: WebSocket Singleton Pattern with Memory Optimization
// Target: Reduce memory usage by 40%
export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, Socket> = new Map();
  private subscribers: Map<string, Set<(socket: Socket) => void>> = new Map();
  private disconnectSubscribers: Map<string, Set<() => void>> = new Map();
  private connectionPromises: Map<string, Promise<Socket>> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();
  private memoryUsage: number = 0;
  private maxConnections: number = 10; // Limit concurrent connections

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Connection pooling and cleanup logic
  async getConnection(userEmail: string, workspaceId: string, sessionToken?: string): Promise<Socket> {
    const connectionKey = `${userEmail}:${workspaceId}`;

    // Check if connection already exists
    if (this.connections.has(connectionKey)) {
      const socket = this.connections.get(connectionKey)!;
      if (socket.connected) {
        return socket;
      }
    }

    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      this.cleanupOldestConnection();
    }

    // Create new connection
    if (this.connectionPromises.has(connectionKey)) {
      return this.connectionPromises.get(connectionKey)!;
    }

    const connectionPromise = this.createConnection(userEmail, workspaceId, connectionKey, sessionToken);
    this.connectionPromises.set(connectionKey, connectionPromise);

    return connectionPromise;
  }

  private async createConnection(userEmail: string, workspaceId: string, connectionKey: string, sessionToken?: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const wsUrl = WS_URL;
      logger.info(`🔗 Creating WebSocket connection to: ${wsUrl} for ${connectionKey}`);

      // Use provided session token or get from auth store
      let token = sessionToken;
      if (!token) {
        const authState = useAuthStore.getState();
        token = authState.sessionToken;
      }

      // Reject connection if no valid session token
      if (!token) {
        logger.info("🚫 WebSocket connection rejected: No session token available");
        reject(new Error('No session token available'));
        return;
      }

      logger.info(`🔑 Using session token for WebSocket auth: ${token ? token.substring(0, 10) + '...' : 'none'}`);

      const socket = io(wsUrl, {
        query: {
          userEmail,
          workspaceId,
          sessionToken: token
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socket.on('connect', () => {
        logger.info(`✅ WebSocket connected for ${connectionKey}`);
        this.connections.set(connectionKey, socket);
        this.connectionPromises.delete(connectionKey);
        this.updateMemoryUsage();
        resolve(socket);
        
        // Notify subscribers
        const subscribers = this.subscribers.get(connectionKey);
        if (subscribers) {
          subscribers.forEach(callback => callback(socket));
        }
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ WebSocket connection error for ${connectionKey}:`, error);
        this.connectionPromises.delete(connectionKey);
        this.connections.delete(connectionKey);
        this.updateMemoryUsage();
        reject(error);
      });

      socket.on('disconnect', () => {
        logger.info(`🔌 WebSocket disconnected for ${connectionKey}`);
        this.connections.delete(connectionKey);
        this.updateMemoryUsage();
        
        // Notify disconnect subscribers
        const disconnectSubs = this.disconnectSubscribers.get(connectionKey);
        if (disconnectSubs) {
          disconnectSubs.forEach(callback => callback());
        }
      });

      // Set cleanup timer for inactive connections
      this.setupCleanupTimer(connectionKey);
    });
  }

  private setupCleanupTimer(connectionKey: string): void {
    // Clear existing timer
    if (this.cleanupTimers.has(connectionKey)) {
      clearTimeout(this.cleanupTimers.get(connectionKey)!);
    }

    // Set new timer (5 minutes of inactivity)
    const timer = setTimeout(() => {
      this.cleanupConnection(connectionKey);
    }, 5 * 60 * 1000);

    this.cleanupTimers.set(connectionKey, timer);
  }

  private cleanupConnection(connectionKey: string): void {
    const socket = this.connections.get(connectionKey);
    if (socket) {
      socket.disconnect();
      this.connections.delete(connectionKey);
      this.subscribers.delete(connectionKey);
      this.disconnectSubscribers.delete(connectionKey);
      this.updateMemoryUsage();
      logger.info(`🧹 Cleaned up connection: ${connectionKey}`);
    }
  }

  private cleanupOldestConnection(): void {
    const oldestKey = this.connections.keys().next().value;
    if (oldestKey) {
      this.cleanupConnection(oldestKey);
    }
  }

  subscribe(connectionKey: string, callback: (socket: Socket) => void): () => void {
    if (!this.subscribers.has(connectionKey)) {
      this.subscribers.set(connectionKey, new Set());
    }
    this.subscribers.get(connectionKey)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(connectionKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(connectionKey);
        }
      }
    };
  }

  subscribeToDisconnect(connectionKey: string, callback: () => void): () => void {
    if (!this.disconnectSubscribers.has(connectionKey)) {
      this.disconnectSubscribers.set(connectionKey, new Set());
    }
    this.disconnectSubscribers.get(connectionKey)!.add(callback);

    return () => {
      const subscribers = this.disconnectSubscribers.get(connectionKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.disconnectSubscribers.delete(connectionKey);
        }
      }
    };
  }

  private updateMemoryUsage(): void {
    // Estimate memory usage based on connections and subscribers
    this.memoryUsage = this.connections.size * 1024 * 1024; // ~1MB per connection
    logger.info(`📊 Memory usage: ${(this.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  }

  getMemoryUsage(): number {
    return this.memoryUsage;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  // Cleanup all connections (for testing or app shutdown)
  cleanupAll(): void {
    this.connections.forEach((socket, key) => {
      socket.disconnect();
    });
    this.connections.clear();
    this.subscribers.clear();
    this.disconnectSubscribers.clear();
    this.connectionPromises.clear();
    this.cleanupTimers.forEach(timer => clearTimeout(timer));
    this.cleanupTimers.clear();
    this.memoryUsage = 0;
  }
}

// Global WebSocket manager instance
const webSocketManager = WebSocketManager.getInstance();

interface UnifiedWebSocketOptions {
  userEmail: string;
  workspaceId: string;
  enabled?: boolean;
  onMessage?: (message: any) => void;
  onTypingStart?: (data: any) => void;
  onTypingStop?: (data: any) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
  onPresenceUpdate?: (users: any[]) => void;
  onTaskUpdate?: (task: any) => void;
  onCommentUpdate?: (comment: any) => void;
  onFileUpdate?: (file: any) => void;
  onError?: (error: string) => void;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  isAuthenticated: boolean;
  lastPing: number | null;
}

export function useUnifiedWebSocketSingleton(options: UnifiedWebSocketOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
    isAuthenticated: true,
    lastPing: null,
  });

  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  const socketRef = useRef<Socket | null>(null);

  // Get auth state for session token
  const { sessionToken } = useAuthStore();

  // Update options ref only when callbacks change
  useEffect(() => {
    optionsRef.current = options;
  }); // No dependency array - runs on every render but doesn't cause re-renders

  const connect = useCallback(async () => {
    const currentOptions = optionsRef.current;

    // Enhanced validation: Check that auth is not in loading state and has valid data
    if (!currentOptions.enabled || !currentOptions.userEmail || !currentOptions.workspaceId || !sessionToken) {
      logger.info("🚫 WebSocket connection skipped: Missing required parameters");
      return;
    }

    if (connectionState.isConnecting || socketRef.current?.connected) {
      return;
    }

    logger.info("🔄 Attempting WebSocket connection with authenticated user:");

    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const socket = await webSocketManager.getConnection(currentOptions.userEmail, currentOptions.workspaceId, sessionToken);
      socketRef.current = socket;
      
      setConnectionState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false,
        error: null 
      }));

      // Set up event listeners for this instance
      setupEventListeners(socket);

    } catch (error) {
      console.error('❌ Failed to connect to singleton WebSocket:', error);
      setConnectionState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to connect',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }
  }, [connectionState.isConnecting, sessionToken]); // Include sessionToken in dependency array

  const setupEventListeners = useCallback((socket: Socket) => {
    // Chat events
    socket.on('chat:message_sent', (data) => {
      optionsRef.current.onMessage?.(data);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    });

    // Typing events
    socket.on('chat:typing_start', (data) => {
      optionsRef.current.onTypingStart?.(data);
    });

    socket.on('chat:typing_stop', (data) => {
      optionsRef.current.onTypingStop?.(data);
    });

    // Presence events
    socket.on('presence:user_joined', (data) => {
      optionsRef.current.onUserJoined?.(data);
      setOnlineUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
    });

    socket.on('presence:user_left', (data) => {
      optionsRef.current.onUserLeft?.(data);
      setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
    });

    socket.on('presence:online_users', (data) => {
      optionsRef.current.onPresenceUpdate?.(data.users);
      setOnlineUsers(data.users);
    });

    // Realtime sync events
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

    socket.on('error', (error) => {
      console.error('❌ Singleton WebSocket error:', error);
      optionsRef.current.onError?.(error.error || 'Unknown error');
    });
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Remove this instance's listeners
      socketRef.current.off();
      socketRef.current = null;
    }
    
    setConnectionState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }));
  }, []);

  // Subscribe to global socket events
  useEffect(() => {
    const currentOptions = optionsRef.current;
    if (!currentOptions.enabled || !currentOptions.userEmail || !currentOptions.workspaceId || !sessionToken) {
      return;
    }

    const onConnect = (socket: Socket) => {
      socketRef.current = socket;
      setConnectionState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      setupEventListeners(socket);
    };

    const onDisconnect = () => {
      setConnectionState(prev => ({ ...prev, isConnected: false }));
      socketRef.current = null;
    };

    const connectionKey = `${currentOptions.userEmail}:${currentOptions.workspaceId}`;
    const unsubscribe = webSocketManager.subscribe(connectionKey, onConnect);
    const disconnectUnsubscribe = webSocketManager.subscribeToDisconnect(connectionKey, onDisconnect);

    // Auto-connect
    connect();

    return () => {
      unsubscribe();
      disconnectUnsubscribe();
      disconnect();
    };
  }, [options.enabled, options.userEmail, options.workspaceId, sessionToken]); // Include sessionToken

  // API methods
  const sendMessage = useCallback((channelId: string, content: string, parentMessageId?: string) => {
    socketRef.current?.emit('chat:send_message', {
      channelId,
      content,
      parentMessageId,
      userEmail: options.userEmail,
      workspaceId: options.workspaceId,
    });
  }, [options.userEmail, options.workspaceId]);

  const startTyping = useCallback((channelId: string) => {
    socketRef.current?.emit('chat:typing_start', {
      channelId,
      userEmail: options.userEmail,
    });
  }, [options.userEmail]);

  const stopTyping = useCallback((channelId: string) => {
    socketRef.current?.emit('chat:typing_stop', {
      channelId,
      userEmail: options.userEmail,
    });
  }, [options.userEmail]);

  const updatePresence = useCallback((status: string) => {
    socketRef.current?.emit('presence:update', {
      userEmail: options.userEmail,
      workspaceId: options.workspaceId,
      status,
    });
  }, [options.userEmail, options.workspaceId]);

  return {
    connectionState,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    updatePresence,
    connect,
    disconnect,
    getTypingUsers: (channelId: string) => Array.from(typingUsers.get(channelId) || []),
  };
}