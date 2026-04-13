// Phase 2.1: Stable WebSocket Hook for Real-time Messaging
// Enhanced version with graceful fallback handling and server availability detection

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import useWorkspaceStore from '@/store/workspace'
import { useAuth } from '@/components/providers/unified-context-provider'
import { logger } from "../lib/logger";

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'user_joined' | 'user_left' | 'presence' | 'error'
  channelId?: string
  userEmail?: string
  data?: any
  timestamp?: number
}

interface ConnectionState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  reconnectAttempts: number
  isOfflineMode: boolean
  serverAvailable: boolean
}

interface UseStableWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onTyping?: (userEmail: string, channelId: string) => void
  onUserJoined?: (userEmail: string, channelId: string) => void
  onUserLeft?: (userEmail: string, channelId: string) => void
  onError?: (error: string) => void
  autoConnect?: boolean
  onMessageSent?: (messageId: string) => void
  onMessageFailed?: (messageId: string, error: Error) => void
}

interface UseStableWebSocketReturn {
  connectionState: ConnectionState
  sendMessage: (channelId: string, content: string, messageId: string) => void
  joinChannel: (channelId: string) => void
  leaveChannel: (channelId: string) => void
  startTyping: (channelId: string) => void
  stopTyping: (channelId: string) => void
  connect: () => void
  disconnect: () => void
}

