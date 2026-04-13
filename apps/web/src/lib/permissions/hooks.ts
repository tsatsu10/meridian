/**
 * ⚛️ Advanced Permission Hooks
 * 
 * React hooks for sophisticated permission checking and role-based UI logic.
 * Provides convenient abstractions for common permission patterns.
 */

import { useMemo, useCallback } from "react";
import { useRBACAuth } from "./context";
import type { PermissionAction, UserRole, PermissionContext } from "./types";

// ===== PERMISSION CHECKING HOOKS =====

/**
 * Hook for checking multiple permissions at once
 */
export function useMultiplePermissions(permissions: PermissionAction[]) {
  const { hasPermission, isLoading } = useRBACAuth();

  const results = useMemo(() => {
    if (isLoading) {
      return {
        hasAll: false,
        hasAny: false,
        hasSome: false,
        missing: permissions,
        granted: [],
        isLoading: true,
      };
    }

    const granted = permissions.filter(permission => hasPermission(permission));
    const missing = permissions.filter(permission => !hasPermission(permission));

    return {
      hasAll: granted.length === permissions.length,
      hasAny: granted.length > 0,
      hasSome: granted.length > 0 && granted.length < permissions.length,
      missing,
      granted,
      isLoading: false,
    };
  }, [permissions, hasPermission, isLoading]);

  return results;
}

/**
 * Hook for conditional permission checking
 */
export function useConditionalPermission(
  condition: boolean,
  permission: PermissionAction
) {
  const { hasPermission } = useRBACAuth();

  return useMemo(() => {
    if (!condition) return true; // If condition is false, permission is granted
    return hasPermission(permission);
  }, [condition, permission, hasPermission]);
}

/**
 * Hook for permission-based feature flags
 */
export function useFeatureFlags() {
  const { hasPermission, user, isLoading } = useRBACAuth();

  const flags = useMemo(() => {
    if (isLoading || !user) {
      return {
        // Admin features
        canAccessAdmin: false,
        canManageRoles: false,
        canViewAnalytics: false,
        
        // Project features
        canCreateProjects: false,
        canEditProjects: false,
        canDeleteProjects: false,
        
        // Task features
        canCreateTasks: false,
        canEditTasks: false,
        canAssignTasks: false,
        
        // Team Lead special features
        canManageSubtasks: false,
        canCreateSubtasks: false,
        canEditSubtasks: false,
        canDeleteSubtasks: false,
        canAssignSubtasks: false,
        canManageSubtaskHierarchy: false,
        
        // Team features
        canManageTeam: false,
        canInviteUsers: false,
        canRemoveMembers: false,
        
        // Communication features
        canCreateChannels: false,
        canModerateChannels: false,
        canDeleteMessages: false,
        
        // Resource features
        canUploadFiles: false,
        canManageFiles: false,
        canDeleteFiles: false,
        
        // External user flags
        isExternalUser: false,
        isInternalUser: false,
        hasRestrictedAccess: false,
        
        isLoading: true,
      };
    }

    const isExternal = ["client", "contractor", "stakeholder", "guest"].includes(user.role || "guest");

    return {
      // Admin features
      canAccessAdmin: hasPermission("canManageWorkspace"),
      canManageRoles: hasPermission("canManageRoles"),
      canViewAnalytics: hasPermission("canViewAnalytics"),
      
      // Project features  
      canCreateProjects: hasPermission("canCreateProjects"),
      canEditProjects: hasPermission("canEditProjects"),
      canDeleteProjects: hasPermission("canDeleteProjects"),
      
      // Task features
      canCreateTasks: hasPermission("canCreateTasks"),
      canEditTasks: hasPermission("canEditTasks"),
      canAssignTasks: hasPermission("canAssignTasks"),
      
      // Team Lead special features (🛡️ Main requirement!)
      canManageSubtasks: hasPermission("canCreateSubtasks") && hasPermission("canEditSubtasks"),
      canCreateSubtasks: hasPermission("canCreateSubtasks"),
      canEditSubtasks: hasPermission("canEditSubtasks"),
      canDeleteSubtasks: hasPermission("canDeleteSubtasks"),
      canAssignSubtasks: hasPermission("canAssignSubtasks"),
      canManageSubtaskHierarchy: hasPermission("canManageSubtaskHierarchy"),
      
      // Team features
      canManageTeam: hasPermission("canCreateTeams"),
      canInviteUsers: hasPermission("canInviteUsers"),
      canRemoveMembers: hasPermission("canRemoveMembers"),
      
      // Communication features
      canCreateChannels: hasPermission("canCreateChannels"),
      canModerateChannels: hasPermission("canModerateChannels"),
      canDeleteMessages: hasPermission("canDeleteMessages"),
      
      // Resource features
      canUploadFiles: hasPermission("canUploadFiles"),
      canManageFiles: hasPermission("canManageFiles"),
      canDeleteFiles: hasPermission("canDeleteFiles"),
      
      // User type flags
      isExternalUser: isExternal,
      isInternalUser: !isExternal,
      hasRestrictedAccess: isExternal || user.role === "guest",
      
      isLoading: false,
    };
  }, [hasPermission, user, isLoading]);

  return flags;
}

