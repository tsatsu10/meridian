// @epic-3.1-messaging: Chat WebSocket Server - Phase 1 Implementation
// @persona-sarah: PM needs real-time messaging for team coordination
// @persona-david: Team lead needs reliable message delivery and presence indicators

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { publishEvent, subscribeToEvent } from '../events';
import { getDatabase } from '../database/connection';
import { 
  messageTable, 
  channelTable, 
  channelMembershipTable, 
  userPresenceTable 
} from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import logger from '../utils/logger';

export interface ChatConnection {
  id: string;
  ws: WebSocket;
  userEmail: string;
  workspaceId: string;
  lastPing: number;
  isTyping: boolean;
  typingChannel?: string;
  typingTimeout?: NodeJS.Timeout;
}

export interface ChatMessage {
  type: 'message' | 'typing' | 'stop_typing' | 'join_channel' | 'leave_channel' | 'presence' | 'ping' | 'pong' | 'message_delivered' | 'message_read';
  data: any;
  timestamp: number;
  userEmail?: string;
  channelId?: string;
  messageId?: string;
}

export interface MessagePayload {
  channelId: string;
  content: string;
  messageType?: 'text' | 'file' | 'system';
  parentMessageId?: string;
  mentions?: string[];
  attachments?: any[];
}

class ChatWebSocketServer {
  private wss: WebSocketServer;
  private connections: Map<string, ChatConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userEmail -> connectionIds
  private channelConnections: Map<string, Set<string>> = new Map(); // channelId -> connectionIds
  private typingUsers: Map<string, Set<string>> = new Map(); // channelId -> Set<userEmail>
  private pingInterval!: NodeJS.Timeout;

