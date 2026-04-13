import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { lazyLoaders } from '../utils/lazy-loader';
import { getDatabase } from '../database/connection';
import { userTable, userPreferencesExtendedTable } from '../database/schema';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '../utils/logger';
import getTeamEvents from './controllers/get-team-events';

const calendar = new Hono();

// Google Calendar OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/google/callback';

// Initialize Google OAuth2 client lazily
let oauth2Client: any = null;

async function getGoogleAuth() {
  if (!oauth2Client) {
    const googleapis = await lazyLoaders.googleapis();
    oauth2Client = new googleapis.google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );
  }
  return oauth2Client;
}

// Get Google Calendar authorization URL
calendar.get('/google/auth', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) {
    return c.json({ error: 'Missing userId' }, 400);
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass userId in state for callback
  });

  return c.json({ authUrl });
});

// Google Calendar OAuth2 callback
calendar.get('/google/callback', async (c) => {
  const { code, state: userId } = c.req.query();
  
  if (!code || !userId) {
    return c.json({ error: 'Missing authorization code or user ID' }, 400);
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in user preferences
    const calendarPrefs = {
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
    };

    const db = getDatabase();
    await db.insert(userPreferencesExtendedTable).values({
      id: createId(),
      userId,
      preferenceType: 'calendar',
      preferenceData: JSON.stringify(calendarPrefs),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [userPreferencesExtendedTable.userId, userPreferencesExtendedTable.preferenceType],
      set: {
        preferenceData: JSON.stringify(calendarPrefs),
        updatedAt: new Date(),
      },
    });

    return c.json({ success: true, message: 'Calendar connected successfully' });
  } catch (error) {
    logger.error('Google Calendar OAuth error:', error);
    return c.json({ error: 'Failed to connect calendar' }, 500);
  }
});

// OLD Google Calendar Create - DEPRECATED (commented out - using new calendar system below)
/*
calendar.post('/events', async (c) => {
  const { userId, title, description, startTime, endTime, participants } = await c.req.json();

  if (!userId || !title || !startTime) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  try {
    const db = getDatabase();
    const prefs = await db.query.userPreferencesExtendedTable.findFirst({
      where: (prefs, { eq, and }) => and(
        eq(prefs.userId, userId),
        eq(prefs.preferenceType, 'calendar')
      ),
    });

    if (!prefs) {
      return c.json({ error: 'Calendar not connected' }, 400);
    }

    const calendarPrefs = JSON.parse(prefs.preferenceData);
    
    if (calendarPrefs.provider === 'google') {
      oauth2Client.setCredentials({
        access_token: calendarPrefs.accessToken,
        refresh_token: calendarPrefs.refreshToken,
        expiry_date: calendarPrefs.expiryDate,
      });

      const googleapis = await lazyLoaders.googleapis();
      const calendar = googleapis.google.calendar({ version: 'v3', auth: oauth2Client });

      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: new Date(startTime).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime ? new Date(endTime).toISOString() : new Date(startTime + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
        attendees: participants?.map((email: string) => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all',
      });

      return c.json({ 
        success: true, 
        eventId: response.data.id,
        eventUrl: response.data.htmlLink 
      });
    }

    return c.json({ error: 'Unsupported calendar provider' }, 400);
  } catch (error) {
    logger.error('Calendar event creation error:', error);
    return c.json({ error: 'Failed to create calendar event' }, 500);
  }
});
*/

// OLD Google Calendar Update - DEPRECATED (commented out - using new calendar system below)
/*
calendar.patch('/events/:eventId', async (c) => {
  const eventId = c.req.param('eventId');
  const { userId, title, description, startTime, endTime, participants } = await c.req.json();

  if (!userId || !eventId) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  try {
    const db = getDatabase();
    const prefs = await db.query.userPreferencesExtendedTable.findFirst({
      where: (prefs, { eq, and }) => and(
        eq(prefs.userId, userId),
        eq(prefs.preferenceType, 'calendar')
      ),
    });

    if (!prefs) {
      return c.json({ error: 'Calendar not connected' }, 400);
    }

    const calendarPrefs = JSON.parse(prefs.preferenceData);
    
    if (calendarPrefs.provider === 'google') {
      oauth2Client.setCredentials({
        access_token: calendarPrefs.accessToken,
        refresh_token: calendarPrefs.refreshToken,
        expiry_date: calendarPrefs.expiryDate,
      });

      const googleapis = await lazyLoaders.googleapis();
      const calendar = googleapis.google.calendar({ version: 'v3', auth: oauth2Client });

      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: new Date(startTime).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime ? new Date(endTime).toISOString() : new Date(startTime + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
        attendees: participants?.map((email: string) => ({ email })) || [],
      };

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: event,
        sendUpdates: 'all',
      });

      return c.json({ 
        success: true, 
        eventId: response.data.id,
        eventUrl: response.data.htmlLink 
      });
    }

    return c.json({ error: 'Unsupported calendar provider' }, 400);
  } catch (error) {
    logger.error('Calendar event update error:', error);
    return c.json({ error: 'Failed to update calendar event' }, 500);
  }
});
*/

