/**
 * 🛡️ RBAC API Routes
 * 
 * Endpoints for managing role-based access control:
 * - Role assignment and removal
 * - Permission checking
 * - Role history and audit trails
 * - Custom permissions
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import rbacStats from "./stats";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { 
  roleAssignmentTable, 
  roleHistoryTable, 
  customPermissionTable,
  departmentTable,
  userTable,
  workspaceTable
} from "../database/schema";
import { createId } from "@paralleldrive/cuid2";
import { getRolePermissions } from "../constants/rbac";
import type { UserRole } from "../types/rbac";
import logger from '../utils/logger';

const rbac = new Hono<{
  Variables: {
    userEmail: string;
  };
}>();

// ===== VALIDATION SCHEMAS =====

const assignRoleSchema = z.object({
  userId: z.string(),
  role: z.enum([
    "workspace-manager",
    "department-head", 
    "workspace-viewer",
    "project-manager",
    "project-viewer",
    "team-lead",
    "member",
    "client",
    "contractor",
    "stakeholder",
    "guest"
  ]),
  workspaceId: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const customPermissionSchema = z.object({
  userId: z.string(),
  permission: z.string(),
  granted: z.boolean(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

// ===== ROLE ASSIGNMENT ENDPOINTS =====

/**
 * GET /roles - Get role permissions matrix
 */
rbac.get("/roles", async (c) => {
  try {
    // Return the role permissions matrix based on the RBAC system
    const rolePermissions: Record<string, Record<string, boolean>> = {
      "workspace-manager": getRolePermissions("workspace-manager"),
      "department-head": getRolePermissions("department-head"),
      "workspace-viewer": getRolePermissions("workspace-viewer"),
      "project-manager": getRolePermissions("project-manager"),
      "project-viewer": getRolePermissions("project-viewer"),
      "team-lead": getRolePermissions("team-lead"),
      "member": getRolePermissions("member"),
      "client": getRolePermissions("client"),
      "contractor": getRolePermissions("contractor"),
      "stakeholder": getRolePermissions("stakeholder"),
      "guest": getRolePermissions("guest"),
    };

    return c.json(rolePermissions);
  } catch (error) {
    logger.error("Failed to get role permissions:", error);
    return c.json({ error: "Failed to get role permissions" }, 500);
  }
});

/**
 * GET /roles/assignments - Get all role assignments
 */
rbac.get("/assignments", async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");

    // TODO: Check if user has permission to view role assignments

    const assignments = await db
      .select({
        assignment: roleAssignmentTable,
        user: userTable,
      })
      .from(roleAssignmentTable)
      .leftJoin(userTable, eq(roleAssignmentTable.userId, userTable.id))
      .where(eq(roleAssignmentTable.isActive, true))
      .orderBy(desc(roleAssignmentTable.assignedAt));

    return c.json({ assignments });
  } catch (error) {
    logger.error("Failed to get role assignments:", error);
    return c.json({ error: "Failed to get role assignments" }, 500);
  }
});

/**
 * GET /roles/assignments/:userId - Get role assignments for specific user
 */
