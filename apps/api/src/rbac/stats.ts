import { Hono } from "hono";
import { getDatabase } from "../database/connection";
import {
  userTable,
  settingsAuditLogTable,
  workspaceUserTable,
} from "../database/schema";
import { and, gte, desc, sql, count, inArray } from "drizzle-orm";
import { authMiddleware } from "../middlewares/secure-auth";
import { memberWorkspaceIds } from "./lib/workspace-scope";
import logger from "../utils/logger";

/**
 * 🚨 SECURITY: every route here used to answer instance-wide.
 *
 * `/stats` counted every user in the deployment, `/distribution` broke every
 * user down by role, and `/recent-changes` returned the last 20 role and
 * permission changes *including the email address of each user involved* — all
 * to any authenticated caller, in a multi-tenant product. A member of one
 * workspace could size up the whole instance and harvest addresses.
 *
 * They are now scoped to the people the caller actually shares a workspace
 * with. That set is computed once per request by `visibleUserEmails` below.
 */

const rbacStats = new Hono<{ Variables: { userEmail: string } }>();

/**
 * Emails of every user who shares at least one workspace with the caller
 * (including the caller). Returns an empty array when the caller belongs to no
 * workspace — callers MUST treat that as "nothing visible" and return an empty
 * result, never an unfiltered query: `inArray(column, [])` is not reliably a
 * false predicate across query builders.
 */
async function visibleUserEmails(userEmail: string | undefined) {
  const workspaces = await memberWorkspaceIds(userEmail);
  if (workspaces.length === 0) return [];

  const rows = await getDatabase()
    .select({ userEmail: workspaceUserTable.userEmail })
    .from(workspaceUserTable)
    .where(inArray(workspaceUserTable.workspaceId, workspaces));

  return [...new Set(rows.map((row) => row.userEmail))];
}

// Get access control stats, scoped to the caller's workspaces
rbacStats.get("/stats", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const emails = await visibleUserEmails(c.get("userEmail"));
    if (emails.length === 0) {
      return c.json({
        totalUsers: 0,
        activeUsers: 0,
        rolesCount: 0,
        recentChanges: 0,
      });
    }

    const totalUsers = await db
      .select({ count: count() })
      .from(userTable)
      .where(inArray(userTable.email, emails));

    // Active users (logged in within last 7 days)
    const activeUsers = await db
      .select({ count: count() })
      .from(userTable)
      .where(
        and(
          gte(userTable.lastSeen, last7Days),
          inArray(userTable.email, emails),
        ),
      );

    // Count unique roles
    const uniqueRoles = await db
      .select({ role: userTable.role })
      .from(userTable)
      .where(inArray(userTable.email, emails))
      .groupBy(userTable.role);

    // Recent role changes
    const recentChanges = await db
      .select({ count: count() })
      .from(settingsAuditLogTable)
      .where(
        and(
          sql`${settingsAuditLogTable.action} LIKE '%role%'`,
          gte(settingsAuditLogTable.createdAt, last7Days),
          inArray(settingsAuditLogTable.userEmail, emails),
        ),
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

// Get role distribution, scoped to the caller's workspaces
rbacStats.get("/distribution", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();

    const emails = await visibleUserEmails(c.get("userEmail"));
    if (emails.length === 0) {
      return c.json([]);
    }

    // Get user count per role
    const roleDistribution = await db
      .select({
        role: userTable.role,
        count: count(),
      })
      .from(userTable)
      .where(inArray(userTable.email, emails))
      .groupBy(userTable.role);

    // Get total users for percentage calculation
    const totalUsers = roleDistribution.reduce(
      (sum, item) => sum + (item.count || 0),
      0,
    );

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
      percentage:
        totalUsers > 0 ? Math.round(((item.count || 0) / totalUsers) * 100) : 0,
      color: roleColors[item.role || "member"] || "#8b5cf6",
    }));

    return c.json(formattedDistribution);
  } catch (error) {
    logger.error("Error fetching role distribution:", error);
    return c.json({ error: "Failed to fetch distribution" }, 500);
  }
});

// Get recent permission changes, scoped to the caller's workspaces
rbacStats.get("/recent-changes", authMiddleware(), async (c) => {
  try {
    const db = getDatabase();
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const emails = await visibleUserEmails(c.get("userEmail"));
    if (emails.length === 0) {
      return c.json([]);
    }

    // Fetch role change audit logs
    const changes = await db
      .select()
      .from(settingsAuditLogTable)
      .where(
        and(
          sql`${settingsAuditLogTable.action} LIKE '%role%' OR ${settingsAuditLogTable.action} LIKE '%permission%'`,
          gte(settingsAuditLogTable.createdAt, last30Days),
          inArray(settingsAuditLogTable.userEmail, emails),
        ),
      )
      .orderBy(desc(settingsAuditLogTable.createdAt))
      .limit(20);

    // Format changes
    const formattedChanges = changes.map((change) => {
      // settings_audit_log stores before/after as JSON strings in oldValue/newValue
      const parse = (value: string | null): unknown => {
        if (!value) return undefined;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };

      return {
        id: change.id,
        userEmail: change.userEmail || "Unknown",
        userName: change.userEmail?.split("@")[0] || "Unknown User",
        action: change.action,
        oldRole: parse(change.oldValue),
        newRole: parse(change.newValue),
        performedBy: change.userEmail || "System",
        timestamp: change.createdAt,
      };
    });

    return c.json(formattedChanges);
  } catch (error) {
    logger.error("Error fetching recent changes:", error);
    return c.json({ error: "Failed to fetch changes" }, 500);
  }
});

export default rbacStats;