// OLD Google Calendar Delete - DEPRECATED (commented out - using new calendar system below)
/*
calendar.delete('/events/:eventId', async (c) => {
  const eventId = c.req.param('eventId');
  const userId = c.req.query('userId');

  if (!userId || !eventId) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  try {
    const db = getDatabase();
    const prefs = await db.query.userPreferencesExtendedTable.findFirst({
      where: (prefs, { eq, and }) => and(
        eq(prefs.userId, userId),
        eq(prefs.preferenceType, 'calendar')
      ),
    });

    if (!prefs) {
      return c.json({ error: 'Calendar not connected' }, 400);
    }

    const calendarPrefs = JSON.parse(prefs.preferenceData);
    
    if (calendarPrefs.provider === 'google') {
      oauth2Client.setCredentials({
        access_token: calendarPrefs.accessToken,
        refresh_token: calendarPrefs.refreshToken,
        expiry_date: calendarPrefs.expiryDate,
      });

      const googleapis = await lazyLoaders.googleapis();
      const calendar = googleapis.google.calendar({ version: 'v3', auth: oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });

      return c.json({ success: true });
    }

    return c.json({ error: 'Unsupported calendar provider' }, 400);
  } catch (error) {
    logger.error('Calendar event deletion error:', error);
    return c.json({ error: 'Failed to delete calendar event' }, 500);
  }
});
*/

// Get calendar connection status
calendar.get('/status/:userId', async (c) => {
  const userId = c.req.param('userId');

  try {
    const db = getDatabase();
    const prefs = await db.query.userPreferencesExtendedTable.findFirst({
      where: (prefs, { eq, and }) => and(
        eq(prefs.userId, userId),
        eq(prefs.preferenceType, 'calendar')
      ),
    });

    if (!prefs) {
      return c.json({ connected: false });
    }

    const calendarPrefs = JSON.parse(prefs.preferenceData);
    const isExpired = calendarPrefs.expiryDate && Date.now() > calendarPrefs.expiryDate;

    return c.json({
      connected: true,
      provider: calendarPrefs.provider,
      needsRefresh: isExpired,
    });
  } catch (error) {
    logger.error('Calendar status error:', error);
    return c.json({ connected: false });
  }
});

// Disconnect calendar
calendar.delete('/disconnect/:userId', async (c) => {
  const userId = c.req.param('userId');

  try {
    const db = getDatabase();
    await db.delete(userPreferencesExtendedTable).where(
      and(
        eq(userPreferencesExtendedTable.userId, userId),
        eq(userPreferencesExtendedTable.preferenceType, 'calendar')
      )
    );

    return c.json({ success: true });
  } catch (error) {
    logger.error('Calendar disconnect error:', error);
    return c.json({ error: 'Failed to disconnect calendar' }, 500);
  }
});

// @epic-3.4-teams: Get team calendar events (tasks, milestones, deadlines, and custom events)
calendar.get('/team/:teamId/events', async (c) => {
  const teamId = c.req.param('teamId');
  const startDate = c.req.query('startDate') || new Date().toISOString();
  const endDate = c.req.query('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const events = await getTeamEvents(teamId, startDate, endDate);
    return c.json({ events });
  } catch (error) {
    logger.error('Team events error:', error);
    return c.json({ error: 'Failed to fetch team events' }, 500);
  }
});

