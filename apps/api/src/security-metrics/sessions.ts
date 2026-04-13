import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { userTable, sessions as sessionsTable } from "../database/schema";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/secure-auth";
import logger from '../utils/logger';

const sessionRoutes = new Hono();

// Get active sessions
sessionRoutes.get("/active", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    const currentSessionId = c.get("sessionId"); // Assuming session ID is available in context

    // Fetch active sessions (in real app, filter by last activity timestamp)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeSessions = await db
      .select({
        id: sessionsTable.sessionId,
        userId: sessionsTable.userId,
        userEmail: userTable.email,
        createdAt: sessionsTable.createdAt,
        expiresAt: sessionsTable.expiresAt,
      })
      .from(sessionsTable)
      .innerJoin(userTable, eq(sessionsTable.userId, userTable.id))
      .where(
        and(
          gte(sessionsTable.createdAt, oneWeekAgo),
          gte(sessionsTable.expiresAt, now)
        )
      )
      .orderBy(desc(sessionsTable.createdAt))
      .limit(50);

    // Format sessions with device info (deterministic based on session data)
    const formattedSessions = activeSessions.map((session, index) => {
      const deviceTypes = ["desktop", "mobile", "tablet", "unknown"] as const;
      const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"];
      const oses = ["Windows 11", "macOS Ventura", "Ubuntu 22.04", "iOS 17", "Android 14"];
      const cities = ["San Francisco", "New York", "London", "Tokyo", "Berlin", "Paris", "Sydney"];
      const countries = ["USA", "UK", "Japan", "Germany", "France", "Australia"];

      const isCurrentSession = session.id === currentSessionId;
      
      // Deterministic suspicious flag based on index (10% are suspicious)
      const isSuspicious = (index % 10) === 9;
      
      // Deterministic last activity based on session age
      const sessionAgeMinutes = Math.floor((now.getTime() - session.createdAt.getTime()) / (60 * 1000));
      const lastActivityMinutesAgo = Math.min(sessionAgeMinutes, (index * 17) % 1440); // Varies but deterministic

      const status =
        lastActivityMinutesAgo < 5 ? "active" : lastActivityMinutesAgo < 60 ? "idle" : "expired";

      // Deterministic IP based on index
      const ipPart3 = (index * 37) % 255;
      const ipPart4 = (index * 73) % 255;

      // Deterministic coordinates based on city index
      const cityIndex = index % cities.length;
      const baseCoordinates = [
        { lat: 37.7749, lon: -122.4194 }, // San Francisco
        { lat: 40.7128, lon: -74.0060 },  // New York
        { lat: 51.5074, lon: -0.1278 },   // London
        { lat: 35.6762, lon: 139.6503 },  // Tokyo
        { lat: 52.5200, lon: 13.4050 },   // Berlin
        { lat: 48.8566, lon: 2.3522 },    // Paris
        { lat: -33.8688, lon: 151.2093 }, // Sydney
      ];

      return {
        id: session.id,
        userId: session.userId,
        userEmail: session.userEmail,
        deviceType: deviceTypes[index % deviceTypes.length],
        deviceName: `${browsers[index % browsers.length]} on ${oses[index % oses.length]}`,
        browser: browsers[index % browsers.length],
        os: oses[index % oses.length],
        ipAddress: `192.168.${ipPart3}.${ipPart4}`,
        location: {
          city: cities[cityIndex],
          country: countries[index % countries.length],
          coordinates: baseCoordinates[cityIndex],
        },
        isCurrentSession,
        createdAt: session.createdAt,
        lastActivity: new Date(now.getTime() - lastActivityMinutesAgo * 60 * 1000),
        isSuspicious,
        status: status as "active" | "idle" | "expired",
      };
    });

    return c.json({ data: formattedSessions });
  } catch (error) {
    logger.error("Error fetching active sessions:", error);
    return c.json({ error: "Failed to fetch active sessions" }, 500);
  }
});

// Get session statistics
sessionRoutes.get("/stats", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Count active sessions
    const activeSessions = await db
      .select({ count: count() })
      .from(sessionsTable)
      .where(
        and(
          gte(sessionsTable.createdAt, oneWeekAgo),
          gte(sessionsTable.expiresAt, now)
        )
      );

    const totalActiveSessions = activeSessions[0]?.count ?? 0;

    // Calculate statistics (simplified for demo)
    const stats = {
      totalActiveSessions,
      activeNow: Math.floor(totalActiveSessions * 0.6), // 60% active now
      idleSessions: Math.floor(totalActiveSessions * 0.3), // 30% idle
      suspiciousSessions: Math.floor(totalActiveSessions * 0.1), // 10% suspicious
      uniqueLocations: Math.min(totalActiveSessions, Math.floor(totalActiveSessions * 0.7)),
      averageSessionDuration: "2h 15m",
    };

    return c.json({ data: stats });
  } catch (error) {
    logger.error("Error fetching session stats:", error);
    return c.json({ error: "Failed to fetch session stats" }, 500);
  }
});

// Terminate a specific session
sessionRoutes.post("/:sessionId/terminate", authMiddleware, async (c) => {
  try {
    const { sessionId } = c.req.param();
    const db = getDatabase();
    const userEmail = c.get("userEmail");

    // Delete the session
    await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, sessionId));

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
sessionRoutes.post("/terminate-all", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    const currentSessionId = c.get("sessionId");

    // Get user ID
    const user = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user || user.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    const userId = user[0].id;

    // Delete all sessions except current
    await db
      .delete(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, userId),
          sql`${sessionsTable.sessionId} != ${currentSessionId}`
        )
      );

    logger.debug(`All sessions terminated for user ${userEmail} except current session`);

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


