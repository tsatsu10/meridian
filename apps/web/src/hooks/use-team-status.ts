import { useState, useEffect, useCallback } from 'react';
import { useUnifiedWebSocketSingleton } from './useUnifiedWebSocketSingleton';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuth } from './auth';
import { API_BASE_URL } from '@/constants/urls';

export type UserStatus = 'available' | 'in_meeting' | 'focus_mode' | 'away';

export interface TeamMemberStatus {
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  status: UserStatus;
  statusMessage?: string;
  emoji?: string;
  expiresAt?: Date;
  updatedAt: Date;
}

export function useTeamStatus() {
  const { user } = useAuth();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [teamStatuses, setTeamStatuses] = useState<TeamMemberStatus[]>([]);
  const [myStatus, setMyStatus] = useState<TeamMemberStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  const socket = useUnifiedWebSocketSingleton({
    userEmail: user?.email || '',
    workspaceId: currentWorkspace?.id || '',
    enabled: !!user && !!currentWorkspace,
    onMessage: (message) => {
      if (message.type === 'status:updated') {
        // Update team statuses
        setTeamStatuses(prev => {
          const filtered = prev.filter(s => s.userEmail !== message.data.userEmail);
          return [...filtered, {
            userEmail: message.data.userEmail,
            userName: message.data.userName,
            userAvatar: message.data.userAvatar,
            status: message.data.status,
            statusMessage: message.data.statusMessage,
            emoji: message.data.emoji,
            expiresAt: message.data.expiresAt ? new Date(message.data.expiresAt) : undefined,
            updatedAt: new Date(),
          }];
        });
        
        // Update my status if it's mine
        if (message.data.userEmail === user?.email) {
          setMyStatus({
            userEmail: message.data.userEmail,
            userName: message.data.userName,
            userAvatar: message.data.userAvatar,
            status: message.data.status,
            statusMessage: message.data.statusMessage,
            emoji: message.data.emoji,
            expiresAt: message.data.expiresAt ? new Date(message.data.expiresAt) : undefined,
            updatedAt: new Date(),
          });
        }
      } else if (message.type === 'status:cleared') {
        setTeamStatuses(prev => 
          prev.map(s => 
            s.userEmail === message.data.userEmail
              ? { ...s, status: 'available' as UserStatus, statusMessage: undefined, emoji: undefined }
              : s
          )
        );
        
        if (message.data.userEmail === user?.email) {
          setMyStatus(prev => prev ? { ...prev, status: 'available', statusMessage: undefined, emoji: undefined } : null);
        }
      }
    }
  });
  
  // Fetch initial state
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    
    setLoading(true);
    
    // Fetch workspace statuses
    Promise.all([
      fetch(`${API_BASE_URL}/users/status/${currentWorkspace.id}`, {
        credentials: 'include',
      }),
      fetch(`${API_BASE_URL}/users/status/me`, {
        credentials: 'include',
      }),
    ])
      .then(([teamRes, myRes]) => Promise.all([teamRes.json(), myRes.json()]))
      .then(([teamData, myData]) => {
        if (teamData.success) {
          setTeamStatuses(teamData.data);
        }
        if (myData.success) {
          setMyStatus(myData.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentWorkspace?.id]);
  
  const setStatus = useCallback((
    status: UserStatus,
    options?: {
      statusMessage?: string;
      emoji?: string;
      expiresIn?: number; // Minutes
    }
  ) => {
    if (!socket) return;
    
    socket.emit('status:set', {
      status,
      statusMessage: options?.statusMessage,
      emoji: options?.emoji,
      expiresIn: options?.expiresIn,
    });
  }, [socket]);
  
  const clearStatus = useCallback(() => {
    if (!socket) return;
    
    socket.emit('status:clear');
  }, [socket]);
  
  return {
    teamStatuses,
    myStatus,
    loading,
    setStatus,
    clearStatus,
  };
}

