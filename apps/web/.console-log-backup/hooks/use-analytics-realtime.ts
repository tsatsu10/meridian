import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@/constants/urls';
import { toast } from 'sonner';

// @epic-3.1-analytics: Real-time analytics updates via WebSocket
// @role-workspace-manager: Live dashboard updates for executive monitoring
// @role-department-head: Real-time team performance tracking
//
// TODO: Backend Implementation Required
// The UnifiedWebSocketServer needs to support analytics-specific events:
// - analytics:subscribe - Subscribe to workspace analytics updates
// - analytics:unsubscribe - Unsubscribe from updates
// - analytics:refresh - Request immediate analytics refresh
// - analytics:update - Receive analytics data updates
// - analytics:metric-update - Receive specific metric updates
// - analytics:project-health - Receive project health updates
// - analytics:team-activity - Receive team activity updates
//
// Connection also needs to pass userEmail in handshake query parameters

interface AnalyticsRealtimeOptions {
  workspaceId: string;
  enabled?: boolean;
  onUpdate?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

export function useAnalyticsRealtime(options: AnalyticsRealtimeOptions) {
  const {
    workspaceId,
    enabled = false, // TODO: Enable when backend analytics WebSocket support is implemented
    onUpdate,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    error: null,
  });

  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !workspaceId) {
      return;
    }

    try {
      // Create socket connection
      const socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        query: {
          workspaceId,
          type: 'analytics'
        }
      });

      // Connection handlers
      socket.on('connect', () => {
        console.log('[Analytics WS] Connected');
        setConnectionStatus({
          connected: true,
          reconnecting: false,
          error: null,
        });
        
        // Subscribe to analytics updates
        socket.emit('analytics:subscribe', { workspaceId });
        
        onConnect?.();
      });

      socket.on('disconnect', (reason) => {
        console.log('[Analytics WS] Disconnected:', reason);
        setConnectionStatus((prev) => ({
          ...prev,
          connected: false,
        }));
        
        onDisconnect?.();

        // Auto-reconnect if not manual disconnect
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('[Analytics WS] Connection error:', error);
        setConnectionStatus({
          connected: false,
          reconnecting: true,
          error: error.message,
        });

        onError?.(error);
      });

      socket.on('reconnecting', (attemptNumber) => {
        console.log(`[Analytics WS] Reconnecting attempt ${attemptNumber}...`);
        setConnectionStatus((prev) => ({
          ...prev,
          reconnecting: true,
        }));
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`[Analytics WS] Reconnected after ${attemptNumber} attempts`);
        setConnectionStatus({
          connected: true,
          reconnecting: false,
          error: null,
        });
        
        // Resubscribe after reconnection
        socket.emit('analytics:subscribe', { workspaceId });
      });

      socket.on('reconnect_failed', () => {
        console.error('[Analytics WS] Reconnection failed');
        setConnectionStatus({
          connected: false,
          reconnecting: false,
          error: 'Failed to reconnect to analytics server',
        });
        
        toast.error('Lost connection to analytics server');
      });

      // Analytics update handlers
      socket.on('analytics:update', (data) => {
        console.log('[Analytics WS] Received update:', data);
        setLiveUpdates((prev) => [data, ...prev].slice(0, 50)); // Keep last 50 updates
        onUpdate?.(data);
      });

      socket.on('analytics:metric-update', (data) => {
        console.log('[Analytics WS] Metric updated:', data);
        onUpdate?.(data);
      });

      socket.on('analytics:project-health', (data) => {
        console.log('[Analytics WS] Project health updated:', data);
        onUpdate?.(data);
      });

      socket.on('analytics:team-activity', (data) => {
        console.log('[Analytics WS] Team activity updated:', data);
        onUpdate?.(data);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('[Analytics WS] Setup error:', error);
      setConnectionStatus({
        connected: false,
        reconnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      onError?.(error instanceof Error ? error : new Error('Socket setup failed'));
    }
  }, [enabled, workspaceId, onConnect, onDisconnect, onError, onUpdate]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[Analytics WS] Disconnecting...');
      socketRef.current.emit('analytics:unsubscribe', { workspaceId });
      socketRef.current.disconnect();
      socketRef.current = null;
      
      setConnectionStatus({
        connected: false,
        reconnecting: false,
        error: null,
      });
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [workspaceId]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  // Clear live updates
  const clearUpdates = useCallback(() => {
    setLiveUpdates([]);
  }, []);

  // Request analytics refresh
  const requestRefresh = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('analytics:refresh', { workspaceId });
    }
  }, [workspaceId]);

  // Effect to manage connection
  useEffect(() => {
    if (enabled && workspaceId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, workspaceId, connect, disconnect]);

  return {
    connectionStatus,
    liveUpdates,
    reconnect,
    disconnect,
    clearUpdates,
    requestRefresh,
    isConnected: connectionStatus.connected,
    isReconnecting: connectionStatus.reconnecting,
    hasError: !!connectionStatus.error,
    error: connectionStatus.error,
  };
}

