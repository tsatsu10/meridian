// @epic-3.4-teams: Enhanced WebSocket Handlers for Advanced Collaboration
import { Socket, Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger';
import { getDatabase } from '../database/connection';

// Types for collaboration data
interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  resourceId?: string;
  timestamp: number;
}

interface CollaboratorPresence {
  userEmail: string;
  userName: string;
  status: 'online' | 'away' | 'busy' | 'do-not-disturb' | 'offline';
  currentPage?: string;
  currentResource?: string;
  currentAction?: 'editing' | 'viewing' | 'commenting' | 'in-meeting' | 'idle';
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  connectionQuality?: 'excellent' | 'good' | 'poor';
  customStatus?: string;
  lastSeen: Date;
}

interface ResourceCollaboration {
  resourceId: string;
  resourceType: 'task' | 'project' | 'kanban-board' | 'document' | 'calendar';
  collaborators: Map<string, CollaboratorPresence>;
  cursors: Map<string, CursorPosition>;
  lastActivity: Date;
}

// In-memory collaboration state (in production, use Redis)
const collaborationSessions = new Map<string, ResourceCollaboration>();
const userPresence = new Map<string, CollaboratorPresence>();
const resourceConnections = new Map<string, Set<string>>(); // resourceId -> Set of userEmails

