import { useState, useCallback, useRef, useEffect } from 'react';
import { useCalendarIntegration } from './useCalendarIntegration';
import { logger } from "../lib/logger";

interface CalendarNotification {
  id: string;
  eventId: string;
  type: 'reminder' | 'invitation' | 'update' | 'cancellation' | 'response';
  title: string;
  message: string;
  scheduledTime: Date;
  deliveryTime?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'dismissed';
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  actions: NotificationAction[];
  metadata: {
    eventTitle: string;
    eventStartTime: Date;
    organizer: string;
    attendeeCount: number;
    location?: string;
    meetingLink?: string;
  };
}

interface NotificationChannel {
  type: 'email' | 'push' | 'chat' | 'sms' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
  lastDelivery?: Date;
  failureCount: number;
}

interface NotificationRecipient {
  userId: string;
  email: string;
  name: string;
  preferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    chatEnabled: boolean;
    smsEnabled: boolean;
    reminderTimes: number[]; // minutes before event
    quietHours: { start: string; end: string };
    weekendNotifications: boolean;
  };
  timezone: string;
  status: 'active' | 'inactive' | 'bounced' | 'unsubscribed';
}

interface NotificationAction {
  id: string;
  type: 'accept' | 'decline' | 'tentative' | 'view_event' | 'join_meeting' | 'reschedule';
  label: string;
  url?: string;
  callback?: () => void;
  style: 'primary' | 'secondary' | 'danger';
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: CalendarNotification['type'];
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  channels: NotificationChannel['type'][];
  active: boolean;
}

interface NotificationSchedule {
  eventId: string;
  reminders: {
    time: Date;
    notificationId: string;
    sent: boolean;
  }[];
  invitations: {
    recipientId: string;
    notificationId: string;
    sent: boolean;
    responded: boolean;
    response?: 'accepted' | 'declined' | 'tentative';
  }[];
}

interface NotificationMetrics {
  totalSent: number;
  deliveryRate: number;
  responseRate: number;
  channelPerformance: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    responseRate: number;
  }>;
  reminderEffectiveness: {
    beforeTime: number; // minutes
    attendanceRate: number;
  }[];
}

interface NotificationConfig {
  enableAutoReminders: boolean;
  defaultReminderTimes: number[]; // minutes before event
  batchProcessing: {
    enabled: boolean;
    batchSize: number;
    intervalMs: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMs: number[];
    retryChannels: NotificationChannel['type'][];
  };
  rateLimiting: {
    emailsPerHour: number;
    pushPerMinute: number;
    smsPerDay: number;
  };
  templates: {
    useCustomTemplates: boolean;
    fallbackTemplate: string;
  };
}

