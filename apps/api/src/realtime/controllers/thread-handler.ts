// @epic-3.6-communication: Message threading system
import { WebSocketMessage } from '../websocket-server';
import { getDatabase } from '../../database/connection';
import { messageTable } from '../../database/schema';
import { eq, and, or, asc, sql, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { channelMemberTable } from '../../database/schema';

export interface ThreadMessageData {
  parentMessageId: string;
  content: string;
  messageType?: string;
  attachments?: string[];
}

export interface ThreadParticipant {
  userEmail: string;
  lastReadAt: Date;
}

interface ThreadNotification {
  threadId: string; // parentMessageId
  userEmail: string;
  unreadCount: number;
  lastActivity: Date;
}

class ThreadHandler {
  private static instance: ThreadHandler;
  private threadParticipants: Map<string, ThreadParticipant[]> = new Map(); // parentMessageId -> participants
  private threadNotifications: Map<string, Map<string, ThreadNotification>> = new Map(); // threadId -> userEmail -> notification

  private constructor() {}

  public static getInstance(): ThreadHandler {
    if (!ThreadHandler.instance) {
      ThreadHandler.instance = new ThreadHandler();
    }
    return ThreadHandler.instance;
  }

  public async createThreadReply(message: WebSocketMessage<ThreadMessageData>): Promise<string> {
    const db = getDatabase();
    const { parentMessageId, content, messageType = 'thread_reply', attachments = [] } = message.data!;

    // Verify parent message exists
    const parentMessage = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.id, parentMessageId))
      .get();

    if (!parentMessage) {
      throw new Error('Parent message not found');
    }

    // Create thread reply
    const replyId = createId();
    await db.insert(messageTable).values({
      id: replyId,
      channelId: parentMessage.channelId,
      userEmail: message.userEmail,
      content,
      messageType,
      parentMessageId,
      attachments: JSON.stringify(attachments),
      createdAt: new Date(),
    });

    // Update thread participants and notifications
    this.addThreadParticipant(parentMessageId, message.userEmail);
    await this.updateThreadNotifications(parentMessageId, message.userEmail);

    // Update thread UI fields
    await this.updateThreadUIFields(parentMessageId);

    return replyId;
  }

  public async getThreadMessages(parentMessageId: string): Promise<WebSocketMessage<ThreadMessageData>[]> {
    const db = getDatabase();
    const messages = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.parentMessageId, parentMessageId))
      .orderBy(asc(messageTable.createdAt));

    return messages.map(msg => ({
      id: msg.id,
      type: 'thread_message',
      channelId: msg.channelId,
      userEmail: msg.userEmail,
      content: msg.content,
      data: {
        parentMessageId,
        content: msg.content, // Add content to match ThreadMessageData interface
        messageType: msg.messageType,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
      },
      timestamp: msg.createdAt,
    }));
  }

  public async markThreadRead(parentMessageId: string, userEmail: string): Promise<void> {
    // Update participant's last read time
    this.addThreadParticipant(parentMessageId, userEmail, new Date());

    // Clear unread count in notification
    const notification = await this.getOrCreateThreadNotification(parentMessageId, userEmail);
    notification.unreadCount = 0;
    this.threadNotifications.get(parentMessageId)?.set(userEmail, notification);
  }

  public async getThreadParticipants(parentMessageId: string): Promise<ThreadParticipant[]> {
    const db = getDatabase();
    
    // Get participants from memory
    const participants = this.threadParticipants.get(parentMessageId) || [];

    // Get participants from database (all unique users who have replied)
    const dbParticipants = await db
      .select({ userEmail: messageTable.userEmail })
      .from(messageTable)
      .where(
        or(
          eq(messageTable.id, parentMessageId),
          eq(messageTable.parentMessageId, parentMessageId)
        )
      )
      .groupBy(messageTable.userEmail);

    // Merge participants
    const allParticipants = new Map<string, ThreadParticipant>();
    
    // Add in-memory participants
    participants.forEach(p => {
      allParticipants.set(p.userEmail, p);
    });

    // Add database participants
    dbParticipants.forEach(p => {
      if (!allParticipants.has(p.userEmail)) {
        allParticipants.set(p.userEmail, {
          userEmail: p.userEmail,
          lastReadAt: new Date(0), // Never read
        });
      }
    });

    return Array.from(allParticipants.values());
  }

  public async getThreadNotifications(userEmail: string): Promise<ThreadNotification[]> {
    const db = getDatabase();
    const notifications: ThreadNotification[] = [];

    // Get all threads the user is part of
    const userThreads = await db
      .select({
        threadId: messageTable.parentMessageId,
        lastActivity: messageTable.createdAt,
      })
      .from(messageTable)
      .where(
        or(
          eq(messageTable.userEmail, userEmail),
          eq(messageTable.parentMessageId, messageTable.id)
        )
      )
      .groupBy(messageTable.parentMessageId);

    for (const thread of userThreads) {
      if (!thread.threadId) continue; // Skip non-thread messages

      const notification = await this.getOrCreateThreadNotification(thread.threadId, userEmail);
      notifications.push(notification);
    }

    return notifications;
  }

  private addThreadParticipant(parentMessageId: string, userEmail: string, lastReadAt: Date = new Date()): void {
    if (!this.threadParticipants.has(parentMessageId)) {
      this.threadParticipants.set(parentMessageId, []);
    }

    const participants = this.threadParticipants.get(parentMessageId)!;
    const existingParticipant = participants.find(p => p.userEmail === userEmail);

    if (existingParticipant) {
      existingParticipant.lastReadAt = lastReadAt;
    } else {
      participants.push({
        userEmail,
        lastReadAt,
      });
    }
  }

  private async updateThreadNotifications(threadId: string, excludeUser: string): Promise<void> {
    // Get all participants except the message sender
    const participants = await this.getThreadParticipants(threadId);
    const now = new Date();

    for (const participant of participants) {
      if (participant.userEmail === excludeUser) continue;

      const notification = await this.getOrCreateThreadNotification(threadId, participant.userEmail);
      
      // Update notification
      notification.unreadCount++;
      notification.lastActivity = now;

      // Store updated notification
      if (!this.threadNotifications.has(threadId)) {
        this.threadNotifications.set(threadId, new Map());
      }
      this.threadNotifications.get(threadId)!.set(participant.userEmail, notification);
    }
  }

  private async getOrCreateThreadNotification(threadId: string, userEmail: string): Promise<ThreadNotification> {
    const db = getDatabase();
    // Check in-memory notifications
    const notification = this.threadNotifications.get(threadId)?.get(userEmail);
    if (notification) return notification;

    // Get thread details from database
    const thread = await db
      .select({
        messageCount: sql<number>`count(*)`,
        lastActivity: sql<Date>`max(created_at)`,
      })
      .from(messageTable)
      .where(eq(messageTable.parentMessageId, threadId))
      .get();

    // Get user's last read time
    const participant = this.threadParticipants.get(threadId)?.find(p => p.userEmail === userEmail);
    const lastReadAt = participant?.lastReadAt || new Date(0);

    // Count unread messages
    const unreadMessages = await db
      .select({ count: sql<number>`count(*)` })
      .from(messageTable)
      .where(
        and(
          eq(messageTable.parentMessageId, threadId),
          sql`created_at > ${lastReadAt}`
        )
      )
      .get();

    // Create new notification
    const newNotification: ThreadNotification = {
      threadId,
      userEmail,
      unreadCount: unreadMessages?.count || 0,
      lastActivity: thread?.lastActivity || new Date(),
    };

    // Store notification
    if (!this.threadNotifications.has(threadId)) {
      this.threadNotifications.set(threadId, new Map());
    }
    this.threadNotifications.get(threadId)!.set(userEmail, newNotification);

    return newNotification;
  }

  private async updateThreadUIFields(threadId: string): Promise<void> {
    const db = getDatabase();
    
    // Get thread statistics
    const [messageStats, participants] = await Promise.all([
      // Get message count and latest reply
      db
        .select({
          count: sql<number>`count(*)`,
          lastReply: sql<Date>`max(created_at)`,
          preview: sql<string>`content`,
        })
        .from(messageTable)
        .where(eq(messageTable.parentMessageId, threadId))
        .orderBy(desc(messageTable.createdAt))
        .limit(1)
        .get(),
      // Get unique participants
      db
        .select({
          participantCount: sql<number>`count(distinct user_email)`,
        })
        .from(messageTable)
        .where(
          or(
            eq(messageTable.id, threadId),
            eq(messageTable.parentMessageId, threadId)
          )
        )
        .get(),
    ]);

    // Update parent message with thread UI fields
    await db
      .update(messageTable)
      .set({
        threadMessageCount: messageStats?.count || 0,
        threadParticipantCount: participants?.participantCount || 0,
        threadLastReplyAt: messageStats?.lastReply || new Date(),
        threadPreview: messageStats?.preview || '',
      })
      .where(eq(messageTable.id, threadId));
  }

  public async updateThreadStatus(threadId: string, status: 'open' | 'closed' | 'archived', userEmail: string): Promise<void> {
    const db = getDatabase();
    
    // Verify user has permission (must be thread creator or channel admin)
    const thread = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.id, threadId))
      .get();

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Check if user is thread creator or channel admin
    const channel = await this.getChannelWithMemberRole(thread.channelId, userEmail);
    if (thread.userEmail !== userEmail && !['owner', 'admin'].includes(channel?.role || '')) {
      throw new Error('Unauthorized to update thread status');
    }

    // Update thread status
    await db
      .update(messageTable)
      .set({
        threadStatus: status,
      })
      .where(eq(messageTable.id, threadId));

    // Add system message about status change
    await db.insert(messageTable).values({
      id: createId(),
      channelId: thread.channelId,
      userEmail,
      content: `Thread marked as ${status} by ${userEmail}`,
      messageType: 'system',
      parentMessageId: threadId,
      createdAt: new Date(),
    });

    // Update thread UI fields
    await this.updateThreadUIFields(threadId);
  }

  private async getChannelWithMemberRole(channelId: string, userEmail: string) {
    const db = getDatabase();
    return await db
      .select({
        role: channelMemberTable.role,
      })
      .from(channelMemberTable)
      .where(
        and(
          eq(channelMemberTable.channelId, channelId),
          eq(channelMemberTable.userEmail, userEmail)
        )
      )
      .get();
  }
}

export const threadHandler = ThreadHandler.getInstance(); 
