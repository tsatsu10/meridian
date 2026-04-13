// @epic-3.1-messaging: Unified WebSocket Server - Robust implementation inspired by gorilla/websocket patterns
// @persona-sarah: PM needs reliable real-time messaging and collaboration
// @persona-david: Team lead needs robust communication infrastructure

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { publishEvent, subscribeToEvent } from '../events';
import { getDatabase } from '../database/connection';
import { validateSessionToken } from '../user/utils/validate-session-token';
import {
  messageTable,
  channelTable,
  channelMembershipTable,
  userPresenceTable,
  userTable,
  workspaceUserTable
} from '../database/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import logger from '../utils/logger';

export interface UserConnection {
  id: string;
  userEmail: string;
  workspaceId: string;
  socketId: string;
  lastSeen: Date;
  isTyping: Map<string, boolean>; // channelId -> isTyping
  presence: 'online' | 'away' | 'busy' | 'offline';
  currentPage?: string;
}

export interface ChatMessage {
  type: 'message' | 'typing' | 'stop_typing' | 'join_channel' | 'leave_channel' | 
        'presence' | 'ping' | 'pong' | 'message_delivered' | 'message_read' | 
        'user_joined' | 'user_left' | 'channels' | 'recent_messages' | 'error';
  data: any;
  timestamp: number;
  userEmail?: string;
  channelId?: string;
  messageId?: string;
}

export interface RealtimeMessage {
  type: 'presence' | 'cursor' | 'session' | 'sync' | 'task_updated' | 'comment_created' | 'file_uploaded';
  data: any;
  timestamp: number;
  userEmail?: string;
}

