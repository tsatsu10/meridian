import { Hono } from "hono";
import { and, eq, sql, desc, inArray, gte } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import logger from '../utils/logger';
import { 
  workspaceUserTable, 
  userTable, 
  projectTable, 
  teamTable, 
  teamMemberTable, 
  taskTable,
  integrationConnectionTable,
  automationRuleTable
} from "../database/schema";
import { userActivity as userActivityTable } from "../database/schema/team-awareness";
import messagesRouter from './messages';
import { createTeam } from './controllers/create-team';
import { updateTeam } from './controllers/update-team';
import { deleteTeam } from './controllers/delete-team';
import { createSlidingWindowRateLimiter, RateLimitPresets } from '../middlewares/sliding-window-rate-limiter';

const app = new Hono<{ Variables: { userEmail: string } }>();

// 🔒 SECURITY: Advanced sliding window rate limiting for team operations
const teamCreateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 team creations per hour
  burstMaxRequests: 10, // Max 10 per minute burst
  burstWindowMs: 60 * 1000,
});

const teamUpdateLimiter = createSlidingWindowRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 200, // 200 updates per hour
  burstMaxRequests: 30, // Max 30 per minute burst
  burstWindowMs: 60 * 1000,
});

// Mount message operations router
app.route("/", messagesRouter);

// @epic-3.4-teams: Get teams for a workspace
app.get("/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const userEmail = c.get("userEmail");

  // Ensure database is initialized
  const { initializeDatabase, getDatabase } = await import("../database/connection");
  await initializeDatabase();
  const db = getDatabase();

  try {
    // Get all teams in the workspace with their associated projects
    const dbTeams = await db
      .select({
        team: teamTable,
        project: projectTable,
      })
      .from(teamTable)
      .leftJoin(projectTable, eq(teamTable.projectId, projectTable.id))
      .where(
        and(
          eq(teamTable.workspaceId, workspaceId),
          eq(teamTable.isActive, true)
        )
      );

    // Get all team members for all teams in ONE query (prevents N+1 problem)
    const teamIds = dbTeams.map(({ team }) => team.id);
    const allTeamMembers = teamIds.length > 0
      ? await db
          .select({
            teamId: teamMemberTable.teamId,
            userId: userTable.id,
            userEmail: userTable.email,
            userName: userTable.name,
            teamRole: teamMemberTable.role,
            workspaceRole: workspaceUserTable.role,
            status: workspaceUserTable.status,
            joinedAt: teamMemberTable.joinedAt,
          })
          .from(teamMemberTable)
          .leftJoin(userTable, eq(teamMemberTable.userId, userTable.id))
          .leftJoin(workspaceUserTable,
            and(
              eq(workspaceUserTable.userEmail, userTable.email),
              eq(workspaceUserTable.workspaceId, workspaceId)
            )
          )
          .where(inArray(teamMemberTable.teamId, teamIds))
      : [];

    // Group team members by team ID and deduplicate by userId within each team
    const membersByTeam = allTeamMembers.reduce((acc, member) => {
      if (!acc[member.teamId]) {
        acc[member.teamId] = [];
      }
      // Only add member if not already in the team (prevent duplicates from JOIN issues)
      const isDuplicate = acc[member.teamId].some(m => m.userId === member.userId);
      if (!isDuplicate) {
        acc[member.teamId].push(member);
      }
      return acc;
    }, {} as Record<string, typeof allTeamMembers>);

    // Map teams with their members
    const teams = dbTeams.map(({ team, project }) => {
      const teamMembers = membersByTeam[team.id] || [];
      
      return {
        id: team.id,
        name: team.name,
        description: team.description || '',
        type: team.projectId ? 'project' as const : 'general' as const,
        workspaceId: team.workspaceId,
        projectId: team.projectId,
        projectName: project?.name || null,
        members: teamMembers.map(member => ({
          id: member.userId,
          name: member.userName,
          email: member.userEmail,
          role: member.teamRole || member.workspaceRole || 'member',
          status: 'online' as const,
          joinedAt: member.joinedAt,
        })),
        memberCount: teamMembers.length,
        createdAt: team.createdAt,
      };
    });

    return c.json({ teams });
  } catch (error) {
    logger.error("Error fetching teams:", error);
    return c.json({ error: "Failed to fetch teams" }, 500);
  }
});

