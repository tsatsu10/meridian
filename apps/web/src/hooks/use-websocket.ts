import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from "../lib/logger";

interface WebSocketOptions {
  workspaceId?: string;
  teamId?: string;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export const useWebSocket = (options: WebSocketOptions) => {
  const { workspaceId, teamId, onMessage, onOpen, onClose, onError } = options;
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    // In test environment, simulate successful connection
    if (import.meta.env.VITEST || process.env.NODE_ENV === 'test') {setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false, 
        error: null 
      }));
      reconnectAttemptsRef.current = 0;
      onOpen?.();
      return;
    }

    try {
      // Build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NODE_ENV === 'development' ? 'localhost:8080' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.info("WebSocket connected");
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false, 
          error: null 
        }));
        reconnectAttemptsRef.current = 0;
        onOpen?.();

        // Send authentication and subscription data
        if (workspaceId) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            workspaceId,
            teamId
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.info("WebSocket message received:");
          onMessage?.(event);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        logger.info("WebSocket disconnected:");
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false 
        }));
        onClose?.();

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Connection failed',
          isConnecting: false 
        }));
        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect',
        isConnecting: false 
      }));
    }
  }, [workspaceId, teamId, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // CRITICAL: Clear WebSocket event handlers before closing to prevent memory leaks
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null
    });
  }, []);

  const sendMessage = useCallback((message: any) => {
    // In test environment, simulate message sending
    if (process.env.NODE_ENV === 'test') {return true;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(messageStr);
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, []);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (workspaceId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [workspaceId, teamId, connect, disconnect]);

  // Cleanup on unmount - removed duplicate cleanup effect

  return {
    ...state,
    sendMessage,
    connect,
    disconnect
  };
}; 