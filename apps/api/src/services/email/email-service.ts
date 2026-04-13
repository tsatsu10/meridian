/**
 * Email Service - Unified email delivery system
 * Supports multiple providers (SendGrid, AWS SES, SMTP)
 * Handles email templates, queuing, and delivery tracking
 */

import sgMail from '@sendgrid/mail';
import logger from '../../utils/logger';

interface EmailConfig {
  provider: 'sendgrid' | 'ses' | 'smtp';
  apiKey?: string;
  from: string;
  fromName: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

export class EmailService {
  private config: EmailConfig;
  private initialized: boolean = false;

  constructor() {
    this.config = {
      provider: (process.env.EMAIL_PROVIDER as any) || 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY || process.env.AWS_SES_API_KEY,
      from: process.env.FROM_EMAIL || 'noreply@meridian.app',
      fromName: process.env.FROM_NAME || 'Meridian',
    };

    this.initialize();
  }

  /**
   * Initialize email service based on provider
   */
  private initialize(): void {
    try {
      if (this.config.provider === 'sendgrid') {
        if (!this.config.apiKey) {
          logger.warn('⚠️  SendGrid API key not found. Email functionality will be disabled.');
          return;
        }
        sgMail.setApiKey(this.config.apiKey);
        this.initialized = true;
        logger.debug('✅ Email service initialized with SendGrid');
      } else if (this.config.provider === 'ses') {
        // TODO: Implement AWS SES
        logger.warn('⚠️  AWS SES not implemented yet');
      } else if (this.config.provider === 'smtp') {
        // TODO: Implement SMTP
        logger.warn('⚠️  SMTP not implemented yet');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize email service:', error);
    }
  }

  /**
   * Send email with retry logic
   */
  private async send(options: EmailOptions, retries = 3): Promise<boolean> {
    if (!this.initialized) {
      logger.warn('⚠️  Email service not initialized. Skipping email send.');
      // In development, log the email instead
      if (process.env.NODE_ENV === 'development') {
        logger.debug('📧 [DEV] Email would be sent:', {
          to: options.to,
          subject: options.subject,
          html: options.html.substring(0, 100) + '...',
        });
      }
      return false;
    }

    const msg = {
      to: options.to,
      from: {
        email: this.config.from,
        name: this.config.fromName,
      },
      subject: options.subject,
      html: options.html,
      text: options.text || this.stripHtml(options.html),
      attachments: options.attachments,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await sgMail.send(msg);
        logger.debug(`✅ Email sent successfully to ${options.to}: ${options.subject}`);
        return true;
      } catch (error: any) {
        logger.error(`❌ Email send attempt ${attempt}/${retries} failed:`, error.message);
        
        if (attempt === retries) {
          logger.error('❌ All email send attempts failed. Email not delivered.');
          return false;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return false;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email: string, token: string, name: string): Promise<boolean> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content h2 { color: #667eea; margin-top: 0; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
            .button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
            .security-info { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .security-info p { margin: 0; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Meridian!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for creating an account with Meridian. We're excited to have you on board!</p>
              <p>To get started and access all features, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verifyUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
              <div class="security-info">
                <p><strong>🔒 Security Note:</strong> This verification link will expire in 24 hours. If you didn't create an account with Meridian, you can safely ignore this email.</p>
              </div>
              <p>Once verified, you'll be able to:</p>
              <ul>
                <li>Create and manage projects</li>
                <li>Collaborate with your team</li>
                <li>Track tasks and time</li>
                <li>Access all premium features</li>
              </ul>
              <p>If you have any questions, feel free to reply to this email or visit our <a href="${process.env.FRONTEND_URL}/help">Help Center</a>.</p>
              <p>Best regards,<br>The Meridian Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Meridian. All rights reserved.</p>
              <p>Meridian - Modern Project Management & Collaboration</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: 'Verify your Meridian account',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content h2 { color: #667eea; margin-top: 0; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
            .button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning p { margin: 0; font-size: 14px; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We received a request to reset your password for your Meridian account.</p>
              <p>Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 14px; word-break: break-all;">${resetUrl}</p>
              <div class="warning">
                <p><strong>⚠️ Important:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
              </div>
              <p><strong>Security Tips:</strong></p>
              <ul>
                <li>Never share your password with anyone</li>
                <li>Use a strong, unique password</li>
                <li>Enable two-factor authentication for extra security</li>
                <li>Don't use the same password across multiple sites</li>
              </ul>
              <p>If you need help or have questions, contact us at <a href="mailto:support@meridian.app">support@meridian.app</a>.</p>
              <p>Best regards,<br>The Meridian Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Meridian. All rights reserved.</p>
              <p>Meridian - Modern Project Management & Collaboration</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: 'Reset your Meridian password',
      html,
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
            .feature-box { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 15px 0; }
            .feature-box h3 { color: #667eea; margin-top: 0; font-size: 18px; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Welcome to Meridian!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Your email is verified and your account is ready! Welcome to the Meridian family. 🎉</p>
              <p>Let's get you started with your first project:</p>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
              </div>
              
              <h3 style="color: #667eea; margin-top: 30px;">🚀 Quick Start Guide</h3>
              
              <div class="feature-box">
                <h3>1️⃣ Create Your First Project</h3>
                <p>Start by creating a project to organize your work. Give it a name, set a deadline, and invite team members.</p>
              </div>
              
              <div class="feature-box">
                <h3>2️⃣ Add Tasks</h3>
                <p>Break down your project into manageable tasks. Assign them to team members, set priorities, and track progress.</p>
              </div>
              
              <div class="feature-box">
                <h3>3️⃣ Collaborate in Real-Time</h3>
                <p>Use our chat features, @mentions, and real-time updates to keep everyone on the same page.</p>
              </div>
              
              <div class="feature-box">
                <h3>4️⃣ Track Time & Progress</h3>
                <p>Monitor time spent on tasks, view analytics, and generate reports to stay on top of your projects.</p>
              </div>
              
              <h3 style="color: #667eea; margin-top: 30px;">📚 Resources</h3>
              <ul>
                <li><a href="${process.env.FRONTEND_URL}/help">Help Center</a> - Guides and tutorials</li>
                <li><a href="${process.env.FRONTEND_URL}/help/getting-started">Getting Started</a> - Step-by-step walkthrough</li>
                <li><a href="${process.env.FRONTEND_URL}/settings">Settings</a> - Customize your experience</li>
              </ul>
              
              <p>Need help? We're here for you:</p>
              <ul>
                <li>📧 Email: <a href="mailto:support@meridian.app">support@meridian.app</a></li>
                <li>💬 Live Chat: Available in your dashboard</li>
                <li>📖 Documentation: <a href="${process.env.FRONTEND_URL}/docs">docs.meridian.com</a></li>
              </ul>
              
              <p>We're thrilled to have you! Let's build something amazing together.</p>
              <p>Best regards,<br>The Meridian Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Meridian. All rights reserved.</p>
              <p>Meridian - Modern Project Management & Collaboration</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: '🎉 Welcome to Meridian - Let\'s get started!',
      html,
    });
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    name: string,
    notification: {
      title: string;
      message: string;
      actionUrl?: string;
      actionText?: string;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 30px; }
            .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>${notification.message}</p>
              ${notification.actionUrl ? `
                <div style="text-align: center;">
                  <a href="${notification.actionUrl}" class="button">${notification.actionText || 'View Details'}</a>
                </div>
              ` : ''}
              <p>You can manage your notification preferences in your <a href="${process.env.FRONTEND_URL}/settings/notifications">account settings</a>.</p>
              <p>Best regards,<br>The Meridian Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Meridian. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: notification.title,
      html,
    });
  }

  /**
   * Send digest email (daily/weekly summary)
   */
  async sendDigestEmail(
    email: string,
    name: string,
    digest: {
      period: 'daily' | 'weekly';
      tasksCompleted: number;
      tasksAssigned: number;
      mentions: number;
      comments: number;
      projects: Array<{ name: string; progress: number; url: string }>;
    }
  ): Promise<boolean> {
    const periodText = digest.period === 'daily' ? 'Daily' : 'Weekly';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .stat-box { background: #f8f9fa; border-radius: 6px; padding: 15px; text-align: center; }
            .stat-number { font-size: 32px; font-weight: 700; color: #667eea; }
            .stat-label { font-size: 14px; color: #6c757d; margin-top: 5px; }
            .project-item { background: #f8f9fa; border-radius: 6px; padding: 15px; margin: 10px 0; }
            .progress-bar { background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 8px; }
            .progress-fill { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; transition: width 0.3s; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Your ${periodText} Digest</h1>
              <p style="margin: 0; opacity: 0.9;">Here's what happened ${digest.period === 'daily' ? 'today' : 'this week'}</p>
            </div>
            <div class="content" style="padding: 30px;">
              <p>Hi ${name},</p>
              <p>Here's a summary of your activity:</p>
              
              <div class="stat-grid">
                <div class="stat-box">
                  <div class="stat-number">${digest.tasksCompleted}</div>
                  <div class="stat-label">Tasks Completed</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${digest.tasksAssigned}</div>
                  <div class="stat-label">New Tasks</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${digest.mentions}</div>
                  <div class="stat-label">Mentions</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${digest.comments}</div>
                  <div class="stat-label">Comments</div>
                </div>
              </div>
              
              ${digest.projects.length > 0 ? `
                <h3 style="color: #667eea; margin-top: 30px;">🚀 Project Updates</h3>
                ${digest.projects.map(project => `
                  <div class="project-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong>${project.name}</strong>
                      <span style="color: #667eea; font-weight: 600;">${project.progress}%</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${project.progress}%"></div>
                    </div>
                    <a href="${project.url}" style="font-size: 14px; color: #667eea; text-decoration: none;">View Project →</a>
                  </div>
                `).join('')}
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View Dashboard</a>
              </div>
              
              <p style="font-size: 14px; color: #6c757d;">You can manage digest preferences in your <a href="${process.env.FRONTEND_URL}/settings/notifications">notification settings</a>.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Meridian. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: `${periodText} Digest - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      html,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();


