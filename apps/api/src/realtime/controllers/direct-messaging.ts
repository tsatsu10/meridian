// @epic-4.1-direct-messaging: Direct messaging controller for 1-on-1 chat
// @persona-sarah: PM needs direct communication with team members
// @persona-david: Team lead needs private conversations with team members

import { Hono } from 'hono';
import { eq, and, or, desc, asc, sql, inArray } from 'drizzle-orm';
import { getDatabase } from '../../database/connection';
import { 
  channelTable, 
  messageTable, 
  directMessageConversations as directMessageConversationsTable, // Fix: Import with correct name
  userTable,
  userPresenceTable
} from '../../database/schema';
import { createId } from '@paralleldrive/cuid2';
import logger from '../../utils/logger';

const directMessaging = new Hono();

const getConversationById = async (db: ReturnType<typeof getDatabase>, conversationId: string) => {
  const [conversation] = await db
    .select()
    .from(directMessageConversationsTable)
    .where(eq(directMessageConversationsTable.id, conversationId))
    .limit(1);
  return conversation;
};

const parseMetadata = (metadata: unknown): Record<string, unknown> => {
  if (!metadata) return {};
  if (typeof metadata === 'object' && metadata !== null) return metadata as Record<string, unknown>;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const getChannelIdFromConversation = (conversation: { metadata?: unknown } | null | undefined): string | null => {
  const metadata = parseMetadata(conversation?.metadata);
  const channelId = metadata.channelId;
  return typeof channelId === 'string' && channelId.length > 0 ? channelId : null;
};

const ensureConversationChannelId = async (
  db: ReturnType<typeof getDatabase>,
  conversation: { id: string; workspaceId: string; participant1Id: string; participant2Id: string; metadata?: unknown }
) => {
  const currentChannelId = getChannelIdFromConversation(conversation);
  if (currentChannelId) return currentChannelId;

  const [participant1] = await db.select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, conversation.participant1Id))
    .limit(1);
  const [participant2] = await db.select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, conversation.participant2Id))
    .limit(1);

  if (!participant1?.email || !participant2?.email) {
    throw new Error('Failed to resolve DM participants');
  }

  const channelId = createId();
  await db.insert(channelTable).values({
    id: channelId,
    name: `DM: ${participant1.email} & ${participant2.email}`,
    description: null,
    workspaceId: conversation.workspaceId,
    isPrivate: true,
    createdBy: participant1.email,
    isArchived: false,
    createdAt: new Date(),
  });

  await db.update(directMessageConversationsTable)
    .set({
      metadata: {
        ...parseMetadata(conversation.metadata),
        channelId,
      },
      updatedAt: new Date(),
    })
    .where(eq(directMessageConversationsTable.id, conversation.id));

  return channelId;
};

