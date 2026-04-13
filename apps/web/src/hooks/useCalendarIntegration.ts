import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from "../lib/logger";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: CalendarAttendee[];
  organizer: CalendarAttendee;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  recurring?: RecurrenceRule;
  reminders: EventReminder[];
  meetingLink?: string;
  source: 'meridian' | 'google' | 'outlook' | 'apple' | 'external';
  metadata: {
    chatId?: string;
    messageId?: string;
    projectId?: string;
    taskId?: string;
    createdFromChat?: boolean;
  };
}

interface CalendarAttendee {
  email: string;
  name: string;
  userId?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  optional: boolean;
  organizer?: boolean;
}

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number;
  weekOfMonth?: number;
}

interface EventReminder {
  method: 'email' | 'popup' | 'notification';
  minutes: number; // Minutes before event
}

interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple' | 'caldav';
  connected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  syncEnabled: boolean;
  defaultCalendarId?: string;
  settings: {
    syncDirection: 'bidirectional' | 'import_only' | 'export_only';
    conflictResolution: 'meridian_wins' | 'external_wins' | 'manual';
    autoCreateMeetingLinks: boolean;
    defaultReminders: EventReminder[];
  };
}

interface MeetingTemplate {
  id: string;
  name: string;
  duration: number; // minutes
  description?: string;
  location?: string;
  defaultAttendees: string[];
  reminders: EventReminder[];
  recurring?: RecurrenceRule;
  requiresApproval: boolean;
  tags: string[];
}

interface CalendarConfig {
  enableSmartScheduling: boolean;
  workingHours: {
    start: string; // HH:mm format
    end: string;
    timezone: string;
    daysOfWeek: number[];
  };
  meetingPreferences: {
    defaultDuration: number;
    bufferTime: number; // minutes between meetings
    maxDailyMeetings: number;
    autoDeclineConflicts: boolean;
  };
  notificationSettings: {
    enableEmailNotifications: boolean;
    enablePushNotifications: boolean;
    enableChatNotifications: boolean;
    reminderTimes: number[]; // minutes before event
  };
  integrationSettings: {
    autoCreateFromChatKeywords: string[];
    enableMeetingLinkGeneration: boolean;
    defaultMeetingProvider: 'zoom' | 'teams' | 'meet' | 'webex';
    syncInterval: number; // minutes
  };
}

interface AvailabilitySlot {
  start: Date;
  end: Date;
  attendees: string[];
  conflictLevel: 'free' | 'tentative' | 'busy' | 'outOfOffice';
}

interface SchedulingConflict {
  type: 'overlap' | 'back_to_back' | 'outside_hours' | 'attendee_unavailable';
  severity: 'warning' | 'error';
  message: string;
  suggestions: string[];
  affectedAttendees?: string[];
}

