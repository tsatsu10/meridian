// @epic-3.1-messaging: Message Router - Phase 1 Implementation
// @persona-sarah: PM needs access to messaging endpoints for team coordination
// @persona-david: Team lead needs message management capabilities

import { Hono } from "hono";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "../middlewares/auth";
import { getDatabase } from "../database/connection";
import {
  directMessageConversations as directMessageConversationsTable,
  messageTable,
  readReceiptsTable,
  userTable,
} from "../database/schema";
import getMessages from "./controllers/get-messages";
import sendMessage from "./controllers/send-message";
import threadController from "./controllers/thread-controller";
import logger from "../utils/logger";
import {
  ConversationRecord,
  formatConversationForClient,
  getUserByEmail,
  serializeConversationRecord,
} from "../direct-messaging/utils";

const message = new Hono();

const participant1Alias = alias(userTable, "dm_message_participant1");
const participant2Alias = alias(userTable, "dm_message_participant2");
const authorAlias = alias(userTable, "dm_message_author");

// Apply authentication middleware to all routes
message.use("*", auth);

// @epic-3.1-messaging: Get messages for a channel with pagination and filtering
message.get("/channel/:channelId", getMessages);

// @epic-3.1-messaging: Send a new message to a channel
message.post("/send", sendMessage);

// @epic-3.6-communication: Thread routes
message.route("/thread", threadController);

