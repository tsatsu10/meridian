/**
 * Email Template Controllers
 * CRUD operations for email templates
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { emailTemplates } from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  category: string;
  workspaceId: string | null;
  isGlobal: boolean;
  variables: any;
  isActive: boolean;
  metadata: any;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface CreateEmailTemplateInput {
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  category: string;
  variables?: any;
  metadata?: any;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  category?: string;
  variables?: any;
  isActive?: boolean;
  metadata?: any;
}

// Get all email templates for a workspace
export async function getEmailTemplates(
  workspaceId: string
): Promise<EmailTemplate[]> {
  const db = getDatabase();
  
  const templates = await db
    .select()
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.workspaceId, workspaceId),
        eq(emailTemplates.isActive, true)
      )
    )
    .orderBy(emailTemplates.createdAt);
  
  return templates as EmailTemplate[];
}

// Get a single email template
export async function getEmailTemplate(
  templateId: string,
  workspaceId: string
): Promise<EmailTemplate | null> {
  const db = getDatabase();
  
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.id, templateId),
        eq(emailTemplates.workspaceId, workspaceId)
      )
    )
    .limit(1);
  
  return (template as EmailTemplate) || null;
}

// Create a new email template
export async function createEmailTemplate(
  workspaceId: string,
  userId: string,
  input: CreateEmailTemplateInput
): Promise<EmailTemplate> {
  const db = getDatabase();
  
  const [template] = await db
    .insert(emailTemplates)
    .values({
      id: createId(),
      name: input.name,
      subject: input.subject,
      htmlBody: input.htmlBody,
      textBody: input.textBody || null,
      category: input.category,
      workspaceId,
      isGlobal: false,
      variables: input.variables || null,
      isActive: true,
      metadata: input.metadata || null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  
  return template as EmailTemplate;
}

// Update an email template
export async function updateEmailTemplate(
  templateId: string,
  workspaceId: string,
  updates: UpdateEmailTemplateInput
): Promise<EmailTemplate> {
  const db = getDatabase();
  
  const [template] = await db
    .update(emailTemplates)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailTemplates.id, templateId),
        eq(emailTemplates.workspaceId, workspaceId)
      )
    )
    .returning();
  
  if (!template) {
    throw new Error('Template not found or access denied');
  }
  
  return template as EmailTemplate;
}

// Delete an email template
export async function deleteEmailTemplate(
  templateId: string,
  workspaceId: string
): Promise<void> {
  const db = getDatabase();
  
  await db
    .delete(emailTemplates)
    .where(
      and(
        eq(emailTemplates.id, templateId),
        eq(emailTemplates.workspaceId, workspaceId)
      )
    );
}

// Test SMTP connection
export async function testSMTPConnection(config: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Import nodemailer lazily
    const nodemailer = await import('nodemailer');
    
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
    
    // Verify connection
    await transporter.verify();
    
    return {
      success: true,
      message: 'SMTP connection successful',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to connect to SMTP server',
    };
  }
}

// Send test email
export async function sendTestEmail(
  config: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    fromName: string;
  },
  toEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
    
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: toEmail,
      subject: 'Meridian Test Email',
      text: 'This is a test email from Meridian to verify your SMTP configuration.',
      html: '<p>This is a test email from <strong>Meridian</strong> to verify your SMTP configuration.</p>',
    });
    
    return {
      success: true,
      message: 'Test email sent successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to send test email',
    };
  }
}


