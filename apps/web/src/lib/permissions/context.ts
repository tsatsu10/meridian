/**
 * @epic-1.1-rbac Enhanced Authentication Context with RBAC
 * 
 * This extends the existing auth context with role-based access control,
 * permission checking, and workspace/project scoping.
 */

import { createContext, useContext } from "react";
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
import type { LoggedInUser } from "@/types/user";

// ===== ENHANCED USER INTERFACE =====

/**
 * Enhanced user type that includes RBAC information
 */
export interface RBACUser extends LoggedInUser {
  // Primary role assignment
  role: UserRole;
  roleAssignment: RoleAssignment;
  
  // Workspace/Project context
  currentWorkspaceId?: string;
  currentProjectId?: string;
  currentDepartmentId?: string;
  
  // Permission cache for performance
  permissions: AllPermissions;
  
  // Role assignment history (for audit trails)
  roleHistory?: RoleAssignment[];
  
  // Account status
  isActive: boolean;
  lastActiveAt: Date;
}

/**
 * Enhanced auth context that includes RBAC functionality
 */
export interface RBACAuthContextType {
  // ===== EXISTING AUTH =====
  user: RBACUser | null | undefined;
  setUser: (user: RBACUser | null | undefined) => void;
  
  // ===== ROLE MANAGEMENT =====
  assignRole: (userId: string, role: UserRole, context?: PermissionContext) => Promise<void>;
  removeRole: (userId: string, context?: PermissionContext) => Promise<void>;
  switchContext: (workspaceId?: string, projectId?: string, departmentId?: string) => void;
  
  // ===== PERMISSION CHECKING =====
  hasPermission: (action: PermissionAction, context?: PermissionContext) => boolean;
  checkPermission: (action: PermissionAction, context?: PermissionContext) => PermissionCheckResult;
  canAccessResource: (resourceType: ResourceType, accessLevel: AccessLevel, context?: PermissionContext) => boolean;
  
  // ===== BULK OPERATIONS =====
  hasAnyPermission: (actions: PermissionAction[], context?: PermissionContext) => boolean;
  hasAllPermissions: (actions: PermissionAction[], context?: PermissionContext) => boolean;
  getAllowedActions: (context?: PermissionContext) => PermissionAction[];
  
  // ===== ROLE QUERIES =====
  canActAs: (targetRole: UserRole) => boolean;
  isMinimumRole: (requiredRole: UserRole) => boolean;
  getRoleDisplayName: () => string;
  getRoleLevel: () => number;
  
  // ===== WORKSPACE/PROJECT CONTEXT =====
  currentWorkspace: string | undefined;
  currentProject: string | undefined;
  currentDepartment: string | undefined;
  setCurrentWorkspace: (workspaceId: string) => void;
  setCurrentProject: (projectId: string) => void;
  setCurrentDepartment: (departmentId: string) => void;
  
  // ===== LOADING STATES =====
  isLoading: boolean;
  isRoleLoading: boolean;
  error: string | null;
}

// ===== CONTEXT CREATION =====

/**
 * Enhanced RBAC Auth Context
 */
export const RBACAuthContext = createContext<RBACAuthContextType | null>(null);

/**
 * Hook to use the RBAC auth context
 */
export function useRBACAuth(): RBACAuthContextType {
  const context = useContext(RBACAuthContext);
  
  if (!context) {
    throw new Error("useRBACAuth must be used within an RBACAuthProvider");
  }
  
  return context;
}

/**
 * Safe when RBAC provider may be absent (e.g. storybook or partial app shell).
 * Prefer useRBACAuth inside RBACProvider; use this for optional permission UI.
 */
export function useOptionalRBACAuth(): RBACAuthContextType | null {
  return useContext(RBACAuthContext);
}

// ===== PERMISSION HOOK SHORTCUTS =====

/**
 * Quick permission checking hooks for common use cases
 */
export function usePermission(action: PermissionAction, context?: PermissionContext): boolean {
  const { hasPermission } = useRBACAuth();
  return hasPermission(action, context);
}

