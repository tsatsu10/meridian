/**
 * 💼 User Work & Activity Service
 * 
 * Manages user's active projects, recent tasks, activity feed, and workload
 */

import { getDatabase } from "../database/connection";
import {
  projects,
  projectMembers,
  tasks,
  activities,
  users,
  teams,
  teamMembers,
} from "../database/schema";
import { eq, and, desc, sql, or, inArray, gte } from "drizzle-orm";
import logger from "../utils/logger";

/**
 * Get user's active projects
 */
export async function getUserActiveProjects(userId: string): Promise<any[]> {
  const db = getDatabase();

  try {
    // Get user's email for project_members lookup
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return [];
    }

    // Get active projects where user is a member
    const activeProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        status: projects.status,
        priority: projects.priority,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        // Member info
        role: projectMembers.role,
        assignedAt: projectMembers.assignedAt,
        hoursPerWeek: projectMembers.hoursPerWeek,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(
        and(
          eq(projectMembers.userEmail, user.email),
          eq(projectMembers.isActive, true),
          eq(projects.isArchived, false),
          or(
            eq(projects.status, "active"),
            eq(projects.status, "in_progress"),
            eq(projects.status, "planning")
          )
        )
      )
      .orderBy(desc(projects.priority));

    // Get task counts for each project
    const projectsWithCounts = await Promise.all(
      activeProjects.map(async (project) => {
        const taskCounts = await db
          .select({
            total: sql<number>`COUNT(*)`,
            completed: sql<number>`COUNT(CASE WHEN status = 'done' THEN 1 END)`,
            inProgress: sql<number>`COUNT(CASE WHEN status = 'in_progress' THEN 1 END)`,
            overdue: sql<number>`COUNT(CASE WHEN status != 'done' AND due_date < NOW() THEN 1 END)`,
          })
          .from(tasks)
          .where(eq(tasks.projectId, project.id));

        // Get last activity date
        const lastActivity = await db
          .select({ updatedAt: tasks.updatedAt })
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, project.id),
              eq(tasks.assigneeId, userId)
            )
          )
          .orderBy(desc(tasks.updatedAt))
          .limit(1);

        return {
          ...project,
          taskCounts: taskCounts[0],
          lastContribution: lastActivity[0]?.updatedAt || project.assignedAt,
        };
      })
    );

    return projectsWithCounts;
  } catch (error) {
    logger.error("Error getting user active projects:", error);
    return [];
  }
}

/**
 * Get user's recent tasks
 */
export async function getUserRecentTasks(
  userId: string,
  options?: { limit?: number }
): Promise<any> {
  const db = getDatabase();

  try {
    const limit = options?.limit || 10;

    // Last completed tasks
    const completedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        completedAt: tasks.completedAt,
        projectId: tasks.projectId,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, "done")))
      .orderBy(desc(tasks.completedAt))
      .limit(5);

    // Currently assigned tasks (in progress or todo)
    const assignedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        startDate: tasks.startDate,
        projectId: tasks.projectId,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(tasks.assigneeId, userId),
          or(eq(tasks.status, "in_progress"), eq(tasks.status, "todo"))
        )
      )
      .orderBy(desc(tasks.priority), tasks.dueDate)
      .limit(10);

    // Overdue tasks
    const overdueTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(tasks.assigneeId, userId),
          sql`${tasks.status} != 'done'`,
          sql`${tasks.dueDate} < NOW()`
        )
      )
      .orderBy(tasks.dueDate);

    return {
      lastCompleted: completedTasks,
      currentlyAssigned: assignedTasks,
      overdue: overdueTasks,
      summary: {
        totalCompleted: completedTasks.length,
        totalAssigned: assignedTasks.length,
        totalOverdue: overdueTasks.length,
      },
    };
  } catch (error) {
    logger.error("Error getting user recent tasks:", error);
    return {
      lastCompleted: [],
      currentlyAssigned: [],
      overdue: [],
      summary: { totalCompleted: 0, totalAssigned: 0, totalOverdue: 0 },
    };
  }
}

/**
 * Get user's recent activity feed
 */
export async function getUserActivityFeed(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const db = getDatabase();

  try {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const recentActivities = await db
      .select({
        id: activities.id,
        type: activities.type,
        content: activities.content,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        // Task info
        taskId: tasks.id,
        taskTitle: tasks.title,
        // Project info
        projectId: projects.id,
        projectName: projects.name,
      })
      .from(activities)
      .leftJoin(tasks, eq(activities.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset);

    return recentActivities;
  } catch (error) {
    logger.error("Error getting user activity feed:", error);
    return [];
  }
}

/**
 * Get user's current workload
 */
export async function getUserWorkload(userId: string): Promise<any> {
  const db = getDatabase();

  try {
    // Count tasks by status
    const tasksByStatus = await db
      .select({
        status: tasks.status,
        count: sql<number>`COUNT(*)`,
        totalEstimatedHours: sql<number>`SUM(COALESCE(${tasks.estimatedHours}, 0))`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          sql`${tasks.status} != 'done'`
        )
      )
      .groupBy(tasks.status);

    // Get high priority tasks
    const highPriorityCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          sql`${tasks.status} != 'done'`,
          or(eq(tasks.priority, "high"), eq(tasks.priority, "urgent"))
        )
      );

    // Get tasks due this week
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const dueThisWeek = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          sql`${tasks.status} != 'done'`,
          sql`${tasks.dueDate} <= ${oneWeekFromNow}`,
          sql`${tasks.dueDate} >= NOW()`
        )
      );

    const totalEstimatedHours = tasksByStatus.reduce(
      (sum, item) => sum + (Number(item.totalEstimatedHours) || 0),
      0
    );

    return {
      tasksByStatus,
      totalActiveTasks: tasksByStatus.reduce(
        (sum, item) => sum + Number(item.count),
        0
      ),
      totalEstimatedHours,
      highPriorityTasks: highPriorityCount[0]?.count || 0,
      dueThisWeek: dueThisWeek[0]?.count || 0,
      workloadLevel:
        totalEstimatedHours > 40
          ? "high"
          : totalEstimatedHours > 20
          ? "medium"
          : "low",
    };
  } catch (error) {
    logger.error("Error getting user workload:", error);
    return {
      tasksByStatus: [],
      totalActiveTasks: 0,
      totalEstimatedHours: 0,
      highPriorityTasks: 0,
      dueThisWeek: 0,
      workloadLevel: "low",
    };
  }
}

/**
 * Get user's team collaborations
 */
export async function getUserTeamCollaborations(userId: string): Promise<any> {
  const db = getDatabase();

  try {
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        color: teams.color,
        // Member info
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        isPrimaryTeam: teamMembers.isPrimaryTeam,
        teamJoinDate: teamMembers.teamJoinDate,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
      userTeams.map(async (team) => {
        const memberCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id));

        return {
          ...team,
          memberCount: memberCount[0]?.count || 0,
          tenureDays: team.teamJoinDate
            ? Math.floor(
                (Date.now() - new Date(team.teamJoinDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0,
        };
      })
    );

    return {
      teams: teamsWithCounts,
      totalTeams: teamsWithCounts.length,
      leadingTeams: teamsWithCounts.filter((t) => t.role === "lead").length,
      primaryTeam: teamsWithCounts.find((t) => t.isPrimaryTeam),
    };
  } catch (error) {
    logger.error("Error getting user team collaborations:", error);
    return {
      teams: [],
      totalTeams: 0,
      leadingTeams: 0,
      primaryTeam: null,
    };
  }
}

