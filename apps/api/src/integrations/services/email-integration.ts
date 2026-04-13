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
    this.transporter = this.createTransporter();
  }

  /**
   * Create nodemailer transporter based on configuration
   */
  private createTransporter(): nodemailer.Transporter {
    switch (this.config.provider) {
      case "smtp":
        return nodemailer.createTransporter({
          host: this.config.host,
          port: this.config.port || 587,
          secure: this.config.secure || false,
          auth: this.config.auth,
          tls: {
            rejectUnauthorized: false // Allow self-signed certificates for development
          }
        });
      
      case "ses":
        // AWS SES configuration
        return nodemailer.createTransporter({
          SES: { /* AWS SES config */ },
          sendingRate: 14 // messages per second
        });
      
      case "sendgrid":
        return nodemailer.createTransporter({
          service: "SendGrid",
          auth: {
            user: "apikey",
            pass: this.config.auth.pass // SendGrid API key
          }
        });
      
      case "mailgun":
        return nodemailer.createTransporter({
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
          results.push({
            messageId: "",
            accepted: [],
            rejected: [batch[index].to as string],
            pending: [],
            response: result.reason?.message || "Failed to send"
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

      if (!template.length) {
        return null;
      }

      const templateData = template[0];
      return {
        id: templateData.id,
        name: templateData.name,
        subject: templateData.subject,
        htmlContent: templateData.htmlContent,
        textContent: templateData.textContent || undefined,
        variables: JSON.parse(templateData.variables || "[]"),
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
        connectionStatus: "connected",
        isActive: true,
        lastConnectedAt: new Date()
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
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        category: template.category,
        variables: JSON.stringify(allVariables),
        workspaceId,
        createdBy: userId
      }).returning();

      return {
        id: newTemplate[0].id,
        name: newTemplate[0].name,
        subject: newTemplate[0].subject,
        htmlContent: newTemplate[0].htmlContent,
        textContent: newTemplate[0].textContent || undefined,
        variables: allVariables,
        category: newTemplate[0].category as any
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

      if (!task.length) {
        throw new Error("Task not found");
      }

      const taskData = task[0];

      // Get email integrations for workspace
      const integrations = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.workspaceId, workspaceId),
            eq(integrationConnectionTable.provider, "email"),
            eq(integrationConnectionTable.isActive, true)
          )
        );

      if (!integrations.length) {
        logger.warn("No email integrations configured for workspace");
        return { success: false, error: "No email integrations configured" };
      }

      for (const integration of integrations) {
        const config = JSON.parse(integration.config);
        const credentials = JSON.parse(integration.credentials || "{}");

        const emailConfig: EmailConfig = {
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
        };

        const emailService = new EmailIntegration(emailConfig);

        // Determine recipients
        let emailRecipients = recipients || [];
        if (!emailRecipients.length && taskData.task.assigneeEmail) {
          emailRecipients = [taskData.task.assigneeEmail];
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
            subject = `New Task: ${taskData.task.title}`;
            break;
          case "updated":
            subject = `Task Updated: ${taskData.task.title}`;
            break;
          case "completed":
            subject = `Task Completed: ${taskData.task.title}`;
            break;
          case "assigned":
            subject = `Task Assigned: ${taskData.task.title}`;
            break;
          case "due_soon":
            subject = `Task Due Soon: ${taskData.task.title}`;
            break;
        }

        templateData = {
          task: {
            title: taskData.task.title,
            description: taskData.task.description,
            status: taskData.task.status,
            priority: taskData.task.priority,
            dueDate: taskData.task.dueDate,
            assignee: taskData.task.assigneeEmail
          },
          project: {
            name: taskData.project.name,
            description: taskData.project.description
          },
          action,
          actionText: this.getActionText(action),
          taskUrl: `${process.env.WEB_URL}/dashboard/workspace/${workspaceId}/project/${taskData.project.id}/tasks/${taskId}`
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

        // Update integration metrics
        await db.update(integrationConnectionTable)
          .set({
            totalOperations: integration.totalOperations + emailRecipients.length,
            successfulOperations: integration.successfulOperations + emailRecipients.length,
            lastSyncAt: new Date()
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
            eq(taskTable.assigneeEmail, recipientEmail),
            eq(projectTable.workspaceId, workspaceId)
          )
        );

      // Group tasks by status and priority
      const taskSummary = {
        total: userTasks.length,
        completed: userTasks.filter(t => t.task.status === "completed").length,
        inProgress: userTasks.filter(t => t.task.status === "in-progress").length,
        pending: userTasks.filter(t => t.task.status === "todo").length,
        overdue: userTasks.filter(t => 
          t.task.dueDate && new Date(t.task.dueDate) < new Date() && t.task.status !== "completed"
        ).length
      };

      // Get email integration
      const integration = await db.select()
        .from(integrationConnectionTable)
        .where(
          and(
            eq(integrationConnectionTable.workspaceId, workspaceId),
            eq(integrationConnectionTable.provider, "email"),
            eq(integrationConnectionTable.isActive, true)
          )
        );

      if (!integration.length) {
        throw new Error("No email integration configured");
      }

      const config = JSON.parse(integration[0].config);
      const credentials = JSON.parse(integration[0].credentials || "{}");

      const emailConfig: EmailConfig = {
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
    
    let match;
    while ((match = regex.exec(htmlContent)) !== null) {
      variables.add(match[1].trim());
    }
    
    while ((match = regex.exec(subject)) !== null) {
      variables.add(match[1].trim());
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
