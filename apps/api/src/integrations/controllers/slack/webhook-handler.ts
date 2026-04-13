/**
 * 🪝 Slack Webhook Handler Controller
 * 
 * Handles incoming Slack webhook events and processes them
 * @epic-3.2-integrations
 */

import { SlackIntegration } from "../../services/slack-integration";
import logger from '../../../utils/logger';

export const handleSlackWebhook = async (c: any) => {
  try {
    const workspaceId = c.req.header("x-workspace-id");
    const signature = c.req.header("x-slack-signature");
    const timestamp = c.req.header("x-slack-request-timestamp");
    
    if (!workspaceId) {
      return c.json({ error: "Workspace ID required" }, 400);
    }

    const payload = await c.req.json();

    // Handle Slack webhook
    const result = await SlackIntegration.handleWebhook(
      workspaceId,
      payload,
      signature || "",
      timestamp || ""
    );

    // Return challenge for URL verification
    if (result.challenge) {
      return c.text(result.challenge);
    }

    return c.json({
      success: true,
      message: "Webhook processed successfully",
      data: result
    });

  } catch (error) {
    logger.error("Failed to handle Slack webhook:", error);
    return c.json({ 
      error: "Failed to handle Slack webhook",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}; 
