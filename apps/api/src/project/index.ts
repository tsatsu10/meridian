import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import createProject from "./controllers/create-project";
import deleteProject from "./controllers/delete-project";
import getProject from "./controllers/get-project";
import getProjects from "./controllers/get-projects";
import getWorkspaceProjectStats from "./controllers/get-workspace-project-stats";
import duplicateProject from "./controllers/duplicate-project";
import updateProject from "./controllers/update-project";
import createStatusColumn from "./controllers/create-status-column";
import deleteStatusColumn from "./controllers/delete-status-column";
import { archiveProject, restoreProject } from "./controllers/archive-project";
import exportProject, { convertToCSV, convertToMarkdown } from "./controllers/export-project";
import getProjectOverview from "./controllers/get-project-overview";
// Project member and settings controllers
import addProjectMember from "./controllers/add-project-member";
import removeProjectMember from "./controllers/remove-project-member";
import updateProjectMember from "./controllers/update-project-member";
import getProjectMembers from "./controllers/get-project-members";
import updateProjectSettings from "./controllers/update-project-settings";
import getProjectSettings from "./controllers/get-project-settings";
// New controllers for enhanced functionality
// Bulk operations controller
import {
  bulkUpdateProjects,
  bulkDeleteProjects,
  bulkCreateProjects,
} from "./controllers/bulk-operations";
// Analytics controller
import { getProjectAnalytics } from "../analytics/controllers/get-project-analytics";
// Teams controllers
import getProjectTeams from "./controllers/teams/get-project-teams";
import createTeam from "./controllers/teams/create-team";
import { checkRateLimit, RATE_LIMITS } from "../middlewares/chat-rate-limiter";
import updateTeam from "./controllers/teams/update-team";
import deleteTeam from "./controllers/teams/delete-team";
import addMember from "./controllers/teams/add-member";
import removeMember from "./controllers/teams/remove-member";
import updateMemberRole from "./controllers/teams/update-member-role";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { statusColumnTable, projectTable, workspaceUserTable, userTable } from "../database/schema";
import rbacMiddleware from "../middlewares/rbac";
import { requirePermission } from "../middlewares/rbac";
import { CachePresets } from "../middlewares/cache-middleware";
import { RateLimitPresets } from "../middlewares/rate-limit";
import logger from '../utils/logger';

// Enhanced validation schemas
const projectStatusSchema = z.enum(["planning", "active", "on-hold", "completed", "archived"]);
const projectCategorySchema = z.enum(["development", "design", "marketing", "operations", "research", "other"]);
const projectPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const projectVisibilitySchema = z.enum(["private", "team", "workspace"]);
const projectRoleSchema = z.enum(["owner", "admin", "team-lead", "senior", "member", "viewer"]);

function splitCsv(s: string | undefined): string[] | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