export function usePermissions(actions: PermissionAction[], context?: PermissionContext): Record<PermissionAction, boolean> {
  const { hasPermission } = useRBACAuth();
  const results: Record<string, boolean> = {};
  
  for (const action of actions) {
    results[action] = hasPermission(action, context);
  }
  
  return results;
}

export function useCanAccess(resourceType: ResourceType, accessLevel: AccessLevel, context?: PermissionContext): boolean {
  const { canAccessResource } = useRBACAuth();
  return canAccessResource(resourceType, accessLevel, context);
}

export function useRole(): {
  role: UserRole;
  displayName: string;
  level: number;
  isMinimumRole: (requiredRole: UserRole) => boolean;
  canActAs: (targetRole: UserRole) => boolean;
} {
  const { user, getRoleDisplayName, getRoleLevel, isMinimumRole, canActAs } = useRBACAuth();
  
  return {
    role: user?.role || "guest",
    displayName: getRoleDisplayName(),
    level: getRoleLevel(),
    isMinimumRole,
    canActAs,
  };
}

// ===== WORKSPACE CONTEXT HOOKS =====

export function useWorkspaceContext(): {
  workspaceId: string | undefined;
  projectId: string | undefined;
  departmentId: string | undefined;
  setWorkspace: (workspaceId: string) => void;
  setProject: (projectId: string) => void;
  setDepartment: (departmentId: string) => void;
  switchContext: (workspaceId?: string, projectId?: string, departmentId?: string) => void;
} {
  const { 
    currentWorkspace, 
    currentProject, 
    currentDepartment,
    setCurrentWorkspace,
    setCurrentProject, 
    setCurrentDepartment,
    switchContext 
  } = useRBACAuth();
  
  return {
    workspaceId: currentWorkspace,
    projectId: currentProject,
    departmentId: currentDepartment,
    setWorkspace: setCurrentWorkspace,
    setProject: setCurrentProject,
    setDepartment: setCurrentDepartment,
    switchContext,
  };
}

// ===== PERMISSION GUARDS FOR COMPONENTS =====

/**
 * Component-level permission guards
 */
export interface PermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: PermissionContext;
}

export interface RequirePermissionProps extends PermissionGuardProps {
  action: PermissionAction;
}

export interface RequireRoleProps extends PermissionGuardProps {
  role: UserRole;
  minimum?: boolean; // If true, accepts this role or higher
}

export interface RequireAccessProps extends PermissionGuardProps {
  resource: ResourceType;
  level: AccessLevel;
}

// ===== ERROR BOUNDARIES =====

export interface RBACError extends Error {
  code: 'PERMISSION_DENIED' | 'ROLE_NOT_FOUND' | 'CONTEXT_INVALID' | 'AUTH_REQUIRED';
  permission?: PermissionAction;
  role?: UserRole;
  context?: PermissionContext;
}

export function createRBACError(
  message: string, 
  code: RBACError['code'], 
  details?: Partial<Pick<RBACError, 'permission' | 'role' | 'context'>>
): RBACError {
  const error = new Error(message) as RBACError;
  error.code = code;
  if (details) {
    Object.assign(error, details);
  }
  return error;
}

// ===== TYPE GUARDS =====

export function isRBACUser(user: unknown): user is RBACUser {
  return (
    !!user &&
    typeof user === "object" &&
    "role" in user &&
    "roleAssignment" in user &&
    "permissions" in user
  );
}

export function hasValidRole(user: RBACUser | null | undefined): user is RBACUser {
  return !!user && 
    isRBACUser(user) && 
    user.isActive &&
    (!user.roleAssignment.expiresAt || user.roleAssignment.expiresAt > new Date());
}

// ===== DEFAULT VALUES =====

// Import guest permissions from the definitions
import { getRolePermissions } from "./definitions";

export function getDefaultGuestPermissions(): AllPermissions {
  return getRolePermissions("guest");
} 