rbac.get("/assignments/:userId", async (c) => {
  try {
    const db = getDatabase();
    const userId = c.req.param("userId");
    const userEmail = c.get("userEmail");

    // TODO: Check if user has permission to view this user's roles

    const assignments = await db
      .select()
      .from(roleAssignmentTable)
      .where(
        and(
          eq(roleAssignmentTable.userId, userId),
          eq(roleAssignmentTable.isActive, true)
        )
      )
      .orderBy(desc(roleAssignmentTable.assignedAt));

    return c.json({ assignments });
  } catch (error) {
    logger.error("Failed to get user role assignments:", error);
    // Return empty assignments if table doesn't exist yet
    if (error instanceof Error && error.message.includes('relation "role_assignment" does not exist')) {
      return c.json({
        assignments: [],
        warning: "RBAC tables not yet created in database. Run 'npm run db:push' to create them."
      });
    }
    return c.json({ error: "Failed to get user role assignments", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

/**
 * POST /roles/assign - Assign role to user
 */
rbac.post(
  "/assign",
  zValidator("json", assignRoleSchema),
  async (c) => {
    try {
      const db = getDatabase();
      const data = c.req.valid("json");
      const assignerEmail = c.get("userEmail");
      
      // Get assigner user ID
      const assignerUser = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, assignerEmail))
        .limit(1);
      
      if (!assignerUser.length) {
        return c.json({ error: "Assigner not found" }, 400);
      }
      
      // TODO: Check if assigner has permission to assign this role
      
      // Deactivate existing role assignments for this user
      await db
        .update(roleAssignmentTable)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(roleAssignmentTable.userId, data.userId),
            eq(roleAssignmentTable.isActive, true)
          )
        );
      
      // Create new role assignment
      const newAssignment = {
        id: createId(),
        userId: data.userId,
        role: data.role,
        assignedBy: assignerUser[0].id,
        assignedAt: new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
        workspaceId: data.workspaceId || null,
        projectIds: data.projectIds ? JSON.stringify(data.projectIds) : null,
        departmentIds: data.departmentIds ? JSON.stringify(data.departmentIds) : null,
        reason: data.reason || null,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.insert(roleAssignmentTable).values(newAssignment);
      
      // Record in role history
      await db.insert(roleHistoryTable).values({
        id: createId(),
        userId: data.userId,
        previousRole: null, // TODO: Get previous role
        newRole: data.role,
        action: "assigned",
        changedBy: assignerUser[0].id,
        reason: data.reason || "Role assigned",
        workspaceId: data.workspaceId || null,
        ipAddress: c.req.header("x-forwarded-for") || "unknown",
        userAgent: c.req.header("user-agent") || "unknown",
        changedAt: new Date(),
      });
      
      return c.json({ 
        success: true, 
        assignment: newAssignment,
        message: `Role ${data.role} assigned successfully`
      });
      
    } catch (error) {
      logger.error("Failed to assign role:", error);
      return c.json({ error: "Failed to assign role" }, 500);
    }
  }
);

/**
 * DELETE /roles/remove/:userId - Remove user's role assignment
 */
rbac.delete("/remove/:userId", async (c) => {
  try {
    const db = getDatabase();
    const userId = c.req.param("userId");
    const removerEmail = c.get("userEmail");
    
    // Get remover user ID
    const removerUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, removerEmail))
      .limit(1);
    
    if (!removerUser.length) {
      return c.json({ error: "User not found" }, 400);
    }
    
    // TODO: Check if remover has permission to remove roles
    
    // Get current role assignment
    const currentAssignment = await db
      .select()
      .from(roleAssignmentTable)
      .where(
        and(
          eq(roleAssignmentTable.userId, userId),
          eq(roleAssignmentTable.isActive, true)
        )
      )
      .limit(1);
    
    if (!currentAssignment.length) {
      return c.json({ error: "No active role assignment found" }, 404);
    }
    
    // Deactivate role assignment
    await db
      .update(roleAssignmentTable)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(roleAssignmentTable.id, currentAssignment[0].id));
    
    // Record in role history
    await db.insert(roleHistoryTable).values({
      id: createId(),
      userId: userId,
      previousRole: currentAssignment[0].role,
      newRole: "guest",
      action: "removed",
      changedBy: removerUser[0].id,
      reason: "Role removed",
      workspaceId: currentAssignment[0].workspaceId,
      ipAddress: c.req.header("x-forwarded-for") || "unknown",
      userAgent: c.req.header("user-agent") || "unknown",
      changedAt: new Date(),
    });
    
    return c.json({ 
      success: true,
      message: "Role removed successfully"
    });
    
  } catch (error) {
    logger.error("Failed to remove role:", error);
    return c.json({ error: "Failed to remove role" }, 500);
  }
});