// @epic-3.1-messaging: Create or get existing direct message conversation
message.post("/conversations", async (c) => {
  try {
    const db = getDatabase();
    const userId = c.get("userId");
    const userEmail = c.get("userEmail");

    if (!userId || !userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { otherUserId, otherUserEmail, workspaceId } = body;

    if (!otherUserId && !otherUserEmail) {
      return c.json({ error: "Other user ID or email required" }, 400);
    }

    if (!workspaceId) {
      return c.json({ error: "Workspace ID required" }, 400);
    }

    const currentUser = await getUserByEmail(db, userEmail);
    if (!currentUser) {
      return c.json({ error: "User not found" }, 404);
    }

    let targetUser =
      (otherUserEmail && (await getUserByEmail(db, otherUserEmail))) || null;

    if (!targetUser && otherUserId) {
      const [user] = await db
        .select({
          id: userTable.id,
          email: userTable.email,
          name: userTable.name,
          avatar: userTable.avatar,
        })
        .from(userTable)
        .where(eq(userTable.id, otherUserId))
        .limit(1);
      targetUser = user ?? null;
    }

    if (!targetUser) {
      return c.json({ error: "Other user not found" }, 404);
    }

    const [existingConversation] = await db
      .select({
        id: directMessageConversationsTable.id,
        workspaceId: directMessageConversationsTable.workspaceId,
        participant1Id: directMessageConversationsTable.participant1Id,
        participant2Id: directMessageConversationsTable.participant2Id,
        lastMessageAt: directMessageConversationsTable.lastMessageAt,
        lastMessagePreview: directMessageConversationsTable.lastMessagePreview,
        isArchived: directMessageConversationsTable.isArchived,
        createdAt: directMessageConversationsTable.createdAt,
        updatedAt: directMessageConversationsTable.updatedAt,
        participant1Email: participant1Alias.email,
        participant1Name: participant1Alias.name,
        participant1Avatar: participant1Alias.avatar,
        participant2Email: participant2Alias.email,
        participant2Name: participant2Alias.name,
        participant2Avatar: participant2Alias.avatar,
      })
      .from(directMessageConversationsTable)
      .leftJoin(
        participant1Alias,
        eq(participant1Alias.id, directMessageConversationsTable.participant1Id),
      )
      .leftJoin(
        participant2Alias,
        eq(participant2Alias.id, directMessageConversationsTable.participant2Id),
      )
      .where(
        and(
          eq(directMessageConversationsTable.workspaceId, workspaceId),
          or(
            and(
              eq(
                directMessageConversationsTable.participant1Id,
                currentUser.id,
              ),
              eq(
                directMessageConversationsTable.participant2Id,
                targetUser.id,
              ),
            ),
            and(
              eq(
                directMessageConversationsTable.participant1Id,
                targetUser.id,
              ),
              eq(
                directMessageConversationsTable.participant2Id,
                currentUser.id,
              ),
            ),
          ),
        ),
      )
      .limit(1);

    if (existingConversation) {
      const serialized = await serializeConversationRecord(
        db,
        existingConversation as ConversationRecord,
      );

      return c.json(
        {
          conversation: formatConversationForClient(serialized),
          created: false,
          message: "Conversation already exists",
        },
        200,
      );
    }

    const now = new Date();
    const [newConversation] = await db
      .insert(directMessageConversationsTable)
      .values({
        id: createId(),
        workspaceId,
        participant1Id: currentUser.id,
        participant2Id: targetUser.id,
        lastMessageAt: null,
        lastMessagePreview: null,
        isArchived: false,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const [conversationRecord] = await db
      .select({
        id: directMessageConversationsTable.id,
        workspaceId: directMessageConversationsTable.workspaceId,
        participant1Id: directMessageConversationsTable.participant1Id,
        participant2Id: directMessageConversationsTable.participant2Id,
        lastMessageAt: directMessageConversationsTable.lastMessageAt,
        lastMessagePreview: directMessageConversationsTable.lastMessagePreview,
        isArchived: directMessageConversationsTable.isArchived,
        createdAt: directMessageConversationsTable.createdAt,
        updatedAt: directMessageConversationsTable.updatedAt,
        participant1Email: participant1Alias.email,
        participant1Name: participant1Alias.name,
        participant1Avatar: participant1Alias.avatar,
        participant2Email: participant2Alias.email,
        participant2Name: participant2Alias.name,
        participant2Avatar: participant2Alias.avatar,
      })
      .from(directMessageConversationsTable)
      .leftJoin(
        participant1Alias,
        eq(participant1Alias.id, directMessageConversationsTable.participant1Id),
      )
      .leftJoin(
        participant2Alias,
        eq(participant2Alias.id, directMessageConversationsTable.participant2Id),
      )
      .where(eq(directMessageConversationsTable.id, newConversation.id))
      .limit(1);

    const serialized = await serializeConversationRecord(
      db,
      conversationRecord as ConversationRecord,
    );

    return c.json(
      {
        conversation: formatConversationForClient(serialized),
        created: true,
        message: "Conversation created successfully",
      },
      201,
    );
  } catch (error: any) {
    logger.error("Error creating conversation:", error);
    return c.json(
      { error: error.message || "Failed to create conversation" },
      500,
    );
  }
});

// @epic-3.6-communication: Get conversations (DMs and channels) for a user
message.get("/conversations", async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.req.query("userEmail");
    const userId = c.get("userId");
    const workspaceId = c.req.query("workspaceId");

    if (!userEmail || !userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const currentUser = await getUserByEmail(db, userEmail);
    if (!currentUser) {
      return c.json({ error: "User not found" }, 404);
    }

    const conversations = await db
      .select({
        id: directMessageConversationsTable.id,
        workspaceId: directMessageConversationsTable.workspaceId,
        participant1Id: directMessageConversationsTable.participant1Id,
        participant2Id: directMessageConversationsTable.participant2Id,
        lastMessageAt: directMessageConversationsTable.lastMessageAt,
        lastMessagePreview: directMessageConversationsTable.lastMessagePreview,
        isArchived: directMessageConversationsTable.isArchived,
        createdAt: directMessageConversationsTable.createdAt,
        updatedAt: directMessageConversationsTable.updatedAt,
        participant1Email: participant1Alias.email,
        participant1Name: participant1Alias.name,
        participant1Avatar: participant1Alias.avatar,
        participant2Email: participant2Alias.email,
        participant2Name: participant2Alias.name,
        participant2Avatar: participant2Alias.avatar,
      })
      .from(directMessageConversationsTable)
      .leftJoin(
        participant1Alias,
        eq(participant1Alias.id, directMessageConversationsTable.participant1Id),
      )
      .leftJoin(
        participant2Alias,
        eq(participant2Alias.id, directMessageConversationsTable.participant2Id),
      )
      .where(
        and(
          or(
            eq(directMessageConversationsTable.participant1Id, currentUser.id),
            eq(directMessageConversationsTable.participant2Id, currentUser.id),
          ),
          workspaceId
            ? eq(directMessageConversationsTable.workspaceId, workspaceId)
            : sql`1=1`,
          or(
            isNull(directMessageConversationsTable.isArchived),
            eq(directMessageConversationsTable.isArchived, false),
          ),
        ),
      )
      .orderBy(desc(directMessageConversationsTable.updatedAt));

    const serialized = await Promise.all(
      conversations.map((conv) =>
        serializeConversationRecord(db, conv as ConversationRecord),
      ),
    );

    const response = serialized.map(formatConversationForClient);

    return c.json({ conversations: response }, 200);
  } catch (error: any) {
    logger.error("Error fetching conversations:", error);
    return c.json(
      { error: error.message || "Failed to fetch conversations" },
      500,
    );
  }
});

// @epic-4.1-direct-messaging: Get message history for a conversation
message.get("/:conversationId/messages", async (c) => {
  try {
    const db = getDatabase();
    const conversationId = c.req.param("conversationId");
    const requestedLimit = parseInt(c.req.query("limit") || "50", 10);
    const limit = Math.min(requestedLimit, 100);
    const offset = Math.max(0, parseInt(c.req.query("offset") || "0", 10));
    const userId = c.get("userId");

    if (!conversationId) {
      return c.json({ error: "Missing conversationId" }, 400);
    }

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [conversation] = await db
      .select({
        participant1Id: directMessageConversationsTable.participant1Id,
        participant2Id: directMessageConversationsTable.participant2Id,
      })
      .from(directMessageConversationsTable)
      .where(eq(directMessageConversationsTable.id, conversationId))
      .limit(1);

    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      return c.json({ error: "Access denied" }, 403);
    }

    const messages = await db
      .select({
        id: messageTable.id,
        conversationId: messageTable.channelId,
        authorId: messageTable.userId,
        content: messageTable.content,
        messageType: messageTable.messageType,
        parentMessageId: messageTable.parentMessageId,
        mentions: messageTable.mentions,
        attachments: messageTable.attachments,
        reactions: messageTable.reactions,
        isEdited: messageTable.isEdited,
        editedAt: messageTable.editedAt,
        deletedAt: messageTable.deletedAt,
        createdAt: messageTable.createdAt,
        updatedAt: messageTable.updatedAt,
        authorEmail: authorAlias.email,
        authorName: authorAlias.name,
        authorAvatar: authorAlias.avatar,
      })
      .from(messageTable)
      .leftJoin(authorAlias, eq(authorAlias.id, messageTable.userId))
      .where(eq(messageTable.channelId, conversationId))
      .orderBy(desc(messageTable.createdAt))
      .limit(limit)
      .offset(offset);

    const normalize = (value: any) => {
      if (value == null) return null;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    const response = messages
      .reverse()
      .map(({ authorEmail, authorName, authorAvatar, ...msg }) => ({
        id: msg.id,
        channelId: msg.conversationId,
        conversationId: msg.conversationId,
        userEmail: authorEmail ?? null,
        userName: authorName ?? null,
        userAvatar: authorAvatar ?? null,
        content: msg.content,
        messageType: msg.messageType,
        parentMessageId: msg.parentMessageId ?? undefined,
        mentions: normalize(msg.mentions) ?? [],
        attachments: normalize(msg.attachments) ?? [],
        reactions: normalize(msg.reactions) ?? [],
        isEdited: msg.isEdited,
        editedAt: msg.editedAt ?? undefined,
        deletedAt: msg.deletedAt ?? undefined,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt ?? msg.createdAt,
      }));

    return c.json({
      messages: response,
      conversationId,
    });
  } catch (error) {
    logger.error("❌ Error getting messages:", error);
    return c.json({ error: "Failed to get messages" }, 500);
  }
});

// @epic-3.1-messaging: Get message by ID (for threading, reactions, etc.)
message.get("/:messageId", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable, userTable, readReceiptsTable } = await import("../database/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Get message with author details
    const [message] = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        conversationId: messagesTable.channelId,
        authorId: messagesTable.userId,
        authorEmail: userTable.email,
        authorName: userTable.name,
        authorAvatar: userTable.avatar,
        isEdited: messagesTable.isEdited,
        editedAt: messagesTable.editedAt,
        isPinned: messagesTable.isPinned,
        deletedAt: messagesTable.deletedAt,
        parentMessageId: messagesTable.parentMessageId,
        reactions: messagesTable.reactions,
        createdAt: messagesTable.createdAt,
        updatedAt: messagesTable.updatedAt,
      })
      .from(messagesTable)
      .leftJoin(userTable, eq(userTable.id, messagesTable.userId))
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Get read receipts count
    const receipts = await db
      .select()
      .from(readReceiptsTable)
      .where(eq(readReceiptsTable.messageId, messageId));

    return c.json({ 
      success: true, 
      message: {
        ...message,
        readBy: receipts.length,
      }
    }, 200);
  } catch (error: any) {
    logger.error('Error fetching message:', error);
    return c.json({ error: error.message || 'Failed to fetch message' }, 500);
  }
});