export function setupEnhancedCollaborationHandlers(io: SocketIOServer, socket: Socket) {
  const userEmail = socket.handshake.query.userEmail as string;
  const workspaceId = socket.handshake.query.workspaceId as string;
  const userName = socket.handshake.query.userName as string || userEmail.split('@')[0];

  logger.info(`🤝 Setting up enhanced collaboration for user: ${userEmail}`);

  // Initialize user presence
  userPresence.set(userEmail, {
    userEmail,
    userName,
    status: 'online',
    lastSeen: new Date(),
    deviceType: detectDeviceType(socket.handshake.headers['user-agent']),
    connectionQuality: 'good'
  });

  // Notify workspace about user coming online
  socket.join(`workspace:${workspaceId}`);
  socket.to(`workspace:${workspaceId}`).emit('realtime:presence', {
    userEmail,
    userName,
    presence: 'online',
    lastSeen: new Date(),
    workspaceId
  });

  // ============================================================================
  // CURSOR TRACKING HANDLERS
  // ============================================================================

  socket.on('realtime:cursor', async (data) => {
    try {
      const { x, y, elementId, resourceId } = data;

      if (!resourceId || typeof x !== 'number' || typeof y !== 'number') {
        socket.emit('error', { error: 'Invalid cursor data' });
        return;
      }

      // Update cursor position
      const cursorData: CursorPosition = {
        x,
        y,
        elementId,
        resourceId,
        timestamp: Date.now()
      };

      // Get or create resource collaboration session
      let session = collaborationSessions.get(resourceId);
      if (!session) {
        session = {
          resourceId,
          resourceType: data.resourceType || 'document',
          collaborators: new Map(),
          cursors: new Map(),
          lastActivity: new Date()
        };
        collaborationSessions.set(resourceId, session);
      }

      // Update cursor and last activity
      session.cursors.set(userEmail, cursorData);
      session.lastActivity = new Date();

      // Broadcast cursor update to other users in the resource
      socket.to(`resource:${resourceId}`).emit('realtime:cursor', {
        userEmail,
        userName,
        x,
        y,
        elementId,
        resourceId,
        timestamp: cursorData.timestamp
      });

      logger.debug(`📍 Cursor update: ${userEmail} at (${x}, ${y}) in ${resourceId}`);

    } catch (error) {
      logger.error('Error handling cursor update:', error);
      socket.emit('error', { error: 'Failed to update cursor position' });
    }
  });

  // ============================================================================
  // PRESENCE MANAGEMENT HANDLERS
  // ============================================================================

  socket.on('realtime:presence', async (data) => {
    try {
      const { status, currentPage, customStatus, currentAction } = data;

      // Update user presence
      const presence = userPresence.get(userEmail);
      if (presence) {
        presence.status = status || 'online';
        presence.currentPage = currentPage;
        presence.customStatus = customStatus;
        presence.currentAction = currentAction;
        presence.lastSeen = new Date();
        userPresence.set(userEmail, presence);
      }

      // Broadcast presence update to workspace
      socket.to(`workspace:${workspaceId}`).emit('realtime:presence', {
        userEmail,
        userName,
        presence: status,
        currentPage,
        customStatus,
        currentAction,
        lastSeen: new Date(),
        workspaceId
      });

      logger.debug(`👤 Presence update: ${userEmail} is ${status}`);

    } catch (error) {
      logger.error('Error handling presence update:', error);
      socket.emit('error', { error: 'Failed to update presence' });
    }
  });

  // Send current presence list to newly connected user
  socket.on('realtime:get_presence', async () => {
    try {
      const workspaceUsers = Array.from(userPresence.values()).filter(user => {
        // In a real implementation, check if user belongs to workspace
        return user.status !== 'offline';
      });

      socket.emit('realtime:presence_list', {
        users: workspaceUsers,
        workspaceId
      });

    } catch (error) {
      logger.error('Error getting presence list:', error);
      socket.emit('error', { error: 'Failed to get presence list' });
    }
  });

  // ============================================================================
  // RESOURCE COLLABORATION HANDLERS
  // ============================================================================

  socket.on('realtime:session', async (data) => {
    try {
      const { resourceId, resourceType, action } = data;

      if (!resourceId || !action) {
        socket.emit('error', { error: 'Invalid session data' });
        return;
      }

      if (action === 'join') {
        // Join resource room
        socket.join(`resource:${resourceId}`);

        // Track resource connections
        if (!resourceConnections.has(resourceId)) {
          resourceConnections.set(resourceId, new Set());
        }
        resourceConnections.get(resourceId)!.add(userEmail);

        // Get or create collaboration session
        let session = collaborationSessions.get(resourceId);
        if (!session) {
          session = {
            resourceId,
            resourceType: resourceType || 'document',
            collaborators: new Map(),
            cursors: new Map(),
            lastActivity: new Date()
          };
          collaborationSessions.set(resourceId, session);
        }

        // Add user to collaborators
        const presence = userPresence.get(userEmail);
        if (presence) {
          session.collaborators.set(userEmail, {
            ...presence,
            currentResource: resourceId
          });
        }

        // Notify other collaborators
        socket.to(`resource:${resourceId}`).emit('realtime:collaborator_joined', {
          userEmail,
          userName,
          resourceId,
          timestamp: Date.now()
        });

        // Send current session state to new collaborator
        const currentCollaborators = Array.from(session.collaborators.values());
        const currentCursors = Array.from(session.cursors.entries()).map(([email, cursor]) => ({
          userEmail: email,
          userName: session.collaborators.get(email)?.userName || email,
          ...cursor
        }));

        socket.emit('realtime:session_state', {
          resourceId,
          collaborators: currentCollaborators,
          cursors: currentCursors,
          lastActivity: session.lastActivity
        });

        logger.info(`🔗 User ${userEmail} joined resource ${resourceId}`);

      } else if (action === 'leave') {
        // Leave resource room
        socket.leave(`resource:${resourceId}`);

        // Remove from resource connections
        const connections = resourceConnections.get(resourceId);
        if (connections) {
          connections.delete(userEmail);
          if (connections.size === 0) {
            resourceConnections.delete(resourceId);
          }
        }

        // Remove from collaboration session
        const session = collaborationSessions.get(resourceId);
        if (session) {
          session.collaborators.delete(userEmail);
          session.cursors.delete(userEmail);

          // Clean up empty sessions
          if (session.collaborators.size === 0) {
            collaborationSessions.delete(resourceId);
          }
        }

        // Notify other collaborators
        socket.to(`resource:${resourceId}`).emit('realtime:collaborator_left', {
          userEmail,
          resourceId,
          timestamp: Date.now()
        });

        logger.info(`🔌 User ${userEmail} left resource ${resourceId}`);
      }

    } catch (error) {
      logger.error('Error handling session:', error);
      socket.emit('error', { error: 'Failed to handle resource session' });
    }
  });

  // ============================================================================
  // COLLABORATIVE EDITING HANDLERS
  // ============================================================================

  socket.on('realtime:edit_start', async (data) => {
    try {
      const { resourceId, elementId, resourceType } = data;

      // Update user action
      const presence = userPresence.get(userEmail);
      if (presence) {
        presence.currentAction = 'editing';
        presence.currentResource = resourceId;
        userPresence.set(userEmail, presence);
      }

      // Notify collaborators about editing start
      socket.to(`resource:${resourceId}`).emit('realtime:edit_started', {
        userEmail,
        userName,
        resourceId,
        elementId,
        timestamp: Date.now()
      });

      logger.debug(`✏️ Edit started: ${userEmail} in ${resourceId}/${elementId}`);

    } catch (error) {
      logger.error('Error handling edit start:', error);
    }
  });

  socket.on('realtime:edit_end', async (data) => {
    try {
      const { resourceId, elementId } = data;

      // Update user action
      const presence = userPresence.get(userEmail);
      if (presence) {
        presence.currentAction = 'viewing';
        userPresence.set(userEmail, presence);
      }

      // Notify collaborators about editing end
      socket.to(`resource:${resourceId}`).emit('realtime:edit_ended', {
        userEmail,
        userName,
        resourceId,
        elementId,
        timestamp: Date.now()
      });

      logger.debug(`✅ Edit ended: ${userEmail} in ${resourceId}/${elementId}`);

    } catch (error) {
      logger.error('Error handling edit end:', error);
    }
  });

  // ============================================================================
  // REAL-TIME SYNC HANDLERS
  // ============================================================================

  socket.on('realtime:sync', async (data) => {
    try {
      const { type, resourceId, payload } = data;

      // Broadcast sync event to resource collaborators
      socket.to(`resource:${resourceId}`).emit('realtime:sync', {
        type,
        resourceId,
        data: payload,
        userEmail,
        userName,
        timestamp: Date.now()
      });

      // Log the sync event
      logger.debug(`🔄 Sync event: ${type} by ${userEmail} in ${resourceId}`);

    } catch (error) {
      logger.error('Error handling sync:', error);
      socket.emit('error', { error: 'Failed to sync changes' });
    }
  });

  // ============================================================================
  // CLEANUP HANDLERS
  // ============================================================================

  socket.on('disconnect', () => {
    logger.info(`🔌 User ${userEmail} disconnected from enhanced collaboration`);

    // Update presence to offline
    const presence = userPresence.get(userEmail);
    if (presence) {
      presence.status = 'offline';
      presence.lastSeen = new Date();
      userPresence.set(userEmail, presence);
    }

    // Clean up from all resource sessions
    for (const [resourceId, connections] of resourceConnections.entries()) {
      if (connections.has(userEmail)) {
        connections.delete(userEmail);

        // Remove from collaboration session
        const session = collaborationSessions.get(resourceId);
        if (session) {
          session.collaborators.delete(userEmail);
          session.cursors.delete(userEmail);

          // Notify remaining collaborators
          socket.to(`resource:${resourceId}`).emit('realtime:collaborator_left', {
            userEmail,
            resourceId,
            timestamp: Date.now()
          });

          // Clean up empty sessions
          if (session.collaborators.size === 0) {
            collaborationSessions.delete(resourceId);
          }
        }

        if (connections.size === 0) {
          resourceConnections.delete(resourceId);
        }
      }
    }

    // Notify workspace about user going offline
    socket.to(`workspace:${workspaceId}`).emit('realtime:presence', {
      userEmail,
      userName,
      presence: 'offline',
      lastSeen: new Date(),
      workspaceId
    });
  });

  // Connection quality monitoring
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback();
    }

    // Update connection quality based on latency
    const presence = userPresence.get(userEmail);
    if (presence) {
      // This would be calculated based on actual ping times
      presence.connectionQuality = 'good';
      userPresence.set(userEmail, presence);
    }
  });
}

