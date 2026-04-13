import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { logger } from "../lib/logger";

interface EmailPreferences {
  enabled: boolean;
  digestEnabled: boolean;
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  digestTime: string; // HH:MM format
  channels: {
    directMessages: boolean;
    mentions: boolean;
    channelMessages: boolean;
    taskUpdates: boolean;
    systemNotifications: boolean;
  };
  offlineOnly: boolean; // Only send emails when user is offline
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  unsubscribeToken?: string;
}

interface EmailDigest {
  id: string;
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  messages: {
    directMessages: EmailMessage[];
    mentions: EmailMessage[];
    channelMessages: EmailMessage[];
    taskUpdates: EmailMessage[];
    systemNotifications: EmailMessage[];
  };
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

interface EmailMessage {
  id: string;
  type: 'directMessage' | 'mention' | 'channelMessage' | 'taskUpdate' | 'systemNotification';
  from: string;
  content: string;
  channel?: string;
  timestamp: Date;
  read: boolean;
}

export function useEmailNotifications() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastDigest, setLastDigest] = useState<EmailDigest | null>(null);
  const [pendingMessages, setPendingMessages] = useState<EmailMessage[]>([]);

  // Load preferences on mount
  useEffect(() => {
    loadEmailPreferences();
    loadPendingMessages();
  }, []);

  const loadEmailPreferences = useCallback(async () => {
    try {
      // Try localStorage first
      const stored = localStorage.getItem('email-notification-preferences');
      if (stored) {
        setPreferences(JSON.parse(stored));
      } else {
        setPreferences(getDefaultEmailPreferences());
      }
    } catch (error) {
      console.error('Failed to load email preferences:', error);
      setPreferences(getDefaultEmailPreferences());
    }
  }, []);

  const loadPendingMessages = useCallback(() => {
    try {
      const stored = localStorage.getItem('pending-email-messages');
      if (stored) {
        const messages = JSON.parse(stored).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setPendingMessages(messages);
      }
    } catch (error) {
      console.error('Failed to load pending messages:', error);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<EmailPreferences>) => {
    if (!preferences) return;

    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);

    try {
      // Save to localStorage
      localStorage.setItem('email-notification-preferences', JSON.stringify(updated));
      
      // In a real implementation, sync with server
      await syncPreferencesWithServer(updated);
      
      toast.success('Email preferences updated');
    } catch (error) {
      console.error('Failed to update email preferences:', error);
      toast.error('Failed to update email preferences');
    }
  }, [preferences]);

  const queueEmailMessage = useCallback((message: Omit<EmailMessage, 'id'>) => {
    if (!preferences?.enabled) return;

    // Check if this type of message should be emailed
    const channelEnabled = preferences.channels[message.type.replace('Message', 'Messages') as keyof typeof preferences.channels];
    if (!channelEnabled) return;

    // Check quiet hours
    if (preferences.quietHours.enabled && isInQuietHours(preferences.quietHours)) {
      return;
    }

    const emailMessage: EmailMessage = {
      ...message,
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setPendingMessages(prev => {
      const updated = [...prev, emailMessage];
      
      // Save to localStorage
      localStorage.setItem('pending-email-messages', JSON.stringify(updated));
      
      return updated;
    });

    // Handle immediate sending if configured
    if (preferences.digestFrequency === 'immediate') {
      setTimeout(() => sendImmediateEmail(emailMessage), 100);
    }
  }, [preferences]);

  const sendImmediateEmail = useCallback(async (message: EmailMessage) => {
    if (!preferences?.enabled) return;

    try {
      setLoading(true);
      
      // In a real implementation, send via API
      await sendEmailNotification({
        type: 'immediate',
        messages: [message],
        userId: 'current-user-id' // Get from auth context
      });

      // Remove from pending messages
      setPendingMessages(prev => {
        const updated = prev.filter(m => m.id !== message.id);
        localStorage.setItem('pending-email-messages', JSON.stringify(updated));
        return updated;
      });

      logger.info("📧 Immediate email sent for:");
    } catch (error) {
      console.error('Failed to send immediate email:', error);
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  const sendDigestEmail = useCallback(async () => {
    if (!preferences?.enabled || !preferences.digestEnabled || pendingMessages.length === 0) {
      return;
    }

    try {
      setLoading(true);

      // Group messages by type
      const groupedMessages = pendingMessages.reduce((acc, message) => {
        const type = message.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(message);
        return acc;
      }, {} as Record<string, EmailMessage[]>);

      // Create digest
      const digest: EmailDigest = {
        id: `digest-${Date.now()}`,
        userId: 'current-user-id', // Get from auth context
        period: {
          start: new Date(Math.min(...pendingMessages.map(m => m.timestamp.getTime()))),
          end: new Date()
        },
        messages: {
          directMessages: groupedMessages.directMessage || [],
          mentions: groupedMessages.mention || [],
          channelMessages: groupedMessages.channelMessage || [],
          taskUpdates: groupedMessages.taskUpdate || [],
          systemNotifications: groupedMessages.systemNotification || []
        },
        sent: false,
        createdAt: new Date()
      };

      // Send digest email
      await sendEmailNotification({
        type: 'digest',
        digest,
        userId: 'current-user-id'
      });

      // Clear pending messages
      setPendingMessages([]);
      localStorage.removeItem('pending-email-messages');
      
      // Store last digest info
      setLastDigest({ ...digest, sent: true, sentAt: new Date() });
      
      toast.success(`Email digest sent with ${pendingMessages.length} messages`);
      logger.info("📧 Email digest sent:");
    } catch (error) {
      console.error('Failed to send email digest:', error);
      toast.error('Failed to send email digest');
    } finally {
      setLoading(false);
    }
  }, [preferences, pendingMessages]);

  const testEmailNotification = useCallback(async () => {
    if (!preferences?.enabled) {
      toast.error('Email notifications are disabled');
      return;
    }

    try {
      setLoading(true);
      
      await sendEmailNotification({
        type: 'test',
        userId: 'current-user-id',
        testMessage: 'This is a test email notification from Meridian'
      });
      
      toast.success('Test email sent successfully');
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  const clearPendingMessages = useCallback(() => {
    setPendingMessages([]);
    localStorage.removeItem('pending-email-messages');
    toast.success('Pending email messages cleared');
  }, []);

  const unsubscribeFromEmails = useCallback(async (token?: string) => {
    try {
      setLoading(true);
      
      // In a real implementation, send unsubscribe request to server
      await unsubscribeFromEmailNotifications(token || preferences?.unsubscribeToken);
      
      // Disable email notifications locally
      await updatePreferences({ enabled: false });
      
      toast.success('Successfully unsubscribed from email notifications');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to unsubscribe from emails');
    } finally {
      setLoading(false);
    }
  }, [preferences, updatePreferences]);

  // Auto-digest scheduling
  useEffect(() => {
    if (!preferences?.enabled || !preferences.digestEnabled || preferences.digestFrequency === 'immediate') {
      return;
    }

    const scheduleDigest = () => {
      const now = new Date();
      const [hours, minutes] = preferences.digestTime.split(':').map(Number);
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If scheduled time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const msUntilDigest = scheduledTime.getTime() - now.getTime();

      const timeoutId = setTimeout(() => {
        sendDigestEmail();
        // Reschedule for next occurrence
        scheduleDigest();
      }, msUntilDigest);

      return timeoutId;
    };

    const timeoutId = scheduleDigest();
    return () => clearTimeout(timeoutId);
  }, [preferences, sendDigestEmail]);

  return {
    preferences,
    loading,
    lastDigest,
    pendingMessages,
    updatePreferences,
    queueEmailMessage,
    sendDigestEmail,
    testEmailNotification,
    clearPendingMessages,
    unsubscribeFromEmails,
    loadEmailPreferences
  };
}

function getDefaultEmailPreferences(): EmailPreferences {
  return {
    enabled: false,
    digestEnabled: true,
    digestFrequency: 'daily',
    digestTime: '09:00',
    channels: {
      directMessages: true,
      mentions: true,
      channelMessages: false,
      taskUpdates: true,
      systemNotifications: false
    },
    offlineOnly: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    }
  };
}

function isInQuietHours(quietHours: { start: string; end: string }): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = quietHours.start.split(':').map(Number);
  const [endHour, endMin] = quietHours.end.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle overnight quiet hours
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }
  
  return currentTime >= startTime && currentTime <= endTime;
}

async function syncPreferencesWithServer(preferences: EmailPreferences) {
  // In a real implementation, sync with your backend
  logger.info("Syncing email preferences with server:");
  
  // Simulate API call
  return new Promise(resolve => setTimeout(resolve, 1000));
}

async function sendEmailNotification(payload: {
  type: 'immediate' | 'digest' | 'test';
  userId: string;
  messages?: EmailMessage[];
  digest?: EmailDigest;
  testMessage?: string;
}) {
  // In a real implementation, send via your email service
  logger.info("Sending email notification:");
  
  // Simulate API call
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate occasional failures
      if (Math.random() > 0.95) {
        reject(new Error('Email service temporarily unavailable'));
      } else {
        resolve({ success: true, messageId: `email-${Date.now()}` });
      }
    }, 2000);
  });
}

async function unsubscribeFromEmailNotifications(token?: string) {
  // In a real implementation, handle unsubscribe via your backend
  logger.info("Unsubscribing from email notifications:");
  
  // Simulate API call
  return new Promise(resolve => setTimeout(resolve, 1000));
}