import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { verifyToken } from '../../auth/jwt';
import { prisma } from '../../lib/prisma';
import logger from '../../utils/logger';

interface ChatMessage {
  type: 'message' | 'typing' | 'reaction' | 'read';
  channelId: string;
  content?: string;
  userId: string;
  messageId?: string;
  reaction?: string;
}

export class ChatWebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      try {
        // Extract token from query string
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token) {
          ws.close(1008, 'No authentication token provided');
          return;
        }

        // Verify token and get user
        const payload = await verifyToken(token);
        const userId = payload.sub;

        // Store client connection
        if (!this.clients.has(userId)) {
          this.clients.set(userId, new Set());
        }
        this.clients.get(userId)!.add(ws);

        // Handle incoming messages
        ws.on('message', async (data: string) => {
          try {
            const message: ChatMessage = JSON.parse(data);
            await this.handleMessage(message, userId);
          } catch (error) {
            logger.error('Error handling message:', error);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          const userClients = this.clients.get(userId);
          if (userClients) {
            userClients.delete(ws);
            if (userClients.size === 0) {
              this.clients.delete(userId);
            }
          }
        });

      } catch (error) {
        logger.error('WebSocket connection error:', error);
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private async handleMessage(message: ChatMessage, senderId: string) {
    try {
      switch (message.type) {
        case 'message':
          // Store message in database
          const newMessage = await prisma.message.create({
            data: {
              channelId: message.channelId,
              userId: senderId,
              content: message.content!,
              type: 'text'
            }
          });

          // Broadcast to channel members
          await this.broadcastToChannel(message.channelId, {
            type: 'message',
            message: newMessage
          });
          break;

        case 'typing':
          await this.broadcastToChannel(message.channelId, {
            type: 'typing',
            userId: senderId
          }, [senderId]);
          break;

        case 'reaction':
          if (message.messageId && message.reaction) {
            // Store reaction in database
            await prisma.messageReaction.create({
              data: {
                messageId: message.messageId,
                userId: senderId,
                emoji: message.reaction
              }
            });

            // Broadcast reaction
            await this.broadcastToChannel(message.channelId, {
              type: 'reaction',
              messageId: message.messageId,
              userId: senderId,
              reaction: message.reaction
            });
          }
          break;

        case 'read':
          // Update last read timestamp
          await prisma.channelMember.update({
            where: {
              channelId_userId: {
                channelId: message.channelId,
                userId: senderId
              }
            },
            data: {
              lastReadAt: new Date()
            }
          });
          break;
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  private async broadcastToChannel(channelId: string, data: any, excludeUsers: string[] = []) {
    try {
      // Get channel members
      const members = await prisma.channelMember.findMany({
        where: { channelId }
      });

      // Broadcast to all connected members except excluded users
      members.forEach(member => {
        if (!excludeUsers.includes(member.userId)) {
          const userClients = this.clients.get(member.userId);
          if (userClients) {
            userClients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
          }
        }
      });
    } catch (error) {
      logger.error('Error broadcasting to channel:', error);
    }
  }
} 