export function useStableWebSocket(options: UseStableWebSocketOptions = {}): UseStableWebSocketReturn {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuth()
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
    isOfflineMode: false,
    serverAvailable: true,
  })
  
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const optionsRef = useRef(options)
  
  // Update options ref when options change
  optionsRef.current = options
  
  // Server availability check
  const checkServerAvailability = useCallback(async (): Promise<boolean> => {
    const maxRetries = 3; // Or more, depending on desired resilience
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Health check on the main API server (port 3007) which hosts HTTP API
        const healthUrl = 'http://localhost:3007/health'
        
        // Quick health check to see if server is running
        const response = await fetch(healthUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        })
        if (response.ok) {
          return true;
        }
      } catch (error) {
        console.warn(`Server health check failed (attempt ${i + 1}/${maxRetries}):`, error);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff for retries
        }
      }
    }
    return false; // All retries failed
  }, [])

  const enableOfflineMode = useCallback(() => {
    logger.info("🔄 Switching to offline mode - chat will work locally only")
    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      isOfflineMode: true,
      serverAvailable: false,
      error: 'Working in offline mode',
    }))
  }, [])

  const connect = useCallback(async () => {
    // Check if WebSocket is disabled or if we're missing required data
    const isWebSocketDisabled = import.meta.env.VITE_DISABLE_WEBSOCKET === 'true';
    if (!user?.email || !workspace?.id || process.env.NODE_ENV === 'test' || isWebSocketDisabled) {
      if (isWebSocketDisabled) {
        logger.info("🔌 WebSocket disabled via environment variable");
        enableOfflineMode();
      }
      return
    }
    
    // Don't connect if already connected or connecting
    if (socketRef.current?.connected || connectionState.isConnecting) {
      return
    }

    // Check server availability first
    const serverAvailable = await checkServerAvailability()
    if (!serverAvailable) {
      enableOfflineMode()
      return
    }
    
    setConnectionState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null,
      serverAvailable: true,
      isOfflineMode: false
    }))
    
    try {
      // Convert ws:// to http:// for Socket.IO
      const wsUrlRaw = import.meta.env.VITE_WS_URL || 'ws://localhost:3007'
      const wsUrl = wsUrlRaw.replace('ws://', 'http://').replace('wss://', 'https://')
      
      logger.info("🔗 Connecting to Socket.IO:")
      const socket = io(wsUrl, {
        query: { 
          userEmail: user.email, 
          workspaceId: workspace.id 
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: false, // We handle reconnection manually
        timeout: 5000,
        forceNew: true,
        autoConnect: true,
      })

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!socket.connected) {
          socket.disconnect()
          logger.info("⏱️ Socket.IO connection timeout, switching to offline mode")
          enableOfflineMode()
        }
      }, 5000) // 5 second timeout
      
      socket.on('connect', () => {
        clearTimeout(connectionTimeout)
        logger.info("✅ Socket.IO connected")
        setConnectionState({
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
          isOfflineMode: false,
          serverAvailable: true,
        })
      })
      
      // Set up Socket.IO event listeners
      socket.on('message', (message: WebSocketMessage) => {
        optionsRef.current.onMessage?.(message)
      })
      
      socket.on('typing', (data: { userEmail: string, channelId: string }) => {
        optionsRef.current.onTyping?.(data.userEmail, data.channelId)
      })
      
      socket.on('user_joined', (data: { userEmail: string, channelId: string }) => {
        optionsRef.current.onUserJoined?.(data.userEmail, data.channelId)
      })
      
      socket.on('user_left', (data: { userEmail: string, channelId: string }) => {
        optionsRef.current.onUserLeft?.(data.userEmail, data.channelId)
      })
      
      socket.on('error', (error: any) => {
        console.error('Socket.IO error:', error)
        optionsRef.current.onError?.(error.message || 'Socket.IO error')
      })
      
      socket.on('connect_error', (error) => {
        clearTimeout(connectionTimeout)
        console.error('Socket.IO connection error:', error)
        setConnectionState(prev => ({ 
          ...prev, 
          error: 'Connection error',
          serverAvailable: false
        }))
        optionsRef.current.onError?.('Connection error')
      })
      
      socket.on('disconnect', (reason) => {
        clearTimeout(connectionTimeout)
        logger.info("🔗 Socket.IO disconnected:")
        
        // Check if this was a server unavailability issue
        if (reason === 'transport error' || reason === 'transport close') {
          // Connection failed - likely server unavailable
          if (connectionState.reconnectAttempts >= 2) {
            logger.info("🔄 Max reconnection attempts reached, switching to offline mode")
            enableOfflineMode()
            return
          }
        }
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: reason !== 'io client disconnect' ? 'Connection closed unexpectedly' : null,
        }))
        
        // Auto-reconnect if not intentionally closed and server might be available
        if (reason !== 'io client disconnect' && connectionState.reconnectAttempts < 3 && !connectionState.isOfflineMode) {
          setConnectionState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }))
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, Math.pow(2, connectionState.reconnectAttempts) * 1000) // Exponential backoff
        }
      })
      
      socketRef.current = socket
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      enableOfflineMode()
    }
  }, [user?.email, workspace?.id, connectionState.reconnectAttempts, connectionState.isConnecting, connectionState.isOfflineMode, checkServerAvailability, enableOfflineMode])
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
      isOfflineMode: false,
      serverAvailable: true,
    })
  }, [])
  
  const sendMessage = useCallback((channelId: string, content: string, messageId: string) => {
    if (socketRef.current?.connected) {
      const message: WebSocketMessage = {
        type: 'message',
        channelId,
        data: {
          id: messageId,
          content,
          userEmail: user?.email,
          timestamp: Date.now(),
        },
      }
      try {
        socketRef.current.emit('message', message)
        optionsRef.current.onMessageSent?.(messageId)
      } catch (error) {
        optionsRef.current.onMessageFailed?.(messageId, error as Error)
      }
    } else if (connectionState.isOfflineMode) {
      // In offline mode, we could store messages locally for later sync
      logger.info("📴 Message sent in offline mode (local only):")
      optionsRef.current.onMessageFailed?.(messageId, new Error('Offline mode'))
    }
  }, [user?.email, connectionState.isOfflineMode])
  
  const joinChannel = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      const message: WebSocketMessage = {
        type: 'user_joined',
        channelId,
        userEmail: user?.email,
      }
      socketRef.current.emit('user_joined', message)
    } else if (connectionState.isOfflineMode) {
      logger.info("📴 Joined channel in offline mode:")
    }
  }, [user?.email, connectionState.isOfflineMode])
  
  const leaveChannel = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      const message: WebSocketMessage = {
        type: 'user_left',
        channelId,
        userEmail: user?.email,
      }
      socketRef.current.emit('user_left', message)
    } else if (connectionState.isOfflineMode) {
      logger.info("📴 Left channel in offline mode:")
    }
  }, [user?.email, connectionState.isOfflineMode])
  
  const startTyping = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      const message: WebSocketMessage = {
        type: 'typing',
        channelId,
        userEmail: user?.email,
        data: { isTyping: true },
      }
      socketRef.current.emit('typing', message)
    }
    // Skip typing indicators in offline mode (no need to log)
  }, [user?.email])
  
  const stopTyping = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      const message: WebSocketMessage = {
        type: 'typing',
        channelId,
        userEmail: user?.email,
        data: { isTyping: false },
      }
      socketRef.current.emit('typing', message)
    }
    // Skip typing indicators in offline mode (no need to log)
  }, [user?.email])
  
  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect !== false && user?.email && workspace?.id) {
      connect()
    }
    
    // Cleanup on dismount
    return () => {
      disconnect()
    }
  }, []) // Only run once on mount
  
  return {
    connectionState,
    sendMessage,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
    connect,
    disconnect,
  }
}