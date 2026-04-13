/**
 * @epic-1.1-rbac Permission Checking Utilities
 * 
 * This file contains utilities for checking permissions in various contexts
 * and enforcing the role-based access control system.
 */

import type { 
  UserRole, 
  AllPermissions, 
  PermissionContext, 
  PermissionCheckResult,
  PermissionAction,
  ResourceType,
  AccessLevel,
  RoleAssignment 
} from "./types";
import { 
  ROLE_PERMISSIONS, 
  hasMinimumRole, 
  hasPermission, 
  getRolePermissions 
} from "./definitions";

// ===== CONTEXT-AWARE PERMISSION CHECKING =====

/**
 * Main permission checking function with context awareness
 */
export function checkPermission(
  userRole: UserRole,
  action: PermissionAction,
  context?: PermissionContext,
  roleAssignment?: RoleAssignment
): PermissionCheckResult {
  try {
    // Get base permissions for the role
    const rolePermissions = getRolePermissions(userRole);
    const hasBasePermission = hasPermission(userRole, action);

    // If no base permission, deny immediately
    if (!hasBasePermission) {
      return {
        allowed: false,
        role: userRole,
        reason: `Role '${userRole}' does not have permission for '${action}'`,
        context,
      };
    }

    // Apply context-specific restrictions
    if (context) {
      const contextResult = checkContextualPermissions(
        userRole, 
        action, 
        context, 
        roleAssignment
      );
      
      if (!contextResult.allowed) {
        return contextResult;
      }
    }

    // Apply role assignment restrictions
    if (roleAssignment) {
      const assignmentResult = checkRoleAssignmentRestrictions(
        action,
        context,
        roleAssignment
      );
      
      if (!assignmentResult.allowed) {
        return assignmentResult;
      }
    }

    return {
      allowed: true,
      role: userRole,
      context,
    };

  } catch (error) {
    return {
      allowed: false,
      role: userRole,
      reason: `Permission check failed: ${error}`,
      context,
    };
  }
}

/**
 * Check permissions with contextual scope restrictions
 */