// @epic-3.4-teams: Get detailed member metrics for teams
app.get("/:workspaceId/metrics", async (c) => {
  const workspaceId = c.req.param("workspaceId");

  const { initializeDatabase, getDatabase } = await import("../database/connection");
  await initializeDatabase();
  const db = getDatabase();

  try {
    // Get all team members with their task statistics
    const memberMetrics = await db
      .select({
        userId: userTable.id,
        userName: userTable.name,
        userEmail: userTable.email,
        teamId: teamMemberTable.teamId,
        teamRole: teamMemberTable.role,
      })
      .from(teamMemberTable)
      .innerJoin(teamTable, eq(teamMemberTable.teamId, teamTable.id))
      .innerJoin(userTable, eq(teamMemberTable.userId, userTable.id))
      .where(eq(teamTable.workspaceId, workspaceId));

    // Calculate metrics for each member
    const metricsWithStats = await Promise.all(
      memberMetrics.map(async (member) => {
        // Get task statistics
        const taskStats = await db
          .select({
            total: sql<number>`count(*)`,
            completed: sql<number>`count(case when ${taskTable.status} = 'done' then 1 end)`,
            inProgress: sql<number>`count(case when ${taskTable.status} = 'in_progress' then 1 end)`,
            todo: sql<number>`count(case when ${taskTable.status} = 'todo' then 1 end)`,
          })
          .from(taskTable)
          .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
          .where(
            and(
              eq(taskTable.assigneeId, member.userId),
              eq(projectTable.workspaceId, workspaceId)
            )
          );

        const stats = taskStats[0] || { total: 0, completed: 0, inProgress: 0, todo: 0 };
        
        // Calculate workload (current active tasks as percentage, max 100%)
        const activeTasks = Number(stats.inProgress) + Number(stats.todo);
        const workload = Math.min(Math.round((activeTasks / Math.max(activeTasks, 10)) * 100), 100);
        
        // Calculate performance (completion rate)
        const completionRate = stats.total > 0 
          ? Math.round((Number(stats.completed) / Number(stats.total)) * 100)
          : 100;

        return {
          userId: member.userId,
          teamId: member.teamId,
          workload,
          performance: completionRate,
          tasksCompleted: Number(stats.completed),
          currentTasks: activeTasks,
        };
      })
    );

    return c.json({ metrics: metricsWithStats });
  } catch (error) {
    logger.error("Error fetching team metrics:", error);
    return c.json({ error: "Failed to fetch team metrics" }, 500);
  }
});

// @epic-3.4-teams: Create a new team (🔒 SECURED with rate limiting)
app.post("/", teamCreateLimiter, createTeam);

// @epic-3.4-teams: Update team (🔒 SECURED with rate limiting)
app.patch("/:teamId", teamUpdateLimiter, updateTeam);

// @epic-3.4-teams: Delete team (🔒 SECURED with Sentry)
app.delete("/:teamId", deleteTeam);

// @epic-3.4-teams: Add member to team
app.post("/:teamId/members", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const body = await c.req.json();
    const { userId, role = "member" } = body;

    if (!userId) {
      return c.json({ error: "Missing userId" }, 400);
    }

    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    const [newMember] = await db
      .insert(teamMemberTable)
      .values({
        teamId,
        userId,
        role,
      })
      .returning();

    return c.json({ member: newMember }, 201);
  } catch (error) {
    logger.error("Error adding team member:", error);
    return c.json({ error: "Failed to add team member" }, 500);
  }
});

// @epic-3.4-teams: Remove member from team
app.delete("/:teamId/members/:userId", async (c) => {
  const teamId = c.req.param("teamId");
  const userId = c.req.param("userId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    const [deletedMember] = await db
      .delete(teamMemberTable)
      .where(
        and(
          eq(teamMemberTable.teamId, teamId),
          eq(teamMemberTable.userId, userId)
        )
      )
      .returning();

    if (!deletedMember) {
      return c.json({ error: "Team member not found" }, 404);
    }

    return c.json({ success: true, member: deletedMember });
  } catch (error) {
    logger.error("Error removing team member:", error);
    return c.json({ error: "Failed to remove team member" }, 500);
  }
});

// @epic-3.4-teams: Update member role
app.patch("/:teamId/members/:userId", async (c) => {
  const teamId = c.req.param("teamId");
  const userId = c.req.param("userId");
  
  try {
    const body = await c.req.json();
    const { role } = body;

    if (!role) {
      return c.json({ error: "Missing role" }, 400);
    }

    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    const [updatedMember] = await db
      .update(teamMemberTable)
      .set({ role })
      .where(
        and(
          eq(teamMemberTable.teamId, teamId),
          eq(teamMemberTable.userId, userId)
        )
      )
      .returning();

    if (!updatedMember) {
      return c.json({ error: "Team member not found" }, 404);
    }

    return c.json({ member: updatedMember });
  } catch (error) {
    logger.error("Error updating team member role:", error);
    return c.json({ error: "Failed to update team member role" }, 500);
  }
});

