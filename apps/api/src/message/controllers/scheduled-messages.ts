// @epic-3.1-messaging: Scheduled messages controller
// @persona-sarah: PM needs to schedule messages for team coordination
// @persona-david: Team lead needs to schedule reminders and announcements

import { Context } from "hono";
import MessageScheduler from "../../services/message-scheduler";
import { z } from "zod";
import logger from '../../utils/logger';

// Validation schemas
const scheduleMessageSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  content: z.string().min(1, "Message content is required"),
  messageType: z.enum(["text", "file", "system"]).optional().default("text"),
  parentMessageId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.any()).optional(),
  scheduledFor: z.string().datetime("Invalid scheduled date format"),
  timezone: z.string().min(1, "Timezone is required"),
  maxRetries: z.number().min(0).max(10).optional().default(3),
});

const updateScheduledMessageSchema = z.object({
  content: z.string().min(1).optional(),
  messageType: z.enum(["text", "file", "system"]).optional(),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.any()).optional(),
  scheduledFor: z.string().datetime().optional(),
  timezone: z.string().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
});

/**
 * Schedule a new message
 */
export async function scheduleMessage(c: Context) {
  const userEmail = c.get("userEmail");
  
  try {
    const body = await c.req.json();
    const validatedData = scheduleMessageSchema.parse(body);

    const scheduledId = await MessageScheduler.scheduleMessage({
      channelId: validatedData.channelId,
      userEmail,
      content: validatedData.content,
      messageType: validatedData.messageType,
      parentMessageId: validatedData.parentMessageId,
      mentions: validatedData.mentions,
      attachments: validatedData.attachments,
      scheduledFor: new Date(validatedData.scheduledFor),
      timezone: validatedData.timezone,
      maxRetries: validatedData.maxRetries,
    });

    return c.json({
      success: true,
      scheduledMessageId: scheduledId,
      scheduledFor: validatedData.scheduledFor,
      timezone: validatedData.timezone,
    }, 201);

  } catch (error) {
    logger.error("❌ Error scheduling message:", error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        error: "Validation failed",
        details: error.errors,
      }, 400);
    }

    return c.json({
      error: error instanceof Error ? error.message : "Failed to schedule message",
    }, 500);
  }
}

/**
 * Get user's scheduled messages
 */
export async function getUserScheduledMessages(c: Context) {
  const userEmail = c.get("userEmail");
  const status = c.req.query("status"); // pending, sent, failed, cancelled
  
  try {
    const messages = await MessageScheduler.getUserScheduledMessages(userEmail, status);

    return c.json({
      scheduledMessages: messages,
      count: messages.length,
      status: status || "all",
    });

  } catch (error) {
    logger.error("❌ Error getting scheduled messages:", error);
    return c.json({
      error: "Failed to get scheduled messages",
    }, 500);
  }
}

/**
 * Get scheduled messages for a channel
 */
export async function getChannelScheduledMessages(c: Context) {
  const userEmail = c.get("userEmail");
  const channelId = c.req.param("channelId");
  const status = c.req.query("status");
  
  try {
    // TODO: Add channel access validation
    const messages = await MessageScheduler.getChannelScheduledMessages(channelId, status);

    return c.json({
      scheduledMessages: messages,
      channelId,
      count: messages.length,
      status: status || "all",
    });

  } catch (error) {
    logger.error("❌ Error getting channel scheduled messages:", error);
    return c.json({
      error: "Failed to get channel scheduled messages",
    }, 500);
  }
}

/**
 * Update a scheduled message
 */
export async function updateScheduledMessage(c: Context) {
  const userEmail = c.get("userEmail");
  const messageId = c.req.param("messageId");
  
  try {
    const body = await c.req.json();
    const validatedData = updateScheduledMessageSchema.parse(body);

    const updateData: any = {};
    
    if (validatedData.content !== undefined) updateData.content = validatedData.content;
    if (validatedData.messageType !== undefined) updateData.messageType = validatedData.messageType;
    if (validatedData.mentions !== undefined) updateData.mentions = validatedData.mentions;
    if (validatedData.attachments !== undefined) updateData.attachments = validatedData.attachments;
    if (validatedData.maxRetries !== undefined) updateData.maxRetries = validatedData.maxRetries;
    
    if (validatedData.scheduledFor && validatedData.timezone) {
      updateData.scheduledFor = new Date(validatedData.scheduledFor);
      updateData.timezone = validatedData.timezone;
    }

    const success = await MessageScheduler.updateScheduledMessage(messageId, userEmail, updateData);

    if (!success) {
      return c.json({
        error: "Scheduled message not found or cannot be updated",
      }, 404);
    }

    return c.json({
      success: true,
      messageId,
      updated: Object.keys(updateData),
    });

  } catch (error) {
    logger.error("❌ Error updating scheduled message:", error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        error: "Validation failed",
        details: error.errors,
      }, 400);
    }

    return c.json({
      error: error instanceof Error ? error.message : "Failed to update scheduled message",
    }, 500);
  }
}

/**
 * Cancel a scheduled message
 */
export async function cancelScheduledMessage(c: Context) {
  const userEmail = c.get("userEmail");
  const messageId = c.req.param("messageId");
  
  try {
    const success = await MessageScheduler.cancelScheduledMessage(messageId, userEmail);

    if (!success) {
      return c.json({
        error: "Scheduled message not found or cannot be cancelled",
      }, 404);
    }

    return c.json({
      success: true,
      messageId,
      status: "cancelled",
    });

  } catch (error) {
    logger.error("❌ Error cancelling scheduled message:", error);
    return c.json({
      error: "Failed to cancel scheduled message",
    }, 500);
  }
}

/**
 * Get a specific scheduled message
 */
export async function getScheduledMessage(c: Context) {
  const userEmail = c.get("userEmail");
  const messageId = c.req.param("messageId");
  
  try {
    const messages = await MessageScheduler.getUserScheduledMessages(userEmail);
    const message = messages.find(msg => msg.id === messageId);

    if (!message) {
      return c.json({
        error: "Scheduled message not found",
      }, 404);
    }

    return c.json({
      scheduledMessage: message,
    });

  } catch (error) {
    logger.error("❌ Error getting scheduled message:", error);
    return c.json({
      error: "Failed to get scheduled message",
    }, 500);
  }
}

/**
 * Get scheduling statistics
 */
export async function getSchedulingStats(c: Context) {
  try {
    const stats = await MessageScheduler.getSchedulingStats();

    return c.json({
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error("❌ Error getting scheduling stats:", error);
    return c.json({
      error: "Failed to get scheduling statistics",
    }, 500);
  }
}