// ===== PERMISSION CHECKING ENDPOINTS =====

/**
 * POST /permissions/check - Check if user has specific permission
 */
rbac.post(
  "/permissions/check",
  zValidator("json", z.object({
    userId: z.string(),
    permission: z.string(),
    context: z.object({
      workspaceId: z.string().optional(),
      projectId: z.string().optional(),
      departmentId: z.string().optional(),
    }).optional(),
  })),
  async (c) => {
    try {
      const db = getDatabase();
      const data = c.req.valid("json");
      
      // Get user's role assignment
      const assignment = await db
        .select()
        .from(roleAssignmentTable)
        .where(
          and(
            eq(roleAssignmentTable.userId, data.userId),
            eq(roleAssignmentTable.isActive, true)
          )
        )
        .limit(1);
      
      if (!assignment.length) {
        return c.json({ 
          allowed: false, 
          role: "guest",
          reason: "No active role assignment" 
        });
      }

      const userRole = assignment[0].role as UserRole;
      const roleAssignment = assignment[0];
      
      // Check if role assignment has expired
      if (roleAssignment.expiresAt && new Date() > roleAssignment.expiresAt) {
        return c.json({
          allowed: false,
          role: userRole,
          reason: "Role assignment has expired",
          context: data.context,
        });
      }

      // Get base permissions for the role
      const rolePermissions = getRolePermissions(userRole);
      const hasBasePermission = rolePermissions[data.permission] || false;

      // If no base permission, deny immediately
      if (!hasBasePermission) {
        return c.json({
          allowed: false,
          role: userRole,
          reason: `Role '${userRole}' does not have permission for '${data.permission}'`,
          context: data.context,
        });
      }

      // Apply context-specific restrictions
      if (data.context) {
        const contextResult = await checkContextualPermissions(
          userRole,
          data.permission,
          data.context,
          roleAssignment
        );
        
        if (!contextResult.allowed) {
          return c.json(contextResult);
        }
      }

      // Check custom permission overrides
      const customPermissions = await db
        .select()
        .from(customPermissionTable)
        .where(
          and(
            eq(customPermissionTable.userId, data.userId),
            eq(customPermissionTable.permission, data.permission)
          )
        );

      // Apply custom permission overrides (most recent takes precedence)
      let finalPermission = hasBasePermission;
      if (customPermissions.length > 0) {
        const latestCustom = customPermissions.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )[0];
        
        if (latestCustom) {
          // Check if custom permission has expired
          if (latestCustom.expiresAt && new Date() > latestCustom.expiresAt) {
            // Custom permission expired, use base permission
          } else {
            finalPermission = latestCustom.granted;
          }
        }
      }

      // Final permission check result
      return c.json({
        allowed: finalPermission,
        role: userRole,
        assignment: roleAssignment,
        customPermissions: customPermissions,
        context: data.context,
        reason: finalPermission ? undefined : "Permission denied by custom override"
      });
      
    } catch (error) {
      logger.error("Failed to check permission:", error);
      return c.json({ error: "Failed to check permission" }, 500);
    }
  }
);

/**
 * Context-aware permission checking function
 */