// @epic-4.1-direct-messaging: Get or create direct message conversation
directMessaging.post('/conversation', async (c) => {
  try {
    const db = getDatabase();
    const { userEmail, targetUserEmail, workspaceId } = await c.req.json();
    
    if (!userEmail || !targetUserEmail || !workspaceId) {
      return c.json({ error: 'Missing userEmail, targetUserEmail, or workspaceId' }, 400);
    }

    if (userEmail === targetUserEmail) {
      return c.json({ error: 'Cannot create conversation with yourself' }, 400);
    }

    // ✅ Convert emails to user IDs
    const [user1] = await db.select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
      
    const [user2] = await db.select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, targetUserEmail))
      .limit(1);

    if (!user1 || !user2) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if conversation already exists (using participant IDs, not emails)
    const existingConversations = await db
      .select()
      .from(directMessageConversationsTable)
      .where(
        or(
          and(
            eq(directMessageConversationsTable.participant1Id, user1.id),
            eq(directMessageConversationsTable.participant2Id, user2.id)
          ),
          and(
            eq(directMessageConversationsTable.participant1Id, user2.id),
            eq(directMessageConversationsTable.participant2Id, user1.id)
          )
        )
      )
      .limit(1);
    
    let conversation = existingConversations[0] || null;

    if (!conversation) {
      try {
        // Create new direct message channel
        const channelId = createId();
        const channelName = `DM: ${userEmail} & ${targetUserEmail}`;
        
        logger.debug('Creating channel with:', { name: channelName, workspaceId, createdBy: userEmail });
        
        // ✅ Use the workspace ID from the request parameter
        try {
          await db.insert(channelTable).values({
            id: channelId, // Use the generated channelId
            name: channelName,
            description: null,
            workspaceId: workspaceId, // ✅ Fixed: Use request parameter instead of hardcoded value
            isPrivate: true,
            createdBy: userEmail,
            isArchived: false,
            createdAt: new Date(),
          });
          logger.debug('Channel created successfully');
        } catch (channelError) {
          logger.error('❌ Error creating channel:', channelError);
          throw channelError;
        }

        logger.debug('Channel created successfully, creating conversation...');

        // Create conversation record (using participant IDs, not emails)
        try {
          const [newConversation] = await db.insert(directMessageConversationsTable).values({
            workspaceId: workspaceId, // ✅ Required field
            participant1Id: user1.id, // ✅ Use user ID, not email
            participant2Id: user2.id, // ✅ Use user ID, not email
            lastMessageAt: new Date(),
            metadata: { channelId },
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();
          logger.debug('Conversation created successfully:', newConversation);
          conversation = newConversation;
        } catch (conversationError) {
          logger.error('❌ Error creating conversation:', conversationError);
          throw conversationError;
        }
        logger.debug('Conversation created successfully:', conversation);
      } catch (error) {
        logger.error('❌ Error in conversation creation:', error);
        throw error;
      }
    }

    // Get recent messages for this conversation
    // Exclude isPinned column for now since it might not exist in the database
    const resolvedChannelId = await ensureConversationChannelId(db, conversation!);
    const messages = await db.select({
      id: messageTable.id,
      channelId: messageTable.channelId,
      userId: messageTable.userId,
      content: messageTable.content,
      messageType: messageTable.messageType,
      parentMessageId: messageTable.parentMessageId,
      mentions: messageTable.mentions,
      reactions: messageTable.reactions,
      attachments: messageTable.attachments,
      isEdited: messageTable.isEdited,
      editedAt: messageTable.editedAt,
      deletedAt: messageTable.deletedAt,
      createdAt: messageTable.createdAt,
    })
    .from(messageTable)
    .where(eq(messageTable.channelId, resolvedChannelId))
    .orderBy(desc(messageTable.createdAt))
    .limit(50);

    // ✅ Get user details for the conversation participants
    const [participant1Details] = await db.select({
      email: userTable.email,
      name: userTable.name,
      avatar: userTable.avatar,
    })
    .from(userTable)
    .where(eq(userTable.id, conversation!.participant1Id))
    .limit(1);

    const [participant2Details] = await db.select({
      email: userTable.email,
      name: userTable.name,
      avatar: userTable.avatar,
    })
    .from(userTable)
    .where(eq(userTable.id, conversation!.participant2Id))
    .limit(1);

    // ✅ Return conversation with user details for frontend compatibility
    return c.json({
      conversation: {
        ...conversation,
        user1Email: participant1Details?.email,
        user2Email: participant2Details?.email,
        user1Name: participant1Details?.name,
        user2Name: participant2Details?.name,
        user1Avatar: participant1Details?.avatar,
        user2Avatar: participant2Details?.avatar,
      },
      messages: messages.reverse(), // Return in chronological order
      channelId: resolvedChannelId
    });

  } catch (error) {
    logger.error('❌ Error creating/getting direct message conversation:', error);
    return c.json({ 
      error: 'Failed to create conversation',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// @epic-4.1-direct-messaging: Get user's direct message conversations
directMessaging.get('/conversations', async (c) => {
  try {
    // Use authenticated user's email if not provided
    const userEmail = c.req.query('userEmail') || c.get('userEmail');
    const workspaceId = c.req.query('workspaceId');

    if (!userEmail) {
      return c.json({ 
        message: "Direct Messaging API - User email required",
        error: 'Missing userEmail',
        howToUse: {
          queryParams: {
            userEmail: "User's email address (defaults to authenticated user)",
            workspaceId: "Workspace ID (optional)"
          },
          example: "/api/direct-messaging/conversations?userEmail=user@example.com"
        }
      }, 400);
    }

    // ✅ Demo mode disabled - return only real conversations from database
    // Production mode: Get real conversations from database
    const db = getDatabase();
    
    // Get user ID from email
    const [currentUser] = await db.select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!currentUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Query conversations where user is participant1 or participant2
    const conversations = await db
      .select()
      .from(directMessageConversationsTable)
      .where(
        and(
          or(
            eq(directMessageConversationsTable.participant1Id, currentUser.id),
            eq(directMessageConversationsTable.participant2Id, currentUser.id)
          ),
          workspaceId ? eq(directMessageConversationsTable.workspaceId, workspaceId) : sql`true`
        )
      )
      .orderBy(desc(directMessageConversationsTable.createdAt)); // Order by createdAt instead of lastMessageAt

    const participantIds = Array.from(
      new Set(
        conversations.flatMap((conv) => [conv.participant1Id, conv.participant2Id])
      )
    );

    const participants = participantIds.length
      ? await db
          .select({
            id: userTable.id,
            email: userTable.email,
            name: userTable.name,
            avatar: userTable.avatar,
          })
          .from(userTable)
          .where(inArray(userTable.id, participantIds))
      : [];

    const participantMap = new Map(
      participants.map((participant) => [participant.id, participant])
    );

    // ✅ Enrich conversations with user details (batched participant lookup)
    const enrichedConversations = conversations.map((conv) => {
      const participant1 = participantMap.get(conv.participant1Id);
      const participant2 = participantMap.get(conv.participant2Id);

      return {
        ...conv,
        user1Email: participant1?.email,
        user2Email: participant2?.email,
        user1Name: participant1?.name,
        user2Name: participant2?.name,
        user1Avatar: participant1?.avatar,
        user2Avatar: participant2?.avatar,
        // Add unread counts (TODO: implement proper unread tracking)
        unreadCount1: 0,
        unreadCount2: 0,
      };
    });

    logger.debug(`✅ Found ${enrichedConversations.length} conversations for user ${userEmail}`);
    return c.json({ conversations: enrichedConversations });

  } catch (error) {
    logger.error('❌ Error getting direct message conversations:', error);
    return c.json({ error: 'Failed to get conversations' }, 500);
  }
});

// @epic-4.1-direct-messaging: Get messages for a conversation by conversation ID
directMessaging.get('/:conversationId/messages', async (c) => {
  try {
    const db = getDatabase();
    const conversationId = c.req.param('conversationId');
    
    // 🔒 SECURITY: Enforce max pagination limits
    const requestedLimit = parseInt(c.req.query('limit') || '50');
    const limit = Math.min(requestedLimit, 100); // Max 100 messages per request
    const offset = Math.max(0, parseInt(c.req.query('offset') || '0')); // Prevent negative offset
    
    if (!conversationId) {
      return c.json({ error: 'Missing conversationId' }, 400);
    }

    const conversation = await getConversationById(db, conversationId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const channelId = await ensureConversationChannelId(db, conversation);
    const messages = await db.select()
      .from(messageTable)
      .where(eq(messageTable.channelId, channelId))
      .orderBy(desc(messageTable.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ 
      messages: messages.reverse(), // Return in chronological order
      channelId,
      conversationId
    });

  } catch (error) {
    logger.error('❌ Error getting messages:', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
});

// @epic-4.1-direct-messaging: Get messages for a conversation by channel ID
directMessaging.get('/messages/:channelId', async (c) => {
  try {
    const db = getDatabase();
    const channelId = c.req.param('channelId');
    
    if (!channelId) {
      return c.json({ error: 'Missing channelId' }, 400);
    }

    const messages = await db.select()
      .from(messageTable)
      .where(eq(messageTable.channelId, channelId))
      .orderBy(desc(messageTable.createdAt))
      .limit(50);

    return c.json({ 
      messages: messages.reverse(), // Return in chronological order
      channelId 
    });

  } catch (error) {
    logger.error('❌ Error getting messages:', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
});

// @epic-4.1-direct-messaging: Send a message
directMessaging.post('/send', async (c) => {
  try {
    const db = getDatabase();
    const {
      channelId: rawChannelId,
      conversationId,
      content,
      userEmail: rawUserEmail,
      messageType = 'text',
      attachments = [],
      parentMessageId,
    } = await c.req.json();
    const userEmail = rawUserEmail || c.get('userEmail');
    let channelId = rawChannelId;
    
    if (!content || !userEmail || (!channelId && !conversationId)) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Backward compatibility: allow FE to send conversationId.
    if (!channelId && conversationId) {
      const conversationById = await getConversationById(db, conversationId);
      if (conversationById) {
        channelId = await ensureConversationChannelId(db, conversationById);
      }
    }

    if (!channelId) {
      return c.json({ error: 'Conversation channel not found' }, 404);
    }

    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user?.id) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Create message
    const [message] = await db.insert(messageTable).values({
      id: createId(),
      channelId,
      userId: user.id,
      content,
      messageType,
      attachments,
      parentMessageId,
      createdAt: new Date(),
    }).returning();

    const [conversation] = await db
      .select({ id: directMessageConversationsTable.id })
      .from(directMessageConversationsTable)
      .where(sql`${directMessageConversationsTable.metadata} ->> 'channelId' = ${channelId}`)
      .limit(1);

    if (conversation) {
      await db.update(directMessageConversationsTable)
        .set({
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(directMessageConversationsTable.id, conversation.id));
    }

    return c.json({ message });

  } catch (error) {
    logger.error('❌ Error sending message:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// @epic-4.1-direct-messaging: Mark conversation as read
directMessaging.post('/mark-read', async (c) => {
  try {
    const db = getDatabase();
    const { channelId: rawChannelId, conversationId, userEmail: rawUserEmail } = await c.req.json();
    const userEmail = rawUserEmail || c.get('userEmail');
    let channelId = rawChannelId;
    
    if ((!channelId && !conversationId) || !userEmail) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (!channelId && conversationId) {
      const conversationById = await getConversationById(db, conversationId);
      if (conversationById) {
        channelId = await ensureConversationChannelId(db, conversationById);
      }
    }

    if (!channelId) {
      return c.json({ error: 'Conversation channel not found' }, 404);
    }

    // Update conversation unread count
    const [conversation] = await db
      .select()
      .from(directMessageConversationsTable)
      .where(sql`${directMessageConversationsTable.metadata} ->> 'channelId' = ${channelId}`)
      .limit(1);

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // Best-effort compatibility: only update timestamp where unread counters are unavailable.
    await db
      .update(directMessageConversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(directMessageConversationsTable.id, conversation.id));

    return c.json({ success: true });

  } catch (error) {
    logger.error('❌ Error marking conversation as read:', error);
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
});

// @epic-4.1-direct-messaging: Get online users for direct messaging
directMessaging.get('/online-users', async (c) => {
  try {
    const db = getDatabase();
    const workspaceId = c.req.query('workspaceId');
    
    if (!workspaceId) {
      return c.json({ error: 'Missing workspaceId' }, 400);
    }

    // Simple test query to check if database is working
    const userCount = await db.select({ count: sql`count(*)` }).from(userTable);
    
    // For now, return all users as online users (we'll add presence tracking later)
    const users = await db.select({
      userEmail: userTable.email,
      userName: userTable.name
    })
    .from(userTable)
    .orderBy(asc(userTable.name));

    // Add computed fields after the query
    const onlineUsers = users.map(user => ({
      email: user.userEmail,
      name: user.userName,
      isOnline: true, // Default to true for now
      status: 'online', // FE contract expects online/away/busy/offline
      lastSeen: new Date(),
      currentWorkspaceId: workspaceId
    }));

    return c.json({ 
      users: onlineUsers, // FE compatibility
      onlineUsers,
      userCount: userCount[0]?.count || 0,
      workspaceId 
    });

  } catch (error) {
    logger.error('❌ Error getting online users:', error);
    return c.json({ 
      error: 'Failed to get online users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// @epic-4.1-direct-messaging: Search users for direct messaging
directMessaging.get('/search-users', async (c) => {
  try {
    const db = getDatabase();
    const workspaceId = c.req.query('workspaceId');
    const query = c.req.query('query') || c.req.query('q') || '';
    const excludeUserEmail = c.req.query('excludeUserEmail');
    
    if (!workspaceId) {
      return c.json({ error: 'Missing workspaceId' }, 400);
    }

        // Search users by name or email
    const users = await db.select({
      email: userTable.email,
      name: userTable.name
    })
    .from(userTable)
    .where(
      query ? 
        or(
          sql`${userTable.name} LIKE ${`%${query}%`}`,
          sql`${userTable.email} LIKE ${`%${query}%`}`
        ) : 
        undefined
    )
    .orderBy(asc(userTable.name))
    .limit(20);

    // Add computed fields after the query
    const usersWithStatus = users
    .filter((user) => !excludeUserEmail || user.email !== excludeUserEmail)
    .map(user => ({
      ...user,
      isOnline: true, // Default to true for now
      status: 'online', // FE contract expects online/away/busy/offline
      lastSeen: new Date()
    }));

    return c.json({ users: usersWithStatus });

  } catch (error) {
    logger.error('❌ Error searching users:', error);
    return c.json({ error: 'Failed to search users' }, 500);
  }
});

// @epic-4.1-direct-messaging: Archive a conversation
directMessaging.post('/:conversationId/archive', async (c) => {
  try {
    const db = getDatabase();
    const conversationId = c.req.param('conversationId');
    if (!conversationId) {
      return c.json({ error: 'Missing conversationId' }, 400);
    }

    await db
      .update(directMessageConversationsTable)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(directMessageConversationsTable.id, conversationId));

    return c.json({ success: true });
  } catch (error) {
    logger.error('❌ Error archiving conversation:', error);
    return c.json({ error: 'Failed to archive conversation' }, 500);
  }
});

// @epic-4.1-direct-messaging: Delete a message
directMessaging.delete('/message/:messageId', async (c) => {
  try {
    const db = getDatabase();
    const messageId = c.req.param('messageId');
    const { userEmail: rawUserEmail } = await c.req.json().catch(() => ({ userEmail: undefined }));
    const userEmail = rawUserEmail || c.get('userEmail');

    if (!messageId || !userEmail) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user?.id) {
      return c.json({ error: 'User not found' }, 404);
    }

    await db
      .update(messageTable)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(messageTable.id, messageId), eq(messageTable.userId, user.id)));

    return c.json({ success: true });
  } catch (error) {
    logger.error('❌ Error deleting message:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
});

// @epic-4.1-direct-messaging: Edit a message
directMessaging.patch('/message/:messageId', async (c) => {
  try {
    const db = getDatabase();
    const messageId = c.req.param('messageId');
    const { content, userEmail: rawUserEmail } = await c.req.json();
    const userEmail = rawUserEmail || c.get('userEmail');

    if (!messageId || !content || !userEmail) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user?.id) {
      return c.json({ error: 'User not found' }, 404);
    }

    const [message] = await db
      .update(messageTable)
      .set({
        content,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(messageTable.id, messageId), eq(messageTable.userId, user.id)))
      .returning();

    if (!message) {
      return c.json({ error: 'Message not found or access denied' }, 404);
    }

    return c.json({ message });
  } catch (error) {
    logger.error('❌ Error editing message:', error);
    return c.json({ error: 'Failed to edit message' }, 500);
  }
});

// @epic-4.1-direct-messaging: Update user presence status
directMessaging.post('/presence', async (c) => {
  try {
    const { userEmail, status, currentPage } = await c.req.json();
    if (!userEmail || !status) {
      return c.json({ error: 'Missing userEmail or status' }, 400);
    }

    return c.json({
      success: true,
      presence: {
        userEmail,
        status,
        currentPage: currentPage || 'direct-messaging',
        lastSeen: new Date(),
      },
    });
  } catch (error) {
    logger.error('❌ Error updating user presence:', error);
    return c.json({ error: 'Failed to update presence' }, 500);
  }
});



// @epic-4.1-direct-messaging: Get user presence status
directMessaging.get('/presence/:userEmail', async (c) => {
  try {
    const userEmail = c.req.param('userEmail');
    
    if (!userEmail) {
      return c.json({ error: 'Missing userEmail' }, 400);
    }

    // For now, return default presence status
    // Later this can be integrated with the userPresenceTable
    const presence = {
      userEmail,
      status: 'online' as const,
      lastSeen: new Date(),
      currentPage: 'direct-messaging',
      isTyping: false
    };

    return c.json({ presence });

  } catch (error) {
    logger.error('❌ Error getting user presence:', error);
    return c.json({ error: 'Failed to get user presence' }, 500);
  }
});

export default directMessaging; 
