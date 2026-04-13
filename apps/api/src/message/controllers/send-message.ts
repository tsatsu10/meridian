// @epic-3.1-messaging: Send Message Controller - Phase 1 Implementation
// @persona-sarah: PM needs to send messages for project coordination
// @persona-david: Team lead needs to communicate with team members

import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDatabase } from "../../database/connection";
import { messageTable, channelTable, channelMembershipTable, userTable } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { publishEvent } from "../../events";
import { sql } from "drizzle-orm";
import logger from '../../utils/logger';
import getSettings from '../../utils/get-settings';
import { createId } from '@paralleldrive/cuid2';
import { checkRateLimit, RATE_LIMITS } from '../../middlewares/chat-rate-limiter';
import { sanitizeMessage } from '../../lib/chat-sanitization';
import { captureException, addBreadcrumb } from '../../services/monitoring/sentry';

// Validation schema for message creation
export const sendMessageSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  content: z.string().min(1, "Message content is required").max(4000, "Message too long"),
  messageType: z.enum(["text", "file", "system"]).default("text"),
  parentMessageId: z.string().optional(),
  mentions: z.array(z.string().email()).max(50, "Too many mentions").optional(), // 🔒 Max 50 mentions
  attachments: z.array(z.object({
    id: z.string().max(100),
    name: z.string().max(255),
    url: z.string().max(2000, "URL too long"),
    type: z.string().max(100),
    size: z.number().max(100 * 1024 * 1024, "File too large (max 100MB)"), // 🔒 100MB max
  })).max(10, "Too many attachments (max 10)").optional(), // 🔒 Max 10 attachments
});

