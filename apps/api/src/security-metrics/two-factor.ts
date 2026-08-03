import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { userTable, settingsAuditLogTable } from "../database/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/secure-auth";
import logger from "../utils/logger";

const twoFactorRoutes = new Hono();

// Get 2FA statistics
twoFactorRoutes.get("/stats", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total users
    const totalUsers = await db.select({ count: count() }).from(userTable);

    // Users with 2FA enabled
    const usersWithTwoFactor = await db
      .select({ count: count() })
      .from(userTable)
      .where(eq(userTable.twoFactorEnabled, true));

    const total = totalUsers[0]?.count ?? 0;
    const withTwoFactor = usersWithTwoFactor[0]?.count ?? 0;
    const withoutTwoFactor = total - withTwoFactor;
    const adoptionPercentage =
      total > 0 ? Math.round((withTwoFactor / total) * 100) : 0;

    // Calculate trend (users who enabled 2FA in the last 30 days)
    const recentEnablements = await db
      .select({ count: count() })
      .from(settingsAuditLogTable)
      .where(
        and(
          eq(settingsAuditLogTable.action, "two_factor_enabled"),
          gte(settingsAuditLogTable.createdAt, lastMonth),
        ),
      );

    const recentCount = recentEnablements[0]?.count ?? 0;
    const trendPercentage =
      total > 0 ? Math.round((recentCount / total) * 100) : 0;

    // Check if enforcement is enabled (stored in settings or environment)
    // For now, we'll return a placeholder
    const enforcementEnabled = false; // See https://github.com/tsatsu10/meridian/issues/65

    return c.json({
      totalUsers: total,
      usersWithTwoFactor: withTwoFactor,
      usersWithoutTwoFactor: withoutTwoFactor,
      adoptionPercentage,
      enforcementEnabled,
      trend: {
        direction: recentCount > 0 ? "up" : "neutral",
        percentage: trendPercentage,
      },
    });
  } catch (error) {
    logger.error("Error fetching 2FA stats:", error);
    return c.json({ error: "Failed to fetch 2FA stats" }, 500);
  }
});

// Get user 2FA status list
twoFactorRoutes.get("/users", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();

    // Fetch all users with 2FA status
    const users = await db
      .select({
        email: userTable.email,
        name: userTable.name,
        twoFactorEnabled: userTable.twoFactorEnabled,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .orderBy(userTable.twoFactorEnabled, userTable.name);

    // Format response
    const userStatuses = users.map((user) => ({
      email: user.email,
      name: user.name || user.email.split("@")[0],
      hasTwoFactor: user.twoFactorEnabled ?? false,
      enabledAt: user.twoFactorEnabled ? user.createdAt : undefined,
      lastUsed: undefined, // See https://github.com/tsatsu10/meridian/issues/72
      backupCodesRemaining: undefined, // See https://github.com/tsatsu10/meridian/issues/72
    }));

    return c.json(userStatuses);
  } catch (error) {
    logger.error("Error fetching user 2FA statuses:", error);
    return c.json({ error: "Failed to fetch user statuses" }, 500);
  }
});

// Toggle 2FA enforcement
twoFactorRoutes.post("/enforcement", authMiddleware(), async (c) => {
  const userEmail = c.get("userEmail");
  if (!userEmail) {
    return c.json({ error: "Authentication required" }, 401);
  }

  // workspace_settings exists but has no enforcement column yet (see
  // https://github.com/tsatsu10/meridian/issues/65), so there is nothing
  // to actually enable/disable. Previously this endpoint wrote a
  // settings_audit_log entry claiming
  // "two_factor_enforcement_enabled/disabled" and returned success
  // regardless — a misleading audit trail for a setting nothing in the
  // codebase enforces. Report honestly instead of faking it.
  return c.json(
    {
      error: "2FA enforcement is not implemented yet",
    },
    501,
  );
});

// Send 2FA setup reminder
twoFactorRoutes.post("/send-reminder", authMiddleware(), async (c) => {
  try {
    const { userEmail } = await c.req.json();
    const senderEmail = c.get("userEmail");
    if (!senderEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const db = getDatabase();

    // Blocked on real email sending — see https://github.com/tsatsu10/meridian/issues/60
    // For now, we'll just log the action

    // Log the reminder
    await db.insert(settingsAuditLogTable).values({
      id: crypto.randomUUID(),
      userEmail: senderEmail,
      section: "security",
      action: "two_factor_reminder_sent",
      metadata: {
        targetUser: userEmail,
        ipAddress: c.req.header("x-forwarded-for") || "unknown",
        severity: "info",
      },
    });

    return c.json({
      success: true,
      message: `Reminder sent to ${userEmail}`,
    });
  } catch (error) {
    logger.error("Error sending 2FA reminder:", error);
    return c.json({ error: "Failed to send reminder" }, 500);
  }
});

export default twoFactorRoutes;
