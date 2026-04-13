/**
 * Note Collaboration Hook - Phase 5.3
 * React hook for real-time note collaboration features
 * Handles live editing, cursor positions, presence indicators, and notifications
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from "@/lib/logger";

interface CursorPosition {
  userEmail: string;
  userName: string;
  position: number;
  selection?: { start: number; end: number };
  color: string;
}

interface Collaborator {
  userEmail: string;
  userName: string;
  color: string;
}

interface ContentChange {
  userEmail: string;
  userName: string;
  changes: {
    type: 'insert' | 'delete' | 'replace';
    position: number;
    content?: string;
    length?: number;
  }[];
  timestamp: string;
}

interface TypingIndicator {
  userEmail: string;
  isTyping: boolean;
  timestamp: string;
}

interface UseNoteCollaborationOptions {
  noteId: string;
  userEmail?: string;
  enabled?: boolean;
}

export function useNoteCollaboration({
  noteId,
  userEmail,
  enabled = true,
}: UseNoteCollaborationOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [remoteChanges, setRemoteChanges] = useState<ContentChange | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !noteId || !userEmail) return;

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3008';
    
    const newSocket = io(WS_URL, {
      query: {
        userEmail,
        workspaceId: 'default', // TODO: Get from workspace context
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      logger.debug('✅ Connected to WebSocket');
      setConnected(true);
      
      // Join note room
      newSocket.emit('note:join', { noteId, userEmail });
    });

    newSocket.on('disconnect', () => {
      logger.debug('❌ Disconnected from WebSocket');
      setConnected(false);
    });

    newSocket.on('note:joined', (data: {
      noteId: string;
      users: Collaborator[];
      cursors: CursorPosition[];
    }) => {
      logger.debug('✅ Joined note:', data);
      setCollaborators(data.users);
      
      const cursorMap = new Map();
      data.cursors.forEach(cursor => {
        cursorMap.set(cursor.userEmail, cursor);
      });
      setCursors(cursorMap);
    });

    newSocket.on('note:user_joined', (data: {
      userEmail: string;
      userName: string;
      color: string;
      timestamp: string;
    }) => {
      logger.debug('👋 User joined:', data);
      setCollaborators(prev => [
        ...prev.filter(c => c.userEmail !== data.userEmail),
        { userEmail: data.userEmail, userName: data.userName, color: data.color },
      ]);
    });

    newSocket.on('note:user_left', (data: {
      userEmail: string;
      timestamp: string;
    }) => {
      logger.debug('👋 User left:', data);
      setCollaborators(prev => prev.filter(c => c.userEmail !== data.userEmail));
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userEmail);
        return newCursors;
      });
      setTypingUsers(prev => {
        const newTyping = new Set(prev);
        newTyping.delete(data.userEmail);
        return newTyping;
      });
    });

    newSocket.on('note:cursor_update', (data: CursorPosition) => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(data.userEmail, data);
        return newCursors;
      });
    });

    newSocket.on('note:content_change', (data: ContentChange) => {
      logger.debug('✏️ Content change:', data);
      setRemoteChanges(data);
    });

    newSocket.on('note:typing', (data: TypingIndicator) => {
      setTypingUsers(prev => {
        const newTyping = new Set(prev);
        if (data.isTyping) {
          newTyping.add(data.userEmail);
        } else {
          newTyping.delete(data.userEmail);
        }
        return newTyping;
      });
    });

    newSocket.on('note:error', (data: { message: string }) => {
      console.error('❌ Note collaboration error:', data.message);
    });

    return () => {
      if (newSocket.connected) {
        newSocket.emit('note:leave', { noteId, userEmail });
      }
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [noteId, userEmail, enabled]);

  // Update cursor position
  const updateCursor = useCallback((position: number, selection?: { start: number; end: number }) => {
    if (!socket || !connected || !userEmail) return;

    socket.emit('note:cursor', {
      noteId,
      userEmail,
      position,
      selection,
    });
  }, [socket, connected, noteId, userEmail]);

  // Send content changes
  const sendContentChange = useCallback((changes: ContentChange['changes']) => {
    if (!socket || !connected || !userEmail) return;

    socket.emit('note:change', {
      noteId,
      userEmail,
      userName: userEmail, // TODO: Get actual user name
      timestamp: new Date(),
      changes,
    });
  }, [socket, connected, noteId, userEmail]);

  // Send typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (!socket || !connected || !userEmail) return;

    socket.emit('note:typing', {
      noteId,
      userEmail,
      isTyping,
    });
  }, [socket, connected, noteId, userEmail]);

  // Clear remote changes after processing
  const clearRemoteChanges = useCallback(() => {
    setRemoteChanges(null);
  }, []);

  return {
    connected,
    collaborators,
    cursors: Array.from(cursors.values()),
    typingUsers: Array.from(typingUsers),
    remoteChanges,
    updateCursor,
    sendContentChange,
    setTyping,
    clearRemoteChanges,
  };
}

