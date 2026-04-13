/**
 * 📋 Get Slack Channels Controller
 * 
 * Retrieves available Slack channels for a connected workspace
 * @epic-3.2-integrations
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import { integrationConnectionTable } from "../../../database/schema";
import { SlackIntegration } from "../../services/slack-integration";
import logger from '../../../utils/logger';

export const getSlackChannels = async (c: any) => {
  const db = getDatabase();
  
  try {
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    const integrationId = c.req.query("integrationId");
    if (!integrationId) {
      return c.json({ error: "Integration ID required" }, 400);
    }

    // Get Slack integration
    const integration = await db.select()
      .from(integrationConnectionTable)
      .where(
        and(
          eq(integrationConnectionTable.id, integrationId),
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

    // Get channels
    const channels = await slack.getChannels();

    return c.json({
      success: true,
      data: {
        channels: channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
          isArchived: channel.is_archived,
          purpose: channel.purpose?.value || "",
          topic: channel.topic?.value || ""
        }))
      }
    });

  } catch (error) {
    logger.error("Failed to get Slack channels:", error);
    return c.json({ 
      error: "Failed to get Slack channels",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
