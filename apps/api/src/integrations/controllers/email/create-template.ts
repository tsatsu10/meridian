/**
 * 📝 Create Email Template Controller
 * 
 * Creates a new email template for automated notifications
 * @epic-3.2-integrations
 */

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { EmailIntegration } from "../../services/email-integration";
import logger from '../../../utils/logger';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  category: z.enum(["notification", "digest", "reminder", "welcome", "custom"]),
  variables: z.array(z.string()).optional()
});

export const createEmailTemplate = zValidator("json", createTemplateSchema, async (c) => {
  try {
    const data = c.req.valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Create email template
    const template = await EmailIntegration.createTemplate(
      workspaceId,
      userEmail,
      data
    );

    return c.json({
      success: true,
      message: "Email template created successfully",
      data: { template }
    });

  } catch (error) {
    logger.error("Failed to create email template:", error);
    return c.json({ 
      error: "Failed to create email template",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}); 
