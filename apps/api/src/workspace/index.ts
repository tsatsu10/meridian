/**
 * Workspace routes — RBAC product rules (keep aligned with onboarding):
 * - POST `/` (create workspace): authenticated user only; not `canCreateProjects` (that permission
 *   applies to projects inside a workspace). Creator receives workspace-manager on the new workspace.
 * - Scoped routes: use `requireWorkspacePermission` / role checks as appropriate.
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import createWorkspace from "./controllers/create-workspace";
import deleteWorkspace from "./controllers/delete-workspace";
import getWorkspace from "./controllers/get-workspace";
import getWorkspaces from "./controllers/get-workspaces";
import updateWorkspace from "./controllers/update-workspace";
import getWorkspaceSettings from "./controllers/get-workspace-settings";
import updateWorkspaceSettings from "./controllers/update-workspace-settings";
import uploadWorkspaceLogo from "./controllers/upload-workspace-logo";
// TODO: Phase 2 - User invitation disabled pending schema implementation
// import inviteUser from "./controllers/invite-user";
// import acceptInvitation from "./controllers/accept-invitation";
import { getWorkspaceAnalytics } from "../analytics/controllers/get-workspace-analytics";
import { requireWorkspacePermission } from "../middlewares/rbac";
import { securityAuditLogger, validateRBACCompliance } from "../middlewares/security-audit";
import logger from '../utils/logger';

const workspace = new Hono<{
  Variables: {
    userEmail: string;
    userRole?: string;
    userId?: string;
    workspaceId?: string;
  };
}>();

workspace.use("*", securityAuditLogger());
workspace.use("*", validateRBACCompliance());

// Get all workspaces for user
workspace.get("/", async (c) => {
  const userEmail = c.get("userEmail");
  logger.debug(`🔐 Workspace request - userEmail from context: ${userEmail}`);

  if (!userEmail) {
    logger.debug(`❌ No userEmail in context`);
    return c.json({ error: "No user email in context" }, 400);
  }

  try {
    const workspaces = await getWorkspaces(userEmail);
    return c.json(workspaces);
  } catch (error) {
    logger.error(`❌ Error getting workspaces for ${userEmail}:`, error);
    return c.json(
      {
        error: "Failed to get workspaces",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Simple test endpoint to check context
workspace.get("/test-context", async (c) => {
  const userEmail = c.get("userEmail");
  return c.json({
    userEmail: userEmail,
    hasUserEmail: !!userEmail,
    requestUrl: c.req.url,
    requestMethod: c.req.method
  });
});

// Workspace creation — any authenticated user may create a workspace; the controller
// assigns workspace-manager for the new workspace. Requiring canCreateProjects blocked
// onboarding (that permission is for projects inside a workspace, not tenant creation).
workspace.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Workspace name is required"),
      description: z.string().optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid("json");
    const userEmail = c.get("userEmail");
    if (!userEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const newWorkspace = await createWorkspace(data.name, userEmail);
      return c.json(newWorkspace, 201);
    } catch (error: any) {
      logger.error("❌ Failed to create workspace:", error);
      return c.json({ error: error.message || "Failed to create workspace" }, 500);
    }
  }
);
// 📧 INVITATION ROUTES - Secure multi-tenant invitation system
// TODO: Phase 2 - User invitation disabled pending schema implementation
/*
// Send workspace invitation
workspace.post(
  "/:id/invite",
  requireWorkspacePermission("canInviteUsers", "id"),
  zValidator("param", z.object({ id: z.string() })),
  zValidator(
    "json",
    z.object({
      inviteeEmail: z.string().email("Valid email required"),
      roleToAssign: z.enum(["member", "team-lead", "project-manager", "department-head"]),
      message: z.string().optional(),
    })
  ),
  async (c) => {
    const workspaceId = c.req.param("id");
    const { inviteeEmail, roleToAssign, message } = c.req.valid("json");
    const inviterEmail = c.get("userEmail");

    try {
      const invitation = await inviteUser(inviterEmail, {
        workspaceId,
        inviteeEmail,
        roleToAssign,
        message,
      });
      return c.json(invitation, 201);
    } catch (error: any) {
      logger.error("Failed to send invitation:", error);
      return c.json({ error: error.message || "Failed to send invitation" }, error.status || 500);
    }
  }
);

// Accept workspace invitation (public endpoint with token validation)
workspace.post(
  "/invitations/accept",
  zValidator(
    "json",
    z.object({
      invitationToken: z.string().min(1, "Invitation token required"),
    })
  ),
  async (c) => {
    const { invitationToken } = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      const result = await acceptInvitation(userEmail, invitationToken);
      return c.json(result);
    } catch (error: any) {
      logger.error("Failed to accept invitation:", error);
      return c.json({ error: error.message || "Failed to accept invitation" }, error.status || 500);
    }
  }
);
*/

