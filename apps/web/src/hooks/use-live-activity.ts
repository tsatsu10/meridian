import { useState, useEffect, useCallback } from 'react';
import { useUnifiedWebSocketSingleton } from './useUnifiedWebSocketSingleton';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuth } from './auth';
import { API_BASE_URL } from '@/constants/urls';

export interface ActivitySession {
  id: string;
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  currentTaskId?: string;
  currentProjectId?: string;
  activityType: 'editing' | 'viewing' | 'commenting';
  lastActive: Date;
}

export function useLiveActivity() {
  const { user } = useAuth();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [activeSessions, setActiveSessions] = useState<ActivitySession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const socket = useUnifiedWebSocketSingleton({
    userEmail: user?.email || '',
    workspaceId: currentWorkspace?.id || '',
    enabled: !!user && !!currentWorkspace,
    onMessage: (message) => {
      if (message.type === 'activity:started') {
        setActiveSessions(prev => {
          // Check if user already has an active session
          const filtered = prev.filter(s => s.userEmail !== message.data.userEmail);
          return [...filtered, {
            id: message.data.sessionId,
            userEmail: message.data.userEmail,
            userName: message.data.userName,
            currentTaskId: message.data.taskId,
            currentProjectId: message.data.projectId,
            activityType: message.data.activityType,
            lastActive: new Date(),
          }];
        });
      } else if (message.type === 'activity:updated') {
        setActiveSessions(prev => 
          prev.map(s => 
            s.userEmail === message.data.userEmail
              ? { ...s, ...message.data, lastActive: new Date() }
              : s
          )
        );
      } else if (message.type === 'activity:ended') {
        setActiveSessions(prev => 
          prev.filter(s => s.userEmail !== message.data.userEmail)
        );
      }
    }
  });
  
  // Fetch initial state
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    
    setLoading(true);
    fetch(`${API_BASE_URL}/activity/live/${currentWorkspace.id}`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActiveSessions(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentWorkspace?.id]);
  
  const startActivity = useCallback((
    taskId?: string,
    projectId?: string,
    activityType: 'editing' | 'viewing' | 'commenting' = 'viewing'
  ) => {
    if (!socket) return;
    
    socket.emit('activity:start', {
      taskId,
      projectId,
      activityType,
    });
  }, [socket]);
  
  const updateActivity = useCallback((
    taskId?: string,
    projectId?: string,
    activityType?: 'editing' | 'viewing' | 'commenting'
  ) => {
    if (!socket) return;
    
    socket.emit('activity:update', {
      taskId,
      projectId,
      activityType,
    });
  }, [socket]);
  
  const endActivity = useCallback(() => {
    if (!socket) return;
    
    socket.emit('activity:end');
  }, [socket]);
  
  return {
    activeSessions,
    loading,
    startActivity,
    updateActivity,
    endActivity,
  };
}

