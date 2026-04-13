// Team Messages API - Complete messaging endpoints
// Backend implementation for team messaging features

import { Hono } from "hono";
import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import logger from '../utils/logger';
import { createId } from '@paralleldrive/cuid2';
import { 
  teamMessages, 
  teamMessageReactions,
  teamMessageReadStatus
} from "../database/schema/team-messages";
import { users as userTable } from "../database/schema/users";

const app = new Hono<{ Variables: { userEmail: string } }>();

// ============================================================================
// GET Messages - Fetch messages with pagination
// ============================================================================
app.get("/:teamId/messages", async (c) => {
  const teamId = c.req.param("teamId");
  const userEmail = c.get("userEmail");
  
  // Parse query parameters
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const messageType = c.req.query("messageType") || "all";
  
  try {
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();
    
    // Build where conditions
    const conditions = [
      eq(teamMessages.teamId, teamId),
      eq(teamMessages.isDeleted, false),
    ];
    
    // Filter by message type if specified
    if (messageType !== "all") {
      conditions.push(eq(teamMessages.messageType, messageType));
    }
    
    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMessages)
      .where(and(...conditions));
    
    const total = Number(countResult.count);
    
    // Fetch messages with user info
    const messages = await db
      .select({
        id: teamMessages.id,
        teamId: teamMessages.teamId,
        userId: teamMessages.userId,
        userEmail: teamMessages.userEmail,
        userName: userTable.name,
        content: teamMessages.content,
        messageType: teamMessages.messageType,
        replyToId: teamMessages.replyToId,
        mentions: teamMessages.mentions,
        attachments: teamMessages.attachments,
        metadata: teamMessages.metadata,
        isEdited: teamMessages.isEdited,
        editedAt: teamMessages.editedAt,
        isDeleted: teamMessages.isDeleted,
        createdAt: teamMessages.createdAt,
        updatedAt: teamMessages.updatedAt,
      })
      .from(teamMessages)
      .leftJoin(userTable, eq(teamMessages.userEmail, userTable.email))
      .where(and(...conditions))
      .orderBy(teamMessages.createdAt) // Oldest first (chronological order)
      .limit(limit)
      .offset(offset);
    
    // Fetch reactions for all messages
    const messageIds = messages.map(m => m.id);
    const allReactions = messageIds.length > 0 ? await db
      .select({
        messageId: teamMessageReactions.messageId,
        id: teamMessageReactions.id,
        userId: teamMessageReactions.userId,
        userEmail: teamMessageReactions.userEmail,
        userName: userTable.name,
        emoji: teamMessageReactions.emoji,
        createdAt: teamMessageReactions.createdAt,
      })
      .from(teamMessageReactions)
      .leftJoin(userTable, eq(teamMessageReactions.userEmail, userTable.email))
      .where(inArray(teamMessageReactions.messageId, messageIds)) : [];
    
    // Fetch read status for current user
    const readStatuses = messageIds.length > 0 ? await db
      .select({
        messageId: teamMessageReadStatus.messageId,
        readAt: teamMessageReadStatus.readAt,
      })
      .from(teamMessageReadStatus)
      .where(
        and(
          inArray(teamMessageReadStatus.messageId, messageIds),
          eq(teamMessageReadStatus.userEmail, userEmail)
        )
      ) : [];
    
    // Group reactions by message ID
    const reactionsByMessage = allReactions.reduce((acc, reaction) => {
      if (!acc[reaction.messageId]) {
        acc[reaction.messageId] = [];
      }
      acc[reaction.messageId].push({
        id: reaction.id,
        userId: reaction.userId,
        userEmail: reaction.userEmail,
        userName: reaction.userName,
        emoji: reaction.emoji,
        createdAt: reaction.createdAt.toISOString(),
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    // Group read statuses by message ID
    const readByMessageId = readStatuses.reduce((acc, status) => {
      acc[status.messageId] = status.readAt.toISOString();
      return acc;
    }, {} as Record<string, string>);
    
    // Fetch parent messages for replies (to show context)
    const replyToIds = messages.map(m => m.replyToId).filter(Boolean) as string[];
    const parentMessages = replyToIds.length > 0 ? await db
      .select({
        id: teamMessages.id,
        content: teamMessages.content,
        userEmail: teamMessages.userEmail,
        userName: userTable.name,
      })
      .from(teamMessages)
      .leftJoin(userTable, eq(teamMessages.userEmail, userTable.email))
      .where(inArray(teamMessages.id, replyToIds)) : [];
    
    const parentMessageMap = parentMessages.reduce((acc, pm) => {
      acc[pm.id] = pm;
      return acc;
    }, {} as Record<string, any>);
    
    // Format messages with reactions and read status
    const formattedMessages = messages.map(msg => {
      const parentMsg = msg.replyToId ? parentMessageMap[msg.replyToId] : null;
      const metadata = msg.metadata || {};
      
      // Ensure replyToContent is in metadata if we have a parent message
      if (parentMsg && !metadata.replyToContent) {
        metadata.replyToContent = parentMsg.content.substring(0, 100);
        metadata.replyToAuthor = parentMsg.userName || parentMsg.userEmail;
      }
      
      return {
        id: msg.id,
        teamId: msg.teamId,
        userId: msg.userId,
        userEmail: msg.userEmail,
        userName: msg.userName,
        content: msg.content,
        messageType: msg.messageType,
        replyTo: msg.replyToId,
        mentions: msg.mentions || [],
        attachments: msg.attachments,
        metadata,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt?.toISOString(),
        isDeleted: msg.isDeleted,
        reactions: reactionsByMessage[msg.id] || [],
        isReadBy: readByMessageId[msg.id] ? [userEmail] : [],
        createdAt: msg.createdAt.toISOString(),
        updatedAt: msg.updatedAt.toISOString(),
      };
    });
    
    logger.info(`Fetched ${formattedMessages.length} messages for team ${teamId}`);
    
    return c.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching messages:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

// ============================================================================
// POST Message - Create/Send new message
// ============================================================================
app.post("/:teamId/messages", async (c) => {
  const teamId = c.req.param("teamId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  
  const {
    content,
    messageType = "text",
    mentions = [],
    metadata = {},
    replyTo,
  } = body;
  
  try {
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();
    
    // Validate content
    if (!content || content.trim().length === 0) {
      return c.json({ error: "Message content is required" }, 400);
    }
    
    if (content.length > 2000) {
      return c.json({ error: "Message content cannot exceed 2000 characters" }, 400);
    }
    
    // Validate message type
    const validTypes = ["text", "file", "announcement", "system"];
    if (!validTypes.includes(messageType)) {
      return c.json({ error: "Invalid message type" }, 400);
    }
    
    // Get user info
    const [user] = await db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Validate replyTo if provided
    if (replyTo) {
      const [parentMessage] = await db
        .select()
        .from(teamMessages)
        .where(
          and(
            eq(teamMessages.id, replyTo),
            eq(teamMessages.teamId, teamId),
            eq(teamMessages.isDeleted, false)
          )
        )
        .limit(1);
      
      if (!parentMessage) {
        return c.json({ error: "Parent message not found" }, 404);
      }
    }
    
    // Create message
    const [newMessage] = await db
      .insert(teamMessages)
      .values({
        id: createId(),
        teamId,
        userId: user.id,
        userEmail,
        content: content.trim(),
        messageType,
        replyToId: replyTo || null,
        mentions,
        metadata,
      })
      .returning();
    
    logger.info(`Message ${newMessage.id} created by ${userEmail} in team ${teamId}`);
    
    // Mark as read by sender immediately
    await db.insert(teamMessageReadStatus).values({
      messageId: newMessage.id,
      userId: user.id,
      userEmail,
      readAt: new Date(),
    }).onConflictDoNothing();
    
    // Format response
    const response = {
      id: newMessage.id,
      teamId: newMessage.teamId,
      userId: newMessage.userId,
      userEmail: newMessage.userEmail,
      userName: user.name,
      content: newMessage.content,
      messageType: newMessage.messageType,
      replyTo: newMessage.replyToId,
      mentions: newMessage.mentions || [],
      attachments: newMessage.attachments,
      metadata: newMessage.metadata || {},
      isEdited: newMessage.isEdited,
      editedAt: newMessage.editedAt?.toISOString(),
      isDeleted: newMessage.isDeleted,
      reactions: [],
      isReadBy: [userEmail],
      createdAt: newMessage.createdAt.toISOString(),
      updatedAt: newMessage.updatedAt.toISOString(),
    };
    
    return c.json({
      success: true,
      data: response,
    }, 201);
  } catch (error) {
    logger.error("Error creating message:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ error: "Failed to create message" }, 500);
  }
});

// ============================================================================
// POST Broadcast - Send team announcement
// ============================================================================
app.post("/:teamId/broadcast", async (c) => {
  const teamId = c.req.param("teamId");
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  
  // Broadcast is just a message with messageType='announcement'
  // Reuse POST messages logic by creating announcement directly
  const announcementData = {
    ...body,
    messageType: "announcement",
  };
  
  try {
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();
    
    // Validate content
    const content = announcementData.content || body.content;
    if (!content || content.trim().length === 0) {
      return c.json({ error: "Announcement content is required" }, 400);
    }
    
    if (content.length > 2000) {
      return c.json({ error: "Announcement content cannot exceed 2000 characters" }, 400);
    }
    
    // Get user info
    const [user] = await db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Create announcement message
    const [newMessage] = await db
      .insert(teamMessages)
      .values({
        id: createId(),
        teamId,
        userId: user.id,
        userEmail,
        content: content.trim(),
        messageType: "announcement",
        replyToId: announcementData.replyTo || null,
        mentions: announcementData.mentions || [],
        metadata: announcementData.metadata || {},
      })
      .returning();
    
    logger.info(`Announcement ${newMessage.id} created by ${userEmail} in team ${teamId}`);
    
    // Mark as read by sender immediately
    await db.insert(teamMessageReadStatus).values({
      messageId: newMessage.id,
      userId: user.id,
      userEmail,
      readAt: new Date(),
    }).onConflictDoNothing();
    
    // Format response
    const response = {
      id: newMessage.id,
      teamId: newMessage.teamId,
      userId: newMessage.userId,
      userEmail: newMessage.userEmail,
      userName: user.name,
      content: newMessage.content,
      messageType: newMessage.messageType,
      replyTo: newMessage.replyToId,
      mentions: newMessage.mentions || [],
      attachments: newMessage.attachments,
      metadata: newMessage.metadata || {},
      isEdited: newMessage.isEdited,
      editedAt: newMessage.editedAt?.toISOString(),
      isDeleted: newMessage.isDeleted,
      reactions: [],
      isReadBy: [userEmail],
      createdAt: newMessage.createdAt.toISOString(),
      updatedAt: newMessage.updatedAt.toISOString(),
    };
    
    return c.json({
      success: true,
      data: response,
    }, 201);
  } catch (error) {
    logger.error("Error creating announcement:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ error: "Failed to create announcement" }, 500);
  }
});

// ============================================================================
// Edit Message
// ============================================================================
app.patch("/:teamId/messages/:messageId", async (c) => {
  const teamId = c.req.param("teamId");
  const messageId = c.req.param("messageId");
  const userEmail = c.get("userEmail");
  const { content } = await c.req.json();

  try {
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Validate user owns this message
    const [existingMessage] = await db
      .select()
      .from(teamMessages)
      .where(
        and(
          eq(teamMessages.id, messageId),
          eq(teamMessages.userEmail, userEmail),
          eq(teamMessages.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingMessage) {
      return c.json({ error: "Message not found or you don't have permission to edit it" }, 404);
    }

    // Update message
    const [updatedMessage] = await db
      .update(teamMessages)
      .set({
        content,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teamMessages.id, messageId))
      .returning();

    logger.info(`Message ${messageId} edited by ${userEmail}`);

    return c.json({
      success: true,
      data: {
        id: updatedMessage.id,
        content: updatedMessage.content,
        isEdited: updatedMessage.isEdited,
        editedAt: updatedMessage.editedAt?.toISOString(),
        updatedAt: updatedMessage.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error editing message:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ error: "Failed to edit message" }, 500);
  }
});

// ============================================================================
// Delete Message
// ============================================================================
app.delete("/:teamId/messages/:messageId", async (c) => {
  const teamId = c.req.param("teamId");
  const messageId = c.req.param("messageId");
  const userEmail = c.get("userEmail");

  try {
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Validate user owns this message
    const [existingMessage] = await db
      .select()
      .from(teamMessages)
      .where(
        and(
          eq(teamMessages.id, messageId),
          eq(teamMessages.userEmail, userEmail),
          eq(teamMessages.isDeleted, false)
        )
      )
      .limit(1);

    if (!existingMessage) {
      return c.json({ error: "Message not found or you don't have permission to delete it" }, 404);
    }

    // Soft delete the message
    const [deletedMessage] = await db
      .update(teamMessages)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teamMessages.id, messageId))
      .returning();

    logger.info(`Message ${messageId} soft deleted by ${userEmail}`);

    return c.json({
      success: true,
      data: {
        messageId: deletedMessage.id,
        deletedAt: deletedMessage.deletedAt?.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error deleting message:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ error: "Failed to delete message" }, 500);
  }
});

// ============================================================================
// Add Reaction
// ============================================================================
app.post("/:teamId/messages/:messageId/reactions", async (c) => {
  const teamId = c.req.param("teamId");
  const messageId = c.req.param("messageId");
  const userEmail = c.get("userEmail");
  const { emoji } = await c.req.json();

  try {
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Validate message exists
    const [message] = await db
      .select()
      .from(teamMessages)
      .where(and(
        eq(teamMessages.id, messageId),
        eq(teamMessages.isDeleted, false)
      ))
      .limit(1);

    if (!message) {
      return c.json({ error: "Message not found" }, 404);
    }

    // Get user info
    const [user] = await db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    // Check if reaction already exists (prevent duplicates)
    const [existing] = await db
      .select()
      .from(teamMessageReactions)
      .where(
        and(
          eq(teamMessageReactions.messageId, messageId),
          eq(teamMessageReactions.userEmail, userEmail),
          eq(teamMessageReactions.emoji, emoji)
        )
      )
      .limit(1);

    if (existing) {
      // Already reacted, return current reactions
      const reactions = await db
        .select({
          id: teamMessageReactions.id,
          userId: teamMessageReactions.userId,
          userEmail: teamMessageReactions.userEmail,
          userName: userTable.name,
          emoji: teamMessageReactions.emoji,
          createdAt: teamMessageReactions.createdAt,
        })
        .from(teamMessageReactions)
        .leftJoin(userTable, eq(teamMessageReactions.userEmail, userTable.email))
        .where(eq(teamMessageReactions.messageId, messageId));

      return c.json({
        success: true,
        data: {
          reactions: reactions.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
          })),
        },
      });
    }

    // Add new reaction
    await db.insert(teamMessageReactions).values({
      messageId,
      userId: user?.id || null,
      userEmail,
      emoji,
    });

    // Fetch all reactions for this message
    const reactions = await db
      .select({
        id: teamMessageReactions.id,
        userId: teamMessageReactions.userId,
        userEmail: teamMessageReactions.userEmail,
        userName: userTable.name,
        emoji: teamMessageReactions.emoji,
        createdAt: teamMessageReactions.createdAt,
      })
      .from(teamMessageReactions)
      .leftJoin(userTable, eq(teamMessageReactions.userEmail, userTable.email))
      .where(eq(teamMessageReactions.messageId, messageId));

    logger.info(`Reaction ${emoji} added to message ${messageId} by ${userEmail}`);

    return c.json({
      success: true,
      data: {
        reactions: reactions.map(r => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error("Error adding reaction:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ error: "Failed to add reaction" }, 500);
  }
});

// ============================================================================
// Remove Reaction
// ============================================================================
app.delete("/:teamId/messages/:messageId/reactions/:emoji", async (c) => {
  const teamId = c.req.param("teamId");
  const messageId = c.req.param("messageId");
  const emoji = decodeURIComponent(c.req.param("emoji"));
  const userEmail = c.get("userEmail");

  try {
    const { initializeDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Remove the reaction
    await db
      .delete(teamMessageReactions)
      .where(
        and(
          eq(teamMessageReactions.messageId, messageId),
          eq(teamMessageReactions.userEmail, userEmail),
          eq(teamMessageReactions.emoji, emoji)
        )
      );

    // Fetch remaining reactions for this message
    const reactions = await db
      .select({
        id: teamMessageReactions.id,
        userId: teamMessageReactions.userId,
        userEmail: teamMessageReactions.userEmail,
        userName: userTable.name,
        emoji: teamMessageReactions.emoji,
        createdAt: teamMessageReactions.createdAt,
      })
      .from(teamMessageReactions)
      .leftJoin(userTable, eq(teamMessageReactions.userEmail, userTable.email))
      .where(eq(teamMessageReactions.messageId, messageId));

    logger.info(`Reaction ${emoji} removed from message ${messageId} by ${userEmail}`);

    return c.json({
      success: true,
      data: {
        reactions: reactions.map(r => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error("Error removing reaction:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ error: "Failed to remove reaction" }, 500);
  }
});

export default app;

