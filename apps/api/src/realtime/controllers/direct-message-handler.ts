// @epic-3.6-communication: Direct messaging system
import { WebSocketMessage } from '../websocket-server';
import { getDatabase } from '../../database/connection';
import { messageTable, userTable } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { or, asc } from 'drizzle-orm';

export interface DirectMessageData {
  recipientEmail: string;
  content: string;
  messageType?: string;
  attachments?: string[];
}

export interface UserPresence {
  userEmail: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
}

class DirectMessageHandler {
  private static instance: DirectMessageHandler;
  private userPresence: Map<string, UserPresence> = new Map();

  private constructor() {
    // Start presence cleanup
    setInterval(() => this.cleanupStalePresence(), 5 * 60 * 1000); // Every 5 minutes
  }

  public static getInstance(): DirectMessageHandler {
    if (!DirectMessageHandler.instance) {
      DirectMessageHandler.instance = new DirectMessageHandler();
    }
    return DirectMessageHandler.instance;
  }

  public async handleDirectMessage(message: WebSocketMessage<DirectMessageData>): Promise<void> {
    const db = getDatabase();
    const { recipientEmail, content, messageType = 'text', attachments = [] } = message.data!;

    // Validate recipient exists
    const recipient = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, recipientEmail))
      .get();

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Create direct message
    const dmId = createId();
    await db.insert(messageTable).values({
      id: dmId,
      channelId: `dm:${message.userEmail}:${recipientEmail}`, // Direct message channel format
      userEmail: message.userEmail,
      content,
      messageType,
      attachments: JSON.stringify(attachments),
      createdAt: new Date(),
    });

    // Return the created message
    return {
      id: dmId,
      type: 'direct_message',
      channelId: `dm:${message.userEmail}:${recipientEmail}`,
      userEmail: message.userEmail,
      content,
      data: {
        recipientEmail,
        messageType,
        attachments,
      },
      timestamp: new Date(),
    };
  }

  public async updatePresence(userEmail: string, status: 'online' | 'offline' | 'away'): Promise<void> {
    this.userPresence.set(userEmail, {
      userEmail,
      status,
      lastSeen: new Date(),
    });
  }

  public async getUserPresence(userEmail: string): Promise<UserPresence | undefined> {
    return this.userPresence.get(userEmail);
  }

  public async getMessageHistory(userEmail: string, otherUserEmail: string): Promise<WebSocketMessage<DirectMessageData>[]> {
    const db = getDatabase();
    const channelPattern1 = `dm:${userEmail}:${otherUserEmail}`;
    const channelPattern2 = `dm:${otherUserEmail}:${userEmail}`;

    const messages = await db
      .select()
      .from(messageTable)
      .where(
        or(
          eq(messageTable.channelId, channelPattern1),
          eq(messageTable.channelId, channelPattern2)
        )
      )
      .orderBy(asc(messageTable.createdAt));

    return messages.map(msg => ({
      id: msg.id,
      type: 'direct_message',
      channelId: msg.channelId,
      userEmail: msg.userEmail,
      content: msg.content,
      data: {
        recipientEmail: msg.channelId.split(':')[2], // Extract recipient from channel ID
        messageType: msg.messageType,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
      },
      timestamp: msg.createdAt,
    }));
  }

  private async cleanupStalePresence(): Promise<void> {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes

    for (const [userEmail, presence] of this.userPresence.entries()) {
      if (presence.lastSeen < staleThreshold) {
        // Mark user as offline if no activity for 30 minutes
        await this.updatePresence(userEmail, 'offline');
      }
    }
  }
}

export const directMessageHandler = DirectMessageHandler.getInstance(); 