export default async function sendMessage(c: Context) {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    const userId = c.get("userId");
    
    if (!userEmail || !userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    // 🔒 SECURITY: Rate limit message sending (20 messages per minute)
    try {
      await checkRateLimit(userId, RATE_LIMITS.SEND_MESSAGE);
    } catch (rateLimitError) {
      if (rateLimitError instanceof HTTPException) {
        throw rateLimitError;
      }
      throw new HTTPException(429, { message: 'Too many messages. Please slow down.' });
    }

    // Validate request body
    const body = await c.req.json();
    const validation = sendMessageSchema.safeParse(body);
    
    if (!validation.success) {
      throw new HTTPException(400, { 
        message: `Invalid request data: ${validation.error.issues.map(i => i.message).join(', ')}`,
      });
    }

    let { channelId, content, messageType, parentMessageId, mentions, attachments } = validation.data;

    // 🔒 SECURITY: Sanitize all user inputs to prevent XSS
    const sanitized = sanitizeMessage({ content, mentions, attachments });
    content = sanitized.content;
    mentions = sanitized.mentions;
    attachments = sanitized.attachments;

    // Additional validation after sanitization
    if (!content || content.length === 0) {
      throw new HTTPException(400, { message: "Message content cannot be empty after sanitization" });
    }

    // Demo mode support - return mock message immediately
    const { isDemoMode } = getSettings();
    if (isDemoMode && (channelId.startsWith('demo-channel-') || channelId.startsWith('channel-'))) {
      logger.info(`🔧 Demo mode: Sending mock message to channel ${channelId}`);
      
      // Get user info for the message
      const db = getDatabase();
      let userName = 'You';
      
      try {
        const [userData] = await db
          .select({ name: userTable.name })
          .from(userTable)
          .where(eq(userTable.email, userEmail))
          .limit(1);
        
        if (userData) {
          userName = userData.name;
        }
      } catch (err) {
        // If user lookup fails, just use default
        userName = userEmail.split('@')[0];
      }
      
      const mockMessage = {
        id: createId(),
        channelId,
        userEmail,
        userName,
        content: content.trim(),
        messageType,
        parentMessageId: parentMessageId || null,
        mentions: mentions || [],
        reactions: [],
        attachments: attachments || [],
        isEdited: false,
        editedAt: null,
        isPinned: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        threadMessageCount: 0,
        threadParticipantCount: 0,
        threadLastReplyAt: null,
        threadPreview: null,
        threadStatus: null
      };
      
      // In demo mode, we still broadcast via WebSocket if available
      try {
        await publishEvent('message:created', {
          message: mockMessage,
          channelId,
          workspaceId: 'demo-workspace',
        });
      } catch (wsError) {
        // WebSocket is optional in demo mode
        logger.debug('WebSocket not available in demo mode:', wsError);
      }
      
      return c.json({ 
        success: true,
        message: mockMessage,
        data: { message: mockMessage }
      }, 201);
    }

    // Validate channel access
    const hasAccess = await validateChannelAccess(userEmail, channelId);
    if (!hasAccess) {
      logger.warn(`User ${userEmail} attempted to send message to channel ${channelId} without access`);
      throw new HTTPException(403, { message: "Access denied to this channel" });
    }

    // Validate parent message if specified
    if (parentMessageId) {
      const parentMessage = await db
        .select({ id: messageTable.id })
        .from(messageTable)
        .where(
          and(
            eq(messageTable.id, parentMessageId),
            eq(messageTable.channelId, channelId)
          )
        )
        .limit(1);

      if (parentMessage.length === 0) {
        throw new HTTPException(400, { message: "Parent message not found in this channel" });
      }
    }

    // Validate mentions - check if mentioned users exist and have access
    if (mentions && mentions.length > 0) {
      const validMentions = await validateMentions(mentions, channelId);
      if (validMentions.length !== mentions.length) {
        throw new HTTPException(400, { message: "Some mentioned users are invalid or don't have access" });
      }
    }

    // Create message in database
    const messageResult = await db
      .insert(messageTable)
      .values({
        channelId,
        userId,
        content: content.trim(),
        messageType,
        parentMessageId,
        mentions: mentions || [],
        attachments: attachments || [],
      })
      .returning();

    const newMessage = messageResult[0];
    if (!newMessage) {
      throw new HTTPException(500, { message: "Failed to create message" });
    }

    // Get user information for response
    const user = await db
      .select({
        email: userTable.email,
        name: userTable.name,
      })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    // Prepare response data
    const responseMessage = {
      ...newMessage,
      mentions: mentions || [],
      attachments: attachments || [],
      user: user[0] || { email: userEmail, name: "Unknown User" },
    };

    // 📊 SENTRY: Add breadcrumb for successful message send
    addBreadcrumb('Message sent successfully', 'chat', 'info', {
      channelId,
      messageId: newMessage.id,
      messageType,
      hasMentions: mentions && mentions.length > 0,
      hasAttachments: attachments && attachments.length > 0,
    });

    // Publish event for real-time delivery via WebSocket
    await publishEvent('chat:message_sent', {
      messageId: newMessage.id,
      channelId,
      userEmail,
      message: responseMessage,
    });

    // Handle mentions notifications
    if (mentions && mentions.length > 0) {
      await publishEvent('chat:users_mentioned', {
        messageId: newMessage.id,
        channelId,
        mentionedUsers: mentions,
        mentionedBy: userEmail,
        content: content.substring(0, 100), // First 100 chars for notification
      });
    }

    return c.json({
      success: true,
      data: {
        message: responseMessage,
      },
    }, 201);

  } catch (error) {
    logger.error("Error sending message:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userEmail: c.get('userEmail'),
    });
    
    // 📊 SENTRY: Capture chat errors for monitoring
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'chat',
        action: 'send_message',
        channelId: (error as any).channelId,
        userEmail: c.get('userEmail'),
        messageType: (error as any).messageType,
      });
    }
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { 
      message: error instanceof Error ? error.message : "Failed to send message" 
    });
  }
}

// Helper function to validate channel access
async function validateChannelAccess(userEmail: string, channelId: string): Promise<boolean> {
  try {
    const db = getDatabase();
    
    // Check if user is a member of the channel
    const membership = await db
      .select()
      .from(channelMembershipTable)
      .where(
        and(
          eq(channelMembershipTable.channelId, channelId),
          eq(channelMembershipTable.userEmail, userEmail)
        )
      )
      .limit(1);

    if (membership.length > 0) return true;

    // Check if it's a public channel
    const channel = await db
      .select({
        isPrivate: channelTable.isPrivate,
        workspaceId: channelTable.workspaceId,
      })
      .from(channelTable)
      .where(eq(channelTable.id, channelId))
      .limit(1);

    if (channel.length === 0) return false;

    // For public channels, allow access (workspace membership would be checked here)
    if (channel[0] && channel[0].isPrivate === false) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error validating channel access:', error);
    return false;
  }
}

// Helper function to validate mentions
async function validateMentions(mentions: string[], channelId: string): Promise<string[]> {
  try {
    const db = getDatabase();
    
    if (mentions.length === 0) {
      return [];
    }
    
    // Use inArray for safe SQL query instead of string interpolation
    const { inArray } = await import('drizzle-orm');
    const validUsers = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(inArray(userTable.email, mentions));

    // For now, return all valid users
    // In a more sophisticated system, we'd also check channel access for each user
    return validUsers.map(user => user.email);
  } catch (error) {
    logger.error('Error validating mentions:', error);
    return [];
  }
} 
