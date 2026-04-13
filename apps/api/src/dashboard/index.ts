import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { eq, and, count, sql } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { projectTable, taskTable, workspaceUserTable, userTable, activityTable } from "../database/schema";
import getAnalytics from "./controllers/get-analytics";
import getAnalyticsSimple from "./controllers/get-analytics-simple";
import getEnhancedAnalytics from "./controllers/get-analytics-enhanced";
import logger from '../utils/logger';

const dashboard = new Hono()
  .get(
    "/stats/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator(
      "query",
      z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        timeRange: z.enum(["today", "week", "month", "all"]).optional(),
        projectIds: z.string().optional(),
        userEmails: z.string().optional(),
      })
    ),
    async (c) => {
      const db = getDatabase();
      const { workspaceId } = c.req.valid("param");
      const filters = c.req.valid("query");

      // Build filter conditions
      const filterConditions = [eq(projectTable.workspaceId, workspaceId)];
      
      // Status filter
      if (filters.status) {
        const statuses = filters.status.split(",");
        if (statuses.length === 1) {
          filterConditions.push(eq(taskTable.status, statuses[0] as any));
        } else {
          filterConditions.push(sql`${taskTable.status} IN (${sql.join(statuses.map(s => sql`${s}`), sql`, `)})`);
        }
      }
      
      // Priority filter
      if (filters.priority) {
        const priorities = filters.priority.split(",");
        if (priorities.length === 1) {
          filterConditions.push(eq(taskTable.priority, priorities[0] as any));
        } else {
          filterConditions.push(sql`${taskTable.priority} IN (${sql.join(priorities.map(p => sql`${p}`), sql`, `)})`);
        }
      }
      
      // Time range filter
      if (filters.timeRange && filters.timeRange !== "all") {
        const now = new Date();
        let dateFilter: Date;
        
        switch (filters.timeRange) {
          case "today":
            dateFilter = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (dateFilter!) {
          filterConditions.push(sql`${taskTable.createdAt} >= ${dateFilter.toISOString()}`);
        }
      }
      
      // Project filter
      if (filters.projectIds) {
        const projectIds = filters.projectIds.split(",");
        if (projectIds.length === 1) {
          filterConditions.push(eq(taskTable.projectId, projectIds[0]));
        } else {
          filterConditions.push(sql`${taskTable.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
        }
      }
      
      // User filter
      if (filters.userEmails) {
        const userEmails = filters.userEmails.split(",");
        if (userEmails.length === 1) {
          filterConditions.push(eq(taskTable.assigneeEmail, userEmails[0]));
        } else {
          filterConditions.push(sql`${taskTable.assigneeEmail} IN (${sql.join(userEmails.map(e => sql`${e}`), sql`, `)})`);
        }
      }

      // Get total tasks with filters
      const [totalTasksResult] = await db
        .select({ count: count() })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(and(...filterConditions)) || [{ count: 0 }];

      // Get completed tasks with filters
      const [completedTasksResult] = await db
        .select({ count: count() })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(
          and(
            ...filterConditions,
            eq(taskTable.status, "done")
          )
        ) || [{ count: 0 }];

      // Get overdue tasks with filters
      const [overdueTasksResult] = await db
        .select({ count: count() })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(
          and(
            ...filterConditions,
            sql`${taskTable.dueDate} < CURRENT_TIMESTAMP`,
            sql`${taskTable.status} != 'done'`
          )
        ) || [{ count: 0 }];

      // Get active projects
      const [activeProjectsResult] = await db
        .select({ count: count() })
        .from(projectTable)
        .where(eq(projectTable.workspaceId, workspaceId)) || [{ count: 0 }];

      // Get team members
      const [teamMembersResult] = await db
        .select({ count: count() })
        .from(workspaceUserTable)
        .where(eq(workspaceUserTable.workspaceId, workspaceId)) || [{ count: 0 }];

      // Calculate productivity (completed tasks / total tasks * 100)
      const productivity = (totalTasksResult?.count || 0) > 0
        ? Math.round(((completedTasksResult?.count || 0) / (totalTasksResult?.count || 1)) * 100)
        : 0;

      return c.json({
        totalTasks: totalTasksResult?.count || 0,
        completedTasks: completedTasksResult?.count || 0,
        overdueTasks: overdueTasksResult?.count || 0,
        activeProjects: activeProjectsResult?.count || 0,
        teamMembers: teamMembersResult?.count || 0,
        productivity,
      });
    }
  )
  .get(
    "/activity",
    zValidator("query", z.object({ 
      workspaceId: z.string(),
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 5)
    })),
    async (c) => {
      const db = getDatabase(); // FIX: Initialize database connection
      const { workspaceId, limit } = c.req.valid("query");

      const activities = await db
        .select({
          id: activityTable.id,
          type: activityTable.type,
          description: activityTable.content,
          timestamp: activityTable.createdAt,
          user: {
            name: userTable.name,
          },
          project: {
            name: projectTable.name,
          },
        })
        .from(activityTable)
        .innerJoin(userTable, eq(activityTable.userId, userTable.id))
        .leftJoin(taskTable, eq(activityTable.taskId, taskTable.id))
        .leftJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(eq(projectTable.workspaceId, workspaceId))
        .orderBy(sql`${activityTable.createdAt} DESC`)
        .limit(limit);

      return c.json(activities);
    }
  )
  .get(
    "/task/upcoming",
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const db = getDatabase(); // FIX: Initialize database connection
      const { workspaceId } = c.req.valid("query");

      const tasks = await db
        .select({
          id: taskTable.id,
          title: taskTable.title,
          dueDate: taskTable.dueDate,
          priority: taskTable.priority,
          project: {
            name: projectTable.name,
          },
          assignee: {
            name: userTable.name,
          },
        })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .leftJoin(userTable, eq(taskTable.userEmail, userTable.email))
        .where(
          and(
            eq(projectTable.workspaceId, workspaceId),
            sql`${taskTable.dueDate} >= CURRENT_TIMESTAMP`,
            sql`${taskTable.status} != 'done'`
          )
        )
        .orderBy(taskTable.dueDate)
        .limit(5);

      return c.json(tasks);
    }
  )
  // @epic-2.1-analytics: Enhanced analytics endpoint with advanced filtering and comparative analytics
  // @role-workspace-manager: Executive-level insights with cross-project visibility
  // @role-department-head: Department-wide analytics and performance tracking
  .get(
    "/analytics/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator(
      "query",
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y", "all", "custom"]).optional(),
        projectIds: z.string().optional(),
        userEmails: z.string().optional(),
        departments: z.string().optional(),
        priorities: z.string().optional(),
        statuses: z.string().optional(),
        includeArchived: z.string().optional().transform(val => val === "true"),
        granularity: z.enum(["daily", "weekly", "monthly"]).optional(),
        compareWith: z.enum(["previous_period", "previous_year", "baseline"]).optional(),
        customStartDate: z.string().optional(),
        customEndDate: z.string().optional(),
        includeForecasting: z.string().optional().transform(val => val === "true"),
        includeBenchmarks: z.string().optional().transform(val => val === "true"),
        enhanced: z.string().optional().transform(val => val === "true"),
      })
    ),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const {
        timeRange,
        projectIds,
        userEmails,
        departments,
        priorities,
        statuses,
        includeArchived,
        granularity,
        compareWith,
        customStartDate,
        customEndDate,
        includeForecasting,
        includeBenchmarks,
        enhanced,
      } = c.req.valid("query");

      // Add debug logging
      logger.debug("📊 Analytics request:", {
        workspaceId,
        timeRange,
        enhanced,
        includeArchived,
        includeForecasting,
        includeBenchmarks
      });

      try {
        // Enhanced analytics is now enabled with fixed date handling
        if (enhanced) {
          // Use enhanced analytics with advanced features
          const options = {
            workspaceId,
            timeRange,
            projectIds: projectIds ? projectIds.split(",") : undefined,
            userEmails: userEmails ? userEmails.split(",") : undefined,
            departments: departments ? departments.split(",") : undefined,
            priorities: priorities ? priorities.split(",") : undefined,
            statuses: statuses ? statuses.split(",") : undefined,
            includeArchived,
            granularity,
            compareWith,
            customStartDate,
            customEndDate,
            includeForecasting,
            includeBenchmarks,
          };

          logger.debug("📊 Enhanced analytics options:", options);
          const analytics = await getEnhancedAnalytics(options);
          return c.json(analytics);
        } else {
          // Use simple analytics for backward compatibility
          const options = {
            workspaceId,
            timeRange,
            projectIds: projectIds ? projectIds.split(",") : undefined,
          };

          logger.debug("📊 Using simple analytics (enhanced analytics temporarily disabled)");
          const simpleAnalytics = await getAnalyticsSimple(options);

          // Helper to create comparative data format
          const toComparative = (value: number) => ({
            current: value,
            comparison: value,
            change: {
              absolute: 0,
              percentage: 0,
              trend: "stable" as const
            }
          });

          // Transform simple analytics to match enhanced analytics format expected by frontend
          const enhancedFormat = {
            projectMetrics: {
              totalProjects: toComparative(simpleAnalytics.projectMetrics.totalProjects),
              activeProjects: toComparative(simpleAnalytics.projectMetrics.activeProjects),
              completedProjects: toComparative(simpleAnalytics.projectMetrics.completedProjects),
              projectsAtRisk: toComparative(simpleAnalytics.projectMetrics.projectsAtRisk),
              avgHealthScore: toComparative(simpleAnalytics.summary.overallHealth || 0),
            },
            taskMetrics: {
              totalTasks: toComparative(simpleAnalytics.taskMetrics.totalTasks),
              completedTasks: toComparative(simpleAnalytics.taskMetrics.completedTasks),
              inProgressTasks: toComparative(simpleAnalytics.taskMetrics.inProgressTasks),
              overdueTasks: toComparative(simpleAnalytics.taskMetrics.overdueTasks),
              avgCycleTime: toComparative(simpleAnalytics.performanceBenchmarks?.avgTaskCycleTime || 0),
              throughput: toComparative(simpleAnalytics.performanceBenchmarks?.teamVelocity || 0),
            },
            teamMetrics: {
              totalMembers: toComparative(simpleAnalytics.teamMetrics.totalMembers),
              activeMembers: toComparative(simpleAnalytics.teamMetrics.activeMembers),
              avgProductivity: toComparative(simpleAnalytics.teamMetrics.avgProductivity),
              teamEfficiency: toComparative(simpleAnalytics.teamMetrics.teamEfficiency),
              collaborationIndex: toComparative(0),
              retentionRate: toComparative(100),
            },
            timeMetrics: {
              totalHours: toComparative(simpleAnalytics.timeMetrics.totalHours),
              billableHours: toComparative(simpleAnalytics.timeMetrics.billableHours),
              avgTimePerTask: toComparative(simpleAnalytics.timeMetrics.avgTimePerTask),
              timeUtilization: toComparative(simpleAnalytics.timeMetrics.timeUtilization),
              overtime: toComparative(0),
            },
            projectHealth: (simpleAnalytics.projectHealth || []).map(p => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              completion: p.completion,
              health: p.health === 'critical' ? 'critical' : p.health === 'warning' ? 'warning' : 'good',
              healthScore: p.health === 'good' ? 85 : p.health === 'warning' ? 60 : 35,
              tasksCompleted: p.tasksCompleted,
              totalTasks: p.totalTasks,
              teamSize: p.teamSize,
              daysRemaining: null,
              overdueTasks: p.overdueTasks,
              avgTimePerTask: 0,
              velocity: 0,
              burndownTrend: p.completion > 75 ? 'on_track' : p.completion > 50 ? 'behind' : 'critical',
              riskFactors: [],
              predictedCompletion: null,
            })),
            resourceUtilization: (simpleAnalytics.resourceUtilization || []).map(r => ({
              userEmail: r.userEmail,
              userName: r.userName,
              department: undefined,
              role: 'member',
              projectCount: 0,
              taskCount: r.taskCount,
              completedTasks: r.completedTasks,
              totalHours: r.totalHours,
              utilization: Math.min(100, Math.round((r.totalHours / 160) * 100)), // Assuming 160 hours/month
              productivity: r.productivity,
              efficiency: r.productivity,
              workloadBalance: r.totalHours > 200 ? 'overloaded' : r.totalHours > 120 ? 'optimal' : 'underutilized',
              skillUtilization: 75,
              collaborationScore: 80,
              recentPerformance: toComparative(r.productivity),
            })),
            performanceBenchmarks: {
              avgProjectCompletion: toComparative(simpleAnalytics.performanceBenchmarks?.avgProjectCompletion || 0),
              avgTaskCycleTime: toComparative(simpleAnalytics.performanceBenchmarks?.avgTaskCycleTime || 0),
              teamVelocity: toComparative(simpleAnalytics.performanceBenchmarks?.teamVelocity || 0),
              qualityScore: toComparative(simpleAnalytics.performanceBenchmarks?.qualityScore || 0),
              onTimeDelivery: toComparative(simpleAnalytics.performanceBenchmarks?.onTimeDelivery || 100),
            },
            timeSeriesData: [],
            departmentBreakdown: [],
            skillGapAnalysis: [],
            capacityPlanning: [],
            riskAssessment: [],
            forecasting: null,
            industryBenchmarks: null,
            summary: {
              timeRange: simpleAnalytics.summary.timeRange || timeRange || '30d',
              comparisonPeriod: 'previous_period',
              generatedAt: simpleAnalytics.summary.generatedAt || new Date().toISOString(),
              dataQuality: 85,
              recommendations: [],
              alerts: []
            }
          };

          return c.json(enhancedFormat);
        }
      } catch (error) {
        logger.error("❌ Analytics error:", error);
        return c.json({ error: "Failed to fetch analytics", details: error.message }, 500);
      }
    }
  );

export default dashboard; 
