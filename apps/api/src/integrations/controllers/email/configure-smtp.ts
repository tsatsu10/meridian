/**
 * 📧 Configure SMTP Controller
 * 
 * Configures SMTP email settings for workspace
 * @epic-3.2-integrations
 */

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { EmailIntegration } from "../../services/email-integration";
import logger from '../../../utils/logger';

const smtpConfigSchema = z.object({
  provider: z.enum(["smtp", "ses", "sendgrid", "mailgun"]),
  host: z.string().min(1).optional(),
  port: z.number().min(1).max(65535).optional(),
  secure: z.boolean().default(false),
  auth: z.object({
    user: z.string().min(1),
    pass: z.string().min(1)
  }),
  from: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  replyTo: z.string().email().optional()
});

export const configureSMTP = zValidator("json", smtpConfigSchema, async (c) => {
  try {
    const data = c.req.valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Configure email integration
    const result = await EmailIntegration.configureEmail(
      workspaceId,
      userEmail,
      data
    );

    return c.json({
      success: true,
      message: "Email configuration saved successfully",
      data: {
        integration: {
          ...result.integration,
          credentials: null // Never return credentials
        }
      }
    });

  } catch (error) {
    logger.error("Failed to configure SMTP:", error);
    return c.json({ 
      error: "Failed to configure SMTP",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}); 
