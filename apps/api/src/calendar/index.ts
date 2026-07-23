import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { userPreferencesExtendedTable } from "../database/schema";
import { logger } from "../utils/logger";
import getTeamEvents from "./controllers/get-team-events";

const calendar = new Hono();

// Google Calendar sync was removed along with external integrations.
calendar.get("/google/auth", (c) =>
  c.json({ error: "Google Calendar sync is no longer available" }, 410),
);

calendar.get("/google/callback", (c) =>
  c.json({ error: "Google Calendar sync is no longer available" }, 410),
);

// Get calendar connection status
calendar.get("/status/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const db = getDatabase();
    const prefs = await db.query.userPreferencesExtendedTable.findFirst({
      where: (prefs, { eq, and }) =>
        and(eq(prefs.userId, userId), eq(prefs.preferenceType, "calendar")),
    });

    if (!prefs) {
      return c.json({ connected: false });
    }

    const calendarPrefs = JSON.parse(prefs.preferenceData);
    const isExpired =
      calendarPrefs.expiryDate && Date.now() > calendarPrefs.expiryDate;

    return c.json({
      connected: true,
      provider: calendarPrefs.provider,
      needsRefresh: isExpired,
    });
  } catch (error) {
    logger.error("Calendar status error:", error);
    return c.json({ connected: false });
  }
});

// Disconnect calendar
calendar.delete("/disconnect/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const db = getDatabase();
    await db
      .delete(userPreferencesExtendedTable)
      .where(
        and(
          eq(userPreferencesExtendedTable.userId, userId),
          eq(userPreferencesExtendedTable.preferenceType, "calendar"),
        ),
      );

    return c.json({ success: true });
  } catch (error) {
    logger.error("Calendar disconnect error:", error);
    return c.json({ error: "Failed to disconnect calendar" }, 500);
  }
});

// @epic-3.4-teams: Get team calendar events (tasks, milestones, deadlines, and custom events)
calendar.get("/team/:teamId/events", async (c) => {
  const teamId = c.req.param("teamId");
  const startDate = c.req.query("startDate") || new Date().toISOString();
  const endDate =
    c.req.query("endDate") ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const events = await getTeamEvents(teamId, startDate, endDate);
    return c.json({ events });
  } catch (error) {
    logger.error("Team events error:", error);
    return c.json({ error: "Failed to fetch team events" }, 500);
  }
});

// @epic-3.4-teams: Create calendar event
calendar.post("/team/:teamId/events", async (c) => {
  const teamId = c.req.param("teamId");
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");

  try {
    const eventData = await c.req.json();
    const { createEvent } = await import("./controllers/create-event");
    const workspaceId =
      typeof eventData.workspaceId === "string"
        ? eventData.workspaceId
        : c.get("workspaceId");
    if (!workspaceId) {
      return c.json({ error: "workspaceId is required" }, 400);
    }
    const actor =
      (typeof userId === "string" && userId) ||
      (typeof userEmail === "string" && userEmail);
    if (!actor) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const newEvent = await createEvent(
      { ...eventData, teamId },
      actor,
      workspaceId,
    );

    return c.json({ event: newEvent }, 201);
  } catch (error) {
    logger.error("Create event error:", error);
    return c.json(
      {
        error: "Failed to create event",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// @epic-3.4-teams: Get single event details
calendar.get("/events/:eventId", async (c) => {
  const eventId = c.req.param("eventId");

  try {
    const { getEvent } = await import("./controllers/get-event");
    const event = await getEvent(eventId);
    return c.json({ event });
  } catch (error) {
    logger.error("Get event error:", error);
    return c.json(
      {
        error: "Failed to fetch event",
        details: error instanceof Error ? error.message : String(error),
      },
      404,
    );
  }
});

// @epic-3.4-teams: Update calendar event
calendar.patch("/events/:eventId", async (c) => {
  const eventId = c.req.param("eventId");
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
  const actor =
    (typeof userId === "string" && userId) ||
    (typeof userEmail === "string" && userEmail);
  if (!actor) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const eventData = await c.req.json();
    const { updateEvent } = await import("./controllers/update-event");

    const updatedEvent = await updateEvent(eventId, eventData, actor);

    return c.json({ event: updatedEvent });
  } catch (error) {
    logger.error("Update event error:", error);
    const statusCode =
      error instanceof Error && error.message.includes("Unauthorized")
        ? 403
        : 500;
    return c.json(
      {
        error: "Failed to update event",
        details: error instanceof Error ? error.message : String(error),
      },
      statusCode,
    );
  }
});

// @epic-3.4-teams: Delete calendar event
calendar.delete("/events/:eventId", async (c) => {
  const eventId = c.req.param("eventId");
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
  const actor =
    (typeof userId === "string" && userId) ||
    (typeof userEmail === "string" && userEmail);
  if (!actor) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { deleteEvent } = await import("./controllers/delete-event");

    const result = await deleteEvent(eventId, actor);

    return c.json(result);
  } catch (error) {
    logger.error("Delete event error:", error);
    const statusCode =
      error instanceof Error && error.message.includes("Unauthorized")
        ? 403
        : 500;
    return c.json(
      {
        error: "Failed to delete event",
        details: error instanceof Error ? error.message : String(error),
      },
      statusCode,
    );
  }
});

// @epic-3.4-teams: Check for scheduling conflicts
calendar.post("/conflicts/check", async (c) => {
  try {
    const { startTime, endTime, teamId, attendeeIds, excludeEventId } =
      await c.req.json();

    if (!startTime || !endTime) {
      return c.json({ error: "Start time and end time are required" }, 400);
    }

    const { checkEventConflicts, checkAttendeeConflicts } = await import(
      "./controllers/check-conflicts"
    );

    const conflicts = [];

    // Check team-level conflicts
    if (teamId) {
      const teamConflicts = await checkEventConflicts(
        new Date(startTime),
        new Date(endTime),
        teamId,
        excludeEventId,
      );
      conflicts.push(
        ...teamConflicts.map((c) => ({ ...c, conflictLevel: "team" })),
      );
    }

    // Check attendee-level conflicts
    if (attendeeIds && attendeeIds.length > 0) {
      const attendeeConflicts = await checkAttendeeConflicts(
        new Date(startTime),
        new Date(endTime),
        attendeeIds,
        excludeEventId,
      );
      conflicts.push(
        ...attendeeConflicts.map((c) => ({ ...c, conflictLevel: "attendee" })),
      );
    }

    return c.json({
      hasConflicts: conflicts.length > 0,
      conflicts,
      conflictCount: conflicts.length,
    });
  } catch (error) {
    logger.error("Conflict check error:", error);
    return c.json(
      {
        error: "Failed to check conflicts",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default calendar;
