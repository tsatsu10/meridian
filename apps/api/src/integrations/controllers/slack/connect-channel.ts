/**
 * 💬 Connect Slack Channel Controller
 * 
 * Connects a Slack workspace and channel to Meridian for notifications
 * @epic-3.2-integrations
 */

import { Context } from "hono";
import { z } from "zod";
import { SlackIntegration } from "../../services/slack-integration";
import logger from '../../../utils/logger';

const connectSlackSchema = z.object({
  botToken: z.string().min(1),
  userToken: z.string().optional(),
  signingSecret: z.string().min(1),
  teamName: z.string().optional(),
  defaultChannel: z.string().optional(),
  features: z.object({
    channelNotifications: z.boolean().default(true),
    directMessages: z.boolean().default(true),
    channelCreation: z.boolean().default(false),
    fileSharing: z.boolean().default(false)
  }).optional()
});

export const connectSlackChannel = async (c: Context) => {
  try {
    // Validate the request body
    const body = await c.req.json();
    const validation = connectSlackSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({ error: "Invalid request data", details: validation.error }, 400);
    }

    const data = validation.data;
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Connect Slack workspace
    const result = await SlackIntegration.connectWorkspace(
      workspaceId,
      userEmail,
      {
        botToken: data.botToken,
        userToken: data.userToken,
        signingSecret: data.signingSecret,
        teamName: data.teamName,
        defaultChannel: data.defaultChannel,
        features: data.features
      }
    );

    if (!result.success) {
      return c.json({
        error: "Failed to connect Slack workspace",
        details: result.error
      }, 400);
    }

    return c.json({
      success: true,
      message: "Slack workspace connected successfully",
      data: {
        integrationId: result.integrationId,
        channels: result.channels
      }
    });

  } catch (error) {
    logger.error("Error connecting Slack workspace:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}; 