// ===== ROLE-BASED HOOKS =====

/**
 * Hook for role hierarchy checking
 */
export function useRoleHierarchy() {
  const { user } = useRBACAuth();

  const hierarchy = useMemo(() => {
    const roleLevels: Record<UserRole, number> = {
      "guest": 0,
      "stakeholder": 1,
      "contractor": 1,
      "client": 1,
      "member": 1,
      "team-lead": 2,
      "project-viewer": 3,
      "project-manager": 4,
      "workspace-viewer": 5,
      "department-head": 6,
      "workspace-manager": 7,
    };

    const currentRole = (user?.role || "guest") as UserRole;
    const currentLevel = roleLevels[currentRole];

    return {
      currentRole,
      currentLevel,
      isAdmin: currentLevel >= 7,
      isManager: currentLevel >= 6,
      isTeamLead: currentLevel >= 2,
      isMember: currentLevel >= 1,
      isExternal: ["client", "contractor", "stakeholder", "guest"].includes(currentRole),
      
      canActAs: (role: UserRole) => currentLevel >= roleLevels[role],
      isHigherThan: (role: UserRole) => currentLevel > roleLevels[role],
      isLowerThan: (role: UserRole) => currentLevel < roleLevels[role],
      isSameLevel: (role: UserRole) => currentLevel === roleLevels[role],
    };
  }, [user]);

  return hierarchy;
}

/**
 * Hook for role-based component rendering
 */
export function useRoleBasedComponent<T extends Record<UserRole, React.ComponentType<any>>>(
  roleComponents: Partial<T>
) {
  const { user } = useRBACAuth();
  
  const Component = useMemo(() => {
    const role = (user?.role || "guest") as UserRole;
    return roleComponents[role] || roleComponents.guest || null;
  }, [user, roleComponents]);

  return Component;
}

// ===== CONTEXT-AWARE HOOKS =====

/**
 * Hook for workspace-scoped permissions
 */
export function useWorkspacePermissions(workspaceId?: string) {
  const { hasPermission, user, workspaceContext } = useRBACAuth();

  const permissions = useMemo(() => {
    const targetWorkspace = workspaceId || workspaceContext?.workspaceId;
    
    if (!targetWorkspace) {
      return {
        canView: false,
        canEdit: false,
        canManage: false,
        canInvite: false,
        canDelete: false,
        workspaceId: null,
      };
    }

    // TODO: Implement workspace-scoped permission checking
    // For now, use global permissions
    return {
      canView: hasPermission("canViewWorkspace"),
      canEdit: hasPermission("canEditWorkspace"),
      canManage: hasPermission("canManageWorkspace"),
      canInvite: hasPermission("canInviteUsers"),
      canDelete: hasPermission("canDeleteWorkspace"),
      workspaceId: targetWorkspace,
    };
  }, [workspaceId, workspaceContext, hasPermission]);

  return permissions;
}

/**
 * Hook for project-scoped permissions
 */
