// @epic-3.6-communication: Chat WebSocket event handlers
import { WebSocketConnection, WebSocketMessage } from '../websocket-server';
import { getDatabase } from '../../database/connection';
import { messageTable, channelTable, channelMembershipTable } from '../../database/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { publishEvent } from '../../events';
import logger from '../../utils/logger';

export interface ChatMessage {
  channelId: string;
  content: string;
  messageType?: string;
  parentMessageId?: string;
  mentions?: string[];
  attachments?: any[];
}

export interface TypingStatus {
  channelId: string;
  isTyping: boolean;
}

export interface MessageDeliveryData {
  messageId: string;
}

export interface MessageReadData {
  messageId: string;
}

export async function handleChatMessage(connection: WebSocketConnection, message: WebSocketMessage<ChatMessage>) {
  const db = getDatabase();
  const { channelId, content, messageType, parentMessageId, mentions, attachments } = message.data;

  try {
    // Validate channel access
    const membership = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, connection.userEmail)
        )
      )
      .limit(1);

    const channel = await db
      .select()
      .from(channelTable)
      .where(eq(channelTable.id, channelId))
      .limit(1);

    if (channel.length === 0) {
      throw new Error('Channel not found');
    }

    const isPublicChannel = channel[0]?.type === 'public';
    if (!isPublicChannel && membership.length === 0) {
      throw new Error('Access denied');
    }

    // Store message in database
    const [newMessage] = await db
      .insert(messageTable)
      .values({
        channelId,
        userEmail: connection.userEmail,
        content: content.trim(),
        messageType: messageType || 'text',
        parentMessageId,
        mentions: mentions ? JSON.stringify(mentions) : null,
        attachments: attachments ? JSON.stringify(attachments) : null,
      })
      .returning();

    // Publish event for real-time delivery
    await publishEvent('chat:message', {
      type: 'new_message',
      channelId,
      message: newMessage,
      workspaceId: connection.workspaceId,
    });

    // Return acknowledgment
    return {
      type: 'message_sent',
      data: newMessage,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error('Error handling chat message:', error instanceof Error ? error.message : 'Unknown error');
    return {
      type: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now(),
    };
  }
}

export async function handleTypingStatus(connection: WebSocketConnection, message: WebSocketMessage<TypingStatus>) {
  const { channelId, isTyping } = message.data;

  try {
    // Publish typing status
    await publishEvent('chat:typing', {
      type: 'typing_status',
      channelId,
      userEmail: connection.userEmail,
      isTyping,
      workspaceId: connection.workspaceId,
    });

    return {
      type: 'typing_status_updated',
      data: { channelId, isTyping },
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error('Error handling typing status:', error instanceof Error ? error.message : 'Unknown error');
    return {
      type: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now(),
    };
  }
}

export async function handleMessageDelivery(connection: WebSocketConnection, message: WebSocketMessage<MessageDeliveryData>) {
  const { messageId } = message.data;

  try {
    const db = getDatabase();
    // Update message delivery status
    const now = new Date();
    await db
      .update(messageTable)
      .set({
        isEdited: true,
        editedAt: now,
      })
      .where(eq(messageTable.id, messageId));

    return {
      type: 'message_delivered',
      data: { messageId },
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error('Error handling message delivery:', error instanceof Error ? error.message : 'Unknown error');
    return {
      type: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now(),
    };
  }
}

export async function handleMessageRead(connection: WebSocketConnection, message: WebSocketMessage<MessageReadData>) {
  const { messageId } = message.data;

  try {
    const db = getDatabase();
    // Update last read timestamp in channel membership
    const now = new Date();
    await db
      .update(channelMembershipTable)
      .set({
        lastReadAt: now,
      })
      .where(
        and(
          eq(channelMembershipTable.userEmail, connection.userEmail),
          eq(channelMembershipTable.channelId, messageId)
        )
      );

    return {
      type: 'message_read',
      data: { messageId },
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error('Error handling message read status:', error instanceof Error ? error.message : 'Unknown error');
    return {
      type: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: Date.now(),
    };
  }
} 
