/**
 * 📤 Send Slack Message Controller
 * 
 * Sends a message to a Slack channel or user
 * @epic-3.2-integrations
 */

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import { integrationConnectionTable } from "../../../database/schema";
import { SlackIntegration } from "../../services/slack-integration";
import logger from '../../../utils/logger';

const sendMessageSchema = z.object({
  integrationId: z.string(),
  channel: z.string(),
  message: z.string().min(1),
  isRichNotification: z.boolean().default(false),
  notification: z.object({
    title: z.string(),
    color: z.string().optional(),
    fields: z.array(z.object({
      title: z.string(),
      value: z.string(),
      short: z.boolean().optional()
    })).optional(),
    actions: z.array(z.object({
      type: z.string(),
      text: z.string(),
      url: z.string().optional(),
      value: z.string().optional()
    })).optional()
  }).optional()
});

export const sendSlackMessage = zValidator("json", sendMessageSchema, async (c) => {
  const db = getDatabase();
  
  try {
    const data = c.req.valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Get Slack integration
    const integration = await db.select()
      .from(integrationConnectionTable)
      .where(
        and(
          eq(integrationConnectionTable.id, data.integrationId),
          eq(integrationConnectionTable.workspaceId, workspaceId),
          eq(integrationConnectionTable.provider, "slack"),
          eq(integrationConnectionTable.isActive, true)
        )
      );

    if (!integration.length) {
      return c.json({ error: "Slack integration not found" }, 404);
    }

    const credentials = JSON.parse(integration[0].credentials || "{}");
    
    const slack = new SlackIntegration({
      botToken: credentials.botToken,
      userToken: credentials.userToken,
      signingSecret: credentials.signingSecret
    });

    let result;

    if (data.isRichNotification && data.notification) {
      // Send rich notification
      result = await slack.sendMeridianNotification(data.channel, {
        title: data.notification.title,
        message: data.message,
        color: data.notification.color,
        fields: data.notification.fields,
        actions: data.notification.actions
      });
    } else {
      // Send simple message
      result = await slack.sendMessage({
        channel: data.channel,
        text: data.message
      });
    }

    // Update integration metrics
    await db.update(integrationConnectionTable)
      .set({
        totalOperations: integration[0].totalOperations + 1,
        successfulOperations: integration[0].successfulOperations + 1,
        lastSyncAt: new Date()
      })
      .where(eq(integrationConnectionTable.id, data.integrationId));

    return c.json({
      success: true,
      message: "Message sent successfully",
      data: {
        messageId: result.ts,
        channel: result.channel
      }
    });

  } catch (error) {
    logger.error("Failed to send Slack message:", error);
    return c.json({ 
      error: "Failed to send Slack message",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}); 
