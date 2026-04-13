/**
 * WebSocket handlers for real-time schedule/calendar features
 * Handles: event updates, conflict notifications, user presence, event locking
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../../utils/logger';

interface ScheduleUser {
  userId: string;
  userName: string;
  socketId: string;
  currentView: string;
  teamId?: string;
  projectId?: string;
  lastActivity: Date;
}

interface EventLock {
  eventId: string;
  userId: string;
  userName: string;
  lockedAt: Date;
}

interface EventUpdate {
  eventId: string;
  action: 'create' | 'update' | 'delete' | 'move';
  event: any;
  userId: string;
  userName: string;
  timestamp: Date;
}

// In-memory stores (in production, use Redis)
const activeUsers = new Map<string, ScheduleUser>();
const eventLocks = new Map<string, EventLock>();
const recentUpdates = new Map<string, EventUpdate[]>();

export function registerScheduleHandlers(io: SocketServer, socket: Socket) {
  logger.info(`Schedule WebSocket connection: ${socket.id}`);

  // Join schedule room
  socket.on('schedule:join', async (data: { 
    userId: string;
    userName: string;
    teamId?: string;
    projectId?: string;
    currentView: string;
  }) => {
    try {
      const { userId, userName, teamId, projectId, currentView } = data;
      
      // Store user info
      activeUsers.set(socket.id, {
        userId,
        userName,
        socketId: socket.id,
        currentView,
        teamId,
        projectId,
        lastActivity: new Date()
      });

      // Join rooms
      if (teamId) {
        socket.join(`team:${teamId}`);
      }
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
      socket.join(`user:${userId}`);

      // Notify others in the team/project
      const roomName = teamId ? `team:${teamId}` : projectId ? `project:${projectId}` : null;
      if (roomName) {
        socket.to(roomName).emit('schedule:user-joined', {
          userId,
          userName,
          currentView,
          timestamp: new Date()
        });

        // Send current active users to the new user
        const activeInRoom = getActiveUsersInRoom(roomName);
        socket.emit('schedule:active-users', activeInRoom);
      }

      logger.info(`User ${userName} joined schedule for team: ${teamId}, project: ${projectId}`);
    } catch (error) {
      logger.error('Error in schedule:join', error);
      socket.emit('schedule:error', { message: 'Failed to join schedule room' });
    }
  });

  // Leave schedule room
  socket.on('schedule:leave', async (data: { userId: string }) => {
    handleUserLeave(socket, data.userId);
  });

  // Update current view
  socket.on('schedule:view-change', async (data: {
    userId: string;
    currentView: string;
  }) => {
    try {
      const user = activeUsers.get(socket.id);
      if (user) {
        user.currentView = data.currentView;
        user.lastActivity = new Date();
        activeUsers.set(socket.id, user);

        // Notify others
        const roomName = user.teamId ? `team:${user.teamId}` : user.projectId ? `project:${user.projectId}` : null;
        if (roomName) {
          socket.to(roomName).emit('schedule:user-activity', {
            userId: user.userId,
            userName: user.userName,
            currentView: data.currentView,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Error in schedule:view-change', error);
    }
  });

  // Event creation/update
  socket.on('schedule:event-update', async (data: {
    eventId: string;
    action: 'create' | 'update' | 'delete' | 'move';
    event: any;
    userId: string;
    userName: string;
    teamId?: string;
    projectId?: string;
  }) => {
    try {
      const { eventId, action, event, userId, userName, teamId, projectId } = data;

      // Check if event is locked by another user
      const lock = eventLocks.get(eventId);
      if (lock && lock.userId !== userId && action !== 'create') {
        socket.emit('schedule:event-locked', {
          eventId,
          lockedBy: lock.userName,
          message: `Event is currently being edited by ${lock.userName}`
        });
        return;
      }

      // Store update
      const update: EventUpdate = {
        eventId,
        action,
        event,
        userId,
        userName,
        timestamp: new Date()
      };

      const roomKey = teamId || projectId || 'global';
      if (!recentUpdates.has(roomKey)) {
        recentUpdates.set(roomKey, []);
      }
      const updates = recentUpdates.get(roomKey)!;
      updates.push(update);
      // Keep only last 50 updates
      if (updates.length > 50) {
        updates.shift();
      }

      // Broadcast to room
      const roomName = teamId ? `team:${teamId}` : projectId ? `project:${projectId}` : null;
      if (roomName) {
        socket.to(roomName).emit('schedule:event-updated', {
          eventId,
          action,
          event,
          userId,
          userName,
          timestamp: new Date()
        });
      }

      logger.info(`Event ${action} by ${userName}: ${eventId}`);
    } catch (error) {
      logger.error('Error in schedule:event-update', error);
      socket.emit('schedule:error', { message: 'Failed to update event' });
    }
  });

  // Lock event for editing
  socket.on('schedule:lock-event', async (data: {
    eventId: string;
    userId: string;
    userName: string;
  }) => {
    try {
      const { eventId, userId, userName } = data;
      
      // Check if already locked
      const existingLock = eventLocks.get(eventId);
      if (existingLock && existingLock.userId !== userId) {
        socket.emit('schedule:event-locked', {
          eventId,
          lockedBy: existingLock.userName,
          message: `Event is currently being edited by ${existingLock.userName}`
        });
        return;
      }

      // Set lock
      eventLocks.set(eventId, {
        eventId,
        userId,
        userName,
        lockedAt: new Date()
      });

      socket.emit('schedule:event-lock-acquired', { eventId });

      // Auto-release lock after 5 minutes
      setTimeout(() => {
        const lock = eventLocks.get(eventId);
        if (lock && lock.userId === userId) {
          eventLocks.delete(eventId);
          logger.info(`Auto-released lock for event ${eventId}`);
        }
      }, 5 * 60 * 1000);

      logger.info(`Event ${eventId} locked by ${userName}`);
    } catch (error) {
      logger.error('Error in schedule:lock-event', error);
      socket.emit('schedule:error', { message: 'Failed to lock event' });
    }
  });

  // Unlock event
  socket.on('schedule:unlock-event', async (data: {
    eventId: string;
    userId: string;
  }) => {
    try {
      const { eventId, userId } = data;
      const lock = eventLocks.get(eventId);
      
      if (lock && lock.userId === userId) {
        eventLocks.delete(eventId);
        socket.emit('schedule:event-lock-released', { eventId });
        logger.info(`Event ${eventId} unlocked by user ${userId}`);
      }
    } catch (error) {
      logger.error('Error in schedule:unlock-event', error);
    }
  });

  // Conflict notification
  socket.on('schedule:conflict-detected', async (data: {
    conflictId: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    affectedEvents: string[];
    teamId?: string;
    projectId?: string;
  }) => {
    try {
      const roomName = data.teamId ? `team:${data.teamId}` : data.projectId ? `project:${data.projectId}` : null;
      
      if (roomName) {
        io.to(roomName).emit('schedule:conflict-alert', {
          conflictId: data.conflictId,
          type: data.type,
          description: data.description,
          severity: data.severity,
          affectedEvents: data.affectedEvents,
          timestamp: new Date()
        });
      }

      logger.warn(`Schedule conflict detected: ${data.description}`);
    } catch (error) {
      logger.error('Error in schedule:conflict-detected', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      handleUserLeave(socket, user.userId);
      
      // Release any locks held by this user
      for (const [eventId, lock] of eventLocks.entries()) {
        if (lock.userId === user.userId) {
          eventLocks.delete(eventId);
          logger.info(`Released lock on event ${eventId} due to disconnect`);
        }
      }
    }
    
    activeUsers.delete(socket.id);
    logger.info(`Schedule WebSocket disconnected: ${socket.id}`);
  });
}

// Helper functions
function handleUserLeave(socket: Socket, userId: string) {
  const user = activeUsers.get(socket.id);
  if (user) {
    const roomName = user.teamId ? `team:${user.teamId}` : user.projectId ? `project:${user.projectId}` : null;
    
    if (roomName) {
      socket.to(roomName).emit('schedule:user-left', {
        userId: user.userId,
        userName: user.userName,
        timestamp: new Date()
      });
    }

    activeUsers.delete(socket.id);
    logger.info(`User ${user.userName} left schedule`);
  }
}

function getActiveUsersInRoom(roomName: string): ScheduleUser[] {
  const users: ScheduleUser[] = [];
  
  for (const [, user] of activeUsers.entries()) {
    const userRoom = user.teamId ? `team:${user.teamId}` : user.projectId ? `project:${user.projectId}` : null;
    if (userRoom === roomName) {
      users.push(user);
    }
  }
  
  return users;
}

// Cleanup old data periodically
setInterval(() => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Remove inactive users
  for (const [socketId, user] of activeUsers.entries()) {
    if (user.lastActivity < fiveMinutesAgo) {
      activeUsers.delete(socketId);
      logger.info(`Removed inactive user: ${user.userName}`);
    }
  }

  // Remove old locks
  for (const [eventId, lock] of eventLocks.entries()) {
    if (lock.lockedAt < fiveMinutesAgo) {
      eventLocks.delete(eventId);
      logger.info(`Removed expired lock: ${eventId}`);
    }
  }

  // Clean old updates (keep only last hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  for (const [key, updates] of recentUpdates.entries()) {
    const filtered = updates.filter(u => u.timestamp > oneHourAgo);
    if (filtered.length === 0) {
      recentUpdates.delete(key);
    } else {
      recentUpdates.set(key, filtered);
    }
  }
}, 60 * 1000); // Run every minute



