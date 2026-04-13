import { DigestData } from './digest-generator';
import { generateDigestEmailHTML, generateDigestEmailText } from '../templates/digest-email';
import { logger } from '../../utils/logger';
import { getDatabase } from '../../database/connection';
import { digestMetrics } from '../../database/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Email service for sending digest emails
 * 
 * NOTE: This is a simplified implementation for development.
 * In production, you would:
 * 1. Install nodemailer: npm install nodemailer @types/nodemailer
 * 2. Configure SMTP settings in .env
 * 3. Use a proper email service (SendGrid, AWS SES, etc.)
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send an email (simulated for development)
 * TODO: Replace with real email service in production
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, text } = options;
  
  // DEVELOPMENT: Log email to console
  if (process.env.NODE_ENV === 'development') {
    logger.info('📧 [EMAIL SIMULATION] Sending email:');
    logger.info(`   To: ${to}`);
    logger.info(`   Subject: ${subject}`);
    logger.info(`   Preview: ${text.substring(0, 200)}...`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  }
  
  // PRODUCTION: Use real email service
  try {
    // TODO: Implement real email sending
    // Example with nodemailer:
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@meridian.app',
      to,
      subject,
      html,
      text,
    });
    */
    
    logger.warn('⚠️ Email sending not configured for production. Email not sent.');
    return false;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send a digest email to a user
 */
export async function sendDigestEmail(digest: DigestData): Promise<boolean> {
  const db = getDatabase();
  
  try {
    const { user, period } = digest;
    
    // Generate email content
    const html = generateDigestEmailHTML(digest);
    const text = generateDigestEmailText(digest);
    
    // Create subject line
    const periodLabel = period.type === 'daily' ? 'Daily' : 'Weekly';
    const subject = `${periodLabel} Digest - ${new Date().toLocaleDateString()}`;
    
    // Send email
    const success = await sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
    
    if (success) {
      // Mark digest as sent
      await db
        .update(digestMetrics)
        .set({ emailSent: true })
        .where(
          and(
            eq(digestMetrics.userEmail, user.email),
            eq(digestMetrics.periodStart, period.start),
            eq(digestMetrics.periodEnd, period.end)
          )
        );
      
      logger.info(`✅ Digest email sent to ${user.email}`);
      return true;
    } else {
      logger.warn(`⚠️ Failed to send digest email to ${user.email}`);
      return false;
    }
  } catch (error) {
    logger.error('Failed to send digest email:', error);
    return false;
  }
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h2>✅ Email Test Successful!</h2>
          <p>Your Meridian email configuration is working correctly.</p>
          <p>You're now ready to receive digest emails.</p>
        </body>
      </html>
    `;
    
    const text = 'Email Test Successful!\n\nYour Meridian email configuration is working correctly.';
    
    return await sendEmail({
      to,
      subject: 'Meridian Email Test',
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send test email:', error);
    return false;
  }
}

/**
 * Setup instructions for production email
 */
export const EMAIL_SETUP_INSTRUCTIONS = `
To enable real email sending in production:

1. Install nodemailer:
   npm install nodemailer @types/nodemailer

2. Add SMTP settings to .env:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM=noreply@meridian.app

3. Uncomment the nodemailer code in email-service.ts

4. Recommended production email services:
   - SendGrid (easy setup, good free tier)
   - AWS SES (scalable, pay-as-you-go)
   - Mailgun (developer-friendly)
   - Postmark (transactional emails)

5. For Gmail SMTP:
   - Enable 2-factor authentication
   - Generate an app-specific password
   - Use that password in SMTP_PASS
`;


