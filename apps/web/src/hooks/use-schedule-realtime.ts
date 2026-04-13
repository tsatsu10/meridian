// @epic-2.2-realtime: Real-time schedule collaboration
// @epic-3.4-teams: Live schedule updates across team members
import { useEffect, useState, useCallback } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { toast } from 'sonner';
import type { CalendarEvent } from '@/types/schedule';

interface ScheduleUpdate {
  type: 'event-created' | 'event-updated' | 'event-deleted' | 'event-moved';
  eventId: string;
  event?: CalendarEvent;
  updatedBy: string;
  timestamp: Date;
}

interface ActiveUser {
  userId: string;
  userName: string;
  email: string;
  lastSeen: Date;
  viewingDate?: Date;
  isEditing?: string; // eventId being edited
}

interface UseScheduleRealtimeOptions {
  teamId: string;
  workspaceId: string;
  currentUserId: string;
  onEventUpdate?: (update: ScheduleUpdate) => void;
  onUserActivity?: (users: ActiveUser[]) => void;
}

export function useScheduleRealtime({
  teamId,
  workspaceId,
  currentUserId,
  onEventUpdate,
  onUserActivity
}: UseScheduleRealtimeOptions) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<ScheduleUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // WebSocket connection
  const { sendMessage, connectionState } = useUnifiedWebSocket({
    enabled: true,
    handlers: {
      // Legacy schedule event handlers
      'schedule:event-created': (data: any) => {
        const update: ScheduleUpdate = {
          type: 'event-created',
          eventId: data.eventId,
          event: data.event,
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp)
        };
        
        handleScheduleUpdate(update);
        
        if (data.updatedBy !== currentUserId) {
          toast.info(`${data.userName} created a new event`, {
            description: data.event.title,
            duration: 3000
          });
        }
      },
      
      'schedule:event-updated': (data: any) => {
        const update: ScheduleUpdate = {
          type: 'event-updated',
          eventId: data.eventId,
          event: data.event,
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp)
        };
        
        handleScheduleUpdate(update);
        
        if (data.updatedBy !== currentUserId) {
          toast.info(`${data.userName} updated an event`, {
            description: data.event.title,
            duration: 3000
          });
        }
      },
      
      'schedule:event-deleted': (data: any) => {
        const update: ScheduleUpdate = {
          type: 'event-deleted',
          eventId: data.eventId,
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp)
        };
        
        handleScheduleUpdate(update);
        
        if (data.updatedBy !== currentUserId) {
          toast.info(`${data.userName} deleted an event`, {
            description: data.eventTitle,
            duration: 3000
          });
        }
      },
      
      // Calendar event handlers (for persistent calendar events)
      'calendar:event-created': (data: any) => {
        const update: ScheduleUpdate = {
          type: 'event-created',
          eventId: data.eventId,
          event: data.event,
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp)
        };
        
        handleScheduleUpdate(update);
        
        if (data.updatedBy !== currentUserId) {
          toast.success('Calendar event created', {
            description: data.event?.title || 'New event added',
            duration: 3000
          });
        }
      },
      
      'calendar:event-updated': (data: any) => {
        const update: ScheduleUpdate = {
          type: 'event-updated',
          eventId: data.eventId,
          event: data.event,
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp)
        };
        
        handleScheduleUpdate(update);
        
        if (data.updatedBy !== currentUserId) {
          toast.info('Calendar event updated', {
            description: data.event?.title || 'Event modified',
            duration: 3000
          });
        }
      },
      
      'calendar:event-deleted': (data: any) => {
        const update: ScheduleUpdate = {
          type: 'event-deleted',
          eventId: data.eventId,
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp)
        };
        
        handleScheduleUpdate(update);
        
        if (data.updatedBy !== currentUserId) {
          toast.warning('Calendar event deleted', {
            description: 'Event removed from calendar',
            duration: 3000
          });
        }
      },
      
      'schedule:event-moved': (data: any) => {
        const update: ScheduleUpdate = {
          type: 'event-moved',
          eventId: data.eventId,
          event: data.event,
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp)
        };
        
        handleScheduleUpdate(update);
        
        if (data.updatedBy !== currentUserId) {
          toast.info(`${data.userName} moved an event`, {
            description: data.event.title,
            duration: 3000
          });
        }
      },
      
      'schedule:user-activity': (data: any) => {
        const users: ActiveUser[] = data.users.map((u: any) => ({
          userId: u.userId,
          userName: u.userName,
          email: u.email,
          lastSeen: new Date(u.lastSeen),
          viewingDate: u.viewingDate ? new Date(u.viewingDate) : undefined,
          isEditing: u.isEditing
        }));
        
        setActiveUsers(users);
        onUserActivity?.(users);
      },
      
      'schedule:conflict-detected': (data: any) => {
        if (data.affectedUsers.includes(currentUserId)) {
          toast.warning('Schedule conflict detected', {
            description: data.description,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => {
                // Handle conflict view
              }
            }
          });
        }
      }
    }
  });
  
  useEffect(() => {
    setIsConnected(connectionState.isConnected);
  }, [connectionState.isConnected]);
  
  const handleScheduleUpdate = useCallback((update: ScheduleUpdate) => {
    setRecentUpdates(prev => [update, ...prev].slice(0, 10));
    onEventUpdate?.(update);
  }, [onEventUpdate]);
  
  // Join schedule room
  useEffect(() => {
    if (isConnected && teamId && workspaceId) {
      sendMessage('schedule:join', {
        teamId,
        workspaceId,
        userId: currentUserId
      });
      
      return () => {
        sendMessage('schedule:leave', {
          teamId,
          workspaceId,
          userId: currentUserId
        });
      };
    }
  }, [isConnected, teamId, workspaceId, currentUserId, sendMessage]);
  
  // Broadcast user activity
  const broadcastActivity = useCallback((viewingDate?: Date, editingEventId?: string) => {
    if (isConnected) {
      sendMessage('schedule:activity', {
        teamId,
        workspaceId,
        userId: currentUserId,
        viewingDate,
        editingEventId,
        timestamp: new Date()
      });
    }
  }, [isConnected, teamId, workspaceId, currentUserId, sendMessage]);
  
  // Broadcast event changes
  const broadcastEventChange = useCallback((
    type: ScheduleUpdate['type'],
    eventId: string,
    event?: CalendarEvent
  ) => {
    if (isConnected) {
      sendMessage('schedule:update', {
        type,
        eventId,
        event,
        teamId,
        workspaceId,
        updatedBy: currentUserId,
        timestamp: new Date()
      });
    }
  }, [isConnected, teamId, workspaceId, currentUserId, sendMessage]);
  
  // Lock event for editing
  const lockEvent = useCallback((eventId: string) => {
    if (isConnected) {
      sendMessage('schedule:lock', {
        eventId,
        teamId,
        workspaceId,
        userId: currentUserId
      });
    }
  }, [isConnected, teamId, workspaceId, currentUserId, sendMessage]);
  
  // Unlock event
  const unlockEvent = useCallback((eventId: string) => {
    if (isConnected) {
      sendMessage('schedule:unlock', {
        eventId,
        teamId,
        workspaceId,
        userId: currentUserId
      });
    }
  }, [isConnected, teamId, workspaceId, currentUserId, sendMessage]);
  
  // Check if event is locked by another user
  const isEventLocked = useCallback((eventId: string) => {
    const editingUser = activeUsers.find(u => u.isEditing === eventId);
    return editingUser && editingUser.userId !== currentUserId ? editingUser : null;
  }, [activeUsers, currentUserId]);
  
  return {
    // Connection state
    isConnected,
    
    // Active users
    activeUsers,
    otherActiveUsers: activeUsers.filter(u => u.userId !== currentUserId),
    
    // Recent updates
    recentUpdates,
    
    // Actions
    broadcastActivity,
    broadcastEventChange,
    lockEvent,
    unlockEvent,
    isEventLocked,
    
    // Stats
    stats: {
      activeUsersCount: activeUsers.length,
      recentUpdatesCount: recentUpdates.length,
      hasRecentActivity: recentUpdates.length > 0
    }
  };
}

// Hook for cursor/presence awareness
export function useSchedulePresence(teamId: string, workspaceId: string) {
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; userName: string }>>(new Map());
  
  const { sendMessage } = useUnifiedWebSocket({
    enabled: true,
    handlers: {
      'schedule:cursor-move': (data: any) => {
        setCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, {
            x: data.x,
            y: data.y,
            userName: data.userName
          });
          return next;
        });
      },
      
      'schedule:cursor-leave': (data: any) => {
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    }
  });
  
  const updateCursor = useCallback((x: number, y: number, userId: string, userName: string) => {
    sendMessage('schedule:cursor-move', {
      teamId,
      workspaceId,
      userId,
      userName,
      x,
      y
    });
  }, [teamId, workspaceId, sendMessage]);
  
  const removeCursor = useCallback((userId: string) => {
    sendMessage('schedule:cursor-leave', {
      teamId,
      workspaceId,
      userId
    });
  }, [teamId, workspaceId, sendMessage]);
  
  return {
    cursors: Array.from(cursors.entries()).map(([userId, data]) => ({
      userId,
      ...data
    })),
    updateCursor,
    removeCursor
  };
}


