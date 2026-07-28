import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { userTable, sessions as sessionsTable } from "../database/schema";
import { eq, and, gte, lt, desc, count, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/secure-auth";
import { describeUserAgent } from "../user/utils/session-provenance";
import logger from "../utils/logger";

/** A session with no activity for this long counts as idle, not active. */
const IDLE_AFTER_MS = 30 * 60 * 1000;

const sessionRoutes = new Hono();

// Get active sessions
sessionRoutes.get("/active", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    if (!userEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const currentSessionId = c.get("sessionId");

    const [currentUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!currentUser) {
      return c.json({ error: "User not found" }, 404);
    }

    const now = new Date();

    // SECURITY: scoped to the caller. This filtered on expiry alone, with no
    // user predicate, while still selecting userEmail — so any authenticated
    // user got back up to 50 sessions belonging to *everyone*, complete with
    // their email addresses and session IDs. (Verified against the dev
    // database: one ordinary account could enumerate 21 other accounts.)
    const activeSessions = await db
      .select({
        id: sessionsTable.id,
        userId: sessionsTable.userId,
        userEmail: userTable.email,
        expiresAt: sessionsTable.expiresAt,
        createdAt: sessionsTable.createdAt,
        lastActivity: sessionsTable.lastActivity,
        ipAddress: sessionsTable.ipAddress,
        userAgent: sessionsTable.userAgent,
      })
      .from(sessionsTable)
      .innerJoin(userTable, eq(sessionsTable.userId, userTable.id))
      .where(
        and(
          eq(sessionsTable.userId, currentUser.id),
          gte(sessionsTable.expiresAt, now),
        ),
      )
      .orderBy(desc(sessionsTable.expiresAt))
      .limit(50);

    const formattedSessions = activeSessions.map((session) => {
      const device = describeUserAgent(session.userAgent);
      return {
        id: session.id,
        userId: session.userId,
        userEmail: session.userEmail,
        deviceType: device.deviceType,
        deviceName: device.deviceName,
        browser: device.browser,
        os: device.os,
        ipAddress: session.ipAddress,
        // Still null: mapping an IP to a place needs a geolocation database
        // this app doesn't ship. Left explicitly unknown rather than guessed —
        // the UI used to derive a "location" from the browser's timezone and
        // present it as the session's origin.
        location: null,
        isCurrentSession: session.id === currentSessionId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        isSuspicious: false,
        status: "active" as const,
      };
    });

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

    const now = new Date();
    const idleCutoff = new Date(now.getTime() - IDLE_AFTER_MS);

    // SECURITY: scoped to the caller. This counted every user's sessions and
    // presented the total as if it were the caller's own.
    const activeSessions = await db
      .select({ count: count() })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, currentUser.id),
          gte(sessionsTable.expiresAt, now),
        ),
      );

    const idle = await db
      .select({ count: count() })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, currentUser.id),
          gte(sessionsTable.expiresAt, now),
          lt(sessionsTable.lastActivity, idleCutoff),
        ),
      );

    const totalActiveSessions = activeSessions[0]?.count ?? 0;
    const idleSessions = idle[0]?.count ?? 0;

    const stats = {
      totalActiveSessions,
      activeNow: totalActiveSessions - idleSessions,
      idleSessions,
      suspiciousSessions: 0,
      // Needs a geolocation database the app doesn't ship; never guessed.
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
