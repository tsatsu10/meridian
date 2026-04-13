/**
 * 🔒 Secure Archive Project Controller
 * 
 * Archives a project with:
 * - RBAC permission checking
 * - Workspace verification
 * - Audit logging
 * - User context tracking
 * 
 * @epic-1.1-rbac: Project archive requires canArchiveProjects permission
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import { projects, userTable } from "../../database/schema";
import { eq, and } from "drizzle-orm";
import { auditLogger } from "../../utils/audit-logger";
import { CacheInvalidation } from "../../utils/cache-invalidation";
import logger from '../../utils/logger';

/**
 * 🔒 SECURITY: Archive a project with full audit trail
 */
export async function archiveProject(c: Context) {
  const db = getDatabase();
  const projectId = c.req.param("id");
  const workspaceId = c.req.query("workspaceId");
  const userEmail = c.get("userEmail");
  const startTime = Date.now();

  if (!projectId) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  if (!workspaceId) {
    return c.json({ error: "Workspace ID is required" }, 400);
  }

  try {
    // Get user context for audit logging
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    // 🔒 STEP 1: Check if project exists and belongs to workspace
    const existingProject = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.workspaceId, workspaceId)
      ),
    });

    if (!existingProject) {
      // 📊 AUDIT: Failed archive attempt
      await auditLogger.logEvent({
        eventType: 'workspace_operation',
        action: 'project_archive',
        userId: user.id,
        userEmail: user.email,
        workspaceId,
        resourceId: projectId,
        resourceType: 'project',
        outcome: 'failure',
        severity: 'medium',
        ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
        userAgent: c.req.header("user-agent"),
        details: {
          reason: 'Project not found or workspace mismatch',
          requestedWorkspace: workspaceId,
          requestedProject: projectId,
          userRole: user.role,
        },
        metadata: {
          duration: Date.now() - startTime,
          errorMessage: 'Project not found',
          timestamp: new Date(),
        }
      });

      return c.json({ error: "Project not found or does not belong to workspace" }, 404);
    }

    // Check if already archived
    if (existingProject.isArchived) {
      return c.json({ 
        success: true,
        message: `Project "${existingProject.name}" is already archived`,
        project: existingProject,
      });
    }

    // 🔒 STEP 2: Archive the project
    const [archivedProject] = await db
      .update(projects)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    const duration = Date.now() - startTime;

    // 📊 AUDIT: Successful archive
    await auditLogger.logEvent({
      eventType: 'workspace_operation',
      action: 'project_archive',
      userId: user.id,
      userEmail: user.email,
      workspaceId,
      resourceId: projectId,
      resourceType: 'project',
      outcome: 'success',
      severity: 'medium', // Archiving is medium severity
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
      userAgent: c.req.header("user-agent"),
      details: {
        projectName: archivedProject.name,
        projectStatus: archivedProject.status,
        userRole: user.role,
        wasArchived: existingProject.isArchived,
        nowArchived: true,
      },
      metadata: {
        duration,
        timestamp: new Date(),
      }
    });

    // 🔴 CACHE: Invalidate project overview and workspace caches
    await CacheInvalidation.onProjectArchive(projectId, workspaceId);

    return c.json({
      success: true,
      message: `Project "${archivedProject.name}" archived successfully`,
      project: archivedProject,
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // 📊 AUDIT: Failed archive
    await auditLogger.logEvent({
      eventType: 'workspace_operation',
      action: 'project_archive',
      userId: user?.id || 'unknown',
      userEmail: userEmail || 'unknown',
      workspaceId,
      resourceId: projectId,
      resourceType: 'project',
      outcome: 'failure',
      severity: 'high', // Failed operations are high severity
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
      userAgent: c.req.header("user-agent"),
      details: {
        error: error.message,
        userRole: user?.role || 'unknown',
      },
      metadata: {
        duration,
        errorMessage: error.message,
        timestamp: new Date(),
      }
    });

    logger.error("Error archiving project:", error);
    return c.json({ error: "Failed to archive project" }, 500);
  }
}

/**
 * 🔒 SECURITY: Restore an archived project with full audit trail
 */
export async function restoreProject(c: Context) {
  const db = getDatabase();
  const projectId = c.req.param("id");
  const workspaceId = c.req.query("workspaceId");
  const userEmail = c.get("userEmail");
  const startTime = Date.now();

  if (!projectId) {
    return c.json({ error: "Project ID is required" }, 400);
  }

  if (!workspaceId) {
    return c.json({ error: "Workspace ID is required" }, 400);
  }

  try {
    // Get user context for audit logging
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    // 🔒 STEP 1: Check if project exists and belongs to workspace
    const existingProject = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.workspaceId, workspaceId)
      ),
    });

    if (!existingProject) {
      // 📊 AUDIT: Failed restore attempt
      await auditLogger.logEvent({
        eventType: 'workspace_operation',
        action: 'project_restore',
        userId: user.id,
        userEmail: user.email,
        workspaceId,
        resourceId: projectId,
        resourceType: 'project',
        outcome: 'failure',
        severity: 'medium',
        ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
        userAgent: c.req.header("user-agent"),
        details: {
          reason: 'Project not found or workspace mismatch',
          requestedWorkspace: workspaceId,
          requestedProject: projectId,
          userRole: user.role,
        },
        metadata: {
          duration: Date.now() - startTime,
          errorMessage: 'Project not found',
          timestamp: new Date(),
        }
      });

      return c.json({ error: "Project not found or does not belong to workspace" }, 404);
    }

    // Check if already active (not archived)
    if (!existingProject.isArchived) {
      return c.json({ 
        success: true,
        message: `Project "${existingProject.name}" is already active`,
        project: existingProject,
      });
    }

    // 🔒 STEP 2: Restore the project
    const [restoredProject] = await db
      .update(projects)
      .set({
        isArchived: false,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    const duration = Date.now() - startTime;

    // 📊 AUDIT: Successful restore
    await auditLogger.logEvent({
      eventType: 'workspace_operation',
      action: 'project_restore',
      userId: user.id,
      userEmail: user.email,
      workspaceId,
      resourceId: projectId,
      resourceType: 'project',
      outcome: 'success',
      severity: 'medium',
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
      userAgent: c.req.header("user-agent"),
      details: {
        projectName: restoredProject.name,
        projectStatus: restoredProject.status,
        userRole: user.role,
        wasArchived: existingProject.isArchived,
        nowArchived: false,
      },
      metadata: {
        duration,
        timestamp: new Date(),
      }
    });

    // 🔴 CACHE: Invalidate project overview and workspace caches
    await CacheInvalidation.onProjectArchive(projectId, workspaceId);

    return c.json({
      success: true,
      message: `Project "${restoredProject.name}" restored successfully`,
      project: restoredProject,
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // 📊 AUDIT: Failed restore
    await auditLogger.logEvent({
      eventType: 'workspace_operation',
      action: 'project_restore',
      userId: user?.id || 'unknown',
      userEmail: userEmail || 'unknown',
      workspaceId,
      resourceId: projectId,
      resourceType: 'project',
      outcome: 'failure',
      severity: 'high',
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
      userAgent: c.req.header("user-agent"),
      details: {
        error: error.message,
        userRole: user?.role || 'unknown',
      },
      metadata: {
        duration,
        errorMessage: error.message,
        timestamp: new Date(),
      }
    });

    logger.error("Error restoring project:", error);
    return c.json({ error: "Failed to restore project" }, 500);
  }
}

