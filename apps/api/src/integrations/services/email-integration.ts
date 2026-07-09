/**
 * 📧 Email Integration Service
 * 
 * Handles SMTP email configuration, template management, and automated
 * email notifications for Meridian workflows and user communications.
 * 
 * @epic-3.2-integrations
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { 
  integrationConnectionTable, 
  emailTemplatesTable,
  userTable,
  taskTable,
  projectTable
} from "../../database/schema";
import nodemailer from "nodemailer";
import * as handlebars from "handlebars";
import logger from '../../utils/logger';
import { parseIntegrationJsonField } from "../../lib/parse-integration-json";

// Email integration types
export interface EmailConfig {
  provider: "smtp" | "ses" | "sendgrid" | "mailgun";
  host?: string;
  port?: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: "notification" | "digest" | "reminder" | "welcome" | "custom";
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailDeliveryResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  response: string;
}

export class EmailIntegration {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = this.createMailTransport();
  }

  /**
   * Create nodemailer transporter based on configuration
   */
  private createMailTransport(): nodemailer.Transporter {
    switch (this.config.provider) {
      case "smtp":
        return nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port || 587,
          secure: this.config.secure || false,
          auth: this.config.auth,
          tls: {
            rejectUnauthorized: false // Allow self-signed certificates for development
          }
        });
      
      case "ses":
        // AWS SES SMTP endpoint (configure host/port in EmailConfig for production)
        return nodemailer.createTransport({
          host: this.config.host ?? "email-smtp.us-east-1.amazonaws.com",
          port: this.config.port ?? 587,
          secure: this.config.secure ?? false,
          auth: this.config.auth
        });
      
      case "sendgrid":
        return nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: "apikey",
            pass: this.config.auth.pass // SendGrid API key
          }
        });
      
      case "mailgun":
        return nodemailer.createTransport({
          service: "Mailgun",
          auth: this.config.auth
        });
      
      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      };
    }
  }

  /**
   * Send email message
   */
  async sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      let htmlContent = message.html;
      let textContent = message.text;
      let subject = message.subject;

      // Process template if templateId is provided
      if (message.templateId) {
        const template = await this.getTemplate(message.templateId);
        if (template) {
          const templateData = message.templateData || {};
          
          // Compile and render template
          const htmlTemplate = handlebars.compile(template.htmlContent);
          const subjectTemplate = handlebars.compile(template.subject);
          
          htmlContent = htmlTemplate(templateData);
          subject = subjectTemplate(templateData);

          if (template.textContent) {
            const textTemplate = handlebars.compile(template.textContent);
            textContent = textTemplate(templateData);
          }
        }
      }

      const mailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc.join(", ") : message.cc) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.join(", ") : message.bcc) : undefined,
        subject,
        html: htmlContent,
        text: textContent,
        replyTo: this.config.replyTo,
        attachments: message.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        messageId: result.messageId,
        accepted: result.accepted || [],
        rejected: result.rejected || [],
        pending: result.pending || [],
        response: result.response
      };
    } catch (error) {
      logger.error("Failed to send email:", error);
      throw error;
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(
    messages: EmailMessage[],
    batchSize: number = 10,
    delayMs: number = 1000
  ): Promise<EmailDeliveryResult[]> {
    const results: EmailDeliveryResult[] = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(message => this.sendEmail(message));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          logger.error(`Failed to send email ${i + index}:`, result.reason);
          const msg = batch[index];
          results.push({
            messageId: "",
            accepted: [],
            rejected: [typeof msg?.to === "string" ? msg.to : String(msg?.to ?? "")],
            pending: [],
            response: result.reason instanceof Error ? result.reason.message : "Failed to send"
          });
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Get email template
   */
  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const db = getDatabase();
    
    try {
      const template = await db.select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, templateId));

      const templateData = template[0];
      if (!templateData) {
        return null;
      }

      const varsRaw = templateData.variables;
      const variablesParsed = Array.isArray(varsRaw)
        ? (varsRaw as string[])
        : typeof varsRaw === "string"
          ? (JSON.parse(varsRaw) as string[])
          : [];
      return {
        id: templateData.id,
        name: templateData.name,
        subject: templateData.subject,
        htmlContent: templateData.htmlBody,
        textContent: templateData.textBody || undefined,
        variables: variablesParsed,
        category: templateData.category as "notification" | "digest" | "reminder" | "welcome" | "custom"
      };
    } catch (error) {
      logger.error("Failed to get email template:", error);
      return null;
    }
  }

  /**
   * Configure SMTP settings for workspace
   */
  static async configureEmail(
    workspaceId: string,
    userId: string,
    config: EmailConfig
  ) {
    const db = getDatabase();
    
    try {
      // Test email configuration
      const emailService = new EmailIntegration(config);
      const testResult = await emailService.testConnection();
      
      if (!testResult.success) {
        throw new Error(testResult.error || "Failed to connect to email server");
      }

      // Create integration connection
      const integration = await db.insert(integrationConnectionTable).values({
        id: createId(),
        name: `Email - ${config.provider.toUpperCase()} (${config.from.email})`,
        provider: "email",
        workspaceId,
        createdBy: userId,
        config: JSON.stringify({
          provider: config.provider,
          host: config.host,
          port: config.port,
          secure: config.secure,
          fromName: config.from.name,
          fromEmail: config.from.email,
          replyTo: config.replyTo
        }),
        credentials: JSON.stringify({
          auth: config.auth
        }),
        status: "active",
        lastSync: new Date(),
        syncStatus: "success"
      }).returning();

      return {
        success: true,
        integration: integration[0]
      };
    } catch (error) {
      logger.error("Failed to configure email integration:", error);
      throw error;
    }
  }

  /**
   * Create email template
   */
  static async createTemplate(
    workspaceId: string,
    userId: string,
    template: {
      name: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      category: "notification" | "digest" | "reminder" | "welcome" | "custom";
      variables?: string[];
    }
  ): Promise<EmailTemplate> {
    try {
      const db = getDatabase();
      // Extract variables from template content
      const extractedVars = this.extractTemplateVariables(template.htmlContent, template.subject);
      const allVariables = [...new Set([...extractedVars, ...(template.variables || [])])];

      const newTemplate = await db.insert(emailTemplatesTable).values({
        id: createId(),
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlContent,
        textBody: template.textContent,
        category: template.category,
        variables: allVariables,
        workspaceId,
        createdBy: userId
      }).returning();

      const row = newTemplate[0];
      if (!row) {
        throw new Error("Failed to create email template");
      }

      return {
        id: row.id,
        name: row.name,
        subject: row.subject,
        htmlContent: row.htmlBody,
        textContent: row.textBody || undefined,
        variables: allVariables,
        category: row.category as any
      };
    } catch (error) {
      logger.error("Failed to create email template:", error);
      throw error;
    }
  }

  /**
   * Send task notification email
   */
  static async sendTaskNotification(
    workspaceId: string,
    taskId: string,
    action: "created" | "updated" | "completed" | "assigned" | "due_soon",
    recipients?: string[]
  ) {
    try {
      const db = getDatabase();
      // Get task details
      const task = await db.select()
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(eq(taskTable.id, taskId));

      const joinedRow = task[0];
      if (!joinedRow) {
        throw new Error("Task not found");
      }

      const { tasks: taskRow, projects: projectRow } = joinedRow;

      // Get email integrations for workspace
      const integrations = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.workspaceId, workspaceId),
            eq(integrationConnectionTable.provider, "email"),
            eq(integrationConnectionTable.status, "active")
          )
        );

      if (!integrations.length) {
        logger.warn("No email integrations configured for workspace");
        return { success: false, error: "No email integrations configured" };
      }

      for (const integration of integrations) {
        const config = parseIntegrationJsonField(integration.config);
        const credentials = parseIntegrationJsonField(integration.credentials);

        const emailConfig: EmailConfig = {
          provider: config.provider as EmailConfig["provider"],
          host: config.host as string,
          port: config.port as number,
          secure: config.secure as boolean,
          auth: credentials.auth as EmailConfig["auth"],
          from: {
            name: config.fromName as string,
            email: config.fromEmail as string
          },
          replyTo: config.replyTo as string | undefined
        };

        const emailService = new EmailIntegration(emailConfig);

        // Determine recipients
        let emailRecipients = recipients || [];
        if (!emailRecipients.length && taskRow.userEmail) {
          emailRecipients = [taskRow.userEmail];
        }

        if (!emailRecipients.length) {
          logger.warn("No recipients for task notification email");
          continue;
        }

        // Determine email content based on action
        let subject: string;
        let templateData: Record<string, any>;

        switch (action) {
          case "created":
            subject = `New Task: ${taskRow.title}`;
            break;
          case "updated":
            subject = `Task Updated: ${taskRow.title}`;
            break;
          case "completed":
            subject = `Task Completed: ${taskRow.title}`;
            break;
          case "assigned":
            subject = `Task Assigned: ${taskRow.title}`;
            break;
          case "due_soon":
            subject = `Task Due Soon: ${taskRow.title}`;
            break;
        }

        templateData = {
          task: {
            title: taskRow.title,
            description: taskRow.description,
            status: taskRow.status,
            priority: taskRow.priority,
            dueDate: taskRow.dueDate,
            assignee: taskRow.userEmail
          },
          project: {
            name: projectRow.name,
            description: projectRow.description
          },
          action,
          actionText: this.getActionText(action),
          taskUrl: `${process.env.WEB_URL}/dashboard/workspace/${workspaceId}/project/${projectRow.id}/tasks/${taskId}`
        };

        // Send email to each recipient
        for (const recipient of emailRecipients) {
          await emailService.sendEmail({
            to: recipient,
            subject,
            templateId: `task_${action}`, // Use predefined template
            templateData: {
              ...templateData,
              recipientEmail: recipient
            }
          });
        }

        await db.update(integrationConnectionTable)
          .set({
            lastSync: new Date(),
            syncStatus: "success"
          })
          .where(eq(integrationConnectionTable.id, integration.id));
      }

      return { success: true, emailsSent: integrations.length };
    } catch (error) {
      logger.error("Failed to send task notification email:", error);
      throw error;
    }
  }

  /**
   * Send daily/weekly digest emails
   */
  static async sendDigestEmail(
    workspaceId: string,
    userId: string,
    period: "daily" | "weekly",
    recipientEmail: string
  ) {
    try {
      const db = getDatabase();
      // Get user's tasks and project activity
      const userTasks = await db.select()
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(
          and(
            eq(taskTable.userEmail, recipientEmail),
            eq(projectTable.workspaceId, workspaceId)
          )
        );

      // Group tasks by status and priority
      const taskSummary = {
        total: userTasks.length,
        completed: userTasks.filter(t => t.tasks.status === "done").length,
        inProgress: userTasks.filter(t => t.tasks.status === "in_progress").length,
        pending: userTasks.filter(t => t.tasks.status === "todo").length,
        overdue: userTasks.filter(t =>
          t.tasks.dueDate &&
          new Date(t.tasks.dueDate) < new Date() &&
          t.tasks.status !== "done"
        ).length
      };

      // Get email integration
      const integration = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.workspaceId, workspaceId),
            eq(integrationConnectionTable.provider, "email"),
            eq(integrationConnectionTable.status, "active")
          )
        );

      if (!integration.length) {
        throw new Error("No email integration configured");
      }

      const digestConn = integration[0];
      if (!digestConn) {
        throw new Error("No email integration configured");
      }

      const config = parseIntegrationJsonField(digestConn.config);
      const credentials = parseIntegrationJsonField(digestConn.credentials);

      const emailConfig: EmailConfig = {
        provider: config.provider as EmailConfig["provider"],
        host: config.host as string,
        port: config.port as number,
        secure: config.secure as boolean,
        auth: credentials.auth as EmailConfig["auth"],
        from: {
          name: config.fromName as string,
          email: config.fromEmail as string
        },
        replyTo: config.replyTo as string | undefined
      };

      const emailService = new EmailIntegration(emailConfig);

      await emailService.sendEmail({
        to: recipientEmail,
        subject: `Your ${period} Meridian digest`,
        templateId: `digest_${period}`,
        templateData: {
          period,
          taskSummary,
          tasks: userTasks,
          dashboardUrl: `${process.env.WEB_URL}/dashboard/workspace/${workspaceId}`
        }
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to send digest email:", error);
      throw error;
    }
  }

  // Helper methods
  private static extractTemplateVariables(htmlContent: string, subject: string): string[] {
    const regex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables = new Set<string>();
    
    let match: RegExpExecArray | null;
    while ((match = regex.exec(htmlContent)) !== null) {
      variables.add(match[1]!.trim());
    }
    
    while ((match = regex.exec(subject)) !== null) {
      variables.add(match[1]!.trim());
    }
    
    return Array.from(variables);
  }

  private static getActionText(action: string): string {
    switch (action) {
      case "created": return "created";
      case "updated": return "updated";
      case "completed": return "completed";
      case "assigned": return "assigned to you";
      case "due_soon": return "is due soon";
      default: return action;
    }
  }
} 