// @epic-3.1-messaging: Update message (edit content)
message.put("/:messageId", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const { content } = await c.req.json();
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!content || content.trim() === '') {
      return c.json({ error: 'Message content is required' }, 400);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable } = await import("../database/schema");
    const { eq, and } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Fetch current message to verify ownership
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Only message author can edit
    if (msg.userId !== userId) {
      return c.json({ error: 'You can only edit your own messages' }, 403);
    }

    // Update message
    const [updatedMessage] = await db
      .update(messagesTable)
      .set({
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messagesTable.id, messageId))
      .returning();

    // Broadcast WebSocket event for real-time updates
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer && msg.channelId) {
        wsServer.broadcast('chat:message_edited', msg.channelId, {
          messageId,
          content: content.trim(),
          isEdited: true,
          editedAt: new Date(),
          timestamp: Date.now(),
        });
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast message edit event:', wsError);
    }

    return c.json({ 
      success: true, 
      message: updatedMessage 
    }, 200);
  } catch (error: any) {
    logger.error('Error editing message:', error);
    return c.json({ error: error.message || 'Failed to edit message' }, 500);
  }
});

// @epic-3.1-messaging: Delete message (soft delete)
message.delete("/:messageId", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable } = await import("../database/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Fetch current message to verify ownership
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Check if already deleted
    if (msg.deletedAt) {
      return c.json({ error: 'Message already deleted' }, 410);
    }

    // Only message author can delete (TODO: Add admin/moderator permissions)
    if (msg.userId !== userId) {
      return c.json({ error: 'You can only delete your own messages' }, 403);
    }

    // Soft delete: Set deletedAt timestamp
    const [deletedMessage] = await db
      .update(messagesTable)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messagesTable.id, messageId))
      .returning();

    // Broadcast WebSocket event for real-time updates
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer && msg.channelId) {
        wsServer.broadcast('chat:message_deleted', msg.channelId, {
          messageId,
          deletedAt: new Date(),
          timestamp: Date.now(),
        });
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast message delete event:', wsError);
    }

    return c.json({ 
      success: true, 
      message: 'Message deleted successfully'
    }, 200);
  } catch (error: any) {
    logger.error('Error deleting message:', error);
    return c.json({ error: error.message || 'Failed to delete message' }, 500);
  }
});