export function useCalendarIntegration(config?: Partial<CalendarConfig>) {
  const [events, setEvents] = useState<Map<string, CalendarEvent>>(new Map());
  const [providers, setProviders] = useState<Map<string, CalendarProvider>>(new Map());
  const [templates, setTemplates] = useState<Map<string, MeetingTemplate>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const calendarConfig = useRef<CalendarConfig>({
    enableSmartScheduling: true,
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
    },
    meetingPreferences: {
      defaultDuration: 30,
      bufferTime: 5,
      maxDailyMeetings: 8,
      autoDeclineConflicts: false
    },
    notificationSettings: {
      enableEmailNotifications: true,
      enablePushNotifications: true,
      enableChatNotifications: true,
      reminderTimes: [15, 5] // 15 and 5 minutes before
    },
    integrationSettings: {
      autoCreateFromChatKeywords: ['meeting', 'schedule', 'call', 'discuss', 'sync'],
      enableMeetingLinkGeneration: true,
      defaultMeetingProvider: 'zoom',
      syncInterval: 15
    },
    ...config
  });

  const syncInterval = useRef<NodeJS.Timeout>();

  // Initialize calendar integration
  useEffect(() => {
    initializeCalendar();
    setupAutoSync();
    loadMeetingTemplates();

    return () => {
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
      }
    };
  }, []);

  const initializeCalendar = async () => {
    setIsLoading(true);
    try {
      // Load saved providers
      await loadCalendarProviders();
      
      // Initial sync
      await syncAllCalendars();
      
      // Load user events
      await loadEvents();
      
    } catch (error) {
      console.error('Failed to initialize calendar:', error);
      setSyncError(error instanceof Error ? error.message : 'Initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalendarProviders = async () => {
    // Mock implementation - would load from API/storage
    const mockProviders: CalendarProvider[] = [
      {
        id: 'google-primary',
        name: 'Google Calendar',
        type: 'google',
        connected: true,
        syncEnabled: true,
        settings: {
          syncDirection: 'bidirectional',
          conflictResolution: 'manual',
          autoCreateMeetingLinks: true,
          defaultReminders: [
            { method: 'popup', minutes: 15 },
            { method: 'email', minutes: 60 }
          ]
        }
      },
      {
        id: 'outlook-work',
        name: 'Outlook Work',
        type: 'outlook',
        connected: false,
        syncEnabled: false,
        settings: {
          syncDirection: 'import_only',
          conflictResolution: 'external_wins',
          autoCreateMeetingLinks: false,
          defaultReminders: [
            { method: 'popup', minutes: 10 }
          ]
        }
      }
    ];

    setProviders(new Map(mockProviders.map(p => [p.id, p])));
  };

  const loadMeetingTemplates = async () => {
    const defaultTemplates: MeetingTemplate[] = [
      {
        id: 'standup',
        name: 'Daily Standup',
        duration: 15,
        description: 'Daily team standup meeting',
        defaultAttendees: [],
        reminders: [{ method: 'popup', minutes: 5 }],
        requiresApproval: false,
        tags: ['daily', 'team']
      },
      {
        id: 'one-on-one',
        name: '1:1 Meeting',
        duration: 30,
        description: 'One-on-one discussion',
        defaultAttendees: [],
        reminders: [{ method: 'popup', minutes: 10 }],
        requiresApproval: false,
        tags: ['1:1', 'personal']
      },
      {
        id: 'project-review',
        name: 'Project Review',
        duration: 60,
        description: 'Project progress review meeting',
        defaultAttendees: [],
        reminders: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ],
        requiresApproval: true,
        tags: ['project', 'review']
      }
    ];

    setTemplates(new Map(defaultTemplates.map(t => [t.id, t])));
  };

  const setupAutoSync = () => {
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
    }

    syncInterval.current = setInterval(() => {
      syncAllCalendars();
    }, calendarConfig.current.integrationSettings.syncInterval * 60 * 1000);
  };

  const syncAllCalendars = async () => {
    try {
      setSyncError(null);
      
      for (const provider of providers.values()) {
        if (provider.connected && provider.syncEnabled) {
          await syncProvider(provider);
        }
      }
      
      setLastSync(new Date());
    } catch (error) {
      console.error('Calendar sync failed:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    }
  };

  const syncProvider = async (provider: CalendarProvider) => {
    // Mock implementation - would sync with actual calendar provider
    logger.info("Syncing ${provider.name} calendar...");
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Would fetch events from provider API and update local storage
  };

  const loadEvents = async (dateRange?: { start: Date; end: Date }) => {
    // Mock implementation - would load from API
    const mockEvents: CalendarEvent[] = [
      {
        id: 'evt-1',
        title: 'Team Standup',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        endTime: new Date(Date.now() + 2.25 * 60 * 60 * 1000),
        attendees: [
          { email: 'user@meridian.app', name: 'Current User', status: 'accepted', optional: false, organizer: true }
        ],
        organizer: { email: 'user@meridian.app', name: 'Current User', status: 'accepted', optional: false, organizer: true },
        status: 'confirmed',
        visibility: 'public',
        reminders: [{ method: 'popup', minutes: 15 }],
        source: 'meridian',
        metadata: { createdFromChat: true }
      }
    ];

    setEvents(new Map(mockEvents.map(e => [e.id, e])));
  };

  // Create calendar event
  const createEvent = useCallback(async (
    eventData: Omit<CalendarEvent, 'id' | 'organizer'>,
    providerId?: string
  ): Promise<CalendarEvent> => {
    const eventId = generateEventId();
    const currentUser = getCurrentUser(); // Would get from auth context

    const event: CalendarEvent = {
      ...eventData,
      id: eventId,
      organizer: currentUser,
      metadata: {
        ...eventData.metadata,
        createdFromChat: true
      }
    };

    // Validate event
    const conflicts = await checkSchedulingConflicts(event);
    if (conflicts.some(c => c.severity === 'error')) {
      throw new Error(`Scheduling conflict: ${conflicts[0].message}`);
    }

    // Create in selected provider
    if (providerId) {
      const provider = providers.get(providerId);
      if (provider?.connected) {
        await createEventInProvider(event, provider);
      }
    }

    // Save locally
    setEvents(prev => new Map(prev).set(eventId, event));

    // Send notifications
    await sendEventNotifications(event, 'created');

    return event;
  }, [providers]);

  // Schedule meeting from chat
  const scheduleMeetingFromChat = useCallback(async (
    chatData: {
      chatId: string;
      messageId: string;
      participants: string[];
      suggestedTime?: Date;
      duration?: number;
      title?: string;
      description?: string;
    }
  ): Promise<CalendarEvent> => {
    const duration = chatData.duration || calendarConfig.current.meetingPreferences.defaultDuration;
    const startTime = chatData.suggestedTime || await findNextAvailableSlot(
      chatData.participants,
      duration,
      new Date()
    );

    const event: Omit<CalendarEvent, 'id' | 'organizer'> = {
      title: chatData.title || `Meeting from chat`,
      description: chatData.description || `Meeting scheduled from chat discussion`,
      startTime,
      endTime: new Date(startTime.getTime() + duration * 60 * 1000),
      attendees: await getAttendeesFromUserIds(chatData.participants),
      status: 'tentative',
      visibility: 'public',
      reminders: calendarConfig.current.notificationSettings.reminderTimes.map(minutes => ({
        method: 'popup' as const,
        minutes
      })),
      meetingLink: await generateMeetingLink(),
      source: 'meridian',
      metadata: {
        chatId: chatData.chatId,
        messageId: chatData.messageId,
        createdFromChat: true
      }
    };

    return await createEvent(event);
  }, [createEvent]);

  // Find available time slots
  const findAvailableSlots = useCallback(async (
    attendees: string[],
    duration: number,
    searchStart: Date,
    searchEnd: Date,
    maxResults: number = 10
  ): Promise<AvailabilitySlot[]> => {
    const slots: AvailabilitySlot[] = [];
    const workingHours = calendarConfig.current.workingHours;
    
    // Get busy times for all attendees
    const busyTimes = await getBusyTimes(attendees, searchStart, searchEnd);
    
    // Find free slots within working hours
    const currentTime = new Date(searchStart);
    
    while (currentTime < searchEnd && slots.length < maxResults) {
      const dayOfWeek = currentTime.getDay();
      
      // Check if it's a working day
      if (workingHours.daysOfWeek.includes(dayOfWeek)) {
        const dayStart = new Date(currentTime);
        const [startHour, startMinute] = workingHours.start.split(':').map(Number);
        dayStart.setHours(startHour, startMinute, 0, 0);
        
        const dayEnd = new Date(currentTime);
        const [endHour, endMinute] = workingHours.end.split(':').map(Number);
        dayEnd.setHours(endHour, endMinute, 0, 0);
        
        // Find free slots within the day
        const daySlots = findFreeSlotsInDay(
          dayStart,
          dayEnd,
          duration,
          busyTimes,
          attendees
        );
        
        slots.push(...daySlots);
      }
      
      // Move to next day
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(0, 0, 0, 0);
    }
    
    return slots.slice(0, maxResults);
  }, []);

  const findNextAvailableSlot = useCallback(async (
    attendees: string[],
    duration: number,
    after: Date
  ): Promise<Date> => {
    const searchEnd = new Date(after.getTime() + 7 * 24 * 60 * 60 * 1000); // Search next 7 days
    const slots = await findAvailableSlots(attendees, duration, after, searchEnd, 1);
    
    if (slots.length === 0) {
      throw new Error('No available time slots found in the next 7 days');
    }
    
    return slots[0].start;
  }, [findAvailableSlots]);

  // Check for scheduling conflicts
  const checkSchedulingConflicts = useCallback(async (
    event: CalendarEvent
  ): Promise<SchedulingConflict[]> => {
    const conflicts: SchedulingConflict[] = [];
    
    // Check working hours
    const workingHours = calendarConfig.current.workingHours;
    const eventStart = event.startTime;
    const dayOfWeek = eventStart.getDay();
    
    if (!workingHours.daysOfWeek.includes(dayOfWeek)) {
      conflicts.push({
        type: 'outside_hours',
        severity: 'warning',
        message: 'Event is scheduled outside working days',
        suggestions: ['Consider rescheduling to a working day']
      });
    }
    
    const eventHour = eventStart.getHours() + eventStart.getMinutes() / 60;
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    const workStartTime = startHour + startMinute / 60;
    const workEndTime = endHour + endMinute / 60;
    
    if (eventHour < workStartTime || eventHour > workEndTime) {
      conflicts.push({
        type: 'outside_hours',
        severity: 'warning',
        message: 'Event is scheduled outside working hours',
        suggestions: [`Consider scheduling between ${workingHours.start} and ${workingHours.end}`]
      });
    }
    
    // Check for overlapping events
    const existingEvents = Array.from(events.values());
    const overlapping = existingEvents.filter(existing => 
      existing.id !== event.id &&
      existing.status !== 'cancelled' &&
      (
        (event.startTime >= existing.startTime && event.startTime < existing.endTime) ||
        (event.endTime > existing.startTime && event.endTime <= existing.endTime) ||
        (event.startTime <= existing.startTime && event.endTime >= existing.endTime)
      )
    );
    
    if (overlapping.length > 0) {
      conflicts.push({
        type: 'overlap',
        severity: 'error',
        message: `Conflicts with ${overlapping.length} existing event(s)`,
        suggestions: ['Choose a different time slot', 'Cancel conflicting events']
      });
    }
    
    // Check attendee availability
    for (const attendee of event.attendees) {
      const isAvailable = await checkAttendeeAvailability(
        attendee.email,
        event.startTime,
        event.endTime
      );
      
      if (!isAvailable) {
        conflicts.push({
          type: 'attendee_unavailable',
          severity: 'warning',
          message: `${attendee.name} may not be available`,
          suggestions: ['Check with attendee', 'Find alternative time'],
          affectedAttendees: [attendee.email]
        });
      }
    }
    
    return conflicts;
  }, [events]);

  // Generate meeting link
  const generateMeetingLink = async (): Promise<string> => {
    const provider = calendarConfig.current.integrationSettings.defaultMeetingProvider;
    const meetingId = generateMeetingId();
    
    // Mock implementation - would integrate with actual meeting providers
    switch (provider) {
      case 'zoom':
        return `https://zoom.us/j/${meetingId}`;
      case 'teams':
        return `https://teams.microsoft.com/l/meetup-join/${meetingId}`;
      case 'meet':
        return `https://meet.google.com/${meetingId}`;
      case 'webex':
        return `https://webex.com/meet/${meetingId}`;
      default:
        return `https://meridian.com/meet/${meetingId}`;
    }
  };

  // Send event notifications
  const sendEventNotifications = async (
    event: CalendarEvent,
    action: 'created' | 'updated' | 'cancelled' | 'reminder'
  ) => {
    const config = calendarConfig.current.notificationSettings;
    
    if (config.enableChatNotifications && event.metadata.chatId) {
      // Send notification to chat
      await sendChatNotification(event, action);
    }
    
    if (config.enableEmailNotifications) {
      // Send email notifications
      await sendEmailNotifications(event, action);
    }
    
    if (config.enablePushNotifications) {
      // Send push notifications
      await sendPushNotifications(event, action);
    }
  };

  // Utility functions
  const getCurrentUser = (): CalendarAttendee => ({
    email: 'user@meridian.app', // Would get from auth context
    name: 'Current User',
    status: 'accepted',
    optional: false,
    organizer: true
  });

  const generateEventId = (): string => 
    `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const generateMeetingId = (): string => 
    Math.random().toString(36).substr(2, 11);

  const getAttendeesFromUserIds = async (userIds: string[]): Promise<CalendarAttendee[]> => {
    // Mock implementation - would fetch user details from API
    return userIds.map((id, index) => ({
      email: `user${index}@meridian.app`,
      name: `User ${index + 1}`,
      userId: id,
      status: 'needsAction',
      optional: false
    }));
  };

  const getBusyTimes = async (
    attendees: string[],
    start: Date,
    end: Date
  ): Promise<{ start: Date; end: Date; attendee: string }[]> => {
    // Mock implementation - would fetch from calendar providers
    return [];
  };

  const findFreeSlotsInDay = (
    dayStart: Date,
    dayEnd: Date,
    duration: number,
    busyTimes: { start: Date; end: Date; attendee: string }[],
    attendees: string[]
  ): AvailabilitySlot[] => {
    const slots: AvailabilitySlot[] = [];
    const slotDuration = duration * 60 * 1000; // Convert to milliseconds
    const bufferTime = calendarConfig.current.meetingPreferences.bufferTime * 60 * 1000;
    
    let currentTime = new Date(dayStart);
    
    while (currentTime.getTime() + slotDuration <= dayEnd.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);
      
      // Check if slot conflicts with busy times
      const hasConflict = busyTimes.some(busy => 
        (currentTime >= busy.start && currentTime < busy.end) ||
        (slotEnd > busy.start && slotEnd <= busy.end) ||
        (currentTime <= busy.start && slotEnd >= busy.end)
      );
      
      if (!hasConflict) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd),
          attendees,
          conflictLevel: 'free'
        });
      }
      
      // Move to next potential slot (with buffer time)
      currentTime = new Date(currentTime.getTime() + (duration + calendarConfig.current.meetingPreferences.bufferTime) * 60 * 1000);
    }
    
    return slots;
  };

  const checkAttendeeAvailability = async (
    email: string,
    start: Date,
    end: Date
  ): Promise<boolean> => {
    // Mock implementation - would check with calendar providers
    return Math.random() > 0.3; // 70% chance of being available
  };

  const createEventInProvider = async (event: CalendarEvent, provider: CalendarProvider) => {
    // Mock implementation - would create event in external calendar
    logger.info("Creating event in ${provider.name}:");
  };

  const sendChatNotification = async (event: CalendarEvent, action: string) => {
    // Would integrate with chat system
    logger.info("Sending chat notification for event ${action}:");
  };

  const sendEmailNotifications = async (event: CalendarEvent, action: string) => {
    // Would send email notifications
    logger.info("Sending email notifications for event ${action}:");
  };

  const sendPushNotifications = async (event: CalendarEvent, action: string) => {
    // Would send push notifications
    logger.info("Sending push notifications for event ${action}:");
  };

  return {
    // State
    events: Array.from(events.values()),
    providers: Array.from(providers.values()),
    templates: Array.from(templates.values()),
    isLoading,
    lastSync,
    syncError,
    
    // Calendar operations
    createEvent,
    scheduleMeetingFromChat,
    updateEvent: async (eventId: string, updates: Partial<CalendarEvent>) => {
      setEvents(prev => {
        const updated = new Map(prev);
        const event = updated.get(eventId);
        if (event) {
          const updatedEvent = { ...event, ...updates };
          updated.set(eventId, updatedEvent);
          sendEventNotifications(updatedEvent, 'updated');
        }
        return updated;
      });
    },
    deleteEvent: async (eventId: string) => {
      const event = events.get(eventId);
      if (event) {
        await sendEventNotifications(event, 'cancelled');
        setEvents(prev => {
          const updated = new Map(prev);
          updated.delete(eventId);
          return updated;
        });
      }
    },
    
    // Scheduling utilities
    findAvailableSlots,
    findNextAvailableSlot,
    checkSchedulingConflicts,
    
    // Provider management
    connectProvider: async (providerType: CalendarProvider['type']) => {
      // Would handle OAuth flow
      logger.info("Connecting to ${providerType} calendar...");
    },
    disconnectProvider: async (providerId: string) => {
      setProviders(prev => {
        const updated = new Map(prev);
        const provider = updated.get(providerId);
        if (provider) {
          provider.connected = false;
          provider.syncEnabled = false;
        }
        return updated;
      });
    },
    
    // Sync operations
    syncAllCalendars,
    manualSync: () => syncAllCalendars(),
    
    // Configuration
    updateConfig: (newConfig: Partial<CalendarConfig>) => {
      calendarConfig.current = { ...calendarConfig.current, ...newConfig };
    },
    
    // Templates
    createTemplate: (template: Omit<MeetingTemplate, 'id'>) => {
      const templateId = `template_${Date.now()}`;
      setTemplates(prev => new Map(prev).set(templateId, { ...template, id: templateId }));
    },
    
    // Computed values
    upcomingEvents: Array.from(events.values()).filter(e => 
      e.startTime > new Date() && e.status !== 'cancelled'
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    
    connectedProviders: Array.from(providers.values()).filter(p => p.connected),
    
    todaysEvents: Array.from(events.values()).filter(e => {
      const today = new Date();
      const eventDate = e.startTime;
      return eventDate.toDateString() === today.toDateString() && e.status !== 'cancelled';
    })
  };
}