// @epic-3.4-teams: Archive team (soft delete)
app.post("/:teamId/archive", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    const [archivedTeam] = await db
      .update(teamTable)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(teamTable.id, teamId))
      .returning();

    if (!archivedTeam) {
      return c.json({ error: "Team not found" }, 404);
    }

    return c.json({ success: true, team: archivedTeam });
  } catch (error) {
    logger.error("Error archiving team:", error);
    return c.json({ error: "Failed to archive team" }, 500);
  }
});

// @epic-3.4-teams: Restore archived team
app.post("/:teamId/restore", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    const [restoredTeam] = await db
      .update(teamTable)
      .set({ 
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(teamTable.id, teamId))
      .returning();

    if (!restoredTeam) {
      return c.json({ error: "Team not found" }, 404);
    }

    return c.json({ success: true, team: restoredTeam });
  } catch (error) {
    logger.error("Error restoring team:", error);
    return c.json({ error: "Failed to restore team" }, 500);
  }
});

// @epic-3.4-teams: Get team statistics and overview
app.get("/:teamId/statistics", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get team info
    const team = await db
      .select()
      .from(teamTable)
      .where(eq(teamTable.id, teamId))
      .limit(1);

    if (!team[0]) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Get member count
    const memberCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMemberTable)
      .where(eq(teamMemberTable.teamId, teamId));

    // Get task statistics
    const taskStatsQuery = db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(case when ${taskTable.status} = 'done' then 1 end)`,
        inProgress: sql<number>`count(case when ${taskTable.status} = 'in_progress' then 1 end)`,
        todo: sql<number>`count(case when ${taskTable.status} = 'todo' then 1 end)`,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id));
    
    // Apply appropriate filter based on team's project assignment
    const taskStats = team[0].projectId
      ? await taskStatsQuery.where(eq(projectTable.id, team[0].projectId))
      : await taskStatsQuery.where(eq(projectTable.workspaceId, team[0].workspaceId));

    // Get recent activity count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activityConditions = [gte(userActivityTable.createdAt, sevenDaysAgo)];
    if (team[0].projectId) {
      activityConditions.push(eq(userActivityTable.projectId, team[0].projectId));
    } else {
      activityConditions.push(eq(userActivityTable.workspaceId, team[0].workspaceId));
    }
    
    const recentActivity = await db
      .select({ count: sql<number>`count(*)` })
      .from(userActivityTable)
      .where(and(...activityConditions));

    return c.json({
      statistics: {
        memberCount: Number(memberCount[0]?.count || 0),
        tasks: {
          total: Number(taskStats[0]?.total || 0),
          completed: Number(taskStats[0]?.completed || 0),
          inProgress: Number(taskStats[0]?.inProgress || 0),
          todo: Number(taskStats[0]?.todo || 0),
          completionRate: taskStats[0]?.total > 0 
            ? Math.round((Number(taskStats[0].completed) / Number(taskStats[0].total)) * 100)
            : 0,
        },
        recentActivityCount: Number(recentActivity[0]?.count || 0),
        createdAt: team[0].createdAt,
      }
    });
  } catch (error) {
    logger.error("Error fetching team statistics:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    // Return empty statistics instead of 500 error (graceful degradation)
    return c.json({
      statistics: {
        memberCount: 0,
        tasks: {
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
          completionRate: 0,
        },
        recentActivityCount: 0,
        createdAt: new Date().toISOString(),
      }
    });
  }
});

// @epic-3.4-teams: Get team activity log
app.get("/:teamId/activity", async (c) => {
  const teamId = c.req.param("teamId");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get team to validate and get project
    const team = await db
      .select()
      .from(teamTable)
      .where(eq(teamTable.id, teamId))
      .limit(1);

    if (!team[0]) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Get activities for the team's project
    const activities = await db
      .select({
        id: userActivityTable.id,
        action: userActivityTable.action,
        entityType: userActivityTable.entityType,
        entityId: userActivityTable.entityId,
        metadata: userActivityTable.metadata,
        createdAt: userActivityTable.createdAt,
        userName: userTable.name,
        userEmail: userTable.email,
      })
      .from(userActivityTable)
      .leftJoin(userTable, eq(userActivityTable.userId, userTable.id))
      .where(
        team[0].projectId 
          ? eq(userActivityTable.projectId, team[0].projectId)
          : eq(userActivityTable.workspaceId, team[0].workspaceId)
      )
      .orderBy(desc(userActivityTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userActivityTable)
      .where(
        team[0].projectId 
          ? eq(userActivityTable.projectId, team[0].projectId)
          : eq(userActivityTable.workspaceId, team[0].workspaceId)
      );

    return c.json({
      activities,
      pagination: {
        total: Number(totalCount[0]?.count || 0),
        limit,
        offset,
        hasMore: offset + activities.length < Number(totalCount[0]?.count || 0),
      }
    });
  } catch (error) {
    logger.error("Error fetching team activity:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    // Return empty data instead of 500 error (graceful degradation)
    return c.json({
      activities: [],
      pagination: {
        total: 0,
        limit,
        offset,
        hasMore: false,
      }
    });
  }
});

// @epic-3.4-teams: Get team notification preferences
app.get("/:teamId/notifications", async (c) => {
  const teamId = c.req.param("teamId");
  const userId = c.req.query("userId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // For now, return default notification preferences
    // TODO: Implement actual notification preferences storage per team member
    return c.json({
      preferences: {
        taskAssigned: true,
        taskCompleted: true,
        taskOverdue: true,
        memberJoined: true,
        memberLeft: true,
        teamUpdated: false,
        mentions: true,
        emailNotifications: true,
        pushNotifications: true,
        digest: "daily", // "realtime", "hourly", "daily", "weekly", "never"
      }
    });
  } catch (error) {
    logger.error("Error fetching notification preferences:", error);
    return c.json({ error: "Failed to fetch notification preferences" }, 500);
  }
});

// @epic-3.4-teams: Update team notification preferences
app.put("/:teamId/notifications", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const body = await c.req.json();
    const { preferences } = body;

    // TODO: Implement actual notification preferences update
    // For now, just return success
    return c.json({
      success: true,
      preferences,
    });
  } catch (error) {
    logger.error("Error updating notification preferences:", error);
    return c.json({ error: "Failed to update notification preferences" }, 500);
  }
});

// @epic-3.4-teams: Get team integrations
app.get("/:teamId/integrations", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get team to get workspace
    const team = await db
      .select()
      .from(teamTable)
      .where(eq(teamTable.id, teamId))
      .limit(1);

    if (!team[0]) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Get workspace integrations
    const integrations = await db
      .select()
      .from(integrationConnectionTable)
      .where(eq(integrationConnectionTable.workspaceId, team[0].workspaceId));

    return c.json({ integrations });
  } catch (error) {
    logger.error("Error fetching team integrations:", error);
    return c.json({ error: "Failed to fetch team integrations" }, 500);
  }
});

// ============================================================================
// Phase 3: Advanced Features
// ============================================================================

// @epic-3.4-teams: Get team analytics dashboard data
app.get("/:teamId/analytics", async (c) => {
  const teamId = c.req.param("teamId");
  const timeRange = c.req.query("range") || "7d"; // 7d, 30d, 90d, all
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get team to validate
    const team = await db
      .select()
      .from(teamTable)
      .where(eq(teamTable.id, teamId))
      .limit(1);

    if (!team[0]) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        startDate = new Date(0); // Unix epoch
        break;
    }

    // Get task completion trend
    const trendConditions = [gte(taskTable.createdAt, startDate)];
    if (team[0].projectId) {
      trendConditions.push(eq(projectTable.id, team[0].projectId));
    }
    
    const taskTrend = await db
      .select({
        date: sql<string>`DATE(${taskTable.updatedAt})`,
        completed: sql<number>`count(case when ${taskTable.status} = 'done' then 1 end)`,
        created: sql<number>`count(*)`,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(and(...trendConditions))
      .groupBy(sql`DATE(${taskTable.updatedAt})`)
      .orderBy(sql`DATE(${taskTable.updatedAt})`);

    // Get member productivity (tasks completed per member)
    // Build task join conditions
    const taskJoinConditions = [eq(taskTable.assigneeId, userTable.id)];
    if (team[0].projectId) {
      taskJoinConditions.push(eq(taskTable.projectId, team[0].projectId));
    }
    taskJoinConditions.push(gte(taskTable.createdAt, startDate));
    
    const memberProductivity = await db
      .select({
        memberId: teamMemberTable.userId,
        memberName: userTable.name,
        tasksCompleted: sql<number>`count(case when ${taskTable.status} = 'done' then 1 end)`,
        tasksInProgress: sql<number>`count(case when ${taskTable.status} = 'in_progress' then 1 end)`,
        totalTasks: sql<number>`count(*)`,
      })
      .from(teamMemberTable)
      .innerJoin(userTable, eq(teamMemberTable.userId, userTable.id))
      .leftJoin(taskTable, and(...taskJoinConditions))
      .where(eq(teamMemberTable.teamId, teamId))
      .groupBy(teamMemberTable.userId, userTable.name);

    // Get status distribution
    const statusConditions = [gte(taskTable.createdAt, startDate)];
    if (team[0].projectId) {
      statusConditions.push(eq(projectTable.id, team[0].projectId));
    }
    
    const statusDistribution = await db
      .select({
        status: taskTable.status,
        count: sql<number>`count(*)`,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(and(...statusConditions))
      .groupBy(taskTable.status);

    // Get priority distribution
    const priorityConditions = [gte(taskTable.createdAt, startDate)];
    if (team[0].projectId) {
      priorityConditions.push(eq(projectTable.id, team[0].projectId));
    }
    
    const priorityDistribution = await db
      .select({
        priority: taskTable.priority,
        count: sql<number>`count(*)`,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(and(...priorityConditions))
      .groupBy(taskTable.priority);

    return c.json({
      analytics: {
        timeRange,
        taskTrend,
        memberProductivity,
        statusDistribution,
        priorityDistribution,
      }
    });
  } catch (error) {
    logger.error("Error fetching team analytics:", error);
    logger.error("Error details:", error instanceof Error ? error.message : String(error));
    // Return empty analytics instead of 500 error (graceful degradation)
    return c.json({
      analytics: {
        timeRange,
        taskTrend: [],
        memberProductivity: [],
        statusDistribution: [],
        priorityDistribution: [],
      }
    });
  }
});

// @epic-3.4-teams: Get advanced permissions for team
app.get("/:teamId/permissions/advanced", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get team members with their roles and custom permissions
    const members = await db
      .select({
        userId: teamMemberTable.userId,
        userName: userTable.name,
        userEmail: userTable.email,
        role: teamMemberTable.role,
        joinedAt: teamMemberTable.joinedAt,
      })
      .from(teamMemberTable)
      .innerJoin(userTable, eq(teamMemberTable.userId, userTable.id))
      .where(eq(teamMemberTable.teamId, teamId));

    // Define permission matrix
    const permissionMatrix = {
      "Admin": {
        canManageMembers: true,
        canManageTasks: true,
        canManageProjects: true,
        canViewAnalytics: true,
        canManageIntegrations: true,
        canDeleteTeam: true,
        canChangePermissions: true,
      },
      "Team Lead": {
        canManageMembers: false,
        canManageTasks: true,
        canManageProjects: true,
        canViewAnalytics: true,
        canManageIntegrations: false,
        canDeleteTeam: false,
        canChangePermissions: false,
      },
      "Member": {
        canManageMembers: false,
        canManageTasks: false,
        canManageProjects: false,
        canViewAnalytics: false,
        canManageIntegrations: false,
        canDeleteTeam: false,
        canChangePermissions: false,
      },
    };

    const membersWithPermissions = members.map(member => ({
      ...member,
      permissions: permissionMatrix[member.role as keyof typeof permissionMatrix] || permissionMatrix["Member"],
    }));

    return c.json({
      members: membersWithPermissions,
      roles: Object.keys(permissionMatrix),
    });
  } catch (error) {
    logger.error("Error fetching advanced permissions:", error);
    return c.json({ error: "Failed to fetch advanced permissions" }, 500);
  }
});

// @epic-3.4-teams: Update member permissions
app.put("/:teamId/permissions/:userId", async (c) => {
  const teamId = c.req.param("teamId");
  const userId = c.req.param("userId");
  
  try {
    const body = await c.req.json();
    const { permissions } = body;

    // TODO: Implement custom permission storage
    // For now, we'll just return success
    return c.json({
      success: true,
      message: "Custom permissions will be implemented in future release",
    });
  } catch (error) {
    logger.error("Error updating member permissions:", error);
    return c.json({ error: "Failed to update member permissions" }, 500);
  }
});

// @epic-3.4-teams: Get team automations
app.get("/:teamId/automations", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get team to get workspace
    const team = await db
      .select()
      .from(teamTable)
      .where(eq(teamTable.id, teamId))
      .limit(1);

    if (!team[0]) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Get automation rules for the workspace
    const automations = await db
      .select()
      .from(automationRuleTable)
      .where(eq(automationRuleTable.workspaceId, team[0].workspaceId));

    return c.json({ automations });
  } catch (error) {
    logger.error("Error fetching team automations:", error);
    return c.json({ error: "Failed to fetch team automations" }, 500);
  }
});

// @epic-3.4-teams: Create team automation
app.post("/:teamId/automations", async (c) => {
  const teamId = c.req.param("teamId");
  
  try {
    const body = await c.req.json();
    const { name, description, trigger, actions, enabled = true } = body;

    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Get team to get workspace
    const team = await db
      .select()
      .from(teamTable)
      .where(eq(teamTable.id, teamId))
      .limit(1);

    if (!team[0]) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Create automation rule
    const newAutomation = await db
      .insert(automationRuleTable)
      .values({
        id: `auto_${Date.now()}`,
        workspaceId: team[0].workspaceId,
        name,
        description,
        triggerType: trigger.type,
        triggerConfig: trigger.config,
        actions: JSON.stringify(actions),
        enabled,
        createdBy: c.get("user")?.id || null,
        createdAt: new Date(),
      })
      .returning();

    return c.json({ automation: newAutomation[0] });
  } catch (error) {
    logger.error("Error creating team automation:", error);
    return c.json({ error: "Failed to create team automation" }, 500);
  }
});

// @epic-3.4-teams: Update team automation
app.put("/:teamId/automations/:automationId", async (c) => {
  const automationId = c.req.param("automationId");
  
  try {
    const body = await c.req.json();
    const { name, description, trigger, actions, enabled } = body;

    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    const updates: any = { updatedAt: new Date() };
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (enabled !== undefined) updates.enabled = enabled;
    if (trigger) {
      updates.triggerType = trigger.type;
      updates.triggerConfig = trigger.config;
    }
    if (actions) updates.actions = JSON.stringify(actions);

    const updatedAutomation = await db
      .update(automationRuleTable)
      .set(updates)
      .where(eq(automationRuleTable.id, automationId))
      .returning();

    return c.json({ automation: updatedAutomation[0] });
  } catch (error) {
    logger.error("Error updating team automation:", error);
    return c.json({ error: "Failed to update team automation" }, 500);
  }
});

// @epic-3.4-teams: Delete team automation
app.delete("/:teamId/automations/:automationId", async (c) => {
  const automationId = c.req.param("automationId");
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    await db
      .delete(automationRuleTable)
      .where(eq(automationRuleTable.id, automationId));

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error deleting team automation:", error);
    return c.json({ error: "Failed to delete team automation" }, 500);
  }
});

// @epic-3.4-teams: Advanced member search and filtering
app.get("/:teamId/members/search", async (c) => {
  const teamId = c.req.param("teamId");
  const query = c.req.query("q") || "";
  const role = c.req.query("role");
  const sortBy = c.req.query("sortBy") || "name"; // name, joinedAt, tasksCompleted
  const order = c.req.query("order") || "asc"; // asc, desc
  
  try {
    const { initializeDatabase, getDatabase } = await import("../database/connection");
    await initializeDatabase();
    const db = getDatabase();

    // Build query
    let membersQuery = db
      .select({
        userId: teamMemberTable.userId,
        userName: userTable.name,
        userEmail: userTable.email,
        userAvatar: userTable.avatar,
        role: teamMemberTable.role,
        joinedAt: teamMemberTable.joinedAt,
      })
      .from(teamMemberTable)
      .innerJoin(userTable, eq(teamMemberTable.userId, userTable.id))
      .where(eq(teamMemberTable.teamId, teamId));

    // Filter by role if specified
    if (role) {
      membersQuery = membersQuery.where(eq(teamMemberTable.role, role));
    }

    let members = await membersQuery;

    // Filter by search query
    if (query) {
      const searchLower = query.toLowerCase();
      members = members.filter(
        (m) =>
          m.userName.toLowerCase().includes(searchLower) ||
          m.userEmail.toLowerCase().includes(searchLower)
      );
    }

    // Sort results
    members.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.userName.localeCompare(b.userName);
          break;
        case "joinedAt":
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return order === "desc" ? -comparison : comparison;
    });

    return c.json({
      members,
      total: members.length,
      filters: { query, role, sortBy, order },
    });
  } catch (error) {
    logger.error("Error searching team members:", error);
    return c.json({ error: "Failed to search team members" }, 500);
  }
});

export default app; 