export function useCalendarNotifications(config?: Partial<NotificationConfig>) {
  const [notifications, setNotifications] = useState<Map<string, CalendarNotification>>(new Map());
  const [schedules, setSchedules] = useState<Map<string, NotificationSchedule>>(new Map());
  const [templates, setTemplates] = useState<Map<string, NotificationTemplate>>(new Map());
  const [recipients, setRecipients] = useState<Map<string, NotificationRecipient>>(new Map());
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const notificationConfig = useRef<NotificationConfig>({
    enableAutoReminders: true,
    defaultReminderTimes: [1440, 60, 15, 5], // 1 day, 1 hour, 15 min, 5 min before
    batchProcessing: {
      enabled: true,
      batchSize: 50,
      intervalMs: 30000 // 30 seconds
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMs: [1000, 5000, 15000],
      retryChannels: ['email', 'push']
    },
    rateLimiting: {
      emailsPerHour: 100,
      pushPerMinute: 60,
      smsPerDay: 50
    },
    templates: {
      useCustomTemplates: true,
      fallbackTemplate: 'default'
    },
    ...config
  });

  const { events } = useCalendarIntegration();
  const processingQueue = useRef<CalendarNotification[]>([]);
  const processingInterval = useRef<NodeJS.Timeout>();

  // Initialize notification system
  useEffect(() => {
    initializeNotifications();
    startProcessingQueue();
    loadDefaultTemplates();
    loadRecipientPreferences();

    return () => {
      if (processingInterval.current) {
        clearInterval(processingInterval.current);
      }
    };
  }, []);

  // Monitor events for notification scheduling
  useEffect(() => {
    events.forEach(event => {
      if (!schedules.has(event.id)) {
        scheduleEventNotifications(event);
      }
    });
  }, [events]);

  const initializeNotifications = async () => {
    try {
      // Initialize notification channels
      await setupNotificationChannels();
      
      // Load existing schedules
      await loadNotificationSchedules();
      
      // Start monitoring for due notifications
      startNotificationMonitoring();
      
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const setupNotificationChannels = async () => {
    // Configure different notification channels
    const channels: NotificationChannel[] = [
      {
        type: 'email',
        enabled: true,
        config: {
          smtpServer: process.env.REACT_APP_SMTP_SERVER,
          fromAddress: 'calendar@meridian.app'
        },
        failureCount: 0
      },
      {
        type: 'push',
        enabled: true,
        config: {
          vapidKey: process.env.REACT_APP_VAPID_KEY,
          endpoint: '/api/push/send'
        },
        failureCount: 0
      },
      {
        type: 'chat',
        enabled: true,
        config: {
          channelId: 'calendar-notifications',
          webhookUrl: '/api/chat/webhook'
        },
        failureCount: 0
      }
    ];

    // Store channel configurations
    localStorage.setItem('notificationChannels', JSON.stringify(channels));
  };

  const loadDefaultTemplates = () => {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'meeting-reminder',
        name: 'Meeting Reminder',
        type: 'reminder',
        subject: 'Reminder: {{eventTitle}} in {{timeUntil}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Meeting Reminder</h2>
            <p>You have a meeting coming up:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>{{eventTitle}}</h3>
              <p><strong>When:</strong> {{eventStartTime}}</p>
              <p><strong>Duration:</strong> {{duration}} minutes</p>
              {{#if location}}<p><strong>Location:</strong> {{location}}</p>{{/if}}
              {{#if meetingLink}}<p><strong>Join:</strong> <a href="{{meetingLink}}">{{meetingLink}}</a></p>{{/if}}
            </div>
            <div style="margin: 20px 0;">
              <a href="{{joinUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Meeting</a>
              <a href="{{eventUrl}}" style="background: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;">View Event</a>
            </div>
          </div>
        `,
        textContent: `
          Meeting Reminder: {{eventTitle}}
          
          When: {{eventStartTime}}
          Duration: {{duration}} minutes
          {{#if location}}Location: {{location}}{{/if}}
          {{#if meetingLink}}Join: {{meetingLink}}{{/if}}
          
          View event: {{eventUrl}}
        `,
        variables: ['eventTitle', 'eventStartTime', 'duration', 'location', 'meetingLink', 'joinUrl', 'eventUrl', 'timeUntil'],
        channels: ['email', 'push', 'chat'],
        active: true
      },
      {
        id: 'meeting-invitation',
        name: 'Meeting Invitation',
        type: 'invitation',
        subject: 'Meeting Invitation: {{eventTitle}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif;">
            <h2>You're Invited to a Meeting</h2>
            <p>{{organizer}} has invited you to:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="margin-top: 0;">{{eventTitle}}</h3>
              <p><strong>When:</strong> {{eventStartTime}} - {{eventEndTime}}</p>
              <p><strong>Organizer:</strong> {{organizer}}</p>
              {{#if description}}<p><strong>Description:</strong> {{description}}</p>{{/if}}
              {{#if location}}<p><strong>Location:</strong> {{location}}</p>{{/if}}
              <p><strong>Attendees:</strong> {{attendeeCount}} people invited</p>
            </div>
            <div style="margin: 30px 0; text-align: center;">
              <a href="{{acceptUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 5px;">Accept</a>
              <a href="{{tentativeUrl}}" style="background: #ffc107; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 5px;">Tentative</a>
              <a href="{{declineUrl}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 0 5px;">Decline</a>
            </div>
          </div>
        `,
        textContent: `
          Meeting Invitation: {{eventTitle}}
          
          {{organizer}} has invited you to a meeting.
          
          When: {{eventStartTime}} - {{eventEndTime}}
          {{#if description}}Description: {{description}}{{/if}}
          {{#if location}}Location: {{location}}{{/if}}
          Attendees: {{attendeeCount}} people invited
          
          Respond: {{responseUrl}}
        `,
        variables: ['eventTitle', 'eventStartTime', 'eventEndTime', 'organizer', 'description', 'location', 'attendeeCount', 'acceptUrl', 'tentativeUrl', 'declineUrl', 'responseUrl'],
        channels: ['email', 'push'],
        active: true
      },
      {
        id: 'meeting-update',
        name: 'Meeting Update',
        type: 'update',
        subject: 'Meeting Updated: {{eventTitle}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Meeting Update</h2>
            <p>The meeting "{{eventTitle}}" has been updated:</p>
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
              <h3>{{eventTitle}}</h3>
              <p><strong>New Time:</strong> {{eventStartTime}} - {{eventEndTime}}</p>
              {{#if location}}<p><strong>Location:</strong> {{location}}</p>{{/if}}
              {{#if changes}}<p><strong>Changes:</strong> {{changes}}</p>{{/if}}
            </div>
            <div style="margin: 20px 0;">
              <a href="{{viewUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Updated Event</a>
            </div>
          </div>
        `,
        textContent: `
          Meeting Update: {{eventTitle}}
          
          The meeting has been updated.
          New Time: {{eventStartTime}} - {{eventEndTime}}
          {{#if location}}Location: {{location}}{{/if}}
          {{#if changes}}Changes: {{changes}}{{/if}}
          
          View event: {{viewUrl}}
        `,
        variables: ['eventTitle', 'eventStartTime', 'eventEndTime', 'location', 'changes', 'viewUrl'],
        channels: ['email', 'push', 'chat'],
        active: true
      }
    ];

    setTemplates(new Map(defaultTemplates.map(t => [t.id, t])));
  };

  const loadRecipientPreferences = async () => {
    // Mock implementation - would load from API
    const mockRecipients: NotificationRecipient[] = [
      {
        userId: 'user-1',
        email: 'user1@meridian.app',
        name: 'User One',
        preferences: {
          emailEnabled: true,
          pushEnabled: true,
          chatEnabled: true,
          smsEnabled: false,
          reminderTimes: [60, 15],
          quietHours: { start: '22:00', end: '08:00' },
          weekendNotifications: false
        },
        timezone: 'America/New_York',
        status: 'active'
      }
    ];

    setRecipients(new Map(mockRecipients.map(r => [r.userId, r])));
  };

  const scheduleEventNotifications = (event: any) => {
    const schedule: NotificationSchedule = {
      eventId: event.id,
      reminders: [],
      invitations: []
    };

    // Schedule reminders
    if (notificationConfig.current.enableAutoReminders) {
      notificationConfig.current.defaultReminderTimes.forEach(minutesBefore => {
        const reminderTime = new Date(event.startTime.getTime() - minutesBefore * 60 * 1000);
        
        if (reminderTime > new Date()) {
          const notificationId = createReminderNotification(event, minutesBefore);
          schedule.reminders.push({
            time: reminderTime,
            notificationId,
            sent: false
          });
        }
      });
    }

    // Schedule invitations
    event.attendees.forEach((attendee: any) => {
      const notificationId = createInvitationNotification(event, attendee);
      schedule.invitations.push({
        recipientId: attendee.userId || attendee.email,
        notificationId,
        sent: false,
        responded: false
      });
    });

    setSchedules(prev => new Map(prev).set(event.id, schedule));
  };

  const createReminderNotification = (event: any, minutesBefore: number): string => {
    const notificationId = generateNotificationId();
    
    const notification: CalendarNotification = {
      id: notificationId,
      eventId: event.id,
      type: 'reminder',
      title: `Meeting Reminder: ${event.title}`,
      message: `Your meeting "${event.title}" starts in ${minutesBefore} minutes`,
      scheduledTime: new Date(event.startTime.getTime() - minutesBefore * 60 * 1000),
      status: 'pending',
      channels: getEnabledChannels(['email', 'push', 'chat']),
      recipients: event.attendees.map((attendee: any) => 
        recipients.get(attendee.userId) || createDefaultRecipient(attendee)
      ),
      actions: [
        {
          id: 'join',
          type: 'join_meeting',
          label: 'Join Meeting',
          url: event.meetingLink,
          style: 'primary'
        },
        {
          id: 'view',
          type: 'view_event',
          label: 'View Event',
          url: `/calendar/events/${event.id}`,
          style: 'secondary'
        }
      ],
      metadata: {
        eventTitle: event.title,
        eventStartTime: event.startTime,
        organizer: event.organizer.name,
        attendeeCount: event.attendees.length,
        location: event.location,
        meetingLink: event.meetingLink
      }
    };

    setNotifications(prev => new Map(prev).set(notificationId, notification));
    return notificationId;
  };

  const createInvitationNotification = (event: any, attendee: any): string => {
    const notificationId = generateNotificationId();
    
    const notification: CalendarNotification = {
      id: notificationId,
      eventId: event.id,
      type: 'invitation',
      title: `Meeting Invitation: ${event.title}`,
      message: `You've been invited to "${event.title}" by ${event.organizer.name}`,
      scheduledTime: new Date(), // Send immediately
      status: 'pending',
      channels: getEnabledChannels(['email', 'push']),
      recipients: [recipients.get(attendee.userId) || createDefaultRecipient(attendee)],
      actions: [
        {
          id: 'accept',
          type: 'accept',
          label: 'Accept',
          url: `/calendar/events/${event.id}/respond?response=accepted`,
          style: 'primary'
        },
        {
          id: 'tentative',
          type: 'tentative',
          label: 'Tentative',
          url: `/calendar/events/${event.id}/respond?response=tentative`,
          style: 'secondary'
        },
        {
          id: 'decline',
          type: 'decline',
          label: 'Decline',
          url: `/calendar/events/${event.id}/respond?response=declined`,
          style: 'danger'
        }
      ],
      metadata: {
        eventTitle: event.title,
        eventStartTime: event.startTime,
        organizer: event.organizer.name,
        attendeeCount: event.attendees.length,
        location: event.location,
        meetingLink: event.meetingLink
      }
    };

    setNotifications(prev => new Map(prev).set(notificationId, notification));
    return notificationId;
  };

  const startProcessingQueue = () => {
    if (processingInterval.current) {
      clearInterval(processingInterval.current);
    }

    processingInterval.current = setInterval(() => {
      processNotificationQueue();
    }, notificationConfig.current.batchProcessing.intervalMs);
  };

  const startNotificationMonitoring = () => {
    setInterval(() => {
      checkDueNotifications();
    }, 60000); // Check every minute
  };

  const checkDueNotifications = () => {
    const now = new Date();
    
    schedules.forEach(schedule => {
      // Check due reminders
      schedule.reminders.forEach(reminder => {
        if (!reminder.sent && reminder.time <= now) {
          const notification = notifications.get(reminder.notificationId);
          if (notification) {
            queueNotification(notification);
            reminder.sent = true;
          }
        }
      });

      // Check pending invitations
      schedule.invitations.forEach(invitation => {
        if (!invitation.sent) {
          const notification = notifications.get(invitation.notificationId);
          if (notification) {
            queueNotification(notification);
            invitation.sent = true;
          }
        }
      });
    });
  };

  const queueNotification = (notification: CalendarNotification) => {
    processingQueue.current.push(notification);
  };

  const processNotificationQueue = async () => {
    if (processingQueue.current.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);
    const batchSize = notificationConfig.current.batchProcessing.batchSize;
    const batch = processingQueue.current.splice(0, batchSize);

    try {
      await Promise.all(batch.map(notification => processNotification(notification)));
    } catch (error) {
      console.error('Batch notification processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processNotification = async (notification: CalendarNotification) => {
    try {
      // Update notification status
      updateNotificationStatus(notification.id, 'processing');

      // Send through enabled channels
      const results = await Promise.allSettled(
        notification.channels
          .filter(channel => channel.enabled)
          .map(channel => sendNotificationThroughChannel(notification, channel))
      );

      // Check if any channel succeeded
      const hasSuccess = results.some(result => result.status === 'fulfilled');
      
      if (hasSuccess) {
        updateNotificationStatus(notification.id, 'sent');
      } else {
        updateNotificationStatus(notification.id, 'failed');
        scheduleRetry(notification);
      }

    } catch (error) {
      console.error(`Failed to process notification ${notification.id}:`, error);
      updateNotificationStatus(notification.id, 'failed');
    }
  };

  const sendNotificationThroughChannel = async (
    notification: CalendarNotification,
    channel: NotificationChannel
  ): Promise<void> => {
    switch (channel.type) {
      case 'email':
        return sendEmailNotification(notification, channel);
      case 'push':
        return sendPushNotification(notification, channel);
      case 'chat':
        return sendChatNotification(notification, channel);
      case 'sms':
        return sendSMSNotification(notification, channel);
      case 'webhook':
        return sendWebhookNotification(notification, channel);
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  };

  const sendEmailNotification = async (
    notification: CalendarNotification,
    channel: NotificationChannel
  ): Promise<void> => {
    // Mock implementation - would integrate with email service
    logger.info("Sending email notification: ${notification.title}");
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const sendPushNotification = async (
    notification: CalendarNotification,
    channel: NotificationChannel
  ): Promise<void> => {
    // Mock implementation - would integrate with push service
    logger.info("Sending push notification: ${notification.title}");
    await new Promise(resolve => setTimeout(resolve, 200));
  };

  const sendChatNotification = async (
    notification: CalendarNotification,
    channel: NotificationChannel
  ): Promise<void> => {
    // Mock implementation - would integrate with chat service
    logger.info("Sending chat notification: ${notification.title}");
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const sendSMSNotification = async (
    notification: CalendarNotification,
    channel: NotificationChannel
  ): Promise<void> => {
    // Mock implementation - would integrate with SMS service
    logger.info("Sending SMS notification: ${notification.title}");
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const sendWebhookNotification = async (
    notification: CalendarNotification,
    channel: NotificationChannel
  ): Promise<void> => {
    // Mock implementation - would send webhook
    logger.info("Sending webhook notification: ${notification.title}");
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  const updateNotificationStatus = (
    notificationId: string,
    status: CalendarNotification['status']
  ) => {
    setNotifications(prev => {
      const updated = new Map(prev);
      const notification = updated.get(notificationId);
      if (notification) {
        notification.status = status;
        if (status === 'sent' || status === 'delivered') {
          notification.deliveryTime = new Date();
        }
      }
      return updated;
    });
  };

  const scheduleRetry = (notification: CalendarNotification) => {
    const config = notificationConfig.current.retryPolicy;
    const retryCount = notification.metadata.retryCount || 0;
    
    if (retryCount < config.maxRetries) {
      const delay = config.backoffMs[retryCount] || config.backoffMs[config.backoffMs.length - 1];
      
      setTimeout(() => {
        const updatedNotification = {
          ...notification,
          metadata: { ...notification.metadata, retryCount: retryCount + 1 }
        };
        queueNotification(updatedNotification);
      }, delay);
    }
  };

  // Utility functions
  const generateNotificationId = (): string => 
    `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getEnabledChannels = (types: NotificationChannel['type'][]): NotificationChannel[] => {
    return types.map(type => ({
      type,
      enabled: true,
      config: {},
      failureCount: 0
    }));
  };

  const createDefaultRecipient = (attendee: any): NotificationRecipient => ({
    userId: attendee.userId || attendee.email,
    email: attendee.email,
    name: attendee.name,
    preferences: {
      emailEnabled: true,
      pushEnabled: true,
      chatEnabled: true,
      smsEnabled: false,
      reminderTimes: [60, 15],
      quietHours: { start: '22:00', end: '08:00' },
      weekendNotifications: true
    },
    timezone: 'UTC',
    status: 'active'
  });

  const loadNotificationSchedules = async () => {
    // Mock implementation - would load from API
    logger.info("Loading notification schedules...");
  };

  // Public API
  const sendEventNotification = useCallback(async (
    eventId: string,
    type: CalendarNotification['type'],
    customMessage?: string
  ) => {
    const event = events.find(e => e.id === eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    let notification: CalendarNotification;
    
    switch (type) {
      case 'reminder':
        notification = {
          id: generateNotificationId(),
          eventId,
          type: 'reminder',
          title: `Reminder: ${event.title}`,
          message: customMessage || `Don't forget about your meeting "${event.title}"`,
          scheduledTime: new Date(),
          status: 'pending',
          channels: getEnabledChannels(['push', 'chat']),
          recipients: event.attendees.map((attendee: any) => 
            recipients.get(attendee.userId) || createDefaultRecipient(attendee)
          ),
          actions: [
            {
              id: 'join',
              type: 'join_meeting',
              label: 'Join Now',
              url: event.meetingLink,
              style: 'primary'
            }
          ],
          metadata: {
            eventTitle: event.title,
            eventStartTime: event.startTime,
            organizer: event.organizer.name,
            attendeeCount: event.attendees.length,
            location: event.location,
            meetingLink: event.meetingLink
          }
        };
        break;
        
      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }

    setNotifications(prev => new Map(prev).set(notification.id, notification));
    queueNotification(notification);
    
    return notification.id;
  }, [events, recipients]);

  const dismissNotification = useCallback((notificationId: string) => {
    updateNotificationStatus(notificationId, 'dismissed');
  }, []);

  const getNotificationHistory = useCallback((eventId?: string) => {
    const allNotifications = Array.from(notifications.values());
    
    if (eventId) {
      return allNotifications.filter(n => n.eventId === eventId);
    }
    
    return allNotifications.sort((a, b) => 
      b.scheduledTime.getTime() - a.scheduledTime.getTime()
    );
  }, [notifications]);

  return {
    // State
    notifications: Array.from(notifications.values()),
    schedules: Array.from(schedules.values()),
    templates: Array.from(templates.values()),
    recipients: Array.from(recipients.values()),
    metrics,
    isProcessing,
    
    // Actions
    sendEventNotification,
    dismissNotification,
    
    // Configuration
    updateConfig: (newConfig: Partial<NotificationConfig>) => {
      notificationConfig.current = { ...notificationConfig.current, ...newConfig };
    },
    
    // Recipients management
    updateRecipientPreferences: (userId: string, preferences: Partial<NotificationRecipient['preferences']>) => {
      setRecipients(prev => {
        const updated = new Map(prev);
        const recipient = updated.get(userId);
        if (recipient) {
          recipient.preferences = { ...recipient.preferences, ...preferences };
        }
        return updated;
      });
    },
    
    // Templates management
    createTemplate: (template: Omit<NotificationTemplate, 'id'>) => {
      const templateId = generateNotificationId();
      setTemplates(prev => new Map(prev).set(templateId, { ...template, id: templateId }));
    },
    
    // Utilities
    getNotificationHistory,
    
    // Computed values
    pendingNotifications: Array.from(notifications.values()).filter(n => n.status === 'pending'),
    recentNotifications: Array.from(notifications.values())
      .filter(n => Date.now() - n.scheduledTime.getTime() < 24 * 60 * 60 * 1000)
      .sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime()),
    
    failedNotifications: Array.from(notifications.values()).filter(n => n.status === 'failed')
  };
}