async function checkContextualPermissions(
  userRole: UserRole,
  permission: string,
  context: { workspaceId?: string; projectId?: string; departmentId?: string },
  roleAssignment: any
): Promise<{ allowed: boolean; role: UserRole; reason?: string; context?: any }> {
  
  if (!roleAssignment) {
    return {
      allowed: false,
      role: userRole,
      reason: "No role assignment found",
      context,
    };
  }
  
  // Department Head - scoped to their departments
  if (userRole === "department-head") {
    if (context.departmentId && roleAssignment.departmentIds) {
      try {
        const departmentIds = JSON.parse(roleAssignment.departmentIds || '[]');
        if (!departmentIds.includes(context.departmentId)) {
          return {
            allowed: false,
            role: userRole,
            reason: "Department Head can only access their assigned departments",
            context,
          };
        }
      } catch (e) {
        // Invalid JSON, deny access
        return {
          allowed: false,
          role: userRole,
          reason: "Invalid department assignments",
          context,
        };
      }
    }
  }

  // Project Manager/Viewer - scoped to assigned projects
  if (userRole === "project-manager" || userRole === "project-viewer") {
    if (context.projectId && roleAssignment.projectIds) {
      try {
        const projectIds = JSON.parse(roleAssignment.projectIds || '[]');
        if (!projectIds.includes(context.projectId)) {
          return {
            allowed: false,
            role: userRole,
            reason: `${userRole} can only access assigned projects`,
            context,
          };
        }
      } catch (e) {
        // Invalid JSON, deny access
        return {
          allowed: false,
          role: userRole,
          reason: "Invalid project assignments",
          context,
        };
      }
    }
    
    // Project Managers cannot see workspace-level analytics
    if (userRole === "project-manager" && permission === "canViewWorkspaceAnalytics") {
      return {
        allowed: false,
        role: userRole,
        reason: "Project Managers cannot access workspace-level analytics",
        context,
      };
    }
  }

  // Workspace scoping - check if user has role assignment for specific workspace
  if (context.workspaceId && roleAssignment.workspaceId && roleAssignment.workspaceId !== context.workspaceId) {
    return {
      allowed: false,
      role: userRole,
      reason: "User does not have role assignment for this workspace",
      context,
    };
  }

  // External roles restrictions
  if (["client", "contractor", "stakeholder", "guest"].includes(userRole)) {
    // External users cannot access internal communications
    if (permission.includes("Internal") || permission.includes("Employee")) {
      return {
        allowed: false,
        role: userRole,
        reason: "External users cannot access internal resources",
        context,
      };
    }
    
    // Additional restrictions for external users
    const restrictedActions = [
      "canManageWorkspace",
      "canManageRoles", 
      "canInviteUsers",
      "canRemoveUsers",
      "canViewWorkspaceAnalytics",
      "canManageBilling"
    ];
    
    if (restrictedActions.includes(permission)) {
      return {
        allowed: false,
        role: userRole,
        reason: "External users cannot access administrative functions",
        context,
      };
    }
  }

  return {
    allowed: true,
    role: userRole,
    context,
  };
}

/**
 * POST /permissions/bulk-update - Update role permissions (for UI settings)
 */
rbac.post(
  "/permissions/bulk-update",
  zValidator("json", z.object({
    permissions: z.record(z.string(), z.record(z.string(), z.boolean()))
  })),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const userEmail = c.get("userEmail");
      
      // TODO: This is a placeholder endpoint for the UI
      // In a real implementation, you would update the role definitions
      // For now, we'll just log the changes and return success
      
      logger.debug("Role permissions update requested by:", userEmail);
      logger.debug("New permissions:", JSON.stringify(data.permissions, null, 2));
      
      // In a real system, you would:
      // 1. Validate the user has permission to update role definitions
      // 2. Update the role permission definitions in the database
      // 3. Invalidate cached permissions
      // 4. Notify affected users of permission changes
      
      return c.json({ 
        success: true, 
        message: "Role permissions updated successfully",
        note: "This is a placeholder implementation. In production, this would update the role definitions."
      });
      
    } catch (error) {
      logger.error("Failed to update role permissions:", error);
      return c.json({ error: "Failed to update role permissions" }, 500);
    }
  }
);

// ===== CUSTOM PERMISSIONS ENDPOINTS =====

/**
 * POST /permissions/custom - Grant or revoke custom permission
 */