// @epic-3.1-messaging: Add reaction to message
message.post("/:messageId/reactions", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const { emoji } = await c.req.json();
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!emoji) {
      return c.json({ error: 'Emoji is required' }, 400);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable } = await import("../database/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Fetch current message
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Update reactions (stored as JSONB)
    const reactions = (msg.reactions as any[]) || [];
    const existingReaction = reactions.find((r: any) => r.emoji === emoji);

    if (existingReaction) {
      // Add user to existing reaction if not already there
      if (!existingReaction.users.includes(userEmail)) {
        existingReaction.users.push(userEmail);
        existingReaction.count = existingReaction.users.length;
      }
    } else {
      // Create new reaction
      reactions.push({
        emoji,
        users: [userEmail],
        count: 1,
      });
    }

    await db
      .update(messagesTable)
      .set({ reactions: reactions as any, updatedAt: new Date() })
      .where(eq(messagesTable.id, messageId));

    // Emit WebSocket event for real-time updates
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer) {
        // Get the channel ID from the message
        const channelId = msg.channelId;
        if (channelId) {
          wsServer.broadcast('chat:reaction_added', channelId, {
            messageId,
            emoji,
            userEmail,
            reactions,
            timestamp: Date.now(),
          });
        }
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast reaction event:', wsError);
      // Continue even if WebSocket broadcast fails
    }

    return c.json({ success: true, reactions }, 200);
  } catch (error: any) {
    logger.error('Error adding reaction:', error);
    return c.json({ error: error.message || 'Failed to add reaction' }, 500);
  }
});

