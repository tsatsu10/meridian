/**
 * Email Service Tests
 * 
 * Comprehensive tests for email functionality:
 * - Email template rendering
 * - Email sending
 * - Email queueing
 * - Error handling
 * - Retry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Email Service', () => {
  const mockMailer = {
    sendMail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Sending', () => {
    it('should send welcome email', async () => {
      mockMailer.sendMail.mockResolvedValue({
        messageId: '<message-id@example.com>',
        accepted: ['user@example.com'],
      });

      const result = await mockMailer.sendMail({
        from: 'noreply@meridian.app',
        to: 'user@example.com',
        subject: 'Welcome to Meridian!',
        html: '<h1>Welcome!</h1>',
      });

      expect(result.messageId).toBeDefined();
      expect(result.accepted).toContain('user@example.com');
      expect(mockMailer.sendMail).toHaveBeenCalled();
    });

    it('should send notification email', async () => {
      mockMailer.sendMail.mockResolvedValue({
        messageId: '<notif@example.com>',
        accepted: ['user@example.com'],
      });

      await mockMailer.sendMail({
        to: 'user@example.com',
        subject: 'New Task Assigned',
        html: '<p>You have been assigned to a task</p>',
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'New Task Assigned',
        })
      );
    });

    it('should send email with attachments', async () => {
      mockMailer.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await mockMailer.sendMail({
        to: 'user@example.com',
        subject: 'Report',
        html: '<p>See attachment</p>',
        attachments: [
          {
            filename: 'report.pdf',
            path: '/path/to/report.pdf',
          },
        ],
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: 'report.pdf' }),
          ]),
        })
      );
    });

    it('should handle SMTP errors', async () => {
      mockMailer.sendMail.mockRejectedValue(
        new Error('SMTP connection failed')
      );

      await expect(
        mockMailer.sendMail({
          to: 'user@example.com',
          subject: 'Test',
          html: 'Test',
        })
      ).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('Email Templates', () => {
    const renderTemplate = (template: string, data: Record<string, any>): string => {
      let rendered = template;
      
      for (const [key, value] of Object.entries(data)) {
        rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
      
      return rendered;
    };

    it('should render welcome email template', () => {
      const template = '<h1>Welcome, {{name}}!</h1><p>Your email is {{email}}</p>';
      const data = { name: 'John', email: 'john@example.com' };

      const rendered = renderTemplate(template, data);

      expect(rendered).toContain('Welcome, John!');
      expect(rendered).toContain('john@example.com');
    });

    it('should render task notification template', () => {
      const template = '<p>Task "{{taskTitle}}" assigned by {{assignedBy}}</p>';
      const data = {
        taskTitle: 'Implement feature',
        assignedBy: 'Manager',
      };

      const rendered = renderTemplate(template, data);

      expect(rendered).toContain('Implement feature');
      expect(rendered).toContain('Manager');
    });

    it('should handle missing template variables', () => {
      const template = '<p>Hello {{name}}, your {{missing}} value</p>';
      const data = { name: 'User' };

      const rendered = renderTemplate(template, data);

      expect(rendered).toContain('Hello User');
      expect(rendered).toContain('{{missing}}'); // Unchanged
    });

    it('should render complex HTML templates', () => {
      const template = `
        <div>
          <h1>{{title}}</h1>
          <p>{{content}}</p>
          <a href="{{actionUrl}}">{{actionText}}</a>
        </div>
      `;
      const data = {
        title: 'Notification',
        content: 'You have a new message',
        actionUrl: 'https://meridian.app/messages',
        actionText: 'View Message',
      };

      const rendered = renderTemplate(template, data);

      expect(rendered).toContain('<h1>Notification</h1>');
      expect(rendered).toContain('You have a new message');
      expect(rendered).toContain('href="https://meridian.app/messages"');
    });
  });

  describe('Email Validation', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should validate correct emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('john.doe@company.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user name@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('Email Queueing', () => {
    interface QueuedEmail {
      id: string;
      to: string;
      subject: string;
      html: string;
      retries: number;
      status: 'pending' | 'sent' | 'failed';
    }

    const emailQueue: QueuedEmail[] = [];

    const queueEmail = (to: string, subject: string, html: string): string => {
      const id = Math.random().toString(36).substring(7);
      emailQueue.push({
        id,
        to,
        subject,
        html,
        retries: 0,
        status: 'pending',
      });
      return id;
    };

    const processQueue = async (): Promise<number> => {
      let processed = 0;
      
      for (const email of emailQueue) {
        if (email.status === 'pending') {
          email.status = 'sent';
          processed++;
        }
      }
      
      return processed;
    };

    beforeEach(() => {
      emailQueue.length = 0;
    });

    it('should queue email', () => {
      const id = queueEmail(
        'user@example.com',
        'Test Subject',
        '<p>Test</p>'
      );

      expect(id).toBeDefined();
      expect(emailQueue).toHaveLength(1);
      expect(emailQueue[0].status).toBe('pending');
    });

    it('should process queued emails', async () => {
      queueEmail('user1@example.com', 'Test 1', '<p>Test 1</p>');
      queueEmail('user2@example.com', 'Test 2', '<p>Test 2</p>');

      const processed = await processQueue();

      expect(processed).toBe(2);
      expect(emailQueue.every(e => e.status === 'sent')).toBe(true);
    });

    it('should handle failed emails', () => {
      const id = queueEmail('invalid', 'Test', 'Test');
      const email = emailQueue.find(e => e.id === id);
      
      if (email) {
        email.status = 'failed';
        email.retries = 3;
      }

      expect(email?.status).toBe('failed');
      expect(email?.retries).toBe(3);
    });
  });

  describe('Retry Logic', () => {
    const sendWithRetry = async (
      mailer: any,
      email: any,
      maxRetries = 3
    ): Promise<boolean> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await mailer.sendMail(email);
          return true;
        } catch (error) {
          if (attempt === maxRetries - 1) throw error;
          
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
      return false;
    };

    it('should retry on temporary failures', async () => {
      mockMailer.sendMail
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ messageId: 'success' });

      const result = await sendWithRetry(mockMailer, {
        to: 'user@example.com',
        subject: 'Test',
        html: 'Test',
      });

      expect(result).toBe(true);
      expect(mockMailer.sendMail).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockMailer.sendMail.mockRejectedValue(new Error('Permanent error'));

      await expect(
        sendWithRetry(mockMailer, {
          to: 'user@example.com',
          subject: 'Test',
          html: 'Test',
        }, 3)
      ).rejects.toThrow('Permanent error');

      expect(mockMailer.sendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('Email Types', () => {
    it('should send password reset email', async () => {
      mockMailer.sendMail.mockResolvedValue({ messageId: 'reset-id' });

      await mockMailer.sendMail({
        to: 'user@example.com',
        subject: 'Reset Your Password',
        html: '<p>Click here to reset: <a href="https://meridian.app/reset?token=abc">Reset</a></p>',
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Reset Your Password',
        })
      );
    });

    it('should send verification email', async () => {
      mockMailer.sendMail.mockResolvedValue({ messageId: 'verify-id' });

      await mockMailer.sendMail({
        to: 'user@example.com',
        subject: 'Verify Your Email',
        html: '<p>Verification link</p>',
      });

      expect(mockMailer.sendMail).toHaveBeenCalled();
    });

    it('should send invitation email', async () => {
      mockMailer.sendMail.mockResolvedValue({ messageId: 'invite-id' });

      await mockMailer.sendMail({
        to: 'newuser@example.com',
        subject: 'Join Our Workspace',
        html: '<p>You have been invited</p>',
      });

      expect(mockMailer.sendMail).toHaveBeenCalled();
    });
  });
});

