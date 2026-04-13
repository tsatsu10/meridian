/**
 * @epic-1.1-rbac Permission Guard Components
 * 
 * Components for protecting UI elements based on user permissions and roles.
 * These provide declarative access control throughout the application.
 */

import React from "react";
import { useRBACAuth } from "./provider";
import type { 
  RequirePermissionProps, 
  RequireRoleProps, 
  RequireAccessProps,
  PermissionGuardProps 
} from "./context";
import type { UserRole, PermissionAction, ResourceType, AccessLevel } from "./types";

// ===== PERMISSION GUARD COMPONENTS =====

/**
 * Renders children only if user has the specified permission
 * 
 * @example
 * <RequirePermission action="canCreateTasks" fallback={<div>No access</div>}>
 *   <CreateTaskButton />
 * </RequirePermission>
 */
export function RequirePermission({ 
  action, 
  children, 
  fallback = null, 
  context 
}: RequirePermissionProps) {
  const { hasPermission } = useRBACAuth();
  
  const hasAccess = hasPermission(action, context);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user has the specified role or higher
 * 
 * @example
 * <RequireRole role="team-lead" minimum fallback={<div>Team leads only</div>}>
 *   <ManageTeamButton />
 * </RequireRole>
 */
export function RequireRole({ 
  role, 
  minimum = false, 
  children, 
  fallback = null 
}: RequireRoleProps) {
  const { user, isMinimumRole } = useRBACAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  const hasAccess = minimum ? isMinimumRole(role) : user.role === role;
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders children only if user can access resource at specified level
 * 
 * @example
 * <RequireAccess resource="project" level="manage" context={{ projectId: "123" }}>
 *   <EditProjectButton />
 * </RequireAccess>
 */
export function RequireAccess({ 
  resource, 
  level, 
  children, 
  fallback = null, 
  context 
}: RequireAccessProps) {
  const { canAccessResource } = useRBACAuth();
  
  const hasAccess = canAccessResource(resource, level, context);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Multi-condition permission guard - requires ALL conditions to be met
 * 
 * @example
 * <RequireAll 
 *   conditions={[
 *     { type: "permission", action: "canCreateTasks" },
 *     { type: "role", role: "team-lead", minimum: true }
 *   ]}
 *   fallback={<div>Insufficient permissions</div>}
 * >
 *   <AdvancedTaskCreator />
 * </RequireAll>
 */
export function RequireAll({ 
  conditions, 
  children, 
  fallback = null,
  context 
}: {
  conditions: Array<
    | { type: "permission"; action: PermissionAction }
    | { type: "role"; role: UserRole; minimum?: boolean }
    | { type: "access"; resource: ResourceType; level: AccessLevel }
  >;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: any;
}) {
  const { hasPermission, user, isMinimumRole, canAccessResource } = useRBACAuth();
  
  const hasAccess = conditions.every(condition => {
    switch (condition.type) {
      case "permission":
        return hasPermission(condition.action, context);
      case "role":
        if (!user) return false;
        return condition.minimum 
          ? isMinimumRole(condition.role)
          : user.role === condition.role;
      case "access":
        return canAccessResource(condition.resource, condition.level, context);
      default:
        return false;
    }
  });
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Multi-condition permission guard - requires ANY condition to be met
 * 
 * @example
 * <RequireAny 
 *   conditions={[
 *     { type: "role", role: "workspace-manager" },
 *     { type: "permission", action: "canManageProjects" }
 *   ]}
 * >
 *   <AdminPanel />
 * </RequireAny>
 */
export function RequireAny({ 
  conditions, 
  children, 
  fallback = null,
  context 
}: {
  conditions: Array<
    | { type: "permission"; action: PermissionAction }
    | { type: "role"; role: UserRole; minimum?: boolean }
    | { type: "access"; resource: ResourceType; level: AccessLevel }
  >;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: any;
}) {
  const { hasPermission, user, isMinimumRole, canAccessResource } = useRBACAuth();
  
  const hasAccess = conditions.some(condition => {
    switch (condition.type) {
      case "permission":
        return hasPermission(condition.action, context);
      case "role":
        if (!user) return false;
        return condition.minimum 
          ? isMinimumRole(condition.role)
          : user.role === condition.role;
      case "access":
        return canAccessResource(condition.resource, condition.level, context);
      default:
        return false;
    }
  });
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Show different content based on user role
 * 
 * @example
 * <RoleSwitch 
 *   roles={{
 *     "workspace-manager": <AdminDashboard />,
 *     "project-manager": <ProjectDashboard />,
 *     "member": <UserDashboard />
 *   }}
 *   fallback={<GuestView />}
 * />
 */
export function RoleSwitch({ 
  roles, 
  fallback = null 
}: {
  roles: Partial<Record<UserRole, React.ReactNode>>;
  fallback?: React.ReactNode;
}) {
  const { user } = useRBACAuth();
  
  if (!user) return <>{fallback}</>;
  
  return <>{roles[user.role] || fallback}</>;
}

/**
 * Conditional render based on authentication status
 * 
 * @example
 * <AuthSwitch 
 *   authenticated={<Dashboard />}
 *   unauthenticated={<LoginForm />}
 *   loading={<Spinner />}
 * />
 */
export function AuthSwitch({ 
  authenticated, 
  unauthenticated, 
  loading = null 
}: {
  authenticated: React.ReactNode;
  unauthenticated: React.ReactNode;
  loading?: React.ReactNode;
}) {
  const { user, isLoading } = useRBACAuth();
  
  if (isLoading) return <>{loading}</>;
  if (user) return <>{authenticated}</>;
  return <>{unauthenticated}</>;
}

// ===== HIGHER-ORDER COMPONENTS =====

/**
 * HOC for protecting entire components with permission requirements
 * 
 * @example
 * const ProtectedComponent = withPermission("canManageUsers")(UserManagement);
 */
export function withPermission(action: PermissionAction, fallback?: React.ComponentType) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function ProtectedComponent(props: P) {
      const FallbackComponent = fallback;
      return (
        <RequirePermission 
          action={action} 
          fallback={FallbackComponent ? <FallbackComponent /> : null}
        >
          <Component {...props} />
        </RequirePermission>
      );
    };
  };
}

/**
 * HOC for protecting components with role requirements
 * 
 * @example
 * const AdminComponent = withRole("workspace-manager")(AdminPanel);
 * const MinTeamLeadComponent = withRole("team-lead", true)(TeamManagement);
 */
export function withRole(role: UserRole, minimum = false, fallback?: React.ComponentType) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function ProtectedComponent(props: P) {
      const FallbackComponent = fallback;
      return (
        <RequireRole 
          role={role} 
          minimum={minimum}
          fallback={FallbackComponent ? <FallbackComponent /> : null}
        >
          <Component {...props} />
        </RequireRole>
      );
    };
  };
}

// ===== PERMISSION STATUS COMPONENTS =====

/**
 * Shows user's current role and permission status
 * 
 * @example
 * <PermissionStatus />
 */
export function PermissionStatus() {
  const { user, getRoleDisplayName, getRoleLevel, error } = useRBACAuth();
  
  if (!user) return null;
  
  return (
    <div className="permission-status">
      <div>Role: {getRoleDisplayName()}</div>
      <div>Level: {getRoleLevel()}</div>
      {error && <div className="error">Error: {error}</div>}
    </div>
  );
}

/**
 * Debug component showing all current permissions (dev only)
 * 
 * @example
 * {process.env.NODE_ENV === 'development' && <PermissionDebug />}
 */
export function PermissionDebug() {
  const { user, getAllowedActions, currentWorkspace, currentProject } = useRBACAuth();
  
  if (!user) return null;
  
  const allowedActions = getAllowedActions();
  
  return (
    <details className="permission-debug">
      <summary>Permission Debug (Dev Only)</summary>
      <div>
        <div><strong>User:</strong> {user.name} ({user.email})</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div><strong>Workspace:</strong> {currentWorkspace || "None"}</div>
        <div><strong>Project:</strong> {currentProject || "None"}</div>
        <div><strong>Allowed Actions ({allowedActions.length}):</strong></div>
        <ul style={{ maxHeight: "200px", overflow: "auto" }}>
          {allowedActions.map(action => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

// ===== EXPORT ALL GUARDS =====

export {
  RequirePermission as CanDo,
  RequireRole as OnlyRole,
  RequireAccess as CanAccess,
  RequireAll as AllOf,
  RequireAny as AnyOf,
}; 