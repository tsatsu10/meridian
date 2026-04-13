// @epic-3.1-messaging: Get messages for a channel
import { Hono } from "hono";
import { and, eq, or, desc, asc, isNull } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { messageTable, userTable } from "../../database/schema";
import { sql } from "drizzle-orm";
import logger from '../../utils/logger';
import getSettings from '../../utils/get-settings';

const getMessages = async (c: any) => {
  const db = getDatabase();
  const channelId = c.req.param("channelId");
  const userEmail = c.get("userEmail");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const before = c.req.query("before"); // Message ID to get messages before
  const after = c.req.query("after"); // Message ID to get messages after
  const includeThreads = c.req.query("includeThreads") === "true";

  try {
    logger.debug(`🔍 Fetching messages for channel: ${channelId}, user: ${userEmail}`);
    
    // Demo mode mock data ONLY for demo-channel-* (not real channels or DMs)
    const { isDemoMode } = getSettings();
    if (isDemoMode && channelId.startsWith('demo-channel-')) {
      logger.info(`🔧 Demo mode: Returning mock messages for demo channel ${channelId}`);
      
      const conversationMap: Record<string, any[]> = {
        'demo-channel-1': [
          {
            id: 'msg-1-1',
            content: 'Hey! Did you finish the project plan?',
            messageType: 'text',
            userEmail: 'sarah.johnson@example.com',
            userName: 'Sarah Johnson',
            parentMessageId: null,
            mentions: [],
            reactions: [],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          },
          {
            id: 'msg-1-2',
            content: 'Yes! Just submitted it for review. Should hear back by tomorrow.',
            messageType: 'text',
            userEmail,
            userName: 'You',
            parentMessageId: null,
            mentions: [],
            reactions: [{ emoji: '👍', users: ['sarah.johnson@example.com'], count: 1 }],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          },
          {
            id: 'msg-1-3',
            content: 'Perfect! Can you also share the timeline we discussed?',
            messageType: 'text',
            userEmail: 'sarah.johnson@example.com',
            userName: 'Sarah Johnson',
            parentMessageId: null,
            mentions: [userEmail],
            reactions: [],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          }
        ],
        'demo-channel-2': [
          {
            id: 'msg-2-1',
            content: 'The new feature is looking great! 🎉',
            messageType: 'text',
            userEmail: 'david.chen@example.com',
            userName: 'David Chen',
            parentMessageId: null,
            mentions: [],
            reactions: [{ emoji: '🎉', users: [userEmail], count: 1 }],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          },
          {
            id: 'msg-2-2',
            content: 'Thanks for the update! 👍',
            messageType: 'text',
            userEmail,
            userName: 'You',
            parentMessageId: null,
            mentions: [],
            reactions: [],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          }
        ],
        'demo-channel-3': [
          {
            id: 'msg-3-1',
            content: 'Let\'s schedule a meeting for next week to discuss the roadmap',
            messageType: 'text',
            userEmail: 'emily.rodriguez@example.com',
            userName: 'Emily Rodriguez',
            parentMessageId: null,
            mentions: [userEmail],
            reactions: [],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          }
        ],
        // Mock messages for default channels
        'channel-general': [
          {
            id: 'msg-gen-1',
            content: 'Welcome to the general channel! 🎉',
            messageType: 'system',
            userEmail: 'system@meridian.app',
            userName: 'Meridian System',
            parentMessageId: null,
            mentions: [],
            reactions: [],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: true,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          },
          {
            id: 'msg-gen-2',
            content: 'Hey team! Quick reminder about our sprint planning meeting tomorrow at 10 AM',
            messageType: 'text',
            userEmail: 'sarah.johnson@example.com',
            userName: 'Sarah Johnson',
            parentMessageId: null,
            mentions: [],
            reactions: [{ emoji: '👍', users: ['david.chen@example.com', userEmail], count: 2 }],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          },
          {
            id: 'msg-gen-3',
            content: 'Perfect! I\'ll prepare the roadmap for review',
            messageType: 'text',
            userEmail: 'david.chen@example.com',
            userName: 'David Chen',
            parentMessageId: null,
            mentions: ['sarah.johnson@example.com'],
            reactions: [],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          }
        ],
        'channel-random': [
          {
            id: 'msg-rand-1',
            content: 'Anyone up for coffee? ☕',
            messageType: 'text',
            userEmail: 'emily.rodriguez@example.com',
            userName: 'Emily Rodriguez',
            parentMessageId: null,
            mentions: [],
            reactions: [{ emoji: '☕', users: ['david.chen@example.com'], count: 1 }],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: false,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          }
        ],
        'channel-announcements': [
          {
            id: 'msg-ann-1',
            content: '📢 New feature release: Dark mode is now available! Toggle it in settings.',
            messageType: 'text',
            userEmail: 'admin@meridian.app',
            userName: 'Meridian Admin',
            parentMessageId: null,
            mentions: [],
            reactions: [{ emoji: '🎉', users: ['sarah.johnson@example.com', 'david.chen@example.com', 'emily.rodriguez@example.com'], count: 3 }],
            attachments: [],
            isEdited: false,
            editedAt: null,
            isPinned: true,
            deletedAt: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            threadMessageCount: 0,
            threadParticipantCount: 0,
            threadLastReplyAt: null,
            threadPreview: null,
            threadStatus: null
          }
        ]
      };
      
      // Try to match channel ID - support both demo-channel-X and channel-name-workspaceId formats
      let mockMessages: any[] = [];
      
      if (channelId.startsWith('demo-channel-')) {
        const channelNum = channelId.replace('demo-channel-', '');
        mockMessages = conversationMap[`demo-channel-${channelNum}`] || [];
      } else if (channelId.includes('channel-general')) {
        mockMessages = conversationMap['channel-general'] || [];
      } else if (channelId.includes('channel-random')) {
        mockMessages = conversationMap['channel-random'] || [];
      } else if (channelId.includes('channel-announcements')) {
        mockMessages = conversationMap['channel-announcements'] || [];
      }
      
      return c.json({ 
        messages: mockMessages,
        pagination: {
          limit,
          offset,
          hasMore: false
        }
      });
    }

    // Build where conditions (channelId filtering is done in the main query)
    let whereConditions: any[] = [];

    if (before) {
      whereConditions.push(sql`${messageTable.createdAt} < (SELECT created_at FROM messages WHERE id = ${before})`);
    }

    if (after) {
      whereConditions.push(sql`${messageTable.createdAt} > (SELECT created_at FROM messages WHERE id = ${after})`);
    }

    // Thread functionality not implemented in current schema
    // Keeping this comment for future implementation
    // if (!includeThreads) {
    //   whereConditions.push(isNull(messageTable.parentMessageId));
    // }

    // Get messages with user information
    // NOTE: messages table currently uses channelId/userId (not conversationId/authorId)
    const messages = await db
      .select({
        id: messageTable.id,
        content: messageTable.content,
        userEmail: userTable.email,
        userName: userTable.name,
        reactions: messageTable.reactions,
        isEdited: messageTable.isEdited,
        editedAt: messageTable.editedAt,
        deletedAt: messageTable.deletedAt,
        createdAt: messageTable.createdAt,
        // Keep response shape expected by web chat client
        channelId: messageTable.channelId,
        // Set default values for fields that don't exist in current schema
        messageType: sql<string>`'text'`.as('messageType'),
        parentMessageId: sql<string | null>`NULL`.as('parentMessageId'),
        mentions: sql<any>`'[]'::jsonb`.as('mentions'),
        attachments: sql<any>`'[]'::jsonb`.as('attachments'),
        isPinned: sql<boolean>`false`.as('isPinned'),
        threadMessageCount: sql<number>`0`.as('threadMessageCount'),
        threadParticipantCount: sql<number>`0`.as('threadParticipantCount'),
        threadLastReplyAt: sql<Date | null>`NULL`.as('threadLastReplyAt'),
        threadPreview: sql<string | null>`NULL`.as('threadPreview'),
        threadStatus: sql<string | null>`NULL`.as('threadStatus'),
      })
      .from(messageTable)
      .leftJoin(userTable, eq(messageTable.userId, userTable.id))
      .where(whereConditions.length > 0 
        ? and(eq(messageTable.channelId, channelId), ...whereConditions)
        : eq(messageTable.channelId, channelId))
      .orderBy(desc(messageTable.createdAt))
      .limit(limit)
      .offset(offset);

    logger.debug(`✅ Found ${messages.length} messages for channel ${channelId}`);

    // Filter out deleted messages
    const activeMessages = messages.filter(msg => !msg.deletedAt);

    return c.json({ 
      messages: activeMessages,
      pagination: {
        limit,
        offset,
        hasMore: activeMessages.length === limit,
      }
    });
  } catch (error) {
    logger.error("❌ Error fetching messages:", error);
    logger.error("Stack trace:", error instanceof Error ? error.stack : 'Unknown error');
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
};

export default getMessages; 