const project = new Hono<{
  Variables: {
    userEmail: string;
  };
}>()
  .get(
    "/",
    zValidator("query", z.object({
      workspaceId: z.string(),
      limit: z.string().optional(),
      offset: z.string().optional(),
      includeArchived: z.string().optional(),
      archivedOnly: z.string().optional(),
      q: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      ownerIds: z.string().optional(),
      teamMemberIds: z.string().optional(),
      sortBy: z.enum(["name", "status", "priority", "dueDate", "progress"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    })),
    async (c) => {
      const q = c.req.valid("query");
      const {
        workspaceId,
        limit,
        offset,
        includeArchived,
        archivedOnly,
        sortBy,
        sortOrder,
      } = q;

      const projects = await getProjects(workspaceId, {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        includeArchived: includeArchived === "true",
        archivedOnly: archivedOnly === "true",
        q: q.q,
        status: splitCsv(q.status),
        priority: splitCsv(q.priority),
        ownerIds: splitCsv(q.ownerIds),
        teamMemberIds: splitCsv(q.teamMemberIds),
        sortBy,
        sortOrder,
      });

      return c.json(projects);
    },
  )
  .get(
    "/stats",
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("query");
      const stats = await getWorkspaceProjectStats(workspaceId);
      return c.json(stats);
    },
  )
  .get(
    "/:projectId",
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { workspaceId } = c.req.valid("query");

      const project = await getProject(projectId, workspaceId);

      return c.json(project);
    },
  )
  .post(
    "/",
    rbacMiddleware.canCreateProjects,
    zValidator(
      "json",
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        icon: z.string().optional().default("Layout"),
        slug: z.string().min(1).max(10),
        // @epic-1.1-subtasks @persona-sarah: Enhanced project metadata
        status: projectStatusSchema.optional().default("planning"),
        category: projectCategorySchema.optional().default("development"),
        priority: projectPrioritySchema.optional().default("medium"),
        // @epic-2.1-files @persona-jennifer: Visibility and access controls
        visibility: projectVisibilitySchema.optional().default("team"),
        allowGuestAccess: z.boolean().optional().default(false),
        requireApprovalForJoining: z.boolean().optional().default(true),
        // @epic-3.2-time @persona-david: Time tracking settings
        timeTrackingEnabled: z.boolean().optional().default(true),
        requireTimeEntry: z.boolean().optional().default(false),
        // Feature toggles
        enableSubtasks: z.boolean().optional().default(true),
        enableDependencies: z.boolean().optional().default(true),
        enableBudgetTracking: z.boolean().optional().default(false),
        // Timeline and budget
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        budget: z.number().min(0).optional().default(0),
        estimatedHours: z.number().min(0).optional().default(0),
        // Notifications
        emailNotifications: z.boolean().optional().default(true),
        slackNotifications: z.boolean().optional().default(false),
      }),
    ),
    async (c) => {
      const projectData = c.req.valid("json");
      const userId = c.get("userId");

      if (!userId) {
        return c.json({ error: "User ID not found in context" }, 401);
      }

      // 🔒 SECURITY: Rate limit project creation (5 per minute)
      try {
        await checkRateLimit(userId, RATE_LIMITS.CREATE_PROJECT);
      } catch (rateLimitError) {
        return c.json({ error: 'Too many projects created. Please wait a moment.' }, 429);
      }

      const project = await createProject(projectData, userId);

      return c.json(project);
    },
  )
  .post(
    "/:projectId/duplicate",
    rbacMiddleware.canCreateProjects,
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator("json", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { workspaceId } = c.req.valid("json");
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ error: "User ID not found in context" }, 401);
      }
      try {
        await checkRateLimit(userId, RATE_LIMITS.CREATE_PROJECT);
      } catch {
        return c.json({ error: "Too many projects created. Please wait a moment." }, 429);
      }
      const created = await duplicateProject(projectId, workspaceId, userId);
      return c.json(created);
    },
  )
  .put(
    "/:projectId",
    rbacMiddleware.canEditProjects,
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        icon: z.string(),
        slug: z.string().min(1).max(10),
        // Enhanced fields
        status: projectStatusSchema.optional(),
        category: projectCategorySchema.optional(),
        priority: projectPrioritySchema.optional(),
        visibility: projectVisibilitySchema.optional(),
        allowGuestAccess: z.boolean().optional(),
        requireApprovalForJoining: z.boolean().optional(),
        timeTrackingEnabled: z.boolean().optional(),
        requireTimeEntry: z.boolean().optional(),
        enableSubtasks: z.boolean().optional(),
        enableDependencies: z.boolean().optional(),
        enableBudgetTracking: z.boolean().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        budget: z.number().min(0).optional(),
        estimatedHours: z.number().min(0).optional(),
        emailNotifications: z.boolean().optional(),
        slackNotifications: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const projectData = c.req.valid("json");
      const userId = c.get("userId");

      // 🔒 SECURITY: Rate limit project updates (20 per minute)
      if (userId) {
        try {
          await checkRateLimit(userId, RATE_LIMITS.UPDATE_PROJECT);
        } catch (rateLimitError) {
          return c.json({ error: 'Too many project updates. Please slow down.' }, 429);
        }
      }

      const project = await updateProject(projectId, projectData, userId);

      return c.json(project);
    },
  )
  .delete(
    "/:projectId",
    RateLimitPresets.delete, // 🚦 Rate limit: 2 deletions per 15 minutes (already has built-in rate limit)
    rbacMiddleware.canDeleteProjects,
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const userId = c.get("userId");

      // Note: Already has RateLimitPresets.delete middleware above
      // Adding our standard rate limit for consistency
      if (userId) {
        try {
          await checkRateLimit(userId, RATE_LIMITS.DELETE_PROJECT);
        } catch (rateLimitError) {
          return c.json({ error: 'Too many deletions. Please wait.' }, 429);
        }
      }

      const project = await deleteProject(projectId);

      return c.json(project);
    },
  )
  
  // Archive/Restore endpoints
  .patch(
    "/:id/archive",
    RateLimitPresets.archive, // 🚦 Rate limit: 5 archive operations per 5 minutes
    rbacMiddleware.canEditProjects,
    archiveProject
  )
  .patch(
    "/:id/restore",
    RateLimitPresets.archive, // 🚦 Rate limit: 5 restore operations per 5 minutes
    rbacMiddleware.canEditProjects,
    restoreProject
  )
  
  // @epic-1.1-subtasks: Enhanced team management endpoints for Sarah's PM workflow
  .get(
    "/:projectId/members",
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");

      const members = await getProjectMembers(projectId);

      return c.json(members);
    },
  )
  .post(
    "/:projectId/members",
    rbacMiddleware.canManageProjectTeam,
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator(
      "json",
      z.object({
        userEmail: z.string().email(),
        role: projectRoleSchema.optional().default("member"),
        hoursPerWeek: z.number().min(1).max(80).optional().default(40),
        notificationSettings: z.record(z.boolean()).optional(),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { userEmail, role, hoursPerWeek, notificationSettings } = c.req.valid("json");
      const assignedBy = c.get("userEmail");

      const member = await addProjectMember({
        projectId,
        userEmail,
        role,
        hoursPerWeek,
        assignedBy,
        notificationSettings,
      });

      return c.json(member);
    },
  )
  .put(
    "/:projectId/members/:memberEmail",
    zValidator("param", z.object({ 
      projectId: z.string(),
      memberEmail: z.string() 
    })),
    zValidator(
      "json",
      z.object({
        role: projectRoleSchema.optional(),
        hoursPerWeek: z.number().min(1).max(80).optional(),
        isActive: z.boolean().optional(),
        notificationSettings: z.record(z.boolean()).optional(),
      }),
    ),
    async (c) => {
      const { projectId, memberEmail } = c.req.valid("param");
      const updateData = c.req.valid("json");

      const member = await updateProjectMember(projectId, memberEmail, updateData);

      return c.json(member);
    },
  )
  .delete(
    "/:projectId/members/:memberEmail",
    zValidator("param", z.object({ 
      projectId: z.string(),
      memberEmail: z.string() 
    })),
    async (c) => {
      const { projectId, memberEmail } = c.req.valid("param");

      const result = await removeProjectMember(projectId, memberEmail);

      return c.json(result);
    },
  )

  // @epic-3.1-dashboard: Project settings management for Jennifer's executive oversight
  .get(
    "/:projectId/settings/:category",
    zValidator("param", z.object({ 
      projectId: z.string(),
      category: z.enum(["integrations", "automation", "templates", "workflows"])
    })),
    async (c) => {
      const { projectId, category } = c.req.valid("param");

      const settings = await getProjectSettings(projectId, category);

      return c.json(settings);
    },
  )
  .put(
    "/:projectId/settings/:category",
    zValidator("param", z.object({ 
      projectId: z.string(),
      category: z.enum(["integrations", "automation", "templates", "workflows"])
    })),
    zValidator(
      "json",
      z.object({
        settings: z.record(z.any()), // Flexible settings object
      }),
    ),
    async (c) => {
      const { projectId, category } = c.req.valid("param");
      const { settings } = c.req.valid("json");
      const modifiedBy = c.get("userEmail");

      const result = await updateProjectSettings(projectId, category, settings, modifiedBy);

      return c.json(result);
    },
  )

  // @epic-1.1-subtasks: Status column management endpoints for Sarah's PM workflow
  .post(
    "/:projectId/status-columns",
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(50),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        position: z.number().int().min(0).optional(),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { name, color, position } = c.req.valid("json");

      const statusColumn = await createStatusColumn({
        projectId,
        name,
        color,
        position,
      });

      return c.json(statusColumn);
    },
  )
  .delete(
    "/:projectId/status-columns/:columnId",
    zValidator("param", z.object({ 
      projectId: z.string(), 
      columnId: z.string() 
    })),
    async (c) => {
      const { projectId, columnId } = c.req.valid("param");

      const result = await deleteStatusColumn({
        projectId,
        columnId,
      });

      return c.json(result);
    },
  )
  
  // Fix position conflicts in project columns
  .post(
    "/:projectId/fix-positions",
    async (c) => {
      const { projectId } = c.req.param();
      const db = getDatabase();

      try {
        logger.debug('🔧 Fixing position conflicts for project:', projectId);

        // Get all columns sorted by current position, then by creation date for tiebreaker
        const columns = await db
          .select()
          .from(statusColumnTable)
          .where(eq(statusColumnTable.projectId, projectId))
          .orderBy(statusColumnTable.position, statusColumnTable.createdAt);

        logger.debug('🔧 Current columns before fix:', columns.map(c => ({ 
          id: c.id, 
          name: c.name, 
          position: c.position, 
          isDefault: c.isDefault 
        })));

        // Renumber positions sequentially
        for (let i = 0; i < columns.length; i++) {
          const column = columns[i];
          const newPosition = i; // 0, 1, 2, 3, 4...
          
          if (column.position !== newPosition) {
            logger.debug(`🔧 Updating ${column.name} position from ${column.position} to ${newPosition}`);
            await db
              .update(statusColumnTable)
              .set({ position: newPosition })
              .where(eq(statusColumnTable.id, column.id));
          }
        }
        
        logger.debug('🔧 Position conflicts fixed');
        return c.json({ success: true, message: 'Position conflicts fixed' });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    },
  )

  // @epic-1.1-subtasks: Analytics endpoint for project analytics
  .get(
    "/:projectId/analytics",
    requirePermission("canViewAnalytics"),
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator("query", z.object({ timeRange: z.string().optional() })),
    getProjectAnalytics
  )

  // ====================================
  // TEAMS API ENDPOINTS
  // ====================================
  
  // Get all teams for a project
  .get(
    "/:projectId/teams",
    zValidator("param", z.object({ projectId: z.string() })),
    getProjectTeams
  )
  
  // Create a new team
  .post(
    "/:projectId/teams",
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator("json", z.object({
      name: z.string().min(1, "Team name is required"),
      description: z.string().optional(),
      color: z.string().optional(),
      leadId: z.string().optional(),
    })),
    createTeam
  )
  
  // Update team details
  .patch(
    "/:projectId/teams/:teamId",
    zValidator("param", z.object({ 
      projectId: z.string(),
      teamId: z.string() 
    })),
    zValidator("json", z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      leadId: z.string().optional(),
    })),
    updateTeam
  )
  
  // Delete a team
  .delete(
    "/:projectId/teams/:teamId",
    zValidator("param", z.object({ 
      projectId: z.string(),
      teamId: z.string() 
    })),
    deleteTeam
  )
  
  // Add member to team
  .post(
    "/:projectId/teams/:teamId/members",
    zValidator("param", z.object({ 
      projectId: z.string(),
      teamId: z.string() 
    })),
    zValidator("json", z.object({
      userEmail: z.string().email("Valid email is required"),
      userName: z.string(),
      role: z.string().optional(),
    })),
    addMember
  )
  
  // Remove member from team
  .delete(
    "/:projectId/teams/:teamId/members/:memberId",
    zValidator("param", z.object({ 
      projectId: z.string(),
      teamId: z.string(),
      memberId: z.string() 
    })),
    removeMember
  )
  
  // Update member role
  .patch(
    "/:projectId/teams/:teamId/members/:memberId/role",
    zValidator("param", z.object({ 
      projectId: z.string(),
      teamId: z.string(),
      memberId: z.string() 
    })),
    zValidator("json", z.object({
      role: z.string().min(1, "Role is required"),
    })),
    updateMemberRole
  )
  // Bulk Operations Endpoints
  .patch(
    "/bulk/update",
    zValidator(
      "json",
      z.object({
        projectIds: z.array(z.string()).min(1),
        updates: z.object({
          status: z.string().optional(),
          priority: z.string().optional(),
          health: z.string().optional(),
          dueDate: z.string().datetime().optional().nullable(),
          description: z.string().optional(),
        }),
      })
    ),
    async (c) => {
      try {
        const payload = c.req.valid("json");
        const result = await bulkUpdateProjects({
          projectIds: payload.projectIds,
          updates: {
            ...payload.updates,
            dueDate: payload.updates.dueDate ? new Date(payload.updates.dueDate) : undefined,
          },
        });
        return c.json(result);
      } catch (error) {
        logger.error("Bulk update error:", error);
        return c.json({ error: "Bulk update failed" }, 500);
      }
    }
  )
  .delete(
    "/bulk/delete",
    zValidator(
      "json",
      z.object({
        projectIds: z.array(z.string()).min(1),
        reason: z.string().optional(),
      })
    ),
    async (c) => {
      try {
        const payload = c.req.valid("json");
        const result = await bulkDeleteProjects(payload);
        return c.json(result);
      } catch (error) {
        logger.error("Bulk delete error:", error);
        return c.json({ error: "Bulk delete failed" }, 500);
      }
    }
  )
  .post(
    "/bulk/create",
    zValidator(
      "json",
      z.object({
        projects: z.array(
          z.object({
            name: z.string().min(1).max(100),
            workspaceId: z.string(),
            ownerId: z.string(),
            icon: z.string().optional(),
            slug: z.string().optional(),
            status: z.enum(["planning", "active", "on-hold", "completed", "archived"]).optional(),
            priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          })
        ),
      })
    ),
    async (c) => {
      try {
        const payload = c.req.valid("json");
        const result = await bulkCreateProjects(payload);
        return c.json(result);
      } catch (error) {
        logger.error("Bulk create error:", error);
        return c.json({ error: "Bulk create failed" }, 500);
      }
    }
  )

  // 🚀 PERFORMANCE: Unified Project Overview Endpoint (with Redis caching)
  .get(
    "/:id/overview",
    zValidator("param", z.object({ id: z.string() })),
    zValidator("query", z.object({ 
      workspaceId: z.string(),
      includeActivity: z.string().optional(),
      activityLimit: z.string().optional(),
      includeTeam: z.string().optional(),
    })),
    CachePresets.projectOverview(), // 🔴 Cache for 5 minutes
    getProjectOverview
  )

  // 🔒 SECURITY: Secure Project Export Endpoint with Audit Logging
  .post(
    "/:projectId/export",
    RateLimitPresets.export, // 🚦 Rate limit: 1 export per minute per user
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator("query", z.object({ workspaceId: z.string() })),
    zValidator(
      "json",
      z.object({
        format: z.enum(["json", "csv", "markdown"]).optional().default("json"),
        includeComments: z.boolean().optional().default(false),
        includeAttachments: z.boolean().optional().default(false),
        includeMilestones: z.boolean().optional().default(true),
        includeTeam: z.boolean().optional().default(true),
        includeActivity: z.boolean().optional().default(false),
      })
    ),
    async (c) => {
      try {
        const { projectId } = c.req.valid("param");
        const { workspaceId } = c.req.valid("query");
        const options = c.req.valid("json");
        const userEmail = c.get("userEmail");

        // Get user context for audit logging
        const db = getDatabase();
        const [user] = await db
          .select()
          .from(userTable)
          .where(eq(userTable.email, userEmail))
          .limit(1);

        if (!user) {
          return c.json({ error: "User not found" }, 401);
        }

        // Build export context
        const context = {
          userEmail,
          userId: user.id,
          userRole: user.role || "member",
          ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
          userAgent: c.req.header("user-agent"),
        };

        // Execute export with full audit logging
        const exportData = await exportProject(
          projectId,
          workspaceId,
          context,
          options
        );

        // Convert to requested format
        let responseData: any;
        let contentType: string;
        let filename: string;

        switch (options.format) {
          case "csv":
            responseData = convertToCSV(exportData);
            contentType = "text/csv";
            filename = `${exportData.project.name.replace(/[^a-z0-9]/gi, '_')}_export.csv`;
            break;

          case "markdown":
            responseData = convertToMarkdown(exportData);
            contentType = "text/markdown";
            filename = `${exportData.project.name.replace(/[^a-z0-9]/gi, '_')}_export.md`;
            break;

          case "json":
          default:
            responseData = JSON.stringify(exportData, null, 2);
            contentType = "application/json";
            filename = `${exportData.project.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
            break;
        }

        // Set response headers for file download
        c.header("Content-Type", contentType);
        c.header("Content-Disposition", `attachment; filename="${filename}"`);
        c.header("X-Export-Format", options.format || "json");
        c.header("X-Export-Timestamp", new Date().toISOString());

        return c.body(responseData);

      } catch (error) {
        logger.error("Export error:", error);
        return c.json({ 
          error: "Export failed",
          message: error.message 
        }, 500);
      }
    }
  );

export default project;

