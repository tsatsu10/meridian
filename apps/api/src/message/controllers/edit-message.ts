// @epic-3.1-messaging: Edit Message Controller
// @persona-sarah: PM needs to edit messages for corrections and updates
// @persona-david: Team lead needs to modify messages for clarity

import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getDatabase } from "../../database/connection";
import { messageTable } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { publishEvent } from "../../events";
// import { messageRateLimiter } from "../../utils/rate-limiter"; // TODO: Implement rate limiter
import logger from '../../utils/logger';

// Validation schema for message editing
export const editMessageSchema = z.object({
  content: z.string()
    .min(1, "Message content is required")
    .max(4000, "Message too long")
    .refine((content) => {
      // Security validation: check for dangerous patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /<link/i,
        /<meta/i,
        /data:text\/html/i,
        /vbscript:/i
      ];
      return !dangerousPatterns.some(pattern => pattern.test(content));
    }, "Message contains potentially unsafe content"),
});

export default async function editMessage(c: Context) {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    const messageId = c.req.param("messageId");
    
    if (!userEmail) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    if (!messageId) {
      throw new HTTPException(400, { message: "Message ID is required" });
    }

    // RATE LIMITING: TODO - Implement rate limiter
    /*
    const rateLimitCheck = messageRateLimiter.isAllowed(`edit_${userEmail}`);
    if (!rateLimitCheck.allowed) {
      const waitTime = rateLimitCheck.resetTime ? Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000) : 60;
      throw new HTTPException(429, { 
        message: `Rate limit exceeded. Try again in ${waitTime} seconds.`,
      });
    }
    */

    // Validate request body
    const body = await c.req.json();
    const validation = editMessageSchema.safeParse(body);
    
    if (!validation.success) {
      throw new HTTPException(400, { 
        message: `Invalid request data: ${validation.error.issues.map(i => i.message).join(', ')}`,
      });
    }

    const { content } = validation.data;

    // First, verify the message exists and user has permission to edit it
    const existingMessage = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.id, messageId))
      .limit(1);

    if (existingMessage.length === 0) {
      throw new HTTPException(404, { message: "Message not found" });
    }

    const message = existingMessage[0];

    // Check if user is the author of the message
    if (message.userEmail !== userEmail) {
      throw new HTTPException(403, { message: "You can only edit your own messages" });
    }

    // Check if message is too old to edit (24 hours limit)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours
    if (messageAge > maxEditAge) {
      throw new HTTPException(403, { message: "Message is too old to edit (24 hour limit)" });
    }

    // Update the message
    const updatedMessage = await db
      .update(messageTable)
      .set({
        content: content.trim(),
        editedAt: new Date().toISOString(),
        isEdited: true,
      })
      .where(eq(messageTable.id, messageId))
      .returning();

    if (updatedMessage.length === 0) {
      throw new HTTPException(500, { message: "Failed to update message" });
    }

    const result = updatedMessage[0];

    // Publish real-time event for message edit
    await publishEvent("chat:message:edited", {
      messageId: result.id,
      channelId: result.channelId,
      content: result.content,
      editedAt: result.editedAt,
      editedBy: userEmail,
      originalAuthor: result.userEmail,
    });

    logger.info(`✏️ Message edited: ${result.id} by ${userEmail} in channel ${result.channelId}`);

    return c.json({
      success: true,
      message: result,
      editedAt: result.editedAt,
    });

  } catch (error) {
    logger.error('❌ Edit message error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(500, { 
      message: "Failed to edit message",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