// @epic-3.4-teams: Create calendar event
calendar.post('/team/:teamId/events', async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');

  try {
    const eventData = await c.req.json();
    const { createEvent } = await import('./controllers/create-event');
    const workspaceId =
      typeof eventData.workspaceId === 'string'
        ? eventData.workspaceId
        : c.get('workspaceId');
    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }
    const actor =
      (typeof userId === 'string' && userId) ||
      (typeof userEmail === 'string' && userEmail);
    if (!actor) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const newEvent = await createEvent(
      { ...eventData, teamId },
      actor,
      workspaceId
    );

    // Broadcast event creation to team members via WebSocket
    const io = c.get('io');
    if (io && teamId) {
      io.to(`team:${teamId}`).emit('calendar:event-created', {
        eventId: newEvent.id,
        event: newEvent,
        updatedBy: actor,
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({ event: newEvent }, 201);
  } catch (error) {
    logger.error('Create event error:', error);
    return c.json({ 
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// @epic-3.4-teams: Get single event details
calendar.get('/events/:eventId', async (c) => {
  const eventId = c.req.param('eventId');

  try {
    const { getEvent } = await import('./controllers/get-event');
    const event = await getEvent(eventId);
    return c.json({ event });
  } catch (error) {
    logger.error('Get event error:', error);
    return c.json({ 
      error: 'Failed to fetch event',
      details: error instanceof Error ? error.message : String(error)
    }, 404);
  }
});

// @epic-3.4-teams: Update calendar event
calendar.patch('/events/:eventId', async (c) => {
  const eventId = c.req.param('eventId');
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');
  const actor =
    (typeof userId === 'string' && userId) ||
    (typeof userEmail === 'string' && userEmail);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const eventData = await c.req.json();
    const { updateEvent, getEventTeamId } = await import('./controllers/update-event');
    
    const updatedEvent = await updateEvent(eventId, eventData, actor);
    
    // Broadcast event update to team members via WebSocket
    const io = c.get('io');
    const teamId = await getEventTeamId(eventId);
    if (io && teamId) {
      io.to(`team:${teamId}`).emit('calendar:event-updated', {
        eventId,
        event: updatedEvent,
        updatedBy: actor,
        timestamp: new Date().toISOString(),
      });
    }
    
    return c.json({ event: updatedEvent });
  } catch (error) {
    logger.error('Update event error:', error);
    const statusCode = error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
    return c.json({ 
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : String(error)
    }, statusCode);
  }
});

// @epic-3.4-teams: Delete calendar event
calendar.delete('/events/:eventId', async (c) => {
  const eventId = c.req.param('eventId');
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');
  const actor =
    (typeof userId === 'string' && userId) ||
    (typeof userEmail === 'string' && userEmail);
  if (!actor) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const { deleteEvent, getEventTeamId } = await import('./controllers/delete-event');
    
    // Get team ID before deleting
    const teamId = await getEventTeamId(eventId);
    
    const result = await deleteEvent(eventId, actor);
    
    // Broadcast event deletion to team members via WebSocket
    const io = c.get('io');
    if (io && teamId) {
      io.to(`team:${teamId}`).emit('calendar:event-deleted', {
        eventId,
        updatedBy: actor,
        timestamp: new Date().toISOString(),
      });
    }
    
    return c.json(result);
  } catch (error) {
    logger.error('Delete event error:', error);
    const statusCode = error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500;
    return c.json({ 
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : String(error)
    }, statusCode);
  }
});

// @epic-3.4-teams: Check for scheduling conflicts
calendar.post('/conflicts/check', async (c) => {
  try {
    const { startTime, endTime, teamId, attendeeIds, excludeEventId } = await c.req.json();

    if (!startTime || !endTime) {
      return c.json({ error: 'Start time and end time are required' }, 400);
    }

    const { checkEventConflicts, checkAttendeeConflicts } = await import('./controllers/check-conflicts');

    const conflicts = [];

    // Check team-level conflicts
    if (teamId) {
      const teamConflicts = await checkEventConflicts(
        new Date(startTime),
        new Date(endTime),
        teamId,
        excludeEventId
      );
      conflicts.push(...teamConflicts.map(c => ({ ...c, conflictLevel: 'team' })));
    }

    // Check attendee-level conflicts
    if (attendeeIds && attendeeIds.length > 0) {
      const attendeeConflicts = await checkAttendeeConflicts(
        new Date(startTime),
        new Date(endTime),
        attendeeIds,
        excludeEventId
      );
      conflicts.push(...attendeeConflicts.map(c => ({ ...c, conflictLevel: 'attendee' })));
    }

    return c.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
      conflictCount: conflicts.length,
    });
  } catch (error) {
    logger.error('Conflict check error:', error);
    return c.json({ 
      error: 'Failed to check conflicts',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default calendar; 

