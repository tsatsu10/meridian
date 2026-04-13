// @epic-3.6-communication: Socket.IO hook for real-time chat
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import { WS_URL } from '@/constants/urls';
import { logger } from "@/lib/logger";

export interface SocketMessage {
  id: string;
  channelId: string;
  content: string;
  userEmail: string;
  userName?: string;
  timestamp: string;
  messageType?: string;
}

export interface TypingStatus {
  channelId: string;
  userEmail: string;
  isTyping: boolean;
}

export const useSocket = () => {
  const { user } = useAuth();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const getSessionToken = () => {
    const localStorageToken = localStorage.getItem('sessionToken');
    if (localStorageToken) return localStorageToken.trim();
    const sessionCookie = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('session='));
    return sessionCookie ? sessionCookie.split('=')[1]?.trim() : undefined;
  };

  useEffect(() => {
    if (!user?.email || !workspace?.id) return;

    const sessionToken = getSessionToken();
    if (!sessionToken) {
      logger.warn('Socket connection skipped: missing session token');
      return;
    }

    // Connect to WebSocket server
    const socket = io(WS_URL, {
      transports: ['websocket'],
      auth: {
        token: sessionToken,
      },
      query: { workspaceId: workspace.id },
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      logger.debug('✅ Socket.IO connected');
    });

    socket.on('disconnect', () => {
      logger.debug('❌ Socket.IO disconnected');
    });

    // Listen for new messages
    socket.on('chat:message', (message: SocketMessage) => {
      logger.debug('📨 New message received:', message);
      
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({ queryKey: ['messages', message.channelId] });
      // Also invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    // Listen for message delivery status
    socket.on('chat:message:delivered', ({ messageId }) => {
      logger.debug('✅ Message delivered:', messageId);
    });

    // Listen for message read status
    socket.on('chat:message:read', ({ messageId, userEmail }) => {
      logger.debug('👁️ Message read by:', userEmail);
    });

    // Listen for typing status
    socket.on('chat:typing', (data: TypingStatus) => {
      logger.debug('⌨️ Typing status:', data);
      // TODO: Handle typing indicator
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.email, workspace?.id, queryClient]);

  const sendMessage = useCallback((channelId: string, content: string, messageType: string = 'text') => {
    if (!socketRef.current || !user?.email) return;

    socketRef.current.emit('chat:message', {
      channelId,
      content,
      userEmail: user.email,
      messageType,
    });
  }, [user?.email]);

  const sendTypingStatus = useCallback((channelId: string, isTyping: boolean) => {
    if (!socketRef.current || !user?.email) return;

    socketRef.current.emit('chat:typing', {
      channelId,
      userEmail: user.email,
      isTyping,
    });
  }, [user?.email]);

  const markMessageAsRead = useCallback((messageId: string) => {
    if (!socketRef.current || !user?.email) return;

    socketRef.current.emit('chat:message:read', {
      messageId,
      userEmail: user.email,
    });
  }, [user?.email]);

  return {
    socket: socketRef.current,
    sendMessage,
    sendTypingStatus,
    markMessageAsRead,
  };
};