  constructor(port: number = 1339) {
    this.wss = new WebSocketServer({ port });
    this.setupEventHandlers();
    this.startPingInterval();
    this.subscribeToEvents();
    
    logger.debug(`💬 Chat WebSocket server started on port ${port}`);
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });
  }

  private async handleConnection(ws: WebSocket, request: IncomingMessage) {
    const connectionId = uuidv4();
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const userEmail = url.searchParams.get('userEmail');
    const workspaceId = url.searchParams.get('workspaceId');

    if (!userEmail || !workspaceId) {
      ws.close(1008, 'Missing userEmail or workspaceId');
      return;
    }

    const connection: ChatConnection = {
      id: connectionId,
      ws,
      userEmail,
      workspaceId,
      lastPing: Date.now(),
      isTyping: false,
    };

    this.connections.set(connectionId, connection);
    this.addUserConnection(userEmail, connectionId);

    logger.debug(`💬 User ${userEmail} connected to chat (${connectionId})`);

    // Update user presence to online
    await this.updateUserPresence(userEmail, 'online');

    // Send connection acknowledgment
    this.sendMessage(connection, {
      type: 'presence',
      data: { status: 'connected', connectionId },
      timestamp: Date.now(),
    });

    ws.on('message', (data: Buffer) => {
      this.handleMessage(connection, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    ws.on('error', (error) => {
      logger.error(`❌ Chat WebSocket error for ${userEmail}:`, error);
      this.handleDisconnection(connectionId);
    });

    // Send initial channel list
    await this.sendUserChannels(connection);
  }

  private async handleMessage(connection: ChatConnection, data: Buffer) {
    try {
      const message: ChatMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'message':
          await this.handleChatMessage(connection, message);
          break;
        case 'typing':
          await this.handleTyping(connection, message);
          break;
        case 'stop_typing':
          await this.handleStopTyping(connection, message);
          break;
        case 'join_channel':
          await this.handleJoinChannel(connection, message);
          break;
        case 'leave_channel':
          await this.handleLeaveChannel(connection, message);
          break;
        case 'message_read':
          await this.handleMessageRead(connection, message);
          break;
        case 'ping':
          this.handlePing(connection);
          break;
        default:
          logger.warn(`🤷 Unknown chat message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('❌ Error handling chat message:', error);
      this.sendMessage(connection, {
        type: 'error',
        data: { error: 'Invalid message format' },
        timestamp: Date.now(),
      });
    }
  }

  private async handleChatMessage(connection: ChatConnection, message: ChatMessage) {
    const { channelId, content, messageType = 'text', parentMessageId, mentions, attachments } = message.data as MessagePayload;

    try {
      const db = getDatabase();
      // Validate channel access
      const hasAccess = await this.validateChannelAccess(connection.userEmail, channelId);
      if (!hasAccess) {
        this.sendMessage(connection, {
          type: 'error',
          data: { error: 'Access denied to channel' },
          timestamp: Date.now(),
        });
        return;
      }

      // Create message in database
      const [newMessage] = await db
        .insert(messageTable)
        .values({
          channelId,
          userEmail: connection.userEmail,
          content: content.trim(),
          messageType,
          parentMessageId,
          mentions: mentions ? JSON.stringify(mentions) : null,
          attachments: attachments ? JSON.stringify(attachments) : null,
        })
        .returning();

      // Stop typing for this user in this channel
      await this.handleStopTyping(connection, { ...message, data: { channelId } });

      // Broadcast message to channel members
      await this.broadcastToChannel(channelId, {
        type: 'message',
        data: {
          message: newMessage,
          user: { email: connection.userEmail }
        },
        timestamp: Date.now(),
        userEmail: connection.userEmail,
        messageId: newMessage.id,
      }, connection.id);

      // Send delivery confirmation to sender
      this.sendMessage(connection, {
        type: 'message_delivered',
        data: { messageId: newMessage.id, status: 'delivered' },
        timestamp: Date.now(),
        messageId: newMessage.id,
      });

      // Publish event for other systems
      await publishEvent('chat:message_sent', {
        messageId: newMessage.id,
        channelId,
        userEmail: connection.userEmail,
        workspaceId: connection.workspaceId,
      });

    } catch (error) {
      logger.error('Error handling chat message:', error);
      this.sendMessage(connection, {
        type: 'error',
        data: { error: 'Failed to send message' },
        timestamp: Date.now(),
      });
    }
  }

  private async handleTyping(connection: ChatConnection, message: ChatMessage) {
    const { channelId } = message.data;
    
    if (!channelId) return;

    // Clear existing typing timeout
    if (connection.typingTimeout) {
      clearTimeout(connection.typingTimeout);
    }

    // Add user to typing users for this channel
    if (!this.typingUsers.has(channelId)) {
      this.typingUsers.set(channelId, new Set());
    }
    this.typingUsers.get(channelId)!.add(connection.userEmail);

    connection.isTyping = true;
    connection.typingChannel = channelId;

    // Broadcast typing indicator to other channel members
    await this.broadcastToChannel(channelId, {
      type: 'typing',
      data: { userEmail: connection.userEmail, isTyping: true },
      timestamp: Date.now(),
      userEmail: connection.userEmail,
      channelId,
    }, connection.id);

    // Auto-stop typing after 3 seconds
    connection.typingTimeout = setTimeout(() => {
      this.handleStopTyping(connection, { ...message, data: { channelId } });
    }, 3000);
  }

  private async handleStopTyping(connection: ChatConnection, message: ChatMessage) {
    const { channelId } = message.data;
    
    if (!channelId || !connection.isTyping || connection.typingChannel !== channelId) return;

    // Clear typing timeout
    if (connection.typingTimeout) {
      clearTimeout(connection.typingTimeout);
      connection.typingTimeout = undefined;
    }

    // Remove user from typing users
    const channelTypingUsers = this.typingUsers.get(channelId);
    if (channelTypingUsers) {
      channelTypingUsers.delete(connection.userEmail);
      if (channelTypingUsers.size === 0) {
        this.typingUsers.delete(channelId);
      }
    }

    connection.isTyping = false;
    connection.typingChannel = undefined;

    // Broadcast stop typing to other channel members
    await this.broadcastToChannel(channelId, {
      type: 'stop_typing',
      data: { userEmail: connection.userEmail, isTyping: false },
      timestamp: Date.now(),
      userEmail: connection.userEmail,
      channelId,
    }, connection.id);
  }

  private async handleJoinChannel(connection: ChatConnection, message: ChatMessage) {
    const { channelId } = message.data;
    
    try {
      const hasAccess = await this.validateChannelAccess(connection.userEmail, channelId);
      if (!hasAccess) {
        this.sendMessage(connection, {
          type: 'error',
          data: { error: 'Access denied to channel' },
          timestamp: Date.now(),
        });
        return;
      }

      this.addChannelConnection(channelId, connection.id);

      // Send recent messages
      await this.sendRecentMessages(connection, channelId);

      // Notify channel members of user joining
      await this.broadcastToChannel(channelId, {
        type: 'user_joined',
        data: { userEmail: connection.userEmail },
        timestamp: Date.now(),
        userEmail: connection.userEmail,
        channelId,
      }, connection.id);

    } catch (error) {
      logger.error('Error joining channel:', error);
      this.sendMessage(connection, {
        type: 'error',
        data: { error: 'Failed to join channel' },
        timestamp: Date.now(),
      });
    }
  }

  private async handleLeaveChannel(connection: ChatConnection, message: ChatMessage) {
    const { channelId } = message.data;
    
    this.removeChannelConnection(channelId, connection.id);

    // Stop typing if user was typing in this channel
    if (connection.isTyping && connection.typingChannel === channelId) {
      await this.handleStopTyping(connection, message);
    }

    // Notify channel members of user leaving
    await this.broadcastToChannel(channelId, {
      type: 'user_left',
      data: { userEmail: connection.userEmail },
      timestamp: Date.now(),
      userEmail: connection.userEmail,
      channelId,
    }, connection.id);
  }

  private async handleMessageRead(connection: ChatConnection, message: ChatMessage) {
    const { channelId, messageId } = message.data;
    
    try {
      const db = getDatabase();
      // Update last read timestamp in channel membership
      await db
        .update(channelMembershipTable)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(channelMembershipTable.channelId, channelId),
            eq(channelMembershipTable.userEmail, connection.userEmail)
          )
        );

      // Optionally broadcast read receipt
      await this.broadcastToChannel(channelId, {
        type: 'message_read',
        data: { userEmail: connection.userEmail, messageId },
        timestamp: Date.now(),
        userEmail: connection.userEmail,
        channelId,
        messageId,
      }, connection.id);

    } catch (error) {
      logger.error('Error updating read status:', error);
    }
  }

  private handlePing(connection: ChatConnection) {
    connection.lastPing = Date.now();
    this.sendMessage(connection, {
      type: 'pong',
      data: {},
      timestamp: Date.now(),
    });
  }

  private async handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    logger.debug(`💬 User ${connection.userEmail} disconnected from chat (${connectionId})`);

    // Clean up typing state
    if (connection.isTyping && connection.typingChannel) {
      await this.handleStopTyping(connection, {
        type: 'stop_typing',
        data: { channelId: connection.typingChannel },
        timestamp: Date.now(),
      });
    }

    // Remove from connections
    this.connections.delete(connectionId);
    this.removeUserConnection(connection.userEmail, connectionId);

    // Remove from all channels
    for (const [channelId, connectionIds] of this.channelConnections) {
      connectionIds.delete(connectionId);
      if (connectionIds.size === 0) {
        this.channelConnections.delete(channelId);
      }
    }

    // Update presence if this was the last connection for this user
    const userConnections = this.userConnections.get(connection.userEmail);
    if (!userConnections || userConnections.size === 0) {
      await this.updateUserPresence(connection.userEmail, 'offline');
    }
  }

  // Helper methods
  private addUserConnection(userEmail: string, connectionId: string) {
    if (!this.userConnections.has(userEmail)) {
      this.userConnections.set(userEmail, new Set());
    }
    this.userConnections.get(userEmail)!.add(connectionId);
  }

  private removeUserConnection(userEmail: string, connectionId: string) {
    const connections = this.userConnections.get(userEmail);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.userConnections.delete(userEmail);
      }
    }
  }

  private addChannelConnection(channelId: string, connectionId: string) {
    if (!this.channelConnections.has(channelId)) {
      this.channelConnections.set(channelId, new Set());
    }
    this.channelConnections.get(channelId)!.add(connectionId);
  }

  private removeChannelConnection(channelId: string, connectionId: string) {
    const connections = this.channelConnections.get(channelId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.channelConnections.delete(channelId);
      }
    }
  }

  private sendMessage(connection: ChatConnection, message: ChatMessage) {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private async broadcastToChannel(channelId: string, message: ChatMessage, excludeConnectionId?: string) {
    const connectionIds = this.channelConnections.get(channelId) || new Set();
    
    for (const connectionId of connectionIds) {
      if (connectionId === excludeConnectionId) continue;
      
      const connection = this.connections.get(connectionId);
      if (connection) {
        this.sendMessage(connection, message);
      }
    }
  }

  private async validateChannelAccess(userEmail: string, channelId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      // First check if user is already a member
      const membership = await db
        .select()
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
        archived: channelTable.archived,
        workspaceId: channelTable.workspaceId
      })
        .from(channelTable)
        .where(eq(channelTable.id, channelId))
        .limit(1);

      if (channel.length === 0 || channel[0].archived) {
        return false;
      }

      // For public channels, verify user has workspace access and auto-join
      if (!channel[0].isPrivate) {
        const workspaceAccess = await this.verifyWorkspaceAccess(userEmail, channel[0].workspaceId);
        if (workspaceAccess) {
          // Auto-join user to public channel
          try {
            const { createId } = await import("@paralleldrive/cuid2");
            await db.insert(channelMembershipTable).values({
              id: createId(),
              channelId,
              userEmail,
              role: "member",
              joinedAt: new Date(),
            });

            logger.debug(`✅ Auto-joined user ${userEmail} to public channel ${channel[0].name}`);
            return true;
          } catch (insertError) {
            // Handle potential race condition where user was added by another process
            if (insertError?.message?.includes('UNIQUE constraint failed')) {
              logger.debug(`ℹ️ User ${userEmail} already joined channel ${channelId}`);
              return true;
            }
            logger.error('Error auto-joining user to channel:', insertError);
            return false;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Error validating channel access:', error);
      return false;
    }
  }

  private async updateUserPresence(userEmail: string, status: 'online' | 'offline' | 'away') {
    try {
      const db = getDatabase();
      // Get user ID from email
      const user = await db.query.userTable.findFirst({
        where: (users, { eq }) => eq(users.email, userEmail),
      });

      if (!user) return;

      // Update or insert presence
      await db
        .insert(userPresenceTable)
        .values({
          userEmail: userEmail,
          workspaceId: 'default', // We need to get the actual workspace ID
          status,
          lastSeen: new Date(),
        })
        .onConflictDoUpdate({
          target: userPresenceTable.userEmail,
          set: {
            status,
            lastSeen: new Date(),
          },
        });
    } catch (error) {
      logger.error('Error updating user presence:', error);
    }
  }

  private async sendUserChannels(connection: ChatConnection) {
    try {
      const db = getDatabase();
      // Get user's channels
      const channels = await db
        .select({
          id: channelTable.id,
          name: channelTable.name,
          type: channelTable.type,
          description: channelTable.description,
        })
        .from(channelTable)
        .innerJoin(
          channelMembershipTable,
          eq(channelTable.id, channelMembershipTable.channelId)
        )
        .where(eq(channelMembershipTable.userEmail, connection.userEmail));

      this.sendMessage(connection, {
        type: 'channels',
        data: { channels },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error fetching user channels:', error);
    }
  }

  private async sendRecentMessages(connection: ChatConnection, channelId: string, limit: number = 50) {
    try {
      const db = getDatabase();
      const messages = await db
        .select()
        .from(messageTable)
        .where(eq(messageTable.channelId, channelId))
        .orderBy(desc(messageTable.createdAt))
        .limit(limit);

      this.sendMessage(connection, {
        type: 'recent_messages',
        data: { 
          channelId, 
          messages: messages.reverse() // Reverse to get chronological order
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error fetching recent messages:', error);
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];

      for (const [connectionId, connection] of this.connections) {
        if (now - connection.lastPing > 60000) { // 60 seconds timeout
          staleConnections.push(connectionId);
        } else {
          // Send ping
          this.sendMessage(connection, {
            type: 'ping',
            data: {},
            timestamp: now,
          });
        }
      }

      // Clean up stale connections
      for (const connectionId of staleConnections) {
        this.handleDisconnection(connectionId);
      }
    }, 30000); // Ping every 30 seconds
  }

  private subscribeToEvents() {
    // Subscribe to external events that should trigger chat messages
    subscribeToEvent('task.created', async (data: any) => {
      // Auto-create system message in project channel
      if (data.projectId) {
        await this.createSystemMessage(data.projectId, `New task created: ${data.title}`, 'task_created');
      }
    });

    subscribeToEvent('task.status_changed', async (data: any) => {
      if (data.projectId) {
        await this.createSystemMessage(data.projectId, `Task status changed: ${data.title} → ${data.newStatus}`, 'task_updated');
      }
    });
  }

  private async createSystemMessage(channelId: string, content: string, messageType: string = 'system') {
    try {
      const db = getDatabase();
      const [systemMessage] = await db
        .insert(messageTable)
        .values({
          channelId,
          userEmail: 'system@meridian.app', // System user
          content,
          messageType,
        })
        .returning();

      // Broadcast to channel
      await this.broadcastToChannel(channelId, {
        type: 'message',
        data: {
          message: systemMessage,
          user: { email: 'system@meridian.app', name: 'System' }
        },
        timestamp: Date.now(),
        messageId: systemMessage.id,
      });
    } catch (error) {
      logger.error('Error creating system message:', error);
    }
  }

  public shutdown() {
    clearInterval(this.pingInterval);
    
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close(1001, 'Server shutting down');
    }
    
    this.wss.close();
    logger.debug('💬 Chat WebSocket server shut down');
  }

  // Public method for external message broadcasting
  public async broadcastMessage(channelId: string, message: any) {
    await this.broadcastToChannel(channelId, {
      type: 'message',
      data: message,
      timestamp: Date.now(),
    });
  }
}

export default ChatWebSocketServer; 
