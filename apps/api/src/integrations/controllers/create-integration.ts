/**
 * 🔌 Create Integration Controller
 * 
 * Creates a new integration connection for third-party services
 * @epic-3.2-integrations
 */

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { IntegrationManager } from "../services/integration-manager";
import logger from '../../utils/logger';

const createIntegrationSchema = z.object({
  provider: z.enum(["github", "slack", "email", "webhook", "discord", "jira", "ipstack", "openweathermap", "unsplash"]),
  name: z.string().min(1).max(100),
  config: z.record(z.any()),
  credentials: z.record(z.any()).optional()
});

export const createIntegration = zValidator("json", createIntegrationSchema, async (c) => {
  try {
    const data = c.req.valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Create integration
    const integration = await IntegrationManager.createIntegration(
      workspaceId,
      userEmail,
      {
        provider: data.provider,
        name: data.name,
        config: data.config,
        credentials: data.credentials
      }
    );

    return c.json({
      success: true,
      message: "Integration created successfully",
      data: {
        ...integration,
        credentials: null // Never return credentials
      }
    });

  } catch (error) {
    logger.error("Failed to create integration:", error);
    return c.json({ 
      error: "Failed to create integration",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}); 