rbac.post(
  "/permissions/custom",
  zValidator("json", customPermissionSchema),
  async (c) => {
    try {
      const db = getDatabase();
      const data = c.req.valid("json");
      const granterEmail = c.get("userEmail");
      
      // Get granter user ID
      const granterUser = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, granterEmail))
        .limit(1);
      
      if (!granterUser.length) {
        return c.json({ error: "Granter not found" }, 400);
      }
      
      // TODO: Check if granter has permission to modify custom permissions
      
      // Create custom permission record
      const customPermission = {
        id: createId(),
        userId: data.userId,
        permission: data.permission,
        granted: data.granted,
        workspaceId: data.workspaceId || null,
        projectId: data.projectId || null,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        assignedBy: granterUser[0].id,
        reason: data.reason || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.insert(customPermissionTable).values(customPermission);
      
      return c.json({ 
        success: true, 
        permission: customPermission,
        message: `Custom permission ${data.granted ? 'granted' : 'revoked'} successfully`
      });
      
    } catch (error) {
      logger.error("Failed to manage custom permission:", error);
      return c.json({ error: "Failed to manage custom permission" }, 500);
    }
  }
);

// ===== AUDIT AND HISTORY ENDPOINTS =====

/**
 * GET /roles/history/:userId - Get role change history for user
 */
rbac.get("/history/:userId", async (c) => {
  try {
    const db = getDatabase();
    const userId = c.req.param("userId");
    
    const history = await db
      .select({
        history: roleHistoryTable,
        changedByUser: userTable,
      })
      .from(roleHistoryTable)
      .leftJoin(userTable, eq(roleHistoryTable.changedBy, userTable.id))
      .where(eq(roleHistoryTable.userId, userId))
      .orderBy(desc(roleHistoryTable.changedAt));
    
    return c.json({ history });
  } catch (error) {
    logger.error("Failed to get role history:", error);
    return c.json({ error: "Failed to get role history" }, 500);
  }
});

/**
 * GET /roles/audit/:userId - Get complete audit trail for user
 */
rbac.get("/audit/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const limit = parseInt(c.req.query("limit") || "100");
    
    const { RoleAuditService } = await import("../services/rbac/role-audit-service");
    const trail = await RoleAuditService.getUserAuditTrail(userId, undefined, limit);
    
    return c.json({ audit: trail, count: trail.length });
  } catch (error) {
    logger.error("Failed to get audit trail:", error);
    return c.json({ error: "Failed to get audit trail" }, 500);
  }
});

/**
 * GET /roles/audit/workspace/:workspaceId - Get workspace audit trail
 */
rbac.get("/audit/workspace/:workspaceId", async (c) => {
  try {
    const workspaceId = c.req.param("workspaceId");
    const limit = parseInt(c.req.query("limit") || "100");
    
    const { RoleAuditService } = await import("../services/rbac/role-audit-service");
    const trail = await RoleAuditService.getWorkspaceAuditTrail(workspaceId, limit);
    
    return c.json({ audit: trail, count: trail.length });
  } catch (error) {
    logger.error("Failed to get workspace audit trail:", error);
    return c.json({ error: "Failed to get workspace audit trail" }, 500);
  }
});

/**
 * GET /roles/audit/stats - Get audit statistics
 */
rbac.get("/audit/stats", async (c) => {
  try {
    const workspaceId = c.req.query("workspaceId");
    
    const { RoleAuditService } = await import("../services/rbac/role-audit-service");
    const stats = await RoleAuditService.getAuditStats(workspaceId);
    
    return c.json(stats);
  } catch (error) {
    logger.error("Failed to get audit stats:", error);
    return c.json({ error: "Failed to get audit stats" }, 500);
  }
});

/**
 * GET /departments - Get all departments
 */
rbac.get("/departments", async (c) => {
  try {
    const db = getDatabase();
    const departments = await db
      .select({
        department: departmentTable,
        headUser: userTable,
      })
      .from(departmentTable)
      .leftJoin(userTable, eq(departmentTable.headUserId, userTable.id))
      .where(eq(departmentTable.isActive, true));
    
    return c.json({ departments });
  } catch (error) {
    logger.error("Failed to get departments:", error);
    return c.json({ error: "Failed to get departments" }, 500);
  }
});

/**
 * POST /migrate/workspace-creators - Migrate existing workspace creators to workspace-manager role
 * Only accessible by workspace managers
 */