// Utility functions
function detectDeviceType(userAgent: string | undefined): 'desktop' | 'mobile' | 'tablet' {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';

  return 'desktop';
}

// Cleanup stale sessions (should be run periodically)
export function cleanupStaleCollaborationSessions() {
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();

  for (const [resourceId, session] of collaborationSessions.entries()) {
    if (now - session.lastActivity.getTime() > staleThreshold) {
      collaborationSessions.delete(resourceId);
      resourceConnections.delete(resourceId);
      logger.debug(`🧹 Cleaned up stale collaboration session: ${resourceId}`);
    }
  }

  // Clean up offline users after 1 hour
  const offlineThreshold = 60 * 60 * 1000; // 1 hour
  for (const [userEmail, presence] of userPresence.entries()) {
    if (presence.status === 'offline' && now - presence.lastSeen.getTime() > offlineThreshold) {
      userPresence.delete(userEmail);
      logger.debug(`🧹 Cleaned up offline user: ${userEmail}`);
    }
  }
}

// Get collaboration statistics
export function getCollaborationStats() {
  const onlineUsers = Array.from(userPresence.values()).filter(u => u.status !== 'offline').length;
  const activeSessions = collaborationSessions.size;
  const totalConnections = Array.from(resourceConnections.values()).reduce((sum, set) => sum + set.size, 0);

  return {
    onlineUsers,
    activeSessions,
    totalConnections,
    timestamp: new Date()
  };
}