export function checkContextualPermissions(
  userRole: UserRole,
  action: PermissionAction,
  context: PermissionContext,
  roleAssignment?: RoleAssignment
): PermissionCheckResult {
  
  // Department Head - scoped to their departments
  if (userRole === "department-head") {
    if (context.departmentId && roleAssignment?.departmentIds) {
      if (!roleAssignment.departmentIds.includes(context.departmentId)) {
        return {
          allowed: false,
          role: userRole,
          reason: "Department Head can only access their assigned departments",
          context,
        };
      }
    }
  }

  // Project Manager/Viewer - scoped to assigned projects
  if (userRole === "project-manager" || userRole === "project-viewer") {
    if (context.projectId && roleAssignment?.projectIds) {
      if (!roleAssignment.projectIds.includes(context.projectId)) {
        return {
          allowed: false,
          role: userRole,
          reason: `${userRole} can only access assigned projects`,
          context,
        };
      }
    }
    
    // Project Managers cannot see workspace-level analytics
    if (userRole === "project-manager" && action === "canViewWorkspaceAnalytics") {
      return {
        allowed: false,
        role: userRole,
        reason: "Project Managers cannot access workspace-level analytics",
        context,
      };
    }
  }

  // External roles restrictions
  if (["client", "contractor", "stakeholder", "guest"].includes(userRole)) {
    // External users cannot access internal communications
    if (action.includes("Internal") || action.includes("Employee")) {
      return {
        allowed: false,
        role: userRole,
        reason: "External users cannot access internal resources",
        context,
      };
    }
    
    // Clients can only see their own projects
    if (userRole === "client" && context.projectId) {
      // This would need to be checked against client's assigned projects
      // Implementation depends on your client-project relationship
    }
  }

  // Time-limited roles
  if (roleAssignment?.hasTimeLimit && roleAssignment?.expiresAt) {
    if (new Date() > roleAssignment.expiresAt) {
      return {
        allowed: false,
        role: userRole,
        reason: "Role assignment has expired",
        context,
        restrictions: ["expired"],
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
 * Check role assignment specific restrictions
 */
export function checkRoleAssignmentRestrictions(
  action: PermissionAction,
  context?: PermissionContext,
  roleAssignment?: RoleAssignment
): PermissionCheckResult {
  
  if (!roleAssignment) {
    return { allowed: true, role: roleAssignment?.role || "guest" };
  }

  // Check if role assignment is active
  if (!roleAssignment.isActive) {
    return {
      allowed: false,
      role: roleAssignment.role,
      reason: "Role assignment is inactive",
      context,
    };
  }

  // Check expiration
  if (roleAssignment.expiresAt && new Date() > roleAssignment.expiresAt) {
    return {
      allowed: false,
      role: roleAssignment.role,
      reason: "Role assignment has expired",
      context,
    };
  }

  // Check custom restrictions
  if (roleAssignment.restrictions) {
    for (const restriction of roleAssignment.restrictions) {
      if (action.toLowerCase().includes(restriction.toLowerCase())) {
        return {
          allowed: false,
          role: roleAssignment.role,
          reason: `Action blocked by restriction: ${restriction}`,
          context,
          restrictions: roleAssignment.restrictions,
        };
      }
    }
  }

  return {
    allowed: true,
    role: roleAssignment.role,
    context,
  };
}

// ===== RESOURCE-SPECIFIC PERMISSION CHECKS =====

/**
 * Check if user can access a specific resource type
 */
export function canAccessResource(
  userRole: UserRole,
  resourceType: ResourceType,
  accessLevel: AccessLevel,
  context?: PermissionContext
): boolean {
  
  const basePermissions = getRolePermissions(userRole);
  
  switch (resourceType) {
    case "workspace":
      switch (accessLevel) {
        case "view": return basePermissions.canViewWorkspace;
        case "edit": return basePermissions.canManageWorkspaceSettings;
        case "manage": return basePermissions.canManageWorkspace;
        case "admin": return basePermissions.canManageWorkspace;
        case "owner": return userRole === "workspace-manager";
        default: return false;
      }
      
    case "project":
      switch (accessLevel) {
        case "view": return basePermissions.canViewProjectDetails;
        case "edit": return basePermissions.canEditProjects;
        case "manage": return basePermissions.canManageProjectSettings;
        case "admin": return basePermissions.canDeleteProjects;
        case "owner": return basePermissions.canManageProjectTeam;
        default: return false;
      }
      
    case "task":
      switch (accessLevel) {
        case "view": return basePermissions.canViewTasks;
        case "edit": return basePermissions.canEditTasks;
        case "manage": return basePermissions.canAssignTasks;
        case "admin": return basePermissions.canDeleteTasks;
        case "owner": return basePermissions.canManageTaskDependencies;
        default: return false;
      }
      
    case "team":
      switch (accessLevel) {
        case "view": return basePermissions.canViewTeamMembers;
        case "edit": return basePermissions.canEditTeams;
        case "manage": return basePermissions.canManageTeamRoles;
        case "admin": return basePermissions.canDeleteTeams;
        case "owner": return basePermissions.canCreateTeams;
        default: return false;
      }
      
    case "user":
      switch (accessLevel) {
        case "view": return basePermissions.canViewAllUsers;
        case "edit": return basePermissions.canManageRoles;
        case "manage": return basePermissions.canInviteUsers;
        case "admin": return basePermissions.canRemoveUsers;
        case "owner": return userRole === "workspace-manager";
        default: return false;
      }
      
    case "file":
      switch (accessLevel) {
        case "view": return basePermissions.canDownloadFiles;
        case "edit": return basePermissions.canUploadFiles;
        case "manage": return basePermissions.canOrganizeFiles;
        case "admin": return basePermissions.canDeleteFiles;
        case "owner": return basePermissions.canManageFileVersions;
        default: return false;
      }
      
    case "report":
      switch (accessLevel) {
        case "view": return basePermissions.canViewAnalytics;
        case "edit": return basePermissions.canCreateReports;
        case "manage": return basePermissions.canCustomizeReports;
        case "admin": return basePermissions.canScheduleReports;
        case "owner": return basePermissions.canManageDashboards;
        default: return false;
      }
      
    case "channel":
      switch (accessLevel) {
        case "view": return basePermissions.canJoinChannels;
        case "edit": return basePermissions.canSendMessages;
        case "manage": return basePermissions.canCreateChannels;
        case "admin": return basePermissions.canManageChannels;
        case "owner": return basePermissions.canManageChannelPermissions;
        default: return false;
      }
      
    case "calendar":
      switch (accessLevel) {
        case "view": return basePermissions.canViewCalendar;
        case "edit": return basePermissions.canCreateEvents;
        case "manage": return basePermissions.canManageAvailability;
        case "admin": return basePermissions.canBookResources;
        case "owner": return basePermissions.canManageTimeOff;
        default: return false;
      }
      
    case "document":
      switch (accessLevel) {
        case "view": return basePermissions.canAccessKnowledgeBase;
        case "edit": return basePermissions.canEditDocuments;
        case "manage": return basePermissions.canCreateDocuments;
        case "admin": return basePermissions.canDeleteDocuments;
        case "owner": return basePermissions.canManageDocumentPermissions;
        default: return false;
      }
      
    default:
      return false;
  }
}

// ===== BULK PERMISSION CHECKS =====

/**
 * Check multiple permissions at once
 */
export function checkMultiplePermissions(
  userRole: UserRole,
  actions: PermissionAction[],
  context?: PermissionContext
): Record<PermissionAction, boolean> {
  const results: Record<string, boolean> = {};
  
  for (const action of actions) {
    const result = checkPermission(userRole, action, context);
    results[action] = result.allowed;
  }
  
  return results;
}

/**
 * Get all allowed actions for a role in a specific context
 */
export function getAllowedActions(
  userRole: UserRole,
  context?: PermissionContext
): PermissionAction[] {
  const permissions = getRolePermissions(userRole);
  const allowedActions: PermissionAction[] = [];
  
  for (const [action, allowed] of Object.entries(permissions)) {
    if (typeof allowed === 'boolean' && allowed) {
      const result = checkPermission(userRole, action as PermissionAction, context);
      if (result.allowed) {
        allowedActions.push(action as PermissionAction);
      }
    }
  }
  
  return allowedActions;
}

// ===== ROLE COMPARISON UTILITIES =====

/**
 * Compare two roles and return the higher one
 */
export function getHigherRole(role1: UserRole, role2: UserRole): UserRole {
  return hasMinimumRole(role1, role2) ? role1 : role2;
}

/**
 * Check if user can perform action on behalf of another user
 */
export function canActAsUser(
  actorRole: UserRole, 
  targetRole: UserRole,
  action: PermissionAction
): boolean {
  // Only higher roles can act on behalf of lower roles
  if (!hasMinimumRole(actorRole, targetRole)) {
    return false;
  }
  
  // Some actions cannot be delegated (like workspace deletion)
  const nonDelegatableActions: PermissionAction[] = [
    "canDeleteWorkspace",
    "canManageWorkspaceSecurity",
    "canManageBilling",
    "canChangePlan"
  ];
  
  if (nonDelegatableActions.includes(action)) {
    return actorRole === "workspace-manager";
  }
  
  // Actor must have the permission to delegate it
  return hasPermission(actorRole, action);
}

// ===== PERMISSION INHERITANCE =====

/**
 * Get effective permissions by combining role permissions with custom overrides
 */
export function getEffectivePermissions(
  baseRole: UserRole,
  customPermissions?: Partial<AllPermissions>,
  restrictions?: string[]
): AllPermissions {
  const basePermissions = getRolePermissions(baseRole);
  
  // Start with base permissions
  let effectivePermissions = { ...basePermissions };
  
  // Apply custom permission overrides
  if (customPermissions) {
    effectivePermissions = {
      ...effectivePermissions,
      ...customPermissions
    };
  }
  
  // Apply restrictions (remove permissions)
  if (restrictions) {
    for (const restriction of restrictions) {
      for (const [key, value] of Object.entries(effectivePermissions)) {
        if (typeof value === 'boolean' && key.toLowerCase().includes(restriction.toLowerCase())) {
          (effectivePermissions as any)[key] = false;
        }
      }
    }
  }
  
  return effectivePermissions;
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate if a role assignment is valid
 */
export function validateRoleAssignment(assignment: Partial<RoleAssignment>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!assignment.role) {
    errors.push("Role is required");
  }
  
  if (!assignment.userId) {
    errors.push("User ID is required");
  }
  
  if (!assignment.assignedBy) {
    errors.push("Assigned by is required");
  }
  
  if (assignment.expiresAt && assignment.expiresAt <= new Date()) {
    errors.push("Expiration date must be in the future");
  }
  
  // Role-specific validations
  if (assignment.role === "department-head" && (!assignment.departmentIds || assignment.departmentIds.length === 0)) {
    errors.push("Department Head must be assigned to at least one department");
  }
  
  if ((assignment.role === "project-manager" || assignment.role === "project-viewer") && 
      (!assignment.projectIds || assignment.projectIds.length === 0)) {
    errors.push("Project roles must be assigned to at least one project");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if role transition is allowed
 */
export function canTransitionRole(
  fromRole: UserRole,
  toRole: UserRole,
  actorRole: UserRole
): { allowed: boolean; reason?: string } {
  
  // Only workspace managers can assign workspace manager role
  if (toRole === "workspace-manager" && actorRole !== "workspace-manager") {
    return {
      allowed: false,
      reason: "Only workspace managers can assign workspace manager role"
    };
  }
  
  // Cannot demote yourself from workspace manager
  if (fromRole === "workspace-manager" && toRole !== "workspace-manager") {
    return {
      allowed: false,
      reason: "Workspace managers cannot demote themselves"
    };
  }
  
  // Department heads can only assign roles within their hierarchy
  if (actorRole === "department-head") {
    const allowedRoles: UserRole[] = ["project-manager", "project-viewer", "team-lead", "member"];
    if (!allowedRoles.includes(toRole)) {
      return {
        allowed: false,
        reason: "Department heads can only assign project and team roles"
      };
    }
  }
  
  // Actor must have higher role than target
  if (!hasMinimumRole(actorRole, toRole)) {
    return {
      allowed: false,
      reason: "Cannot assign a role higher than your own"
    };
  }
  
  return { allowed: true };
}

export default {
  checkPermission,
  canAccessResource,
  checkMultiplePermissions,
  getAllowedActions,
  getHigherRole,
  canActAsUser,
  getEffectivePermissions,
  validateRoleAssignment,
  canTransitionRole,
}; 