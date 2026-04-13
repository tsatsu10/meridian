// @epic-3.6-communication: Reactions and mentions system
import { WebSocketMessage } from '../websocket-server';
import { getDatabase } from '../../database/connection';
import { messageTable, userTable, notificationTable } from '../../database/schema';
import { eq, or, like, SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { WebSocket } from 'ws';

export interface Reaction {
  emoji: string;
  userEmail: string;
  timestamp: Date;
}

export interface MessageReactions {
  messageId: string;
  reactions: Map<string, Reaction>; // emoji -> reaction
}

export interface MentionSuggestion {
  email: string;
  name: string;
}

interface MentionNotification {
  type: 'mention';
  messageId: string;
  channelId: string;
  mentionedBy: string;
  content: string;
  timestamp: Date;
}

class ReactionHandler {
  private static instance: ReactionHandler;
  private messageReactions: Map<string, MessageReactions> = new Map();

  private constructor() {}

  public static getInstance(): ReactionHandler {
    if (!ReactionHandler.instance) {
      ReactionHandler.instance = new ReactionHandler();
    }
    return ReactionHandler.instance;
  }

  public async addReaction(messageId: string, emoji: string, userEmail: string): Promise<void> {
    // Get or create message reactions
    let messageReactions = this.messageReactions.get(messageId);
    if (!messageReactions) {
      messageReactions = {
        messageId,
        reactions: new Map(),
      };
      this.messageReactions.set(messageId, messageReactions);
    }

    // Get or create reaction
    let reaction = messageReactions.reactions.get(emoji);
    if (!reaction) {
      reaction = {
        emoji,
        userEmail,
        timestamp: new Date(),
      };
      messageReactions.reactions.set(emoji, reaction);
    }

    // Add user if not already reacted
    if (!reaction.userEmail) {
      reaction.userEmail = userEmail;
      reaction.timestamp = new Date();

      // Update database
      await this.updateMessageReactions(messageId);
    }
  }

  public async removeReaction(messageId: string, emoji: string, userEmail: string): Promise<void> {
    const messageReactions = this.messageReactions.get(messageId);
    if (!messageReactions) return;

    const reaction = messageReactions.reactions.get(emoji);
    if (!reaction) return;

    // Remove user and update count
    const userIndex = reaction.userEmail.indexOf(userEmail);
    if (userIndex !== -1) {
      reaction.userEmail = reaction.userEmail.slice(0, userIndex) + reaction.userEmail.slice(userIndex + 1);
      reaction.timestamp = new Date();

      // Remove reaction if no users left
      if (reaction.userEmail.length === 0) {
        messageReactions.reactions.delete(emoji);
      }

      // Update database
      await this.updateMessageReactions(messageId);
    }
  }

  public async getMessageReactions(messageId: string): Promise<Map<string, Reaction>> {
    const messageReactions = this.messageReactions.get(messageId);
    return messageReactions?.reactions || new Map();
  }

  private async updateMessageReactions(messageId: string): Promise<void> {
    const db = getDatabase();
    const messageReactions = this.messageReactions.get(messageId);
    if (!messageReactions) return;

    // Convert reactions map to JSON-friendly format
    const reactionsJson = Array.from(messageReactions.reactions.entries()).map(([emoji, reaction]) => ({
      emoji,
      userEmail: reaction.userEmail,
      timestamp: reaction.timestamp,
    }));

    // Update message in database
    await db
      .update(messageTable)
      .set({
        reactions: JSON.stringify(reactionsJson),
        updatedAt: new Date(),
      })
      .where(eq(messageTable.id, messageId));
  }

  public async getMentionSuggestions(query: string, limit: number = 5): Promise<MentionSuggestion[]> {
    const db = getDatabase();
    
    // Search users by name or email
    const users = await db
      .select({
        email: userTable.email,
        name: userTable.name,
      })
      .from(userTable)
      .where(
        or(
          like(userTable.name, `%${query}%`),
          like(userTable.email, `%${query}%`)
        )
      )
      .limit(limit);

    return users.map(user => ({
      email: user.email,
      name: user.name,
    }));
  }

  public async processMentions(content: string, messageId: string, channelId: string, senderEmail: string): Promise<string[]> {
    const db = getDatabase();
    const mentions: string[] = [];
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const emailToCheck = match[1];
      // Verify user exists
      const users = await db
        .select({
          email: userTable.email
        })
        .from(userTable)
        .where(eq(userTable.email, emailToCheck))
        .all();

      const user = users[0];
      if (user && user.email) {
        mentions.push(user.email);
        // Send notification
        await this.sendMentionNotification({
          type: 'mention',
          messageId,
          channelId,
          mentionedBy: senderEmail,
          content,
          timestamp: new Date(),
        }, user.email);
      }
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  private async sendMentionNotification(notification: MentionNotification, recipientEmail: string): Promise<void> {
    const db = getDatabase();
    
    // Store notification in database
    const now = new Date();
    await db.insert(notificationTable).values({
      id: createId(),
      userEmail: recipientEmail,
      title: `You were mentioned by ${notification.mentionedBy}`,
      content: notification.content,
      type: notification.type,
      isRead: false,
      resourceId: notification.messageId,
      resourceType: 'message',
      createdAt: now,
    });

    // Send real-time notification if user is online
    const userSocket = this.getUserSocket(recipientEmail);
    if (userSocket) {
      userSocket.send(JSON.stringify({
        type: 'notification',
        data: notification,
      }));
    }
  }

  private getUserSocket(email: string): WebSocket | null {
    // Implementation to get user's WebSocket connection
    // This should be integrated with your WebSocket server
    return null; // Placeholder
  }
}

export default ReactionHandler;