// @epic-3.1-messaging: Remove reaction from message
message.delete("/:messageId/reactions/:emoji", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const emoji = decodeURIComponent(c.req.param('emoji'));
    const userEmail = c.get('userEmail');

    if (!userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable } = await import("../database/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDatabase();

    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    let reactions = (msg.reactions as any[]) || [];
    reactions = reactions
      .map((r: any) => {
        if (r.emoji === emoji) {
          r.users = r.users.filter((email: string) => email !== userEmail);
          r.count = r.users.length;
        }
        return r;
      })
      .filter((r: any) => r.count > 0);

    await db
      .update(messagesTable)
      .set({ reactions: reactions as any, updatedAt: new Date() })
      .where(eq(messagesTable.id, messageId));

    // Emit WebSocket event for real-time updates
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer) {
        // Get the channel ID from the message
        const channelId = msg.channelId;
        if (channelId) {
          wsServer.broadcast('chat:reaction_removed', channelId, {
            messageId,
            emoji,
            userEmail,
            reactions,
            timestamp: Date.now(),
          });
        }
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast reaction event:', wsError);
      // Continue even if WebSocket broadcast fails
    }

    return c.json({ success: true, reactions }, 200);
  } catch (error: any) {
    logger.error('Error removing reaction:', error);
    return c.json({ error: error.message || 'Failed to remove reaction' }, 500);
  }
});

// @epic-3.1-messaging: Pin/unpin message
message.post("/:messageId/pin", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable, channelMembershipTable } = await import("../database/schema");
    const { eq, and } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Fetch message
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    if (msg.deletedAt) {
      return c.json({ error: 'Cannot pin a deleted message' }, 400);
    }

    // Check if user has permission to pin messages (channel membership check)
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, msg.channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return c.json({ error: 'You do not have permission to pin messages in this channel' }, 403);
    }

    // Pin the message
    const [pinnedMessage] = await db
      .update(messagesTable)
      .set({
        isPinned: true,
        updatedAt: new Date(),
      })
      .where(eq(messagesTable.id, messageId))
      .returning();

    // Broadcast WebSocket event
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer && msg.channelId) {
        wsServer.broadcast('chat:message_pinned', msg.channelId, {
          messageId,
          isPinned: true,
          pinnedBy: userEmail,
          timestamp: Date.now(),
        });
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast message pin event:', wsError);
    }

    return c.json({ 
      success: true, 
      message: pinnedMessage 
    }, 200);
  } catch (error: any) {
    logger.error('Error pinning message:', error);
    return c.json({ error: error.message || 'Failed to pin message' }, 500);
  }
});

// @epic-3.1-messaging: Unpin message
message.delete("/:messageId/pin", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable, channelMembershipTable } = await import("../database/schema");
    const { eq, and } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Fetch message
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Check if user has permission to pin/unpin messages
    const [membership] = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, msg.channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return c.json({ error: 'You do not have permission to unpin messages in this channel' }, 403);
    }

    // Unpin the message
    const [unpinnedMessage] = await db
      .update(messagesTable)
      .set({
        isPinned: false,
        updatedAt: new Date(),
      })
      .where(eq(messagesTable.id, messageId))
      .returning();

    // Broadcast WebSocket event
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer && msg.channelId) {
        wsServer.broadcast('chat:message_unpinned', msg.channelId, {
          messageId,
          isPinned: false,
          unpinnedBy: userEmail,
          timestamp: Date.now(),
        });
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast message unpin event:', wsError);
    }

    return c.json({ 
      success: true, 
      message: unpinnedMessage 
    }, 200);
  } catch (error: any) {
    logger.error('Error unpinning message:', error);
    return c.json({ error: error.message || 'Failed to unpin message' }, 500);
  }
});

// @epic-3.1-messaging: Mark message as read
message.post("/:messageId/read", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable, readReceiptsTable } = await import("../database/schema");
    const { eq, and } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Check if message exists
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Don't mark own messages as read
    if (msg.userId === userId) {
      return c.json({ message: 'Cannot mark own message as read' }, 400);
    }

    // Check if already marked as read (upsert logic)
    const [existingReceipt] = await db
      .select()
      .from(readReceiptsTable)
      .where(
        and(
          eq(readReceiptsTable.messageId, messageId),
          eq(readReceiptsTable.userId, userId)
        )
      )
      .limit(1);

    if (existingReceipt) {
      return c.json({ 
        success: true, 
        message: 'Already marked as read',
        readAt: existingReceipt.readAt 
      }, 200);
    }

    // Create read receipt
    const [receipt] = await db
      .insert(readReceiptsTable)
      .values({
        messageId,
        userId,
        userEmail,
      })
      .returning();

    // Broadcast WebSocket event
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer && msg.channelId) {
        wsServer.broadcast('chat:message_read', msg.channelId, {
          messageId,
          userId,
          userEmail,
          readAt: receipt.readAt,
          timestamp: Date.now(),
        });
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast read receipt event:', wsError);
    }

    return c.json({ 
      success: true, 
      receipt 
    }, 200);
  } catch (error: any) {
    logger.error('Error marking message as read:', error);
    return c.json({ error: error.message || 'Failed to mark message as read' }, 500);
  }
});