rbac.post("/migrate/workspace-creators", async (c) => {
  try {
    const db = getDatabase();
    const userEmail = c.get("userEmail");
    
    // Get user and check if they have permission to run migrations
    const user = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    
    if (!user.length) {
      return c.json({ error: "User not found" }, 400);
    }
    
    // Check if user has workspace-manager role (simplified check)
    const hasPermission = await db
      .select()
      .from(roleAssignmentTable)
      .where(
        and(
          eq(roleAssignmentTable.userId, user[0].id),
          eq(roleAssignmentTable.role, "workspace-manager"),
          eq(roleAssignmentTable.isActive, true)
        )
      )
      .limit(1);
    
    if (!hasPermission.length) {
      return c.json({ error: "Insufficient permissions. Only workspace managers can run migrations." }, 403);
    }
    
    // Import and run the migration function
    const assignWorkspaceManagerToCreators = await import("../workspace-user/controllers/assign-workspace-manager-to-creators");
    const result = await assignWorkspaceManagerToCreators.default();
    
    return c.json({
      success: true,
      message: "Workspace creator migration completed",
      ...result
    });
    
  } catch (error) {
    logger.error("Failed to run workspace creator migration:", error);
    return c.json({ error: "Failed to run migration" }, 500);
  }
});

/**
 * POST /auto-assign-role - Auto-assign role to current user if they don't have one
 * Useful for development and onboarding
 * 🚨 SECURITY: DISABLED - This endpoint was auto-granting workspace access
 */
/*
rbac.post("/auto-assign-role", async (c) => {
  try {
    const userEmail = c.get("userEmail");
    
    // Get user
    const user = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);
    
    if (!user.length) {
      return c.json({ error: "User not found" }, 400);
    }
    
    const userId = user[0].id;
    
    // Check if user already has role assignments
    const existingRoles = await db
      .select()
      .from(roleAssignmentTable)
      .where(
        and(
          eq(roleAssignmentTable.userId, userId),
          eq(roleAssignmentTable.isActive, true)
        )
      );
    
    if (existingRoles.length > 0) {
      return c.json({ 
        message: "User already has role assignments",
        roles: existingRoles 
      });
    }
    
    // Get or create a workspace
    let workspace = await db
      .select()
      .from(workspaceTable)
      .limit(1);
    
    let workspaceId: string;
    
    if (!workspace.length) {
      // Create a demo workspace
      workspaceId = createId();
      await db.insert(workspaceTable).values({
        id: workspaceId,
        name: "Demo Workspace",
        description: "Auto-created workspace for development",
        ownerEmail: userEmail,
        createdAt: new Date(),
      });
    } else {
      workspaceId = workspace[0].id;
    }
    
    // Assign workspace-manager role
    const roleAssignmentId = createId();
    const historyId = createId();
    
    await db.insert(roleAssignmentTable).values({
      id: roleAssignmentId,
      userId,
      role: "workspace-manager",
      workspaceId,
      assignedBy: userId, // Self-assigned
      assignedAt: new Date(),
      isActive: true,
    });
    
    // Log to history
    await db.insert(roleHistoryTable).values({
      id: historyId,
      userId,
      action: "role_assigned",
      oldRole: null,
      newRole: "workspace-manager",
      changedBy: userId,
      reason: "Auto-assigned workspace-manager role for development user",
      workspaceId,
      changedAt: new Date(),
    });
    
    return c.json({
      success: true,
      message: "Successfully assigned workspace-manager role",
      roleAssignment: {
        id: roleAssignmentId,
        role: "workspace-manager",
        workspaceId,
        assignedAt: new Date(),
      }
    });
    
  } catch (error) {
    logger.error("Failed to auto-assign role:", error);
    return c.json({ error: "Failed to assign role" }, 500);
  }
});
*/

// Mount stats routes
rbac.route("/", rbacStats);

export default rbac; 
