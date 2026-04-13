export { default } from '../../realtime/controllers/direct-messaging'

/*
// @epic-4.1-direct-messaging: Direct messaging controller
// @persona-sarah: PM needs API endpoints for direct messaging
// @persona-david: Team lead needs efficient team communication APIs

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, or, desc, asc, like, sql, isNull, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { getDatabase } from '../../database/connection'
import { 
  directMessageConversationsTable, 
  messageTable, 
  userTable,
  userPresenceTable,
  readReceiptsTable,
  conversationsTable,
  channelTable,
  channelMembershipTable,
  workspaceUserTable,
} from '../../database/schema'
import { authMiddleware } from '../../middlewares/secure-auth'
import logger from '../../utils/logger';
import {
  ConversationRecord,
  Database,
  buildLastMessagePreview,
  computeUnreadCount,
  getLastMessageForConversation,
  getUserByEmail,
  serializeConversationRecord,
} from '../utils'

const directMessagingRouter = new Hono()
const participant1Alias = alias(userTable, 'participant1');
const participant2Alias = alias(userTable, 'participant2');
const authorAlias = alias(userTable, 'author');

// Validation schemas
const getConversationsSchema = z.object({
  userEmail: z.string().email(),
  workspaceId: z.string()
})

const getMessageHistorySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
})

const sendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'file', 'system']).default('text'),
  parentMessageId: z.string().optional(),
  mentions: z.array(z.string().email()).optional(),
  attachments: z.array(z.union([
    z.string(),
    z.object({
      id: z.string(),
      name: z.string(),
      url: z.string().url(),
      size: z.number(),
      type: z.string()
    }),
  ])).optional()
})

const markAsReadSchema = z.object({
  conversationId: z.string()
})

const archiveConversationSchema = z.object({
  conversationId: z.string()
})

const deleteMessageSchema = z.object({
  messageId: z.string()
})

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000)
})

const searchUsersSchema = z.object({
  query: z.string().min(1),
  workspaceId: z.string(),
  excludeUserEmail: z.string().email().optional()
})

const getOrCreateConversationSchema = z.object({
  userEmail: z.string().email(),
  targetUserEmail: z.string().email(),
  workspaceId: z.string()
})

const updatePresenceSchema = z.object({
  userEmail: z.string().email().optional(),
  workspaceId: z.string().optional(),
  status: z.enum(['online', 'away', 'busy', 'offline']),
  currentPage: z.string().optional(),
})

// Get direct message conversations
directMessagingRouter.get('/conversations', 
  zValidator('query', getConversationsSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { userEmail, workspaceId } = c.req.valid('query')

      // Verify workspace access
      const hasAccess = await hasWorkspaceAccess(db, userEmail, workspaceId)
      if (!hasAccess) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const rawConversations = await db
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
            eq(directMessageConversationsTable.isArchived, false),
            or(
              eq(directMessageConversationsTable.participant1Id, currentUser.id),
              eq(directMessageConversationsTable.participant2Id, currentUser.id),
            ),
          ),
        )
        .orderBy(desc(directMessageConversationsTable.updatedAt))

      const conversationsWithDetails = await Promise.all(
        rawConversations.map((conv) =>
          serializeConversationRecord(db, conv as ConversationRecord),
        ),
      )

      return c.json({ conversations: conversationsWithDetails })
    } catch (error) {
      logger.error('Error getting conversations:', error)
      return c.json({ error: 'Failed to get conversations' }, 500)
    }
  }
)

// Get message history for a conversation
directMessagingRouter.get('/history/:conversationId',
  zValidator('param', z.object({ conversationId: z.string() })),
  zValidator('query', getMessageHistorySchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { conversationId } = c.req.valid('param')
      const { limit, offset } = c.req.valid('query')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [conversation] = await db
        .select({
          id: directMessageConversationsTable.id,
          workspaceId: directMessageConversationsTable.workspaceId,
          participant1Id: directMessageConversationsTable.participant1Id,
          participant2Id: directMessageConversationsTable.participant2Id,
          participant1Email: participant1Alias.email,
          participant2Email: participant2Alias.email,
          isArchived: directMessageConversationsTable.isArchived,
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
        .where(eq(directMessageConversationsTable.id, conversationId))
        .limit(1)

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404)
      }

      if (
        conversation.participant1Id !== currentUser.id &&
        conversation.participant2Id !== currentUser.id
      ) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const messages = await db
        .select({
          id: messageTable.id,
          conversationId: messageTable.channelId,
          authorId: messageTable.userId,
          authorEmail: authorAlias.email,
          authorName: authorAlias.name,
          content: messageTable.content,
          messageType: messageTable.messageType,
          parentMessageId: messageTable.parentMessageId,
          mentions: messageTable.mentions,
          attachments: messageTable.attachments,
          isEdited: messageTable.isEdited,
          editedAt: messageTable.editedAt,
          isPinned: messageTable.isPinned,
          deletedAt: messageTable.deletedAt,
          createdAt: messageTable.createdAt,
        })
        .from(messageTable)
        .leftJoin(authorAlias, eq(authorAlias.id, messageTable.userId))
        .where(eq(messageTable.channelId, conversationId))
        .orderBy(desc(messageTable.createdAt))
        .limit(limit)
        .offset(offset)

      const normalizedMessages = messages.reverse().map((msg) => {
        const parseJson = (value: unknown) => {
          if (typeof value !== 'string') return value ?? null
          try {
            return JSON.parse(value)
          } catch {
            return value
          }
        }

        return {
          id: msg.id,
          conversationId: msg.conversationId,
          userEmail: msg.authorEmail ?? null,
          userName: msg.authorName ?? null,
          authorId: msg.authorId,
          content: msg.content,
          messageType: msg.messageType,
          parentMessageId: msg.parentMessageId,
          mentions: parseJson(msg.mentions) ?? [],
          attachments: parseJson(msg.attachments) ?? [],
          isEdited: msg.isEdited,
          editedAt: msg.editedAt,
          isPinned: msg.isPinned,
          deletedAt: msg.deletedAt,
          createdAt: msg.createdAt,
        }
      })

      return c.json({ messages: normalizedMessages })
    } catch (error) {
      logger.error('Error getting message history:', error)
      return c.json({ error: 'Failed to get message history' }, 500)
    }
  }
)

// Frontend-compatible alias for message history
directMessagingRouter.get('/:conversationId/messages',
  zValidator('param', z.object({ conversationId: z.string() })),
  zValidator('query', getMessageHistorySchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { conversationId } = c.req.valid('param')
      const { limit, offset } = c.req.valid('query')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [conversation] = await db
        .select({
          id: directMessageConversationsTable.id,
          participant1Id: directMessageConversationsTable.participant1Id,
          participant2Id: directMessageConversationsTable.participant2Id,
        })
        .from(directMessageConversationsTable)
        .where(eq(directMessageConversationsTable.id, conversationId))
        .limit(1)

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404)
      }

      if (
        conversation.participant1Id !== currentUser.id &&
        conversation.participant2Id !== currentUser.id
      ) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const messages = await db
        .select({
          id: messageTable.id,
          conversationId: messageTable.channelId,
          authorId: messageTable.userId,
          authorEmail: authorAlias.email,
          authorName: authorAlias.name,
          content: messageTable.content,
          messageType: messageTable.messageType,
          parentMessageId: messageTable.parentMessageId,
          mentions: messageTable.mentions,
          attachments: messageTable.attachments,
          isEdited: messageTable.isEdited,
          editedAt: messageTable.editedAt,
          isPinned: messageTable.isPinned,
          deletedAt: messageTable.deletedAt,
          createdAt: messageTable.createdAt,
        })
        .from(messageTable)
        .leftJoin(authorAlias, eq(authorAlias.id, messageTable.userId))
        .where(eq(messageTable.channelId, conversationId))
        .orderBy(desc(messageTable.createdAt))
        .limit(limit)
        .offset(offset)

      return c.json({
        messages: messages.reverse().map((msg) => ({
          id: msg.id,
          conversationId: msg.conversationId,
          userEmail: msg.authorEmail ?? null,
          userName: msg.authorName ?? null,
          authorId: msg.authorId,
          content: msg.content,
          messageType: msg.messageType,
          parentMessageId: msg.parentMessageId,
          mentions: msg.mentions ?? [],
          attachments: msg.attachments ?? [],
          isEdited: msg.isEdited,
          editedAt: msg.editedAt,
          isPinned: msg.isPinned,
          deletedAt: msg.deletedAt,
          createdAt: msg.createdAt,
        })),
      })
    } catch (error) {
      logger.error('Error getting message history:', error)
      return c.json({ error: 'Failed to get message history' }, 500)
    }
  }
)

// Send a direct message
directMessagingRouter.post('/send',
  zValidator('json', sendMessageSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { conversationId, content, messageType, parentMessageId, mentions, attachments } = c.req.valid('json')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [conversation] = await db
        .select({
          id: directMessageConversationsTable.id,
          participant1Id: directMessageConversationsTable.participant1Id,
          participant2Id: directMessageConversationsTable.participant2Id,
          workspaceId: directMessageConversationsTable.workspaceId,
        })
        .from(directMessageConversationsTable)
        .where(eq(directMessageConversationsTable.id, conversationId))
        .limit(1)

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404)
      }

      if (
        conversation.participant1Id !== currentUser.id &&
        conversation.participant2Id !== currentUser.id
      ) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const messageId = createId()
      const createdAt = new Date()

      const [message] = await db
        .insert(messageTable)
        .values({
          id: messageId,
          conversationId,
          authorId: currentUser.id,
          userEmail,
          content,
          messageType,
          parentMessageId,
          mentions: mentions ?? [],
          attachments: attachments ?? [],
          createdAt,
          updatedAt: createdAt,
        })
        .returning()

      // Update conversation metadata
      const preview = buildLastMessagePreview(content)
      await db
        .update(directMessageConversationsTable)
        .set({
          lastMessageAt: createdAt,
          lastMessagePreview: preview,
          updatedAt: createdAt,
        })
        .where(eq(directMessageConversationsTable.id, conversationId))

      // Mark sender's message as read for themselves
      await db
        .insert(readReceiptsTable)
        .values({
          id: createId(),
          messageId: message.id,
          userId: currentUser.id,
          userEmail,
          readAt: createdAt,
        })
        .onConflictDoNothing()

      return c.json({
        message: {
          ...message,
          userEmail,
          createdAt,
        },
      })
    } catch (error) {
      logger.error('Error sending message:', error)
      return c.json({ error: 'Failed to send message' }, 500)
    }
  }
)

// Mark conversation as read
directMessagingRouter.post('/mark-read',
  zValidator('json', markAsReadSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { conversationId } = c.req.valid('json')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [conversation] = await db
        .select({
          id: directMessageConversationsTable.id,
          participant1Id: directMessageConversationsTable.participant1Id,
          participant2Id: directMessageConversationsTable.participant2Id,
        })
        .from(directMessageConversationsTable)
        .where(eq(directMessageConversationsTable.id, conversationId))
        .limit(1)

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404)
      }

      if (
        conversation.participant1Id !== currentUser.id &&
        conversation.participant2Id !== currentUser.id
      ) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const unreadMessages = await db
        .select({
          id: messageTable.id,
        })
        .from(messageTable)
        .leftJoin(
          readReceiptsTable,
          and(
            eq(readReceiptsTable.messageId, messageTable.id),
            eq(readReceiptsTable.userId, currentUser.id),
          ),
        )
        .where(
          and(
            eq(messageTable.channelId, conversationId),
            ne(messageTable.userId, currentUser.id),
            isNull(readReceiptsTable.id),
          ),
        )

      if (unreadMessages.length > 0) {
        await db
          .insert(readReceiptsTable)
          .values(
            unreadMessages.map((msg) => ({
              id: createId(),
              messageId: msg.id,
              userId: currentUser.id,
              userEmail,
              readAt: new Date(),
            })),
          )
          .onConflictDoNothing()
      }

      return c.json({ success: true })
    } catch (error) {
      logger.error('Error marking conversation as read:', error)
      return c.json({ error: 'Failed to mark conversation as read' }, 500)
    }
  }
)

// Archive conversation
directMessagingRouter.post('/archive',
  zValidator('json', archiveConversationSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { conversationId } = c.req.valid('json')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [conversation] = await db
        .select({
          id: directMessageConversationsTable.id,
          participant1Id: directMessageConversationsTable.participant1Id,
          participant2Id: directMessageConversationsTable.participant2Id,
          isArchived: directMessageConversationsTable.isArchived,
        })
        .from(directMessageConversationsTable)
        .where(eq(directMessageConversationsTable.id, conversationId))
        .limit(1)

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404)
      }

      if (
        conversation.participant1Id !== currentUser.id &&
        conversation.participant2Id !== currentUser.id
      ) {
        return c.json({ error: 'Access denied' }, 403)
      }

      if (conversation.isArchived) {
        return c.json({ success: true })
      }

      await db
        .update(directMessageConversationsTable)
        .set({
          isArchived: true,
          updatedAt: new Date(),
        })
        .where(eq(directMessageConversationsTable.id, conversationId))

      return c.json({ success: true })
    } catch (error) {
      logger.error('Error archiving conversation:', error)
      return c.json({ error: 'Failed to archive conversation' }, 500)
    }
  }
)

// Delete message
directMessagingRouter.delete('/message/:messageId',
  zValidator('param', deleteMessageSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { messageId } = c.req.valid('param')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [message] = await db
        .select({
          id: messageTable.id,
          authorId: messageTable.userId,
          conversationId: messageTable.channelId,
          deletedAt: messageTable.deletedAt,
        })
        .from(messageTable)
        .where(eq(messageTable.id, messageId))
        .limit(1)

      if (!message) {
        return c.json({ error: 'Message not found' }, 404)
      }

      if (message.authorId !== currentUser.id) {
        return c.json({ error: 'You can only delete your own messages' }, 403)
      }

      if (message.deletedAt) {
        return c.json({ success: true })
      }

      await db
        .update(messageTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messageTable.id, messageId))

      return c.json({ success: true })
    } catch (error) {
      logger.error('Error deleting message:', error)
      return c.json({ error: 'Failed to delete message' }, 500)
    }
  }
)

// Edit message
directMessagingRouter.put('/message/:messageId',
  zValidator('param', deleteMessageSchema),
  zValidator('json', editMessageSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { messageId } = c.req.valid('param')
      const { content } = c.req.valid('json')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [message] = await db
        .select({
          id: messageTable.id,
          authorId: messageTable.userId,
          deletedAt: messageTable.deletedAt,
        })
        .from(messageTable)
        .where(eq(messageTable.id, messageId))
        .limit(1)

      if (!message || message.deletedAt) {
        return c.json({ error: 'Message not found or has been deleted' }, 404)
      }

      if (message.authorId !== currentUser.id) {
        return c.json({ error: 'You can only edit your own messages' }, 403)
      }

      const [updatedMessage] = await db
        .update(messageTable)
        .set({
          content: content.trim(),
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messageTable.id, messageId))
        .returning()

      return c.json({
        message: {
          ...updatedMessage,
          userEmail,
        },
      })
    } catch (error) {
      logger.error('Error editing message:', error)
      return c.json({ error: 'Failed to edit message' }, 500)
    }
  }
)

// Frontend-compatible alias for edit message
directMessagingRouter.patch('/message/:messageId',
  zValidator('param', deleteMessageSchema),
  zValidator('json', editMessageSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { messageId } = c.req.valid('param')
      const { content } = c.req.valid('json')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [message] = await db
        .select({
          id: messageTable.id,
          authorId: messageTable.userId,
          deletedAt: messageTable.deletedAt,
        })
        .from(messageTable)
        .where(eq(messageTable.id, messageId))
        .limit(1)

      if (!message || message.deletedAt) {
        return c.json({ error: 'Message not found or has been deleted' }, 404)
      }

      if (message.authorId !== currentUser.id) {
        return c.json({ error: 'You can only edit your own messages' }, 403)
      }

      const [updatedMessage] = await db
        .update(messageTable)
        .set({
          content: content.trim(),
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messageTable.id, messageId))
        .returning()

      return c.json({
        message: {
          ...updatedMessage,
          userEmail,
        },
      })
    } catch (error) {
      logger.error('Error editing message:', error)
      return c.json({ error: 'Failed to edit message' }, 500)
    }
  }
)

// Frontend-compatible alias for archive conversation
directMessagingRouter.post('/:conversationId/archive',
  zValidator('param', z.object({ conversationId: z.string() })),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { conversationId } = c.req.valid('param')
      const userEmail = c.get('userEmail')

      const currentUser = await getUserByEmail(db, userEmail)
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404)
      }

      const [conversation] = await db
        .select({
          id: directMessageConversationsTable.id,
          participant1Id: directMessageConversationsTable.participant1Id,
          participant2Id: directMessageConversationsTable.participant2Id,
        })
        .from(directMessageConversationsTable)
        .where(eq(directMessageConversationsTable.id, conversationId))
        .limit(1)

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404)
      }

      if (
        conversation.participant1Id !== currentUser.id &&
        conversation.participant2Id !== currentUser.id
      ) {
        return c.json({ error: 'Access denied' }, 403)
      }

      await db
        .update(directMessageConversationsTable)
        .set({
          isArchived: true,
          updatedAt: new Date(),
        })
        .where(eq(directMessageConversationsTable.id, conversationId))

      return c.json({ success: true })
    } catch (error) {
      logger.error('Error archiving conversation:', error)
      return c.json({ error: 'Failed to archive conversation' }, 500)
    }
  }
)

// Search users
directMessagingRouter.get('/search-users',
  zValidator('query', searchUsersSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { query, workspaceId, excludeUserEmail } = c.req.valid('query')
      const userEmail = c.get('userEmail')
      
      // Verify workspace access
      const hasAccess = await hasWorkspaceAccess(db, excludeUserEmail || userEmail, workspaceId)
      if (!hasAccess) {
        return c.json({ error: 'Access denied' }, 403)
      }

      // Search users in the workspace
      const users = await db
        .select({
          email: userTable.email,
          name: userTable.name,
          avatar: userTable.avatar
        })
        .from(userTable)
        .where(
          and(
            like(userTable.email, `%${query}%`),
            excludeUserEmail ? sql`${userTable.email} != ${excludeUserEmail}` : sql`1=1`
          )
        )
        .limit(10)

      // Get online status for each user
      const usersWithStatus = await Promise.all(
        users.map(async (user) => {
          const presence = await db
            .select({ status: userPresenceTable.status })
            .from(userPresenceTable)
            .where(eq(userPresenceTable.userEmail, user.email))
            .limit(1)

          return {
            ...user,
            status: presence[0]?.status || 'offline'
          }
        })
      )

      return c.json({ users: usersWithStatus })
    } catch (error) {
      logger.error('Error searching users:', error)
      return c.json({ error: 'Failed to search users' }, 500)
    }
  }
)

// Frontend-compatible alias for get-or-create conversation
directMessagingRouter.post(
  '/conversation',
  zValidator('json', getOrCreateConversationSchema),
  authMiddleware(),
  async (c) => {
    // Reuse the same business logic path
    const db = getDatabase();
    const { userEmail, targetUserEmail, workspaceId } = c.req.valid('json');

    const hasAccess1 = await hasWorkspaceAccess(db, userEmail, workspaceId);
    const hasAccess2 = await hasWorkspaceAccess(db, targetUserEmail, workspaceId);
    if (!hasAccess1 || !hasAccess2) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const [user, targetUser] = await Promise.all([
      getUserByEmail(db, userEmail),
      getUserByEmail(db, targetUserEmail),
    ]);
    if (!user || !targetUser) {
      return c.json({ error: 'One or more users not found' }, 404);
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
              eq(directMessageConversationsTable.participant1Id, user.id),
              eq(directMessageConversationsTable.participant2Id, targetUser.id),
            ),
            and(
              eq(directMessageConversationsTable.participant1Id, targetUser.id),
              eq(directMessageConversationsTable.participant2Id, user.id),
            ),
          ),
        ),
      )
      .limit(1);

    if (existingConversation) {
      await ensureConversationMetadata(
        db,
        existingConversation.id,
        `DM: ${user.name ?? user.email} & ${targetUser.name ?? targetUser.email}`,
        user.id,
      );

      const payload = await serializeConversationRecord(
        db,
        existingConversation as ConversationRecord,
      );
      return c.json({ conversation: payload, created: false });
    }

    const now = new Date();
    const [createdConversation] = await db
      .insert(directMessageConversationsTable)
      .values({
        id: createId(),
        workspaceId,
        participant1Id: user.id,
        participant2Id: targetUser.id,
        lastMessageAt: null,
        lastMessagePreview: null,
        isArchived: false,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await ensureConversationMetadata(
      db,
      createdConversation.id,
      `DM: ${user.name ?? user.email} & ${targetUser.name ?? targetUser.email}`,
      user.id,
    );

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
      .where(eq(directMessageConversationsTable.id, createdConversation.id))
      .limit(1);

    const payload = await serializeConversationRecord(
      db,
      conversationRecord as ConversationRecord,
    );

    return c.json({ conversation: payload, created: true });
  },
);

// Get or create conversation
directMessagingRouter.post('/get-or-create-conversation',
  zValidator('json', getOrCreateConversationSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { userEmail, targetUserEmail, workspaceId } = c.req.valid('json')
      
      // Verify workspace access for both users
      const hasAccess1 = await hasWorkspaceAccess(db, userEmail, workspaceId)
      const hasAccess2 = await hasWorkspaceAccess(db, targetUserEmail, workspaceId)
      
      if (!hasAccess1 || !hasAccess2) {
        return c.json({ error: 'Access denied' }, 403)
      }

      const [user, targetUser] = await Promise.all([
        getUserByEmail(db, userEmail),
        getUserByEmail(db, targetUserEmail),
      ])

      if (!user || !targetUser) {
        return c.json({ error: 'One or more users not found' }, 404)
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
                eq(directMessageConversationsTable.participant1Id, user.id),
                eq(directMessageConversationsTable.participant2Id, targetUser.id),
              ),
              and(
                eq(directMessageConversationsTable.participant1Id, targetUser.id),
                eq(directMessageConversationsTable.participant2Id, user.id),
              ),
            ),
          ),
        )
        .limit(1)

      if (existingConversation) {
        await ensureConversationMetadata(
          db,
          existingConversation.id,
          `DM: ${user.name ?? user.email} & ${targetUser.name ?? targetUser.email}`,
          user.id,
        )

        const payload = await serializeConversationRecord(
          db,
          existingConversation as ConversationRecord,
        )
        return c.json({
          conversation: payload,
          created: false,
          message: 'Conversation already exists',
        })
      }

      const now = new Date()
      const [createdConversation] = await db
        .insert(directMessageConversationsTable)
        .values({
          id: createId(),
          workspaceId,
          participant1Id: user.id,
          participant2Id: targetUser.id,
          lastMessageAt: null,
          lastMessagePreview: null,
          isArchived: false,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      await ensureConversationMetadata(
        db,
        createdConversation.id,
        `DM: ${user.name ?? user.email} & ${targetUser.name ?? targetUser.email}`,
        user.id,
      )

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
        .where(eq(directMessageConversationsTable.id, createdConversation.id))
        .limit(1)

      const payload = await serializeConversationRecord(
        db,
        conversationRecord as ConversationRecord,
      )

      return c.json({
        conversation: payload,
        created: true,
        message: 'Conversation created successfully',
      })
    } catch (error) {
      logger.error('Error getting or creating conversation:', error)
      return c.json({ error: 'Failed to get or create conversation' }, 500)
    }
  }
)

directMessagingRouter.get('/online-users',
  zValidator('query', z.object({ workspaceId: z.string() })),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { workspaceId } = c.req.valid('query');
      const userEmail = c.get('userEmail');

      const hasAccess = await hasWorkspaceAccess(db, userEmail, workspaceId);
      if (!hasAccess) {
        return c.json({ error: 'Access denied' }, 403);
      }

      const users = await db
        .select({
          email: userTable.email,
          name: userTable.name,
          avatar: userTable.avatar,
          status: userPresenceTable.status,
          lastSeen: userPresenceTable.lastSeen,
        })
        .from(workspaceUserTable)
        .innerJoin(userTable, eq(userTable.id, workspaceUserTable.userId))
        .leftJoin(
          userPresenceTable,
          and(
            eq(userPresenceTable.userEmail, userTable.email),
            eq(userPresenceTable.workspaceId, workspaceId),
          ),
        )
        .where(eq(workspaceUserTable.workspaceId, workspaceId))
        .orderBy(asc(userTable.name))
        .limit(100);

      const normalized = users.map((user) => ({
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        status: user.status ?? 'offline',
        lastSeen: user.lastSeen ?? new Date(),
      }));

      return c.json({ users: normalized, onlineUsers: normalized });
    } catch (error) {
      logger.error('Error getting online users:', error);
      return c.json({ error: 'Failed to get online users' }, 500);
    }
  }
)

directMessagingRouter.get('/presence/:userEmail',
  zValidator('param', z.object({ userEmail: z.string().email() })),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const { userEmail } = c.req.valid('param');
      const workspaceId = c.req.query('workspaceId');

      const [presence] = await db
        .select({
          userEmail: userPresenceTable.userEmail,
          status: userPresenceTable.status,
          lastSeen: userPresenceTable.lastSeen,
          currentPage: userPresenceTable.currentPage,
        })
        .from(userPresenceTable)
        .where(
          workspaceId
            ? and(
                eq(userPresenceTable.userEmail, userEmail),
                eq(userPresenceTable.workspaceId, workspaceId),
              )
            : eq(userPresenceTable.userEmail, userEmail),
        )
        .orderBy(desc(userPresenceTable.updatedAt))
        .limit(1);

      return c.json({
        presence: presence ?? {
          userEmail,
          status: 'offline',
          lastSeen: new Date(),
          currentPage: null,
          isTyping: false,
        },
      });
    } catch (error) {
      logger.error('Error getting user presence:', error);
      return c.json({ error: 'Failed to get user presence' }, 500);
    }
  }
)

directMessagingRouter.post('/presence',
  zValidator('json', updatePresenceSchema),
  authMiddleware(),
  async (c) => {
    try {
      const db = getDatabase();
      const payload = c.req.valid('json');
      const authenticatedUserEmail = c.get('userEmail');
      const userEmail = payload.userEmail ?? authenticatedUserEmail;

      const currentUser = await getUserByEmail(db, userEmail);
      if (!currentUser) {
        return c.json({ error: 'User not found' }, 404);
      }

      const workspaceId =
        payload.workspaceId ?? (await getPrimaryWorkspaceIdForUser(db, currentUser.id));
      if (!workspaceId) {
        return c.json({ error: 'Workspace not found for user' }, 400);
      }

      const [existing] = await db
        .select({ id: userPresenceTable.id })
        .from(userPresenceTable)
        .where(
          and(
            eq(userPresenceTable.userEmail, userEmail),
            eq(userPresenceTable.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      const now = new Date();
      if (existing) {
        await db
          .update(userPresenceTable)
          .set({
            status: payload.status,
            currentPage: payload.currentPage ?? null,
            lastSeen: now,
            updatedAt: now,
          })
          .where(eq(userPresenceTable.id, existing.id));
      } else {
        await db
          .insert(userPresenceTable)
          .values({
            id: createId(),
            userEmail,
            workspaceId,
            status: payload.status,
            currentPage: payload.currentPage ?? null,
            lastSeen: now,
            createdAt: now,
            updatedAt: now,
          });
      }

      return c.json({
        success: true,
        presence: {
          userEmail,
          workspaceId,
          status: payload.status,
          currentPage: payload.currentPage ?? null,
          lastSeen: now,
        },
      });
    } catch (error) {
      logger.error('Error updating user presence:', error);
      return c.json({ error: 'Failed to update user presence' }, 500);
    }
  }
)

export default directMessagingRouter 

async function ensureConversationMetadata(
  db: Database,
  conversationId: string,
  name: string,
  createdBy: string,
) {
  const existing = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1)

  if (existing.length > 0) {
    return
  }

  await db
    .insert(conversationsTable)
    .values({
      id: conversationId,
      name,
      type: 'direct',
      createdBy,
      projectId: null,
    })
    .onConflictDoNothing()
}

async function hasWorkspaceAccess(db: Database, userEmail: string, workspaceId: string) {
  const [membership] = await db
    .select({ id: workspaceUserTable.id })
    .from(workspaceUserTable)
    .innerJoin(userTable, eq(userTable.id, workspaceUserTable.userId))
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(userTable.email, userEmail),
      ),
    )
    .limit(1)

  return Boolean(membership)
}

async function getPrimaryWorkspaceIdForUser(db: Database, userId: string) {
  const [membership] = await db
    .select({ workspaceId: workspaceUserTable.workspaceId })
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.userId, userId))
    .limit(1)

  return membership?.workspaceId ?? null
}
*/
