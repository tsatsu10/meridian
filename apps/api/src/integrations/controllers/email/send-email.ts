/**
 * 📤 Send Email Controller
 * 
 * Sends emails using configured SMTP settings
 * @epic-3.2-integrations
 */

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../../database/connection";
import { integrationConnectionTable } from "../../../database/schema";
import { EmailIntegration } from "../../services/email-integration";
import logger from '../../../utils/logger';

const sendEmailSchema = z.object({
  integrationId: z.string(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  templateId: z.string().optional(),
  templateData: z.record(z.any()).optional()
});

export const sendEmail = zValidator("json", sendEmailSchema, async (c) => {
  const db = getDatabase();
  
  try {
    const data = c.req.valid("json");
    const workspaceId = c.req.header("x-workspace-id");
    const userEmail = c.req.header("x-user-email");

    if (!workspaceId || !userEmail) {
      return c.json({ error: "Workspace ID and user email required" }, 400);
    }

    // Get email integration
    const integration = await db.select()
      .from(integrationConnectionTable)
      .where(
        and(
          eq(integrationConnectionTable.id, data.integrationId),
          eq(integrationConnectionTable.workspaceId, workspaceId),
          eq(integrationConnectionTable.provider, "email"),
          eq(integrationConnectionTable.isActive, true)
        )
      );

    if (!integration.length) {
      return c.json({ error: "Email integration not found" }, 404);
    }

    const config = JSON.parse(integration[0].config);
    const credentials = JSON.parse(integration[0].credentials || "{}");

    const emailService = new EmailIntegration({
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: credentials.auth,
      from: {
        name: config.fromName,
        email: config.fromEmail
      },
      replyTo: config.replyTo
    });

    // Send email
    const result = await emailService.sendEmail({
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      html: data.html,
      text: data.text,
      templateId: data.templateId,
      templateData: data.templateData
    });

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
      message: "Email sent successfully",
      data: {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      }
    });

  } catch (error) {
    logger.error("Failed to send email:", error);
    return c.json({ 
      error: "Failed to send email",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}); 
