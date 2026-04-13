/**
 * 🛡️ Route Protection System
 * 
 * Comprehensive route protection for permission-based page access.
 * Integrates with TanStack Router for declarative route security.
 */

import React from "react";
import { useRBACAuth } from "./context";
import type { PermissionAction, UserRole } from "./types";
import { RequirePermission, RequireRole } from "./components";

// ===== ROUTE GUARD COMPONENTS =====

/**
 * Page-level permission guard - wraps entire page components
 */
export function ProtectedPage({ 
  children, 
  permission,
  fallbackPath = "/dashboard"
}: {
  children: React.ReactNode;
  permission: PermissionAction;
  fallbackPath?: string;
}) {
  return (
    <RequirePermission 
      action={permission} 
      fallback={<RedirectToPath path={fallbackPath} />}
    >
      {children}
    </RequirePermission>
  );
}

/**
 * Role-based page guard - requires minimum role level
 */
export function RoleProtectedPage({
  children,
  role,
  minimum = true,
  fallbackPath = "/dashboard"
}: {
  children: React.ReactNode;
  role: UserRole;
  minimum?: boolean;
  fallbackPath?: string;
}) {
  return (
    <RequireRole 
      role={role} 
      minimum={minimum}
      fallback={<RedirectToPath path={fallbackPath} />}
    >
      {children}
    </RequireRole>
  );
}

/**
 * Multi-permission page guard - requires ALL specified permissions
 */
export function MultiPermissionPage({
  children,
  permissions,
  fallbackPath = "/dashboard"
}: {
  children: React.ReactNode;
  permissions: PermissionAction[];
  fallbackPath?: string;
}) {
  const { hasPermission } = useRBACAuth();
  
  // Check if user has all required permissions
  const hasAllPermissions = permissions.every(permission => hasPermission(permission));
  
  if (!hasAllPermissions) {
    return <RedirectToPath path={fallbackPath} />;
  }
  
  return <>{children}</>;
}

// ===== ROUTE PROTECTION HOOKS =====

/**
 * Hook for programmatic route protection
 */
export function useRouteProtection() {
  const { hasPermission, user, isLoading } = useRBACAuth();

  const checkRouteAccess = (permission: PermissionAction): boolean => {
    if (isLoading) return false;
    return hasPermission(permission);
  };

  const redirectIfUnauthorized = (
    permission: PermissionAction, 
    redirectPath = "/dashboard"
  ) => {
    if (!isLoading && !hasPermission(permission)) {
      window.location.href = redirectPath;
    }
  };

  return {
    checkRouteAccess,
    redirectIfUnauthorized,
    isLoading,
    user,
  };
}

// ===== UTILITY COMPONENTS =====

/**
 * Redirect component for unauthorized access
 */
function RedirectToPath({ path }: { path: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
        <button 
          onClick={() => window.location.href = path}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// ===== ROUTE CONFIGURATION HELPERS =====

/**
 * Common route protection configurations
 */
export const RouteProtections = {
  // Admin-only routes
  adminOnly: (children: React.ReactNode) => (
    <RoleProtectedPage role="workspace-manager" minimum={true}>
      {children}
    </RoleProtectedPage>
  ),

  // Manager-level routes
  managerOnly: (children: React.ReactNode) => (
    <RoleProtectedPage role="department-head" minimum={true}>
      {children}
    </RoleProtectedPage>
  ),

  // Team lead routes
  teamLeadOnly: (children: React.ReactNode) => (
    <RoleProtectedPage role="team-lead" minimum={true}>
      {children}
    </RoleProtectedPage>
  ),

  // Settings routes
  settings: (children: React.ReactNode) => (
    <ProtectedPage permission="canManageWorkspace">
      {children}
    </ProtectedPage>
  ),

  // Analytics routes
  analytics: (children: React.ReactNode) => (
    <ProtectedPage permission="canViewAnalytics">
      {children}
    </ProtectedPage>
  ),

  // Member-only routes (basic access)
  memberOnly: (children: React.ReactNode) => (
    <RoleProtectedPage role="member" minimum={true}>
      {children}
    </RoleProtectedPage>
  ),
};

/**
 * Route beforeLoad function for permission checking
 */
export function createPermissionCheck(permission: PermissionAction) {
  return () => {
    return {
      requiresPermission: permission
    };
  };
}

/**
 * Route loader with permission checking
 */
export function createProtectedLoader<T>(
  permission: PermissionAction,
  loader: () => Promise<T>
) {
  return async (): Promise<T> => {
    // TODO: Implement permission checking in loaders
    return loader();
  };
}

// ===== ROUTE PROTECTION EXAMPLES =====

/**
 * Example: How to protect routes in TanStack Router
 */
export const RouteExamples = {
  // Basic permission protection
  adminRoute: `
    export const Route = createFileRoute('/admin')({
      component: () => (
        <ProtectedPage permission="canManageWorkspace">
          <AdminDashboard />
        </ProtectedPage>
      ),
    });
  `,

  // Role-based protection
  teamLeadRoute: `
    export const Route = createFileRoute('/team/manage')({
      component: () => (
        <RoleProtectedPage role="team-lead" minimum={true}>
          <TeamManagement />
        </RoleProtectedPage>
      ),
    });
  `,

  // Multi-permission protection
  projectRoute: `
    export const Route = createFileRoute('/project/edit')({
      component: () => (
        <MultiPermissionPage permissions={["canEditProjects", "canAssignTasks"]}>
          <ProjectEditor />
        </MultiPermissionPage>
      ),
    });
  `,

  // Using route protection helper
  settingsRoute: `
    export const Route = createFileRoute('/settings')({
      component: () => RouteProtections.settings(
        <SettingsPage />
      ),
    });
  `,
};

// Exports are handled in the function declarations above 