export class UnifiedWebSocketServer {
  private static instance: UnifiedWebSocketServer | null = null;
  private io: SocketIOServer;
  private connections: Map<string, UserConnection> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userEmail -> Set<socketId>
  private workspaceUsers: Map<string, Set<string>> = new Map(); // workspaceId -> Set<userEmail>
  private channelMembers: Map<string, Set<string>> = new Map(); // channelId -> Set<userEmail>
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(httpServer: HTTPServer) {
    UnifiedWebSocketServer.instance = this;
    // Allow multiple frontend ports for development
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5174", // Vite default alternative port
      "http://localhost:5175", // Additional fallback
    ];

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps, Postman, curl)
          if (!origin) return callback(null, true);
          
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            logger.warn(`⚠️ WebSocket CORS rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    this.setupEventHandlers();
    this.setupHeartbeat();
    this.subscribeToInternalEvents();
    
    console.log('🚀 Unified WebSocket Server initialized with Socket.io');
  }

  public static getInstance(): UnifiedWebSocketServer | null {
    return UnifiedWebSocketServer.instance;
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private async handleConnection(socket: any) {
    const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
    const clientIp = socket.handshake.address || 'unknown';

    console.log(`🔗 New connection attempt from ${clientIp} (${userAgent})`);

    // 🔒 SECURITY: Validate session token instead of accepting query params
    let sessionToken: string | undefined;
    
    // Try to get token from auth header (preferred)
    if (socket.handshake.auth && socket.handshake.auth.token) {
      sessionToken = socket.handshake.auth.token;
    }
    // Fallback: Try to get from cookie header
    else if (socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';').map((c: string) => c.trim());
      const sessionCookie = cookies.find((c: string) => c.startsWith('session='));
      if (sessionCookie) {
        sessionToken = sessionCookie.split('=')[1];
      }
    }

    if (!sessionToken) {
      console.error('❌ Connection rejected: No session token provided', {
        clientIp,
        userAgent,
        hasAuthToken: !!socket.handshake.auth?.token,
        hasCookie: !!socket.handshake.headers.cookie
      });
      socket.emit('error', { 
        message: 'Authentication required. Please log in.',
        code: 'NO_SESSION_TOKEN'
      });
      socket.disconnect(true);
      return;
    }

    // Validate session token
    let user: any;
    let session: any;
    try {
      const result = await validateSessionToken(sessionToken);
      user = result.user;
      session = result.session;
    } catch (error) {
      console.error('❌ Connection rejected: Invalid session token', {
        clientIp,
        userAgent,
        error: error instanceof Error ? error.message : String(error)
      });
      socket.emit('error', { 
        message: 'Invalid or expired session. Please log in again.',
        code: 'INVALID_SESSION'
      });
      socket.disconnect(true);
      return;
    }

    if (!user || !session) {
      console.error('❌ Connection rejected: Session validation failed', {
        clientIp,
        userAgent
      });
      socket.emit('error', { 
        message: 'Session validation failed. Please log in again.',
        code: 'SESSION_VALIDATION_FAILED'
      });
      socket.disconnect(true);
      return;
    }

    // ✅ Use validated user identity from session
    const userEmail = user.email;
    const workspaceId = socket.handshake.query.workspaceId as string; // Still allow workspace selection from query
    
    if (!workspaceId) {
      console.error('❌ Connection rejected: Missing workspaceId', {
        userEmail,
        clientIp,
        userAgent
      });
      socket.emit('error', { 
        message: 'Workspace ID is required',
        code: 'MISSING_WORKSPACE_ID'
      });
      socket.disconnect(true);
      return;
    }

    // Validate user and workspace access
    try {
      const hasAccess = await this.verifyWorkspaceAccess(userEmail, workspaceId);
      if (!hasAccess) {
        console.error('❌ Connection rejected: Access denied', { userEmail, workspaceId });
        socket.emit('error', { 
          message: 'Access denied to workspace',
          code: 'ACCESS_DENIED'
        });
        socket.disconnect(true);
        return;
      }
    } catch (error) {
      console.error('❌ Connection validation failed:', error);
      socket.emit('error', { 
        message: 'Failed to validate access',
        code: 'VALIDATION_ERROR'
      });
      socket.disconnect(true);
      return;
    }

    const connectionId = uuidv4();
    const connection: UserConnection = {
      id: connectionId,
      userEmail,
      workspaceId,
      socketId: socket.id,
      lastSeen: new Date(),
      isTyping: new Map(),
      presence: 'online',
    };

    this.connections.set(socket.id, connection);
    this.addUserSocket(userEmail, socket.id);
    this.addWorkspaceUser(workspaceId, userEmail);

    console.log(`👋 User ${userEmail} connected to workspace ${workspaceId} (${socket.id})`);

    // Update user presence in database
    await this.updateUserPresence(userEmail, workspaceId, 'online');

    // Join workspace room for workspace-wide broadcasts
    socket.join(`workspace:${workspaceId}`);

    // Send connection acknowledgment
    socket.emit('connected', {
      connectionId,
      timestamp: Date.now(),
      workspaceUsers: Array.from(this.workspaceUsers.get(workspaceId) || [])
    });

    // Setup event handlers for this socket
    this.setupSocketHandlers(socket, connection);

    // Send initial data
    await this.sendUserChannels(socket, connection);
    await this.sendPresenceUpdate(socket, connection);
  }

  private setupSocketHandlers(socket: any, connection: UserConnection) {
    // Chat message handlers
    socket.on('chat:message', (data: any) => this.handleChatMessage(socket, connection, data));
    socket.on('chat:typing', (data: any) => this.handleTyping(socket, connection, data));
    socket.on('chat:stop_typing', (data: any) => this.handleStopTyping(socket, connection, data));
    socket.on('chat:join_channel', (data: any) => this.handleJoinChannel(socket, connection, data));
    socket.on('chat:leave_channel', (data: any) => this.handleLeaveChannel(socket, connection, data));
    socket.on('chat:mark_read', (data: any) => this.handleMarkMessageRead(socket, connection, data));

    // @epic-4.1-direct-messaging: Direct messaging handlers
    socket.on('dm:start_conversation', (data: any) => this.handleStartDirectConversation(socket, connection, data));
    socket.on('dm:join_conversation', (data: any) => this.handleJoinDirectConversation(socket, connection, data));
    socket.on('dm:message', (data: any) => this.handleDirectMessage(socket, connection, data));
    socket.on('dm:typing', (data: any) => this.handleDirectTyping(socket, connection, data));
    socket.on('dm:stop_typing', (data: any) => this.handleDirectStopTyping(socket, connection, data));
    socket.on('dm:get_conversations', (data: any) => this.handleGetDirectConversations(socket, connection, data));
    socket.on('dm:get_history', (data: any) => this.handleGetDirectHistory(socket, connection, data));

    // @epic-3.6-communication: Thread handlers
    socket.on('thread:reply', (data: any) => this.handleThreadReply(socket, connection, data));
    socket.on('thread:get_messages', (data: any) => this.handleGetThreadMessages(socket, connection, data));
    socket.on('thread:get_participants', (data: any) => this.handleGetThreadParticipants(socket, connection, data));
    socket.on('thread:update_status', (data: any) => this.handleUpdateThreadStatus(socket, connection, data));
    socket.on('thread:mark_read', (data: any) => this.handleMarkThreadRead(socket, connection, data));
    socket.on('thread:get_notifications', (data: any) => this.handleGetThreadNotifications(socket, connection, data));

    // Real-time collaboration handlers
    socket.on('realtime:presence', (data: any) => this.handlePresenceUpdate(socket, connection, data));
    socket.on('realtime:cursor', (data: any) => this.handleCursorUpdate(socket, connection, data));
    socket.on('realtime:session', (data: any) => this.handleSessionUpdate(socket, connection, data));

    // System handlers
    socket.on('ping', () => this.handlePing(socket, connection));
    socket.on('disconnect', () => this.handleDisconnection(socket.id));
    socket.on('error', (error: any) => {
      console.error(`❌ Socket error for ${connection.userEmail}:`, error);
      this.handleDisconnection(socket.id);
    });
  }

  // Chat Message Handlers
  private async handleChatMessage(socket: any, connection: UserConnection, data: any) {
    try {
      const db = getDatabase();
      const { channelId, content, messageType = 'text', parentMessageId, mentions, attachments } = data;

      if (!channelId || !content?.trim()) {
        socket.emit('error', { error: 'Missing required message data' });
        return;
      }

      // Verify user has access to channel
      const hasAccess = await this.verifyChannelAccess(connection.userEmail, channelId);
      if (!hasAccess) {
        socket.emit('error', { error: 'Access denied to channel' });
        return;
      }

      // Get user ID from email
      const users = await db.select().from(userTable).where(eq(userTable.email, connection.userEmail)).limit(1);
      const user = users[0];
      
      if (!user) {
        socket.emit('error', { error: 'User not found' });
        return;
      }

      // Store message in database
      const [message] = await db.insert(messageTable).values({
        channelId,
        userId: user.id,
        content: content.trim(),
        messageType: messageType || 'text',
        parentMessageId: parentMessageId || null,
        mentions: Array.isArray(mentions) ? mentions : [],
        attachments: Array.isArray(attachments) ? attachments : [],
      } as any).returning();

      const messageData = {
        type: 'message',
        data: { message },
        timestamp: Date.now(),
        channelId,
        messageId: message?.id,
      };

      // Broadcast to channel members
      this.broadcastToChannel(channelId, messageData);

      // Send delivery confirmation
      socket.emit('chat:message_delivered', {
        messageId: message?.id,
        timestamp: Date.now()
      });

      // Publish event for other systems
      publishEvent('message.created', { channelId, message });

    } catch (error) {
      console.error('❌ Error handling chat message:', error);
      socket.emit('error', { error: 'Failed to send message' });
    }
  }

  private async handleTyping(socket: any, connection: UserConnection, data: any) {
    const { channelId } = data;
    if (!channelId) return;

    connection.isTyping.set(channelId, true);

    // Clear existing timeout
    const timeoutKey = `${connection.userEmail}:${channelId}`;
    const existingTimeout = this.typingTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Broadcast typing indicator
    this.broadcastToChannel(channelId, {
      type: 'typing',
      data: { userEmail: connection.userEmail },
      timestamp: Date.now(),
      channelId,
    }, [connection.socketId]);

    // Auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      this.handleStopTyping(socket, connection, { channelId });
    }, 3000);

    this.typingTimeouts.set(timeoutKey, timeout);
  }

  private async handleStopTyping(socket: any, connection: UserConnection, data: any) {
    const { channelId } = data;
    if (!channelId) return;

    connection.isTyping.set(channelId, false);

    // Clear timeout
    const timeoutKey = `${connection.userEmail}:${channelId}`;
    const existingTimeout = this.typingTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingTimeouts.delete(timeoutKey);
    }

    // Broadcast stop typing
    this.broadcastToChannel(channelId, {
      type: 'stop_typing',
      data: { userEmail: connection.userEmail },
      timestamp: Date.now(),
      channelId,
    }, [connection.socketId]);
  }

  private async handleJoinChannel(socket: any, connection: UserConnection, data: any) {
    const { channelId } = data;
    if (!channelId) return;

    try {
      const db = getDatabase();
      // Verify access and join channel room
      const hasAccess = await this.verifyChannelAccess(connection.userEmail, channelId);
      if (!hasAccess) {
        socket.emit('error', { error: 'Access denied to channel' });
        return;
      }

      socket.join(`channel:${channelId}`);
      this.addChannelMember(channelId, connection.userEmail);

      // Broadcast user joined
      this.broadcastToChannel(channelId, {
        type: 'user_joined',
        data: { userEmail: connection.userEmail },
        timestamp: Date.now(),
        channelId,
      }, [connection.socketId]);

      // Send recent messages
      const messages = await this.getRecentMessages(channelId);
      socket.emit('chat:recent_messages', {
        channelId,
        messages,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error joining channel:', error);
      socket.emit('error', { error: 'Failed to join channel' });
    }
  }

  private async handleLeaveChannel(socket: any, connection: UserConnection, data: any) {
    const { channelId } = data;
    if (!channelId) return;

    socket.leave(`channel:${channelId}`);
    this.removeChannelMember(channelId, connection.userEmail);

    // Stop typing if user was typing
    if (connection.isTyping.get(channelId)) {
      this.handleStopTyping(socket, connection, { channelId });
    }

    // Broadcast user left
    this.broadcastToChannel(channelId, {
      type: 'user_left',
      data: { userEmail: connection.userEmail },
      timestamp: Date.now(),
      channelId,
    });
  }

  private async handleMarkMessageRead(socket: any, connection: UserConnection, data: any) {
    const { channelId, messageId } = data;
    if (!channelId || !messageId) return;

    try {
      const db = getDatabase();
      // TODO: Implement proper read receipt tracking
      // channelMemberships table doesn't exist in schema yet
      // await db.update(channelMemberships)
      //   .set({ lastReadAt: new Date() })
      //   .where(...);

      // Broadcast read receipt
      this.broadcastToChannel(channelId, {
        type: 'message_read',
        data: { userEmail: connection.userEmail, messageId },
        timestamp: Date.now(),
        channelId,
        messageId,
      });

    } catch (error) {
      console.error('❌ Error marking message as read:', error);
    }
  }

  // Real-time Collaboration Handlers
  private async handlePresenceUpdate(socket: any, connection: UserConnection, data: any) {
    const { status, currentPage } = data;
    
    connection.presence = status || 'online';
    connection.currentPage = currentPage;
    connection.lastSeen = new Date();

    await this.updateUserPresence(connection.userEmail, connection.workspaceId, connection.presence);

    // Broadcast presence update to workspace
    this.io.to(`workspace:${connection.workspaceId}`).emit('realtime:presence', {
      userEmail: connection.userEmail,
      presence: connection.presence,
      currentPage: connection.currentPage,
      lastSeen: connection.lastSeen,
      timestamp: Date.now()
    });
  }

  private async handleCursorUpdate(socket: any, connection: UserConnection, data: any) {
    const { x, y, elementId, resourceId } = data;

    // Broadcast cursor position to resource viewers
    if (resourceId) {
      socket.to(`resource:${resourceId}`).emit('realtime:cursor', {
        userEmail: connection.userEmail,
        x, y, elementId, resourceId,
        timestamp: Date.now()
      });
    }
  }

  private async handleSessionUpdate(socket: any, connection: UserConnection, data: any) {
    const { resourceId, resourceType, action, metadata } = data;

    if (action === 'join' && resourceId) {
      socket.join(`resource:${resourceId}`);
    } else if (action === 'leave' && resourceId) {
      socket.leave(`resource:${resourceId}`);
    }

    // Broadcast session update
    this.io.to(`resource:${resourceId}`).emit('realtime:session', {
      userEmail: connection.userEmail,
      resourceId,
      resourceType,
      action,
      metadata,
      timestamp: Date.now()
    });
  }

  // System Handlers
  private handlePing(socket: any, connection: UserConnection) {
    connection.lastSeen = new Date();
    socket.emit('pong', { timestamp: Date.now() });
  }

  // @epic-4.1-direct-messaging: Direct messaging handlers
  private async handleStartDirectConversation(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Epic 4.1 - Direct messaging temporarily disabled - schema mismatch
      socket.emit('error', { error: 'Direct messaging temporarily unavailable' });
      logger.warn('Direct messaging feature disabled - schema migration needed');
      return;

      /*
      const { targetUserEmail } = data;

      if (!targetUserEmail) {
        socket.emit('error', { error: 'Missing targetUserEmail' });
        return;
      }

      if (connection.userEmail === targetUserEmail) {
        socket.emit('error', { error: 'Cannot start conversation with yourself' });
        return;
      }

      // Check if conversation already exists
      const existingConversation = await db.query.directMessageConversationsTable.findFirst({
        where: or(
          and(
            eq(directMessageConversationsTable.user1Email, connection.userEmail),
            eq(directMessageConversationsTable.user2Email, targetUserEmail)
          ),
          and(
            eq(directMessageConversationsTable.user1Email, targetUserEmail),
            eq(directMessageConversationsTable.user2Email, connection.userEmail)
          )
        )
      });

      if (existingConversation) {
        // Join existing conversation
        socket.join(`dm:${existingConversation.channelId}`);
        socket.emit('dm:conversation_started', {
          channelId: existingConversation.channelId,
          conversation: existingConversation
        });
      } else {
        // Create new conversation
        const channelId = uuidv4();
        const channelName = `DM: ${connection.userEmail} & ${targetUserEmail}`;
        
        await db.insert(channelTable).values({
          name: channelName,
          type: 'direct',
          workspaceId: connection.workspaceId,
          createdBy: connection.userEmail,
          isPrivate: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const [newConversation] = await db.insert(directMessageConversationsTable).values({
          user1Email: connection.userEmail,
          user2Email: targetUserEmail,
          channelId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        // Join the new conversation
        socket.join(`dm:${channelId}`);
        
        // Notify both users about the new conversation
        socket.emit('dm:conversation_started', {
          channelId,
          conversation: newConversation
        });

        // Notify the other user if they're online
        const targetUserSockets = this.userSockets.get(targetUserEmail);
        if (targetUserSockets) {
          targetUserSockets.forEach(socketId => {
            const targetSocket = this.io.sockets.sockets.get(socketId);
            if (targetSocket) {
              targetSocket.emit('dm:new_conversation', {
                channelId,
                conversation: newConversation,
                initiatorEmail: connection.userEmail
              });
            }
          });
        }
      }
      */

    } catch (error) {
      logger.error('❌ Error starting direct conversation:', error);
      socket.emit('error', { error: 'Failed to start conversation' });
    }
  }

  private async handleJoinDirectConversation(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Epic 4.1 - Direct messaging temporarily disabled
      socket.emit('error', { error: 'Direct messaging temporarily unavailable' });
      return;
      /*
      const { channelId } = data;

      if (!channelId) {
        socket.emit('error', { error: 'Missing channelId' });
        return;
      }

      // Verify user has access to this direct message
      const conversation = await db.query.directMessageConversationsTable.findFirst({
        where: and(
          eq(directMessageConversationsTable.channelId, channelId),
          or(
            eq(directMessageConversationsTable.user1Email, connection.userEmail),
            eq(directMessageConversationsTable.user2Email, connection.userEmail)
          )
        )
      });

      if (!conversation) {
        socket.emit('error', { error: 'Access denied to conversation' });
        return;
      }

      // Join the conversation room
      socket.join(`dm:${channelId}`);
      
      // Send recent messages
      const messages = await this.getRecentMessages(channelId);
      socket.emit('dm:conversation_joined', {
        channelId,
        messages,
        conversation
      });

      // Notify other participants
      socket.to(`dm:${channelId}`).emit('dm:user_joined_conversation', {
        channelId,
        userEmail: connection.userEmail,
        timestamp: Date.now()
      });
      */

    } catch (error) {
      logger.error('❌ Error joining direct conversation:', error);
      socket.emit('error', { error: 'Failed to join conversation' });
    }
  }

  private async handleDirectMessage(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Epic 4.1 - Direct messaging temporarily disabled
      socket.emit('error', { error: 'Direct messaging temporarily unavailable' });
      return;
      /*
      const { channelId, content, messageType = 'text', parentMessageId, mentions, attachments } = data;

      if (!channelId || !content?.trim()) {
        socket.emit('error', { error: 'Missing required message data' });
        return;
      }

      // Verify user has access to this direct message
      const conversation = await db.query.directMessageConversationsTable.findFirst({
        where: and(
          eq(directMessageConversationsTable.channelId, channelId),
          or(
            eq(directMessageConversationsTable.user1Email, connection.userEmail),
            eq(directMessageConversationsTable.user2Email, connection.userEmail)
          )
        )
      });

      if (!conversation) {
        socket.emit('error', { error: 'Access denied to conversation' });
        return;
      }

      // Store message in database
      const message = await db.insert(messageTable).values({
        id: uuidv4(),
        channelId,
        userEmail: connection.userEmail,
        content: content.trim(),
        messageType,
        parentMessageId,
        mentions: mentions ? JSON.stringify(mentions) : null,
        attachments: attachments ? JSON.stringify(attachments) : null,
        createdAt: new Date(),
      }).returning();

      // Update conversation last message time
      await db.update(directMessageConversationsTable)
        .set({
          lastMessageAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(directMessageConversationsTable.channelId, channelId));

      // Increment unread count for the other user
      const isUser1 = conversation.user1Email === connection.userEmail;
      const updateField = isUser1 ? 'unreadCount2' : 'unreadCount1';
      
      await db.update(directMessageConversationsTable)
        .set({
          [updateField]: conversation[updateField] + 1,
          updatedAt: new Date()
        })
        .where(eq(directMessageConversationsTable.channelId, channelId));

      const messageData = {
        type: 'dm:message',
        data: { message: message[0] },
        timestamp: Date.now(),
        channelId,
        messageId: message[0]?.id,
        userEmail: connection.userEmail,
      };

      // Broadcast to conversation participants
      this.io.to(`dm:${channelId}`).emit('dm:message_received', messageData);

      // Send delivery confirmation
      socket.emit('dm:message_delivered', {
        messageId: message[0]?.id,
        timestamp: Date.now()
      });

      // Publish event for other systems
      publishEvent('direct_message.created', { channelId, message: message[0] });
      */

    } catch (error) {
      logger.error('❌ Error handling direct message:', error);
      socket.emit('error', { error: 'Failed to send message' });
    }
  }

  private async handleDirectTyping(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Epic 4.1 - Direct messaging temporarily disabled
      return;
      /*
      const { channelId } = data;
      if (!channelId) return;

      // Verify access to conversation
      const conversation = await db.query.directMessageConversationsTable.findFirst({
        where: and(
          eq(directMessageConversationsTable.channelId, channelId),
          or(
            eq(directMessageConversationsTable.user1Email, connection.userEmail),
            eq(directMessageConversationsTable.user2Email, connection.userEmail)
          )
        )
      });

      if (!conversation) return;

      // Broadcast typing indicator to conversation participants
      socket.to(`dm:${channelId}`).emit('dm:typing', {
        channelId,
        userEmail: connection.userEmail,
        timestamp: Date.now()
      });
      */

    } catch (error) {
      logger.error('❌ Error handling direct typing:', error);
    }
  }

  private async handleDirectStopTyping(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Epic 4.1 - Direct messaging temporarily disabled
      return;
    } catch (error) {
      logger.error('❌ Error handling direct stop typing:', error);
    }
  }

  // @epic-4.1-direct-messaging: Get direct message conversations
  private async handleGetDirectConversations(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Epic 4.1 - Direct messaging temporarily disabled
      socket.emit('error', { error: 'Direct messaging temporarily unavailable' });
      return;
    } catch (error) {
      logger.error('❌ Error getting direct conversations:', error);
      socket.emit('error', { error: 'Failed to get conversations' });
    }
  }

  // @epic-4.1-direct-messaging: Get direct message history
  private async handleGetDirectHistory(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Epic 4.1 - Direct messaging temporarily disabled
      socket.emit('error', { error: 'Direct messaging temporarily unavailable' });
      return;
    } catch (error) {
      logger.error('❌ Error getting direct message history:', error);
      socket.emit('error', { error: 'Failed to get message history' });
    }
  }

  // @epic-3.6-communication: Thread Handlers
  private async handleThreadReply(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Phase 3.6 - Thread replies temporarily disabled
      socket.emit('error', { error: 'Thread replies temporarily unavailable' });
      logger.warn('Thread replies feature disabled - implementation needed');
      return;
      /*
      const db = getDatabase();
      const { threadId, content, messageType = 'thread_reply', attachments = [] } = data;

      if (!threadId || !content?.trim()) {
        socket.emit('error', { error: 'Missing required thread data' });
        return;
      }

      // Verify parent message exists and user has access
      const parentMessage = await db
        .select()
        .from(messageTable)
        .where(eq(messageTable.id, threadId))
        .limit(1);

      if (!parentMessage || parentMessage.length === 0) {
        socket.emit('error', { error: 'Parent message not found' });
        return;
      }

      // Verify user has access to channel
      const hasAccess = await this.verifyChannelAccess(connection.userEmail, parentMessage[0].channelId);
      if (!hasAccess) {
        socket.emit('error', { error: 'Access denied to thread' });
        return;
      }

      // Create thread reply using thread handler
      const replyId = await threadHandler.createThreadReply({
        id: uuidv4(),
        type: 'thread_reply',
        channelId: parentMessage.channelId,
        userEmail: connection.userEmail,
        data: {
          parentMessageId: threadId,
          content: content.trim(),
          messageType,
          attachments
        },
        timestamp: Date.now()
      });

      // Broadcast thread update to channel
      this.broadcastToChannel(parentMessage.channelId, {
        type: 'thread_reply_created',
        data: { threadId, replyId, userEmail: connection.userEmail },
        timestamp: Date.now(),
        channelId: parentMessage.channelId
      });

      // Send confirmation to sender
      socket.emit('thread:reply_created', {
        threadId,
        replyId,
        timestamp: Date.now()
      });

      // Publish event for other systems
      publishEvent('thread.reply.created', { threadId, replyId, userEmail: connection.userEmail });
      */

    } catch (error) {
      logger.error('❌ Error handling thread reply:', error);
      socket.emit('error', { error: 'Failed to create thread reply' });
    }
  }

  private async handleGetThreadMessages(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Phase 3.6 - Thread messages temporarily disabled
      socket.emit('error', { error: 'Thread messages temporarily unavailable' });
      return;
    } catch (error) {
      logger.error('❌ Error getting thread messages:', error);
      socket.emit('error', { error: 'Failed to get thread messages' });
    }
  }

  private async handleGetThreadParticipants(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Phase 3.6 - Thread participants temporarily disabled
      socket.emit('error', { error: 'Thread participants temporarily unavailable' });
      return;
    } catch (error) {
      logger.error('❌ Error getting thread participants:', error);
      socket.emit('error', { error: 'Failed to get thread participants' });
    }
  }

  private async handleUpdateThreadStatus(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Phase 3.6 - Thread status temporarily disabled
      socket.emit('error', { error: 'Thread status temporarily unavailable' });
      return;
    } catch (error) {
      logger.error('❌ Error updating thread status:', error);
      socket.emit('error', { error: 'Failed to update thread status' });
    }
  }

  private async handleMarkThreadRead(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Phase 3.6 - Thread read status temporarily disabled
      socket.emit('error', { error: 'Thread read status temporarily unavailable' });
      return;
    } catch (error) {
      logger.error('❌ Error marking thread read:', error);
      socket.emit('error', { error: 'Failed to mark thread as read' });
    }
  }

  private async handleGetThreadNotifications(socket: any, connection: UserConnection, data: any) {
    try {
      // TODO: Phase 3.6 - Thread notifications temporarily disabled
      socket.emit('error', { error: 'Thread notifications temporarily unavailable' });
      return;
    } catch (error) {
      logger.error('❌ Error getting thread notifications:', error);
      socket.emit('error', { error: 'Failed to get thread notifications' });
    }
  }

  // Real-time collaboration handlers
  private async handleDisconnection(socketId: string) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    console.log(`👋 User ${connection.userEmail} disconnected (${socketId})`);

    // Clean up typing indicators
    for (const [channelId, isTyping] of connection.isTyping) {
      if (isTyping) {
        this.broadcastToChannel(channelId, {
          type: 'stop_typing',
          data: { userEmail: connection.userEmail },
          timestamp: Date.now(),
          channelId,
        });
      }
    }

    // Clean up timeouts
    for (const [key, timeout] of this.typingTimeouts) {
      if (key.startsWith(`${connection.userEmail}:`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }

    // Remove from data structures
    this.connections.delete(socketId);
    this.removeUserSocket(connection.userEmail, socketId);

    // Update presence if no more connections
    if (!this.hasUserConnections(connection.userEmail)) {
      await this.updateUserPresence(connection.userEmail, connection.workspaceId, 'offline');
      this.removeWorkspaceUser(connection.workspaceId, connection.userEmail);

      // Broadcast user offline
      this.io.to(`workspace:${connection.workspaceId}`).emit('realtime:presence', {
        userEmail: connection.userEmail,
        presence: 'offline',
        lastSeen: new Date(),
        timestamp: Date.now()
      });
    }
  }

  // Utility Methods
  private broadcastToChannel(channelId: string, message: any, excludeSockets: string[] = []) {
    const room = this.io.to(`channel:${channelId}`);
    
    if (excludeSockets.length > 0) {
      excludeSockets.forEach(socketId => {
        room.except(socketId);
      });
    }
    
    room.emit('chat:message', message);
  }

  private async verifyWorkspaceAccess(userEmail: string, workspaceId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      // Check if user exists and get user ID
      const users = await db.select()
        .from(userTable)
        .where(eq(userTable.email, userEmail))
        .limit(1);

      if (users.length === 0) {
        logger.error('❌ User not found for workspace access:', userEmail);
        return false;
      }

      const user = users[0];

      // Check if user exists
      if (!user) {
        logger.error('❌ User not found:', { userEmail });
        return false;
      }

      // Check if user has active role assignment for this workspace (matching API logic)
      const { roleAssignmentTable } = await import('../database/schema.js');
      const roleAssignments = await db.select()
        .from(roleAssignmentTable)
        .where(and(
          eq(roleAssignmentTable.workspaceId, workspaceId),
          eq(roleAssignmentTable.userId, user.id),
          eq(roleAssignmentTable.isActive, true)
        ))
        .limit(1);

      if (roleAssignments.length === 0) {
        logger.error('❌ User has no active role in workspace:', { userEmail, workspaceId });
        return false;
      }

      logger.info(`✅ Workspace access verified for ${userEmail} in workspace ${workspaceId}`);
      return true;
    } catch (error) {
      logger.error('❌ Error verifying workspace access:', error);
      return false;
    }
  }

  private async verifyChannelAccess(userEmail: string, channelId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      // First check if user is already a member
      const membership = await db.select()
        .from(channelMembershipTable)
        .where(
          and(
            eq(channelMembershipTable.channelId, channelId),
            eq(channelMembershipTable.userEmail, userEmail)
          )
        )
        .limit(1);

      if (membership.length > 0) {
        return true;
      }

      // If not a member, check if it's a public channel and auto-join
      const channel = await db.select({
        id: channelTable.id,
        name: channelTable.name,
        isPrivate: channelTable.isPrivate,
        isArchived: channelTable.isArchived,
        workspaceId: channelTable.workspaceId
      })
        .from(channelTable)
        .where(eq(channelTable.id, channelId))
        .limit(1);

      if (channel.length === 0 || channel[0]?.isArchived) {
        return false;
      }

      const channelData = channel[0];
      if (!channelData) {
        return false;
      }

      // For public channels (isPrivate = false), verify user has workspace access and auto-join
      if (!channelData.isPrivate) {
        const workspaceAccess = await this.verifyWorkspaceAccess(userEmail, channelData.workspaceId!);
        if (workspaceAccess) {
          // Auto-join user to public channel
          try {
            const { createId } = await import("@paralleldrive/cuid2");
            // Get userId from userEmail
            const userForJoin = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, userEmail)).limit(1);
            const userId = userForJoin[0]?.id;
            
            if (!userId) {
              logger.error('Cannot auto-join: User not found', { userEmail });
              return false;
            }
            
            await db.insert(channelMembershipTable).values({
              id: createId(),
              channelId,
              userId,
              userEmail,
              role: "member",
              joinedAt: new Date(),
            });

            logger.info(`✅ Auto-joined user ${userEmail} to public channel ${channelData.name}`);
            return true;
          } catch (insertError: any) {
            // Handle potential race condition where user was added by another process
            if (insertError?.message?.includes('UNIQUE constraint failed') || insertError?.message?.includes('duplicate key')) {
              logger.info(`ℹ️ User ${userEmail} already joined channel ${channelId}`);
              return true;
            }
            logger.error('Error auto-joining user to channel:', insertError);
            return false;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Error verifying channel access:', error);
      return false;
    }
  }

  private async getRecentMessages(channelId: string, limit: number = 50) {
    try {
      const db = getDatabase();
      return await db.select()
        .from(messageTable)
        .where(eq(messageTable.channelId, channelId))
        .orderBy(desc(messageTable.createdAt))
        .limit(limit);
    } catch (error) {
      logger.error('Error fetching recent messages:', error);
      return [];
    }
  }

  private async sendUserChannels(socket: any, connection: UserConnection) {
    try {
      const db = getDatabase();

      // Use the correct table references from schema.ts (channel, not channels)
      const userChannels = await db.select({
        channel: channelTable,
        membership: channelMembershipTable
      })
        .from(channelTable)
        .innerJoin(channelMembershipTable, eq(channelTable.id, channelMembershipTable.channelId))
        .where(eq(channelMembershipTable.userEmail, connection.userEmail));

      socket.emit('chat:channels', {
        channels: userChannels.map(c => c.channel),
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error sending user channels:', error);
    }
  }

  private async sendPresenceUpdate(socket: any, connection: UserConnection) {
    const workspaceUsers = Array.from(this.workspaceUsers.get(connection.workspaceId) || []);
    
    socket.emit('realtime:presence_list', {
      users: workspaceUsers,
      timestamp: Date.now()
    });
  }

  private async updateUserPresence(userEmail: string, workspaceId: string, status: string) {
    try {
      const db = getDatabase();
      // Get user ID first
      const users = await db.select().from(userTable).where(eq(userTable.email, userEmail)).limit(1);
      if (users.length === 0) {
        logger.error('User not found for presence update:', userEmail);
        return;
      }

      // Check if presence record exists
      const existingPresence = await db.select()
        .from(userPresenceTable)
        .where(and(
          eq(userPresenceTable.userEmail, userEmail),
          eq(userPresenceTable.workspaceId, workspaceId)
        ))
        .limit(1);

      if (existingPresence.length > 0) {
        // Update existing presence
        await db
          .update(userPresenceTable)
          .set({
            status: status as any,
            lastSeen: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userPresenceTable.userEmail, userEmail),
              eq(userPresenceTable.workspaceId, workspaceId)
            )
          );
      } else if (users[0]) {
        // Create new presence record
        const { createId } = await import("@paralleldrive/cuid2");
        await db
          .insert(userPresenceTable)
          .values({
            id: createId(),
            userId: users[0].id,
            userEmail: userEmail,
            workspaceId: workspaceId,
            status: status as any,
            lastSeen: new Date(),
          } as any);
      }

      // Broadcast presence update to workspace
      this.io.to(`workspace:${workspaceId}`).emit('presence:update', {
        userEmail,
        status,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('❌ Failed to update user presence:', error);
    }
  }

  // Connection Management
  private addUserSocket(userEmail: string, socketId: string) {
    if (!this.userSockets.has(userEmail)) {
      this.userSockets.set(userEmail, new Set());
    }
    this.userSockets.get(userEmail)!.add(socketId);
  }

  private removeUserSocket(userEmail: string, socketId: string) {
    const sockets = this.userSockets.get(userEmail);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userEmail);
      }
    }
  }

  private hasUserConnections(userEmail: string): boolean {
    return this.userSockets.has(userEmail) && this.userSockets.get(userEmail)!.size > 0;
  }

  private addWorkspaceUser(workspaceId: string, userEmail: string) {
    if (!this.workspaceUsers.has(workspaceId)) {
      this.workspaceUsers.set(workspaceId, new Set());
    }
    this.workspaceUsers.get(workspaceId)!.add(userEmail);
  }

  private removeWorkspaceUser(workspaceId: string, userEmail: string) {
    const users = this.workspaceUsers.get(workspaceId);
    if (users) {
      users.delete(userEmail);
    }
  }

  private addChannelMember(channelId: string, userEmail: string) {
    if (!this.channelMembers.has(channelId)) {
      this.channelMembers.set(channelId, new Set());
    }
    this.channelMembers.get(channelId)!.add(userEmail);
  }

  private removeChannelMember(channelId: string, userEmail: string) {
    const members = this.channelMembers.get(channelId);
    if (members) {
      members.delete(userEmail);
    }
  }

  // Enhanced Health Check and Monitoring with configurable intervals
  private setupHeartbeat() {
    const HEARTBEAT_INTERVAL = 25000; // 25 seconds
    const AWAY_THRESHOLD = 120000; // 2 minutes
    const DISCONNECT_THRESHOLD = 300000; // 5 minutes
    const PING_TIMEOUT = 10000; // 10 seconds

    // Enhanced heartbeat interval with presence management
    setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];

      for (const [socketId, connection] of this.connections) {
        const timeSinceLastSeen = now - connection.lastSeen.getTime();
        
        // Mark users as away after 2 minutes of inactivity
        if (timeSinceLastSeen > AWAY_THRESHOLD && connection.presence === 'online') {
          this.updateUserPresence(connection.userEmail, connection.workspaceId, 'away');
          console.log(`😴 User ${connection.userEmail} marked as away due to inactivity`);
        }
        
        // Disconnect after 5 minutes of inactivity
        if (timeSinceLastSeen > DISCONNECT_THRESHOLD) {
          staleConnections.push(socketId);
        }
      }

      // Clean up stale connections
      staleConnections.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          console.log(`💔 Disconnecting stale connection: ${socketId}`);
          socket.disconnect(true);
        }
        this.handleDisconnection(socketId);
      });

      // Emit ping to all clients for health check
      this.io.emit('ping', { timestamp: now });

    }, HEARTBEAT_INTERVAL);

    // Ping-pong mechanism for connection health monitoring
    setInterval(() => {
      this.connections.forEach((connection) => {
        const socket = this.io.sockets.sockets.get(connection.socketId);
        if (socket) {
          socket.emit('ping', { timestamp: Date.now() });
          
          // Set up ping timeout
          setTimeout(() => {
            if (this.connections.has(connection.id)) {
              console.log(`⏰ Ping timeout for user ${connection.userEmail}`);
              this.handleDisconnection(connection.socketId);
            }
          }, PING_TIMEOUT);
        }
      });
    }, 60000); // Ping every minute

    console.log('💓 Enhanced heartbeat mechanism initialized with presence management');
  }

  // Event System Integration
  private subscribeToInternalEvents() {
    // Task updates
    subscribeToEvent('task.updated', async (data: any) => {
      this.io.to(`workspace:${data.workspaceId}`).emit('realtime:sync', {
        type: 'task_updated',
        data,
        timestamp: Date.now()
      });
    });

    // Comment updates
    subscribeToEvent('comment.created', async (data: any) => {
      this.io.to(`resource:${data.taskId}`).emit('realtime:sync', {
        type: 'comment_created',
        data,
        timestamp: Date.now()
      });
    });

    // File uploads
    subscribeToEvent('file.uploaded', async (data: any) => {
      if (data.taskId) {
        this.io.to(`resource:${data.taskId}`).emit('realtime:sync', {
          type: 'file_uploaded',
          data,
          timestamp: Date.now()
        });
      }
    });
  }

  // Public API for broadcasting
  public broadcastToWorkspace(workspaceId: string, message: any) {
    this.io.to(`workspace:${workspaceId}`).emit('realtime:broadcast', {
      ...message,
      timestamp: Date.now()
    });
  }

  public broadcastToResource(resourceId: string, message: any) {
    this.io.to(`resource:${resourceId}`).emit('realtime:broadcast', {
      ...message,
      timestamp: Date.now()
    });
  }

  // Backward-compatible wrapper used by message routes
  public broadcast(event: string, channelId: string, payload: any) {
    this.io.to(`channel:${channelId}`).emit(event, payload);
  }

  // Graceful shutdown
  public async shutdown() {
    console.log('🛑 Shutting down WebSocket server...');
    
    // Clear all timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();

    // Disconnect all clients
    this.io.disconnectSockets(true);
    
    // Close server
    this.io.close();
  }

  // Statistics and monitoring
  public getStats() {
    return {
      totalConnections: this.connections.size,
      totalUsers: this.userSockets.size,
      workspaces: this.workspaceUsers.size,
      channels: this.channelMembers.size,
      typingUsers: this.typingTimeouts.size,
    };
  }
}

export default UnifiedWebSocketServer; 