// @epic-3.1-messaging: Get read receipts for a message
message.get("/:messageId/receipts", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { readReceiptsTable, userTable } = await import("../database/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Get all read receipts for this message with user info
    const receipts = await db
      .select({
        id: readReceiptsTable.id,
        userId: readReceiptsTable.userId,
        userEmail: readReceiptsTable.userEmail,
        userName: userTable.name,
        userAvatar: userTable.avatar,
        readAt: readReceiptsTable.readAt,
      })
      .from(readReceiptsTable)
      .leftJoin(userTable, eq(userTable.id, readReceiptsTable.userId))
      .where(eq(readReceiptsTable.messageId, messageId))
      .orderBy(readReceiptsTable.readAt);

    return c.json({ 
      success: true, 
      receipts,
      count: receipts.length 
    }, 200);
  } catch (error: any) {
    logger.error('Error fetching read receipts:', error);
    return c.json({ error: error.message || 'Failed to fetch read receipts' }, 500);
  }
});

// @epic-3.1-messaging: Create mention and trigger notification
message.post("/:messageId/mentions", async (c) => {
  try {
    const messageId = c.req.param('messageId');
    const { mentionedUserIds } = await c.req.json();
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');

    if (!userId || !userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!mentionedUserIds || !Array.isArray(mentionedUserIds) || mentionedUserIds.length === 0) {
      return c.json({ error: 'mentionedUserIds array is required' }, 400);
    }

    const { getDatabase } = await import("../database/connection");
    const { messagesTable, mentionsTable, notificationTable, userTable } = await import("../database/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Verify message exists
    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Get author details for notification
    const [author] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    const mentions = [];
    const notifications = [];

    // Create mentions and notifications for each mentioned user
    for (const mentionedUserId of mentionedUserIds) {
      // Create mention record
      const [mention] = await db
        .insert(mentionsTable)
        .values({
          messageId,
          mentionedUserId,
        })
        .returning();

      mentions.push(mention);

      // Create notification
      const [notification] = await db
        .insert(notificationTable)
        .values({
          userId: mentionedUserId,
          type: 'mention',
          title: `${author?.name || userEmail} mentioned you`,
          message: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
          link: `/dashboard/chat?channel=${msg.channelId}&message=${messageId}`,
        })
        .returning();

      notifications.push(notification);
    }

    // Broadcast WebSocket event for mentions
    try {
      const { UnifiedWebSocketServer } = await import("../realtime/unified-websocket-server");
      const wsServer = UnifiedWebSocketServer.getInstance();
      if (wsServer && msg.channelId) {
        // Notify each mentioned user
        for (const mentionedUserId of mentionedUserIds) {
          wsServer.broadcast('chat:user_mentioned', msg.channelId, {
            messageId,
            mentionedUserId,
            mentionedBy: userId,
            mentionedByName: author?.name || userEmail,
            timestamp: Date.now(),
          });
        }
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast mention event:', wsError);
    }

    return c.json({ 
      success: true, 
      mentions,
      notifications 
    }, 200);
  } catch (error: any) {
    logger.error('Error creating mentions:', error);
    return c.json({ error: error.message || 'Failed to create mentions' }, 500);
  }
});

// @epic-3.1-messaging: Mark mention as read
message.post("/:messageId/mentions/:mentionId/read", async (c) => {
  try {
    const mentionId = c.req.param('mentionId');
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { getDatabase } = await import("../database/connection");
    const { mentionsTable } = await import("../database/schema");
    const { eq, and } = await import("drizzle-orm");
    
    const db = getDatabase();

    // Verify mention belongs to user
    const [mention] = await db
      .select()
      .from(mentionsTable)
      .where(
        and(
          eq(mentionsTable.id, mentionId),
          eq(mentionsTable.mentionedUserId, userId)
        )
      )
      .limit(1);

    if (!mention) {
      return c.json({ error: 'Mention not found or does not belong to you' }, 404);
    }

    // Mark as read
    const [updatedMention] = await db
      .update(mentionsTable)
      .set({
        readAt: new Date(),
      })
      .where(eq(mentionsTable.id, mentionId))
      .returning();

    return c.json({ 
      success: true, 
      mention: updatedMention 
    }, 200);
  } catch (error: any) {
    logger.error('Error marking mention as read:', error);
    return c.json({ error: error.message || 'Failed to mark mention as read' }, 500);
  }
});

export default message; 
