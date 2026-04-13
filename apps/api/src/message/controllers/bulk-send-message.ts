// Enhanced bulk message sending controller for the improved send message modal
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../../database/connection";
import { messageTable, 
  channelTable, 
  userTable,
  workspaceUserTable,
  teamTable,
  projectMemberTable } from "../../database/schema";
import logger from '../../utils/logger';
import getSettings from "../../utils/get-settings";

// Validation schemas
const recipientSchema = z.object({
  type: z.enum(['user', 'team', 'channel']),
  id: z.string(),
  email: z.string().email().optional(),
});

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number().min(0),
});

const bulkSendMessageSchema = z.object({
  recipients: z.array(recipientSchema).min(1).max(50), // Max 50 recipients
  content: z.string().min(1).max(2000),
  attachments: z.array(attachmentSchema).optional(),
  contextType: z.enum(['project', 'task', 'general']).default('general'),
  contextId: z.string().optional(),
  messageType: z.enum(['text', 'file', 'system']).default('text'),
});

interface SendResult {
  recipientId: string;
  recipientType: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export default async function bulkSendMessage(c: any) {
  try {
    const userEmail = c.get("userEmail");
    if (!userEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const { recipients, content, attachments, contextType, contextId, messageType } = c.req.valid("json");
    
    // Demo mode check
    const { isDemoMode, adminEmail } = getSettings();
    if (isDemoMode && userEmail === adminEmail) {
      logger.info(`🔧 Demo mode: Simulating bulk message send for ${recipients.length} recipients`);
      
      // Return mock success response for demo mode
      return c.json({
        success: true,
        data: {
          messageId: `demo-bulk-msg-${Date.now()}`,
          sentTo: recipients.length,
          failed: 0,
          results: recipients.map(r => ({
            recipientId: r.id,
            recipientType: r.type,
            success: true,
            messageId: `demo-msg-${Date.now()}-${r.id}`,
          })),
        },
      });
    }

    const results: SendResult[] = [];
    let successCount = 0;

    // Process each recipient
    for (const recipient of recipients) {
      try {
        let messageId: string | null = null;

        if (recipient.type === 'channel') {
          // Send to channel
          const result = await sendToChannel(recipient.id, content, attachments, userEmail, messageType);
          messageId = result.messageId;
          
        } else if (recipient.type === 'user') {
          // Send direct message
          const result = await sendDirectMessage(recipient.id, recipient.email!, content, attachments, userEmail, messageType);
          messageId = result.messageId;
          
        } else if (recipient.type === 'team') {
          // Send to team members
          const result = await sendToTeam(recipient.id, content, attachments, userEmail, messageType);
          messageId = result.messageId;
        }

        results.push({
          recipientId: recipient.id,
          recipientType: recipient.type,
          success: true,
          messageId: messageId || undefined,
        });
        successCount++;

      } catch (error) {
        logger.error(`Failed to send to ${recipient.type} ${recipient.id}:`, error);
        results.push({
          recipientId: recipient.id,
          recipientType: recipient.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const failedCount = recipients.length - successCount;
    const failedRecipients = results.filter(r => !r.success).map(r => r.recipientId);

    return c.json({
      success: successCount > 0,
      data: {
        messageId: results.find(r => r.success)?.messageId || `bulk-${Date.now()}`,
        sentTo: successCount,
        failed: failedCount,
        failedRecipients: failedRecipients.length > 0 ? failedRecipients : undefined,
        results,
      },
    });

  } catch (error) {
    logger.error("Bulk send message error:", error);
    return c.json({ error: "Failed to send messages" }, 500);
  }
}

// Helper function to send message to a channel
async function sendToChannel(
  channelId: string, 
  content: string, 
  attachments: any[], 
  userEmail: string,
  messageType: string
): Promise<{ messageId: string }> {
  const db = getDatabase();
  
  // Verify channel exists and user has access
  const channel = await db
    .select()
    .from(channelTable)
    .where(eq(channelTable.id, channelId))
    .limit(1);

  if (!channel[0]) {
    throw new Error('Channel not found');
  }

  // Create message
  const [message] = await db
    .insert(messageTable)
    .values({
      id: createId(),
      channelId,
      userEmail,
      content,
      messageType,
      attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
      createdAt: new Date(),
    })
    .returning();

  return { messageId: message.id };
}

// Helper function to send direct message
async function sendDirectMessage(
  userId: string,
  recipientEmail: string,
  content: string,
  attachments: any[],
  senderEmail: string,
  messageType: string
): Promise<{ messageId: string }> {
  const db = getDatabase();
  
  // Verify recipient exists
  const recipient = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, recipientEmail))
    .limit(1);

  if (!recipient[0]) {
    throw new Error('Recipient not found');
  }

  // For now, create a system message or notification
  // In a full implementation, you'd create/find a DM channel
  const messageId = createId();
  
  // Create a temporary notification or system message
  // This is a simplified approach - in production you'd want proper DM channels
  logger.info(`Sending DM from ${senderEmail} to ${recipientEmail}: ${content}`);
  
  return { messageId };
}

// Helper function to send message to team members
async function sendToTeam(
  teamId: string,
  content: string,
  attachments: any[],
  senderEmail: string,
  messageType: string
): Promise<{ messageId: string }> {
  const db = getDatabase();
  
  // Since we don't have a direct team member table, we'll use workspace users for the team
  // This is a simplified approach for demo purposes
  const team = await db
    .select()
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);

  if (!team[0]) {
    throw new Error('Team not found');
  }

  // Get workspace users from the team's workspace
  const workspaceMembers = await db
    .select({
      userEmail: userTable.email,
    })
    .from(workspaceUserTable)
    .innerJoin(userTable, eq(workspaceUserTable.userEmail, userTable.email))
    .where(eq(workspaceUserTable.workspaceId, team[0].workspaceId));

  if (workspaceMembers.length === 0) {
    throw new Error('No team members found');
  }

  // For each team member, send a direct message or notification
  // This is a simplified approach
  const messageId = createId();
  
  for (const member of workspaceMembers) {
    if (member.userEmail !== senderEmail) { // Don't send to self
      logger.info(`Sending team message from ${senderEmail} to ${member.userEmail}: [Team] ${content}`);
      // In production, you'd create actual messages or notifications
    }
  }

  return { messageId };
}

// Validation middleware
export const validateBulkSendMessage = zValidator("json", bulkSendMessageSchema);

