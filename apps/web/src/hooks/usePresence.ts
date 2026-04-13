// @epic-2.2-realtime: Presence hook for collaborative features
import { useState, useEffect, useCallback } from 'react'
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { useUnifiedWebSocket } from './useUnifiedWebSocket';
import useWorkspaceStore from '@/store/workspace';

export interface LiveCursor {
  userEmail: string;
  userName: string;
  position: { x: number; y: number };
  selection?: any;
  lastUpdated: string;
}

export interface SelectionHighlight {
  id: string;
  userEmail: string;
  userName: string;
  elementId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  color: string;
  timestamp: string;
}

interface PresenceState {
  liveCursors: Map<string, LiveCursor>;
  selections: Map<string, SelectionHighlight>;
  onlineUsers: Set<string>;
}

interface UserPresence {
  userEmail: string;
  userName: string;
  lastSeen: Date;
  status: 'online' | 'away' | 'busy';
  cursor?: {
    x: number;
    y: number;
    elementId?: string;
  };
}

interface UsePresenceReturn {
  onlineUsers: UserPresence[];
  isConnected: boolean;
  updatePresence: (status: 'online' | 'away' | 'busy') => void;
  updateCursor: (position: { x: number; y: number; elementId?: string }) => void;
  updateSelection: (selection: Omit<SelectionHighlight, 'id' | 'userEmail' | 'userName' | 'color' | 'timestamp'>) => void;
}

export function usePresence(): UsePresenceReturn {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const [cursor, setCursor] = useState<{ x: number; y: number; elementId?: string } | null>(null);
  
  const { connectionState, updatePresence: wsUpdatePresence, updateCursor: wsUpdateCursor } = useUnifiedWebSocket({ 
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || ''
  });
  const isConnected = connectionState.isConnected;

  const [presenceState, setPresenceState] = useState<PresenceState>({
    liveCursors: new Map(),
    selections: new Map(),
    onlineUsers: new Set(),
  });

  // Send presence updates
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy') => {
    if (!isConnected || !user) return;
    wsUpdatePresence?.(status, window.location.pathname);
  }, [isConnected, user, wsUpdatePresence]);

  // Send cursor position updates
  const updateCursor = useCallback((position: { x: number; y: number; elementId?: string }) => {
    if (!isConnected || !user) return;
    setCursor(position);
    wsUpdateCursor?.(position.x, position.y, position.elementId);
  }, [isConnected, user, wsUpdateCursor]);

  // Send text selection updates
  const updateSelection = useCallback((selection: Omit<SelectionHighlight, 'id' | 'userEmail' | 'userName' | 'color' | 'timestamp'>) => {
    if (!isConnected || !user?.email) return;
    
    // For now, just use cursor update as the context doesn't have selection-specific method
    wsUpdateCursor(
      selection.elementId,
      'selection',
      { startOffset: selection.startOffset, endOffset: selection.endOffset },
      { text: selection.selectedText }
    );
  }, [isConnected, user, wsUpdateCursor]);

  // Send online presence when connected
  useEffect(() => {
    if (isConnected) {
      updatePresence('online');
    }
  }, [isConnected, updatePresence]);

  // Send offline presence when disconnecting
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isConnected) {
        updatePresence('offline');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isConnected, updatePresence]);

  // Convert Set to UserPresence array
  const onlineUsers: UserPresence[] = Array.from(presenceState.onlineUsers).map(email => ({
    userEmail: email,
    userName: email.split('@')[0], // Extract username from email
    lastSeen: new Date(),
    status: 'online' as const,
  }));

  return {
    onlineUsers,
    isConnected,
    updatePresence,
    updateCursor,
    updateSelection, // Export updateSelection for text selection tracking
  };
} 