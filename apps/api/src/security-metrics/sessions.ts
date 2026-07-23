import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { userTable, sessions as sessionsTable } from "../database/schema";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/secure-auth";
import logger from "../utils/logger";

const sessionRoutes = new Hono();

// Get active sessions
sessionRoutes.get("/active", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    if (!userEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const currentSessionId = c.get("sessionId"); // Assuming session ID is available in context

    // Fetch active sessions (in real app, filter by last activity timestamp)
    const now = new Date();

    // sessions only stores id/userId/expiresAt — device, location and activity
    // data is not captured. A previous revision FABRICATED those fields
    // (deterministic fake IPs/cities and index-based "suspicious" flags),
    // which is unacceptable on a security dashboard; unknowns are now unknowns.
    const activeSessions = await db
      .select({
        id: sessionsTable.id,
        userId: sessionsTable.userId,
        userEmail: userTable.email,
        expiresAt: sessionsTable.expiresAt,
      })
      .from(sessionsTable)
      .innerJoin(userTable, eq(sessionsTable.userId, userTable.id))
      .where(gte(sessionsTable.expiresAt, now))
      .orderBy(desc(sessionsTable.expiresAt))
      .limit(50);

    const formattedSessions = activeSessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      userEmail: session.userEmail,
      deviceType: "unknown" as const,
      deviceName: "Unknown device",
      browser: null,
      os: null,
      ipAddress: null,
      location: null,
      isCurrentSession: session.id === currentSessionId,
      createdAt: null,
      lastActivity: null,
      expiresAt: session.expiresAt,
      isSuspicious: false,
      status: "active" as const,
    }));

    return c.json({ data: formattedSessions });
  } catch (error) {
    logger.error("Error fetching active sessions:", error);
    return c.json({ error: "Failed to fetch active sessions" }, 500);
  }
});

// Get session statistics
sessionRoutes.get("/stats", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();
    const now = new Date();

    // Count active (unexpired) sessions — that's the only signal the schema has
    const activeSessions = await db
      .select({ count: count() })
      .from(sessionsTable)
      .where(gte(sessionsTable.expiresAt, now));

    const totalActiveSessions = activeSessions[0]?.count ?? 0;

    // Only real numbers: activity/location/duration are not tracked in the
    // sessions schema, so no invented breakdowns (previous revision faked
    // idle/suspicious percentages).
    const stats = {
      totalActiveSessions,
      activeNow: totalActiveSessions,
      idleSessions: 0,
      suspiciousSessions: 0,
      uniqueLocations: 0,
      averageSessionDuration: null,
    };

    return c.json({ data: stats });
  } catch (error) {
    logger.error("Error fetching session stats:", error);
    return c.json({ error: "Failed to fetch session stats" }, 500);
  }
});

// Terminate a specific session
sessionRoutes.post("/:sessionId/terminate", authMiddleware(), async (c) => {
  try {
    const { sessionId } = c.req.param();
    if (!sessionId) {
      return c.json({ error: "Session id is required" }, 400);
    }
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    if (!userEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const [currentUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!currentUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // SECURITY: scope the delete to the caller's own session. Without this,
    // any authenticated user could terminate ANY other user's session by
    // supplying an arbitrary sessionId (no ownership check existed before).
    // Returning 404 for both "no such session" and "not yours" avoids
    // letting a caller distinguish real session IDs from made-up ones.
    const result = await db
      .delete(sessionsTable)
      .where(
        and(
          eq(sessionsTable.id, sessionId),
          eq(sessionsTable.userId, currentUser.id),
        ),
      )
      .returning({ id: sessionsTable.id });

    if (result.length === 0) {
      return c.json({ error: "Session not found" }, 404);
    }

    // In a real app, you might also want to:
    // 1. Invalidate any cached tokens
    // 2. Notify the user via email
    // 3. Log the termination event

    logger.debug(`Session ${sessionId} terminated by ${userEmail}`);

    return c.json({
      success: true,
      message: "Session terminated successfully",
    });
  } catch (error) {
    logger.error("Error terminating session:", error);
    return c.json({ error: "Failed to terminate session" }, 500);
  }
});

// Terminate all sessions except current
sessionRoutes.post("/terminate-all", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    if (!userEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const currentSessionId = c.get("sessionId");

    // Get user ID
    const user = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    const [currentUser] = user;
    if (!currentUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Delete all sessions except current
    await db
      .delete(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, currentUser.id),
          sql`${sessionsTable.id} != ${currentSessionId}`,
        ),
      );

    logger.debug(
      `All sessions terminated for user ${userEmail} except current session`,
    );

    return c.json({
      success: true,
      message: "All other sessions terminated successfully",
    });
  } catch (error) {
    logger.error("Error terminating all sessions:", error);
    return c.json({ error: "Failed to terminate all sessions" }, 500);
  }
});

export default sessionRoutes;