// Get workspace by ID - properly secured with membership validation
workspace.get(
  "/:id",
  requireWorkspacePermission("canViewWorkspace", "id"),
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const id = c.req.param("id");
    const userEmail = c.get("userEmail");
    
    logger.debug(`🔍 DEBUG: GET workspace request - ID: ${id}, UserEmail: ${userEmail}`);
    
    // 🚨 SECURITY: Removed auto-assignment - users must have explicit workspace access
    
    try {
      const workspace = await getWorkspace(userEmail, id);
      return c.json(workspace);
    } catch (error: any) {
      logger.error("Failed to get workspace:", error);
      return c.json({ error: error.message || "Failed to get workspace" }, 500);
    }
  }
);

// Update workspace - requires workspace management permission
workspace.put(
  "/:id",
  requireWorkspacePermission("canManageWorkspaceSettings", "id"),
  zValidator("json", z.object({ name: z.string(), description: z.string() })),
  async (c) => {
    const id = c.req.param("id");
    const { name, description } = c.req.valid("json");
    const userEmail = c.get("userEmail");
    
    try {
      const updatedWorkspace = await updateWorkspace(userEmail, id, name, description);
      return c.json(updatedWorkspace);
    } catch (error: any) {
      logger.error("Failed to update workspace:", error);
      return c.json({ error: error.message || "Failed to update workspace" }, 500);
    }
  }
);

// Delete workspace - requires workspace delete permission
workspace.delete(
  "/:id",
  requireWorkspacePermission("canDeleteWorkspace", "id"),
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const id = c.req.param("id");
    const userEmail = c.get("userEmail");
    
    try {
      const result = await deleteWorkspace(userEmail, id);
      return c.json({ message: "Workspace deleted successfully", result });
    } catch (error: any) {
      logger.error("Failed to delete workspace:", error);
      return c.json({ error: error.message || "Failed to delete workspace" }, 500);
    }
  }
);

// 📋 WORKSPACE SETTINGS ENDPOINTS - Phase 1 Implementation
// Get comprehensive workspace settings
workspace.get(
  "/:id/settings",
  requireWorkspacePermission("canViewWorkspace", "id"),
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const id = c.req.param("id");
    const userEmail = c.get("userEmail");
    
    try {
      const settings = await getWorkspaceSettings(userEmail, id);
      return c.json(settings);
    } catch (error: any) {
      logger.error("Failed to get workspace settings:", error);
      return c.json({ error: error.message || "Failed to get workspace settings" }, 500);
    }
  }
);

// Update workspace settings
workspace.patch(
  "/:id/settings",
  requireWorkspacePermission("canManageWorkspaceSettings", "id"),
  zValidator("param", z.object({ id: z.string() })),
  zValidator("json", z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    slug: z.string().optional(),
    allowMemberInvites: z.boolean().optional(),
    requireAdminApproval: z.boolean().optional(),
    enableGuestAccess: z.boolean().optional(),
    autoRemoveInactive: z.boolean().optional(),
    inactivityDays: z.number().int().min(1).max(365).optional(),
    maxMembers: z.number().int().positive().nullable().optional(),
    defaultProjectVisibility: z.enum(['private', 'team', 'workspace']).optional(),
    defaultTaskPriority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    enableTimeTracking: z.boolean().optional(),
    requireTaskApproval: z.boolean().optional(),
    workingDays: z.array(z.string()).optional(),
    workingHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    workingHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    enableAutomation: z.boolean().optional(),
    enableCalendar: z.boolean().optional(),
    enableMessaging: z.boolean().optional(),
    enableAnalytics: z.boolean().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    customDomain: z.string().nullable().optional(),
  })),
  async (c) => {
    const id = c.req.param("id");
    const userEmail = c.get("userEmail");
    const updates = c.req.valid("json");
    
    try {
      const updatedWorkspace = await updateWorkspaceSettings(userEmail, id, updates);
      return c.json({
        message: "Workspace settings updated successfully",
        workspace: updatedWorkspace
      });
    } catch (error: any) {
      logger.error("Failed to update workspace settings:", error);
      return c.json({ error: error.message || "Failed to update workspace settings" }, 500);
    }
  }
);

// Upload workspace logo
workspace.post(
  "/:id/logo",
  requireWorkspacePermission("canManageWorkspaceSettings", "id"),
  async (c) => {
    const id = c.req.param("id");
    
    try {
      const body = await c.req.parseBody();
      const file = body['logo'];
      
      if (!file || !(file instanceof File)) {
        return c.json({ error: 'No file uploaded' }, 400);
      }
      
      const logoUrl = await uploadWorkspaceLogo(
        id,
        file,
        file.name,
        file.type
      );
      
      return c.json({
        message: "Logo uploaded successfully",
        logoUrl
      });
    } catch (error: any) {
      logger.error("Failed to upload logo:", error);
      return c.json({ error: error.message || "Failed to upload logo" }, 500);
    }
  }
);

// @epic-3.1-analytics: Workspace analytics endpoint
workspace.get(
  "/:id/analytics",
  requireWorkspacePermission("canViewAnalytics", "id"),
  zValidator("param", z.object({ id: z.string() })),
  zValidator("query", z.object({ timeRange: z.string().optional() })),
  getWorkspaceAnalytics
);

// 🚨 SECURITY: Removed dangerous debug endpoint that bypassed workspace access controls

export default workspace;
