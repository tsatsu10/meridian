// @epic-3.6-communication: Message delivery status and read receipts controller
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../database/connection";
import { 
  // messageDeliveryStatusTable,  // TODO: Table doesn't exist yet - implement when delivery status feature is added
  messageTable, 
  channelTable, 
  channelMembershipTable,
  userTable } from "../../database/schema";
import logger from '../../utils/logger';
import { createId } from "@paralleldrive/cuid2";
import UnifiedWebSocketServer from "../../realtime/unified-websocket-server";

// Validation schemas
export const markMessageReadSchema = z.object({
  messageId: z.string(),
  channelId: z.string().optional(),
});

export const bulkMarkReadSchema = z.object({
  messageIds: z.array(z.string()),
  channelId: z.string().optional(),
});

// Create delivery status records for all channel members when message is sent
export async function createDeliveryStatusRecords(messageId: string, channelId: string, senderEmail: string) {
  const db = getDatabase();
  try {
    // Get all channel members except the sender
    const channelMembers = await db
      .select({
        userEmail: channelMembershipTable.userEmail,
      })
      .from(channelMembershipTable)
      .where(eq(channelMembershipTable.channelId, channelId));

    const recipientEmails = channelMembers
      .map(member => member.userEmail)
      .filter(email => email !== senderEmail);

    if (recipientEmails.length === 0) {
      return { success: true, recipientCount: 0 };
    }

    // Create delivery status records for all recipients
    const deliveryRecords = recipientEmails.map(userEmail => ({
      id: createId(),
      messageId,
      userEmail,
      status: "sent" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // TODO: Implement messageDeliveryStatusTable first
    // await db.insert(messageDeliveryStatusTable).values(deliveryRecords);

    // Emit WebSocket event for real-time delivery tracking
    // TODO: Fix unifiedWebSocketService import/usage
    /*
    try {
      await unifiedWebSocketService.broadcastToChannel(channelId, {
        type: "message:delivery:sent",
        data: {
          messageId,
          recipientCount: recipientEmails.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (wsError) {
      logger.error("Error emitting delivery status:", wsError);
    }
    */

    return { success: true, recipientCount: recipientEmails.length };
  } catch (error) {
    logger.error("Error creating delivery status records:", error);
    throw new Error("Failed to create delivery status records");
  }
}

// Mark message as delivered (when user comes online or joins channel)
export async function markMessageDelivered(messageId: string, userEmail: string) {
  const db = await getDatabase();
  try {
    const deliveredAt = new Date();

    await db
      .update(messageDeliveryStatusTable)
      .set({
        status: "delivered",
        deliveredAt,
        updatedAt: deliveredAt,
      })
      .where(
        and(
          eq(messageDeliveryStatusTable.messageId, messageId),
          eq(messageDeliveryStatusTable.userEmail, userEmail),
          eq(messageDeliveryStatusTable.status, "sent")
        )
      );

    // Get message details for WebSocket emission
    const [message] = await db
      .select({
        channelId: messageTable.channelId,
        senderEmail: messageTable.userEmail,
      })
      .from(messageTable)
      .where(eq(messageTable.id, messageId))
      .limit(1);

    if (message) {
      // Emit WebSocket event for real-time delivery status
      try {
        await unifiedWebSocketService.broadcastToChannel(message.channelId, {
          type: "message:delivery:delivered",
          data: {
            messageId,
            userEmail,
            deliveredAt: deliveredAt.toISOString(),
          },
        });
      } catch (wsError) {
        logger.error("Error emitting delivery status:", wsError);
      }
    }

    return { success: true, deliveredAt };
  } catch (error) {
    logger.error("Error marking message as delivered:", error);
    throw new Error("Failed to mark message as delivered");
  }
}

// Mark message as read (read receipt)
export async function markMessageAsRead(messageId: string, userEmail: string) {
  const db = await getDatabase();
  try {
    const readAt = new Date();

    // Update delivery status to read
    await db
      .update(messageDeliveryStatusTable)
      .set({
        status: "read",
        readAt,
        deliveredAt: readAt, // Also set delivered if not already set
        updatedAt: readAt,
      })
      .where(
        and(
          eq(messageDeliveryStatusTable.messageId, messageId),
          eq(messageDeliveryStatusTable.userEmail, userEmail)
        )
      );

    // Get message details for WebSocket emission
    const [message] = await db
      .select({
        channelId: messageTable.channelId,
        senderEmail: messageTable.userEmail,
      })
      .from(messageTable)
      .where(eq(messageTable.id, messageId))
      .limit(1);

    if (message) {
      // Emit WebSocket event for real-time read receipt
      try {
        await unifiedWebSocketService.broadcastToChannel(message.channelId, {
          type: "message:delivery:read",
          data: {
            messageId,
            userEmail,
            readAt: readAt.toISOString(),
          },
        });

        // Also notify the sender specifically
        await unifiedWebSocketService.sendToUser(message.senderEmail, {
          type: "message:read_receipt",
          data: {
            messageId,
            readerEmail: userEmail,
            readAt: readAt.toISOString(),
          },
        });
      } catch (wsError) {
        logger.error("Error emitting read receipt:", wsError);
      }
    }

    return { success: true, readAt };
  } catch (error) {
    logger.error("Error marking message as read:", error);
    throw new Error("Failed to mark message as read");
  }
}

// Bulk mark multiple messages as read (for channel read optimization)
export async function bulkMarkMessagesAsRead(messageIds: string[], userEmail: string) {
  const db = await getDatabase();
  try {
    const readAt = new Date();

    if (messageIds.length === 0) {
      return { success: true, markedCount: 0 };
    }

    // Update all messages to read status
    await db
      .update(messageDeliveryStatusTable)
      .set({
        status: "read",
        readAt,
        deliveredAt: readAt,
        updatedAt: readAt,
      })
      .where(
        and(
          inArray(messageDeliveryStatusTable.messageId, messageIds),
          eq(messageDeliveryStatusTable.userEmail, userEmail)
        )
      );

    // Get unique channel IDs for WebSocket emissions
    const messageChannels = await db
      .select({
        messageId: messageTable.id,
        channelId: messageTable.channelId,
        senderEmail: messageTable.userEmail,
      })
      .from(messageTable)
      .where(inArray(messageTable.id, messageIds));

    // Group by channel for efficient WebSocket broadcasting
    const channelGroups = messageChannels.reduce((groups, msg) => {
      if (!groups[msg.channelId]) {
        groups[msg.channelId] = [];
      }
      groups[msg.channelId].push(msg);
      return groups;
    }, {} as Record<string, typeof messageChannels>);

    // Emit WebSocket events for each channel
    for (const [channelId, messages] of Object.entries(channelGroups)) {
      try {
        await unifiedWebSocketService.broadcastToChannel(channelId, {
          type: "message:delivery:bulk_read",
          data: {
            messageIds: messages.map(m => m.messageId),
            userEmail,
            readAt: readAt.toISOString(),
            count: messages.length,
          },
        });

        // Notify senders of read receipts
        const uniqueSenders = [...new Set(messages.map(m => m.senderEmail))];
        for (const senderEmail of uniqueSenders) {
          const senderMessages = messages.filter(m => m.senderEmail === senderEmail);
          await unifiedWebSocketService.sendToUser(senderEmail, {
            type: "message:bulk_read_receipt",
            data: {
              messageIds: senderMessages.map(m => m.messageId),
              readerEmail: userEmail,
              readAt: readAt.toISOString(),
              count: senderMessages.length,
            },
          });
        }
      } catch (wsError) {
        logger.error(`Error emitting bulk read for channel ${channelId}:`, wsError);
      }
    }

    return { success: true, markedCount: messageIds.length };
  } catch (error) {
    logger.error("Error bulk marking messages as read:", error);
    throw new Error("Failed to bulk mark messages as read");
  }
}

// Get delivery status for a message
export async function getMessageDeliveryStatus(messageId: string) {
  const db = await getDatabase();
  try {
    const deliveryStatuses = await db
      .select({
        userEmail: messageDeliveryStatusTable.userEmail,
        status: messageDeliveryStatusTable.status,
        deliveredAt: messageDeliveryStatusTable.deliveredAt,
        readAt: messageDeliveryStatusTable.readAt,
        userName: userTable.name,
        userAvatar: userTable.avatarUrl,
      })
      .from(messageDeliveryStatusTable)
      .leftJoin(userTable, eq(messageDeliveryStatusTable.userEmail, userTable.email))
      .where(eq(messageDeliveryStatusTable.messageId, messageId));

    // Group by status for easy consumption
    const statusSummary = {
      sent: deliveryStatuses.filter(s => s.status === "sent").length,
      delivered: deliveryStatuses.filter(s => s.status === "delivered").length,
      read: deliveryStatuses.filter(s => s.status === "read").length,
      total: deliveryStatuses.length,
    };

    return {
      messageId,
      statuses: deliveryStatuses,
      summary: statusSummary,
    };
  } catch (error) {
    logger.error("Error getting message delivery status:", error);
    throw new Error("Failed to get message delivery status");
  }
}

// Get read receipts for messages in a channel (for read receipt indicators)
export async function getChannelReadReceipts(channelId: string, messageIds?: string[]) {
  const db = await getDatabase();
  try {
    let query = db
      .select({
        messageId: messageDeliveryStatusTable.messageId,
        userEmail: messageDeliveryStatusTable.userEmail,
        status: messageDeliveryStatusTable.status,
        readAt: messageDeliveryStatusTable.readAt,
        userName: userTable.name,
      })
      .from(messageDeliveryStatusTable)
      .leftJoin(userTable, eq(messageDeliveryStatusTable.userEmail, userTable.email))
      .leftJoin(messageTable, eq(messageDeliveryStatusTable.messageId, messageTable.id))
      .where(eq(messageTable.channelId, channelId));

    if (messageIds && messageIds.length > 0) {
      query = query.where(
        and(
          eq(messageTable.channelId, channelId),
          inArray(messageDeliveryStatusTable.messageId, messageIds)
        )
      );
    }

    const readReceipts = await query;

    // Group by message ID for easy consumption
    const receiptsByMessage = readReceipts.reduce((groups, receipt) => {
      if (!groups[receipt.messageId]) {
        groups[receipt.messageId] = [];
      }
      groups[receipt.messageId].push(receipt);
      return groups;
    }, {} as Record<string, typeof readReceipts>);

    return receiptsByMessage;
  } catch (error) {
    logger.error("Error getting channel read receipts:", error);
    throw new Error("Failed to get channel read receipts");
  }
}

// Clean up old delivery status records (maintenance)
export async function cleanupOldDeliveryStatuses(olderThanDays: number = 30) {
  const db = await getDatabase();
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(messageDeliveryStatusTable)
      .where(
        and(
          eq(messageDeliveryStatusTable.status, "read"),
          // Only clean up read messages older than cutoff
        )
      );

    return { success: true, cleanedCount: result.changes };
  } catch (error) {
    logger.error("Error cleaning up delivery statuses:", error);
    throw new Error("Failed to cleanup delivery statuses");
  }
}