export function useProjectPermissions(projectId?: string) {
  const { hasPermission, workspaceContext } = useRBACAuth();

  const permissions = useMemo(() => {
    const targetProject = projectId || workspaceContext?.projectId;
    
    if (!targetProject) {
      return {
        canView: false,
        canEdit: false,
        canManage: false,
        canDelete: false,
        canCreateTasks: false,
        canAssignTasks: false,
        projectId: null,
      };
    }

    // TODO: Implement project-scoped permission checking
    return {
      canView: hasPermission("canViewProjectDetails") || hasPermission("canViewAllProjects"),
      canEdit: hasPermission("canEditProjects"),
      canManage: hasPermission("canManageProjectSettings"),
      canDelete: hasPermission("canDeleteProjects"),
      canArchive: hasPermission("canArchiveProjects"),
      canClone: hasPermission("canCloneProjects"),
      canManageTeam: hasPermission("canManageProjectTeam"),
      canManageBudget: hasPermission("canManageProjectBudget"),
      canViewAnalytics: hasPermission("canViewProjectAnalytics"),
      canCreateTasks: hasPermission("canCreateTasks"),
      canAssignTasks: hasPermission("canAssignTasks"),
      canInviteMembers: hasPermission("canInviteToProject"),
      canRemoveMembers: hasPermission("canRemoveFromProject"),
      projectId: targetProject,
    };
  }, [projectId, workspaceContext, hasPermission]);

  return permissions;
}

// ===== ACTION-BASED HOOKS =====

/**
 * Hook for permission-gated actions
 */
export function usePermissionGatedAction(
  permission: PermissionAction,
  action: () => void | Promise<void>
) {
  const { hasPermission } = useRBACAuth();

  const execute = useCallback(async () => {
    if (!hasPermission(permission)) {
      console.warn(`Action blocked: Missing permission '${permission}'`);
      return false;
    }

    try {
      await action();
      return true;
    } catch (error) {
      console.error("Permission-gated action failed:", error);
      return false;
    }
  }, [permission, action, hasPermission]);

  return {
    canExecute: hasPermission(permission),
    execute,
  };
}

/**
 * Hook for team lead specific actions (Main requirement!)
 */
export function useTeamLeadActions() {
  const { hasPermission } = useRBACAuth();

  const actions = useMemo(() => ({
    // Subtask management actions
    createSubtask: {
      canExecute: hasPermission("canCreateSubtasks"),
      action: (parentTaskId: string, subtaskData: any) => {// TODO: Implement subtask creation
      }
    },

    editSubtask: {
      canExecute: hasPermission("canEditSubtasks"),
      action: (subtaskId: string, updates: any) => {// TODO: Implement subtask editing
      }
    },

    deleteSubtask: {
      canExecute: hasPermission("canDeleteSubtasks"),
      action: (subtaskId: string) => {// TODO: Implement subtask deletion
      }
    },

    assignSubtask: {
      canExecute: hasPermission("canAssignSubtasks"),
      action: (subtaskId: string, assigneeId: string) => {// TODO: Implement subtask assignment
      }
    },

    reorderSubtasks: {
      canExecute: hasPermission("canManageSubtaskHierarchy"),
      action: (parentTaskId: string, subtaskOrder: string[]) => {// TODO: Implement subtask reordering
      }
    },

    // Team management actions
    manageTeam: {
      canExecute: hasPermission("canCreateTeams"),
      action: (teamId: string, action: string, data: any) => {// TODO: Implement team management
      }
    }
  }), [hasPermission]);

  return actions;
}

// ===== UTILITY HOOKS =====

/**
 * Hook for permission debugging
 */
export function usePermissionDebug() {
  const { user, permissions, isLoading } = useRBACAuth();

  const debugInfo = useMemo(() => {
    if (isLoading) {
      return {
        user: null,
        role: null,
        permissions: {},
        permissionCount: 0,
        isLoading: true,
      };
    }

    return {
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      } : null,
      role: user?.role || "guest",
      permissions: permissions || {},
      permissionCount: Object.keys(permissions || {}).length,
      grantedPermissions: Object.entries(permissions || {})
        .filter(([_, granted]) => granted)
        .map(([permission]) => permission),
      deniedPermissions: Object.entries(permissions || {})
        .filter(([_, granted]) => !granted)
        .map(([permission]) => permission),
      isLoading: false,
    };
  }, [user, permissions, isLoading]);

  return debugInfo;
}

/**
 * Hook for performance-optimized permission checking
 */
export function useOptimizedPermission(permission: PermissionAction) {
  const { hasPermission } = useRBACAuth();
  
  // Memoize the permission check result
  const result = useMemo(() => hasPermission(permission), [permission, hasPermission]);
  
  return result;
}

// ===== EXPORT ALL HOOKS =====
export {
  // Re-export existing hooks from context
  useRBACAuth,
  usePermission,
  usePermissions,
  useCanAccess,
  useRole,
  useWorkspaceContext,
} from "./context";