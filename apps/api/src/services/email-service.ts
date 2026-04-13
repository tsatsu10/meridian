// @epic-2.2-realtime: Email service for sending invitations and notifications
import nodemailer from 'nodemailer';
import logger from '../utils/logger';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface InvitationEmailData {
  inviteeEmail: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Check for email configuration in environment variables
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = process.env.EMAIL_PORT;
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;
      const emailSecure = process.env.EMAIL_SECURE === 'true';

      if (!emailHost || !emailPort || !emailUser || !emailPass) {
        logger.debug('📧 Email service not configured - missing environment variables');
        logger.debug('📧 Required: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS');
        return;
      }

      const config: EmailConfig = {
        host: emailHost,
        port: parseInt(emailPort),
        secure: emailSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      };

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      logger.debug('📧 Email service configured successfully');
    } catch (error) {
      logger.error('❌ Failed to configure email service:', error);
    }
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.debug('📧 Email service not configured - invitation email not sent');
      logger.debug(`📧 Would send invitation to: ${data.inviteeEmail}`);
      logger.debug(`📧 Workspace: ${data.workspaceName}`);
      logger.debug(`📧 Invite URL: ${data.inviteUrl}`);
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.inviteeEmail,
        subject: `You're invited to join ${data.workspaceName} on Meridian`,
        html: this.generateInvitationEmailTemplate(data),
        text: this.generateInvitationEmailText(data),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.debug(`📧 Invitation email sent to ${data.inviteeEmail}:`, result.messageId);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to send invitation email to ${data.inviteeEmail}:`, error);
      return false;
    }
  }

  private generateInvitationEmailTemplate(data: InvitationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're invited to join ${data.workspaceName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Meridian</div>
          </div>
          
          <div class="content">
            <h2>You're invited to join ${data.workspaceName}!</h2>
            <p>Hi there,</p>
            <p><strong>${data.inviterName}</strong> has invited you to collaborate on <strong>${data.workspaceName}</strong> workspace in Meridian.</p>
            <p>Meridian is a powerful project management platform that helps teams collaborate effectively and get things done.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">${data.inviteUrl}</p>
          </div>
          
          <div class="footer">
            <p>This invitation was sent by ${data.inviterName}. If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvitationEmailText(data: InvitationEmailData): string {
    return `
You're invited to join ${data.workspaceName}!

Hi there,

${data.inviterName} has invited you to collaborate on ${data.workspaceName} workspace in Meridian.

Meridian is a powerful project management platform that helps teams collaborate effectively and get things done.

To accept this invitation, visit: ${data.inviteUrl}

If you weren't expecting this invitation, you can safely ignore this email.

Best regards,
The Meridian Team
    `.trim();
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.debug('📧 Email service connection test successful');
      return true;
    } catch (error) {
      logger.error('❌ Email service connection test failed:', error);
      return false;
    }
  }
}

export default new EmailService(); 
