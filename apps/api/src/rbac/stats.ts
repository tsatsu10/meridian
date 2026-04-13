import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import { userTable, settingsAuditLogTable } from "../database/schema";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import { authMiddleware } from "../middlewares/secure-auth";
import logger from '../utils/logger';

const rbacStats = new Hono();

// Get overall access control stats
rbacStats.get("/stats", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total users
    const totalUsers = await db.select({ count: count() }).from(userTable);

    // Active users (logged in within last 7 days)
    const activeUsers = await db
      .select({ count: count() })
      .from(userTable)
      .where(gte(userTable.lastActiveAt, last7Days));

    // Count unique roles
    const uniqueRoles = await db
      .select({ role: userTable.role })
      .from(userTable)
      .groupBy(userTable.role);

    // Recent role changes
    const recentChanges = await db
      .select({ count: count() })
      .from(settingsAuditLogTable)
      .where(
        and(
          sql`${settingsAuditLogTable.action} LIKE '%role%'`,
          gte(settingsAuditLogTable.timestamp, last7Days)
        )
      );

    return c.json({
      totalUsers: totalUsers[0]?.count ?? 0,
      activeUsers: activeUsers[0]?.count ?? 0,
      rolesCount: uniqueRoles.length,
      recentChanges: recentChanges[0]?.count ?? 0,
    });
  } catch (error) {
    logger.error("Error fetching RBAC stats:", error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Get role distribution
rbacStats.get("/distribution", authMiddleware, async (c) => {
  try {
    const db = getDatabase();

    // Get user count per role
    const roleDistribution = await db
      .select({
        role: userTable.role,
        count: count(),
      })
      .from(userTable)
      .groupBy(userTable.role);

    // Get total users for percentage calculation
    const totalUsers = roleDistribution.reduce((sum, item) => sum + (item.count || 0), 0);

    // Define colors for each role
    const roleColors: Record<string, string> = {
      "workspace-manager": "#ef4444",
      admin: "#f59e0b",
      "department-head": "#eab308",
      "project-manager": "#10b981",
      "team-lead": "#3b82f6",
      member: "#8b5cf6",
      guest: "#6b7280",
      "project-viewer": "#ec4899",
    };

    // Format response with percentages and colors
    const formattedDistribution = roleDistribution.map((item) => ({
      role: item.role || "member",
      count: item.count || 0,
      percentage: totalUsers > 0 ? Math.round(((item.count || 0) / totalUsers) * 100) : 0,
      color: roleColors[item.role || "member"] || "#8b5cf6",
    }));

    return c.json(formattedDistribution);
  } catch (error) {
    logger.error("Error fetching role distribution:", error);
    return c.json({ error: "Failed to fetch distribution" }, 500);
  }
});

// Get recent permission changes
rbacStats.get("/recent-changes", authMiddleware, async (c) => {
  try {
    const db = getDatabase();
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch role change audit logs
    const changes = await db
      .select()
      .from(settingsAuditLogTable)
      .where(
        and(
          sql`${settingsAuditLogTable.action} LIKE '%role%' OR ${settingsAuditLogTable.action} LIKE '%permission%'`,
          gte(settingsAuditLogTable.timestamp, last30Days)
        )
      )
      .orderBy(desc(settingsAuditLogTable.timestamp))
      .limit(20);

    // Format changes
    const formattedChanges = changes.map((change) => {
      let details: any = {};
      try {
        details = typeof change.details === 'string' 
          ? JSON.parse(change.details) 
          : change.details || {};
      } catch (e) {
        details = {};
      }

      return {
        id: change.id,
        userEmail: change.userEmail || "Unknown",
        userName: change.userEmail?.split("@")[0] || "Unknown User",
        action: change.action,
        oldRole: details.oldRole,
        newRole: details.newRole,
        performedBy: change.userEmail || "System",
        timestamp: change.timestamp,
      };
    });

    return c.json(formattedChanges);
  } catch (error) {
    logger.error("Error fetching recent changes:", error);
    return c.json({ error: "Failed to fetch changes" }, 500);
  }
});

export default rbacStats;


