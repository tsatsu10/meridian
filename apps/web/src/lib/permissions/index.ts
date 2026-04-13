/**
 * @epic-1.1-rbac RBAC Permissions System Export
 * 
 * Main export file for the comprehensive Role-Based Access Control system.
 * Import from here to use RBAC functionality throughout your application.
 */

// ===== CORE TYPES =====
export type { 
  UserRole, 
  AllPermissions, 
  PermissionContext, 
  PermissionCheckResult,
  PermissionAction,
  ResourceType,
  AccessLevel,
  RoleAssignment,
  WorkspacePermissions,
  ProjectPermissions,
  TaskPermissions,
  TeamPermissions,
  CommunicationPermissions,
  ResourcePermissions,
  AnalyticsPermissions,
  SystemPermissions,
  RoleMetadata,
} from "./types";

export { ROLE_METADATA } from "./types";

// ===== CONTEXT & HOOKS =====
export type { 
  RBACUser, 
  RBACAuthContextType,
  RequirePermissionProps,
  RequireRoleProps,
  RequireAccessProps,
  PermissionGuardProps,
  RBACError,
} from "./context";

export {
  RBACAuthContext,
  useRBACAuth,
  useOptionalRBACAuth,
  usePermission,
  usePermissions,
  useCanAccess,
  useRole,
  useWorkspaceContext,
  isRBACUser,
  hasValidRole,
  createRBACError,
  getDefaultGuestPermissions,
} from "./context";

// ===== PROVIDER =====
export { RBACProvider, useRBACAuth as useAuth } from "./provider";

// ===== PERMISSION UTILITIES =====
export {
  checkPermission,
  canAccessResource,
  checkMultiplePermissions,
  getAllowedActions,
  getHigherRole,
  canActAsUser,
  getEffectivePermissions,
  checkContextualPermissions,
  checkRoleAssignmentRestrictions,
  validateRoleAssignment,
  canTransitionRole,
} from "./utils";

// ===== ROLE DEFINITIONS =====
export {
  ROLE_PERMISSIONS,
  getRolePermissions,
  hasPermission,
  hasMinimumRole,
} from "./definitions";

// ===== PERMISSION GUARD COMPONENTS =====
export {
  RequirePermission,
  RequireRole,
  RequireAccess,
  RequireAll,
  RequireAny,
  RoleSwitch,
  AuthSwitch,
  withPermission,
  withRole,
  PermissionStatus,
  PermissionDebug,
  
  // Aliases for cleaner component names
  CanDo,
  OnlyRole,
  CanAccess,
  AllOf,
  AnyOf,
} from "./components";

// ===== ROUTE PROTECTION =====
export { 
  ProtectedPage,
  RoleProtectedPage, 
  MultiPermissionPage,
  useRouteProtection,
  RouteProtections,
  createPermissionCheck,
  createProtectedLoader
} from "./route-protection";

// ===== ADVANCED HOOKS =====
export {
  useMultiplePermissions,
  useConditionalPermission,
  useFeatureFlags,
  useRoleHierarchy,
  useRoleBasedComponent,
  useWorkspacePermissions,
  useProjectPermissions,
  usePermissionGatedAction,
  useTeamLeadActions,
  usePermissionDebug,
  useOptimizedPermission,
} from "./hooks";

// ===== CONVENIENCE EXPORTS =====

/**
 * Main RBAC Provider - wrap your app with this
 */
export { RBACProvider as PermissionProvider } from "./provider";

/**
 * Main auth hook with RBAC capabilities
 */
export { useRBACAuth as useAuthWithPermissions } from "./provider";

/**
 * Quick permission check for common actions
 */
export const QuickChecks = {
  // Workspace-level checks
  canManageWorkspace: (user: any) => user?.permissions?.canManageWorkspace || false,
  canViewWorkspace: (user: any) => user?.permissions?.canViewWorkspace || false,
  canInviteUsers: (user: any) => user?.permissions?.canInviteUsers || false,
  
  // Project-level checks
  canCreateProjects: (user: any) => user?.permissions?.canCreateProjects || false,
  canManageProjects: (user: any) => user?.permissions?.canEditProjects || user?.permissions?.canManageProjectSettings || false,
  canEditProjects: (user: any) => user?.permissions?.canEditProjects || false,
  canDeleteProjects: (user: any) => user?.permissions?.canDeleteProjects || false,
  canArchiveProjects: (user: any) => user?.permissions?.canArchiveProjects || false,
  canCloneProjects: (user: any) => user?.permissions?.canCloneProjects || false,
  canManageProjectSettings: (user: any) => user?.permissions?.canManageProjectSettings || false,
  canManageProjectTeam: (user: any) => user?.permissions?.canManageProjectTeam || false,
  canViewAllProjects: (user: any) => user?.permissions?.canViewAllProjects || false,
  
  // Task-level checks
  canCreateTasks: (user: any) => user?.permissions?.canCreateTasks || false,
  canEditTasks: (user: any) => user?.permissions?.canEditTasks || false,
  canAssignTasks: (user: any) => user?.permissions?.canAssignTasks || false,
  
  // Team-level checks
  canManageTeam: (user: any) => user?.permissions?.canCreateTeams || false,
  canAddMembers: (user: any) => user?.permissions?.canAddMembers || false,
  canAssignTeamLeads: (user: any) => user?.permissions?.canAssignTeamLeads || false,
  
  // Special subtask permissions (Team Lead specific)
  canCRUDSubtasks: (user: any) => user?.role === "team-lead" || user?.permissions?.canManageSubtaskHierarchy || false,
} as const;

/**
 * Role level helpers for quick comparisons
 */
export const RoleLevels = {
  GUEST: 0,
  MEMBER: 1,
  TEAM_LEAD: 2,
  PROJECT_VIEWER: 3,
  PROJECT_MANAGER: 4,
  WORKSPACE_VIEWER: 5,
  DEPARTMENT_HEAD: 6,
  WORKSPACE_MANAGER: 7,
} as const;

/**
 * Common permission combinations for UI components
 */
export const PermissionCombos = {
  // Admin access
  IS_ADMIN: [
    { type: "role" as const, role: "workspace-manager" as const },
  ],
  
  // Manager access (workspace or department)
  IS_MANAGER: [
    { type: "role" as const, role: "workspace-manager" as const },
    { type: "role" as const, role: "department-head" as const },
  ],
  
  // Project leadership
  CAN_LEAD_PROJECTS: [
    { type: "role" as const, role: "workspace-manager" as const },
    { type: "role" as const, role: "department-head" as const },
    { type: "role" as const, role: "project-manager" as const },
  ],
  
  // Team leadership
  CAN_LEAD_TEAMS: [
    { type: "role" as const, role: "workspace-manager" as const },
    { type: "role" as const, role: "department-head" as const },
    { type: "role" as const, role: "project-manager" as const },
    { type: "role" as const, role: "team-lead" as const },
  ],
  
  // Task management
  CAN_MANAGE_TASKS: [
    { type: "permission" as const, action: "canCreateTasks" as const },
    { type: "permission" as const, action: "canEditTasks" as const },
    { type: "permission" as const, action: "canAssignTasks" as const },
  ],
  
  // External user detection
  IS_EXTERNAL: [
    { type: "role" as const, role: "client" as const },
    { type: "role" as const, role: "contractor" as const },
    { type: "role" as const, role: "stakeholder" as const },
    { type: "role" as const, role: "guest" as const },
  ],
} as const;

// ===== DEFAULT EXPORTS =====
import { RBACProvider } from "./provider";
export default RBACProvider; 