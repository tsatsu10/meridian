/**
 * @epic-1.1-rbac RBAC Provider Implementation
 *
 * This provider wraps the existing auth context and adds RBAC functionality.
 * It integrates seamlessly with your current authentication system.
 */

import type React from "react";
import { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/constants/urls";

// Import existing auth
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import type { LoggedInUser } from "@/types/user";

// Import RBAC types and utilities
import type {
  UserRole,
  AllPermissions,
  PermissionContext,
  PermissionCheckResult,
  PermissionAction,
  ResourceType,
  AccessLevel,
  RoleAssignment,
} from "./types";
import { ROLE_METADATA } from "./types";
import {
  RBACAuthContext,
  type RBACAuthContextType,
  type RBACUser,
  getDefaultGuestPermissions,
} from "./context";
import {
  checkPermission,
  canAccessResource,
  getAllowedActions,
  canActAsUser,
} from "./utils";
import { getRolePermissions, hasMinimumRole } from "./definitions";

// ===== ROLE ASSIGNMENT UTILITIES =====

/**
 * Convert existing user to RBAC user with default role assignment
 */
function createRBACUser(
  user: LoggedInUser,
  role: UserRole = "member",
  permissions?: AllPermissions,
): RBACUser {
  const now = new Date();

  // Create default role assignment
  const defaultRoleAssignment: RoleAssignment = {
    id: `role-${user.id}-${now.getTime()}`,
    userId: user.id,
    role: role,
    assignedBy: user.id, // Self-assigned for now
    assignedAt: now,
    isActive: true,
    // Add workspace/project context when available
    workspaceId: undefined, // To be set by workspace context
    projectIds: [],
    departmentIds: [],
  };

  return {
    ...user,
    role,
    roleAssignment: defaultRoleAssignment,
    permissions: permissions || getRolePermissions(role),
    isActive: true,
    lastActiveAt: now,
  };
}

/**
 * Fallback role when the RBAC assignments API is unavailable or returns no
 * active assignment. Production users should get roles from
 * GET /rbac/assignments/:userId; this heuristic is dev/demo bootstrap only.
 */
function determineInitialRole(user: LoggedInUser): UserRole {
  const email = user.email?.toLowerCase() || "";

  // Specific workspace managers. The old `|| true` short-circuit granted
  // EVERY user workspace-manager in the UI — removed; the allowlisted email
  // also had a typo (elidegbotse@ → elikemdegbotse@).
  if (
    email.includes("admin") ||
    email.includes("manager") ||
    email.includes("owner") ||
    email === "elikemdegbotse@gmail.com" ||
    email === "sarah@meridian.app"
  ) {
    return "workspace-manager";
  }

  // Demo department heads
  if (
    email.includes("head") ||
    email.includes("director") ||
    email.includes("vp")
  ) {
    return "department-head";
  }

  // Demo project managers
  if (email.includes("pm") || email.includes("project")) {
    return "project-manager";
  }

  // Demo team leads
  if (email.includes("lead") || email.includes("senior")) {
    return "team-lead";
  }

  // Default role for new users
  return "member";
}

// ===== RBAC PROVIDER COMPONENT =====

interface RBACProviderProps {
  children: React.ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  // Get existing auth context
  const { user: authUser, setUser: setAuthUser } = useAuth();

  // RBAC state
  const [rbacUser, setRBACUser] = useState<RBACUser | null | undefined>(
    undefined,
  );
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Context state
  const [currentWorkspace, setCurrentWorkspace] = useState<
    string | undefined
  >();
  const [currentProject, setCurrentProject] = useState<string | undefined>();
  const [currentDepartment, setCurrentDepartment] = useState<
    string | undefined
  >();

  // ===== USER CONVERSION LOGIC =====

  /**
   * Convert auth user to RBAC user when auth state changes
   */
  useEffect(() => {
    if (authUser === undefined) {
      // Auth is still loading
      setRBACUser(undefined);
      return;
    }

    if (authUser === null) {
      // User is not authenticated
      setRBACUser(null);
      return;
    }

    // User is authenticated - convert to RBAC user
    setIsRoleLoading(true);

    // Try to fetch role from database first, fallback to email-based determination
    const loadUserRole = async () => {
      try {
        // Try to get role from backend
        const response = await fetch(
          `${API_BASE_URL}/rbac/assignments/${authUser.id}`,
          {
            credentials: "include",
          },
        );
        let userRole: UserRole;

        if (response.ok) {
          const data = await response.json();
          // Check if we got a valid assignments response
          if (data.assignments && Array.isArray(data.assignments)) {
            const activeAssignment = data.assignments.find(
              (a: { isActive?: boolean; role?: UserRole }) => a.isActive,
            );
            userRole = activeAssignment?.role || determineInitialRole(authUser);
          } else {
            // Response doesn't have assignments (might be auth error), fallback
            userRole = determineInitialRole(authUser);
          }
        } else {
          // Fallback to email-based determination
          userRole = determineInitialRole(authUser);
        }

        const permissions = getRolePermissions(userRole);
        const newRBACUser = createRBACUser(authUser, userRole, permissions);

        setRBACUser(newRBACUser);
        setError(null);
      } catch (err) {
        console.error(
          "Failed to load user role from database, using fallback:",
          err,
        );

        // Fallback to email-based determination
        try {
          const userRole = determineInitialRole(authUser);
          const permissions = getRolePermissions(userRole);
          const newRBACUser = createRBACUser(authUser, userRole, permissions);

          setRBACUser(newRBACUser);
          setError(null);
        } catch (fallbackErr) {
          console.error("Failed to create RBAC user:", fallbackErr);
          setError("Failed to load user permissions");

          // Final fallback to guest permissions
          const guestPermissions = getDefaultGuestPermissions();
          const fallbackUser = createRBACUser(
            authUser,
            "guest",
            guestPermissions,
          );
          setRBACUser(fallbackUser);
        }
      } finally {
        setIsRoleLoading(false);
      }
    };

    loadUserRole();
  }, [authUser]);

  // ===== ROLE MANAGEMENT FUNCTIONS =====

  const assignRole = useCallback(
    async (
      userId: string,
      role: UserRole,
      context?: PermissionContext,
    ): Promise<void> => {
      setIsRoleLoading(true);

      try {
        // Workspace is mandatory: POST /rbac/assign requires workspaceId
        // (z.string().min(1)) because role assignment is scoped per
        // workspace server-side. Without this guard, an undefined
        // context?.workspaceId would sail through JSON.stringify (the key
        // just vanishes) and the request would 400 with a validation error
        // instead of failing with a message that names the actual problem.
        // Refusing here also rules out ever inventing a fallback workspace —
        // assigning a role into the wrong workspace is a security-relevant
        // mistake, so failing loudly is correct.
        if (!context?.workspaceId) {
          throw new Error(
            "Cannot assign a role without a workspace: role assignment is workspace-scoped.",
          );
        }

        // This used to be a client-side simulation: it never called the API,
        // and only mutated local state when you assigned a role to *yourself*
        // — so assigning a role to anyone else silently did nothing at all,
        // while the UI reported success. POST /rbac/assign has existed all
        // along (it enforces canManageRoles server-side).
        const response = await fetch(`${API_BASE_URL}/rbac/assign`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            role,
            workspaceId: context?.workspaceId,
            projectIds: context?.projectId ? [context.projectId] : undefined,
          }),
        });

        if (!response.ok) {
          const body = await response
            .json()
            .catch(() => ({ error: "Failed to assign role" }));
          throw new Error(
            body.error ||
              (response.status === 403
                ? "You do not have permission to assign roles"
                : `Failed to assign role (HTTP ${response.status})`),
          );
        }

        if (rbacUser && rbacUser.id === userId) {
          const newPermissions = getRolePermissions(role);
          const now = new Date();

          const newRoleAssignment: RoleAssignment = {
            ...rbacUser.roleAssignment,
            role,
            assignedAt: now,
            workspaceId: context?.workspaceId,
            projectIds: context?.projectId ? [context.projectId] : [],
            departmentIds: context?.departmentId ? [context.departmentId] : [],
          };

          const updatedUser: RBACUser = {
            ...rbacUser,
            role,
            roleAssignment: newRoleAssignment,
            permissions: newPermissions,
            lastActiveAt: now,
          };

          setRBACUser(updatedUser);
        }

        // Outside the self-assignment branch: the toast used to live inside
        // it, so assigning a role to another user gave no feedback at all.
        toast.success(`Role updated to ${ROLE_METADATA[role].displayName}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to assign role";
        setError(message);
        toast.error(message);
      } finally {
        setIsRoleLoading(false);
      }
    },
    [rbacUser],
  );

  const removeRole = useCallback(
    async (userId: string, context?: PermissionContext): Promise<void> => {
      // Was a stub that only toasted "not yet implemented". The endpoint has
      // existed all along (it deactivates the active assignment and records
      // the change in role history, gated on canManageRoles server-side).
      setIsRoleLoading(true);

      try {
        // Workspace is mandatory: DELETE /rbac/remove/:userId now requires a
        // ?workspaceId= query param, because role removal is scoped per
        // workspace server-side (it previously had no workspace concept at
        // all, which allowed a cross-workspace privilege bug). There are
        // currently no call sites for removeRole, so refuse to call the API
        // without a workspace rather than let it 400 silently for whoever
        // wires this up next.
        if (!context?.workspaceId) {
          throw new Error(
            "Cannot remove a role without a workspace: role removal is workspace-scoped.",
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/rbac/remove/${userId}?workspaceId=${encodeURIComponent(context.workspaceId)}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );

        if (!response.ok) {
          const body = await response
            .json()
            .catch(() => ({ error: "Failed to remove role" }));
          throw new Error(
            body.error ||
              (response.status === 403
                ? "You do not have permission to remove roles"
                : `Failed to remove role (HTTP ${response.status})`),
          );
        }

        toast.success("Role removed");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove role";
        setError(message);
        toast.error(message);
      } finally {
        setIsRoleLoading(false);
      }
    },
    [],
  );

  const switchContext = useCallback(
    (workspaceId?: string, projectId?: string, departmentId?: string) => {
      setCurrentWorkspace(workspaceId);
      setCurrentProject(projectId);
      setCurrentDepartment(departmentId);

      // Update user context
      if (rbacUser) {
        const updatedUser: RBACUser = {
          ...rbacUser,
          currentWorkspaceId: workspaceId,
          currentProjectId: projectId,
          currentDepartmentId: departmentId,
          lastActiveAt: new Date(),
        };
        setRBACUser(updatedUser);
      }
    },
    [rbacUser],
  );

  // ===== PERMISSION CHECKING FUNCTIONS =====

  const hasPermission = useCallback(
    (action: PermissionAction, context?: PermissionContext): boolean => {
      if (!rbacUser) return false;

      const result = checkPermission(
        rbacUser.role,
        action,
        context || {
          workspaceId: currentWorkspace,
          projectId: currentProject,
          departmentId: currentDepartment,
        },
        rbacUser.roleAssignment,
      );

      return result.allowed;
    },
    [rbacUser, currentWorkspace, currentProject, currentDepartment],
  );

  const checkPermissionFull = useCallback(
    (
      action: PermissionAction,
      context?: PermissionContext,
    ): PermissionCheckResult => {
      if (!rbacUser) {
        return {
          allowed: false,
          role: "guest",
          reason: "User not authenticated",
        };
      }

      return checkPermission(
        rbacUser.role,
        action,
        context || {
          workspaceId: currentWorkspace,
          projectId: currentProject,
          departmentId: currentDepartment,
        },
        rbacUser.roleAssignment,
      );
    },
    [rbacUser, currentWorkspace, currentProject, currentDepartment],
  );

  const canAccessResourceFull = useCallback(
    (
      resourceType: ResourceType,
      accessLevel: AccessLevel,
      context?: PermissionContext,
    ): boolean => {
      if (!rbacUser) return false;

      return canAccessResource(
        rbacUser.role,
        resourceType,
        accessLevel,
        context || {
          workspaceId: currentWorkspace,
          projectId: currentProject,
          departmentId: currentDepartment,
        },
      );
    },
    [rbacUser, currentWorkspace, currentProject, currentDepartment],
  );

  // ===== BULK OPERATIONS =====

  const hasAnyPermission = useCallback(
    (actions: PermissionAction[], context?: PermissionContext): boolean => {
      return actions.some((action) => hasPermission(action, context));
    },
    [hasPermission],
  );

  const hasAllPermissions = useCallback(
    (actions: PermissionAction[], context?: PermissionContext): boolean => {
      return actions.every((action) => hasPermission(action, context));
    },
    [hasPermission],
  );

  const getAllowedActionsFull = useCallback(
    (context?: PermissionContext): PermissionAction[] => {
      if (!rbacUser) return [];

      return getAllowedActions(
        rbacUser.role,
        context || {
          workspaceId: currentWorkspace,
          projectId: currentProject,
          departmentId: currentDepartment,
        },
      );
    },
    [rbacUser, currentWorkspace, currentProject, currentDepartment],
  );

  // ===== ROLE QUERY FUNCTIONS =====

  const canActAs = useCallback(
    (targetRole: UserRole): boolean => {
      if (!rbacUser) return false;
      return canActAsUser(rbacUser.role, targetRole, "canManageRoles");
    },
    [rbacUser],
  );

  const isMinimumRole = useCallback(
    (requiredRole: UserRole): boolean => {
      if (!rbacUser) return false;
      return hasMinimumRole(rbacUser.role, requiredRole);
    },
    [rbacUser],
  );

  const getRoleDisplayName = useCallback((): string => {
    if (!rbacUser) return "Guest";
    return ROLE_METADATA[rbacUser.role].displayName;
  }, [rbacUser]);

  const getRoleLevel = useCallback((): number => {
    if (!rbacUser) return 0;
    return ROLE_METADATA[rbacUser.role].level;
  }, [rbacUser]);

  // ===== USER MANAGEMENT =====

  const setUser = useCallback(
    (user: RBACUser | null | undefined) => {
      setRBACUser(user);

      // Update the auth context as well
      if (user) {
        const {
          role,
          roleAssignment,
          permissions,
          isActive,
          lastActiveAt,
          ...authData
        } = user;
        setAuthUser(authData);
      } else {
        setAuthUser(user);
      }
    },
    [setAuthUser],
  );

  // ===== CONTEXT VALUE =====

  const contextValue: RBACAuthContextType = useMemo(
    () => ({
      // User and auth
      user: rbacUser,
      setUser,

      // Role management
      assignRole,
      removeRole,
      switchContext,

      // Permission checking
      hasPermission,
      checkPermission: checkPermissionFull,
      canAccessResource: canAccessResourceFull,

      // Bulk operations
      hasAnyPermission,
      hasAllPermissions,
      getAllowedActions: getAllowedActionsFull,

      // Role queries
      canActAs,
      isMinimumRole,
      getRoleDisplayName,
      getRoleLevel,

      // Context management
      currentWorkspace,
      currentProject,
      currentDepartment,
      setCurrentWorkspace,
      setCurrentProject,
      setCurrentDepartment,

      // Loading states
      isLoading: authUser === undefined,
      isRoleLoading,
      error,
    }),
    [
      rbacUser,
      setUser,
      assignRole,
      removeRole,
      switchContext,
      hasPermission,
      checkPermissionFull,
      canAccessResourceFull,
      hasAnyPermission,
      hasAllPermissions,
      getAllowedActionsFull,
      canActAs,
      isMinimumRole,
      getRoleDisplayName,
      getRoleLevel,
      currentWorkspace,
      currentProject,
      currentDepartment,
      authUser,
      isRoleLoading,
      error,
    ],
  );

  return (
    <RBACAuthContext.Provider value={contextValue}>
      {children}
    </RBACAuthContext.Provider>
  );
}

// ===== CONVENIENCE HOOKS =====

/**
 * Hook that combines existing auth with RBAC
 */
export function useRBACAuth(): RBACAuthContextType {
  const context = useContext(RBACAuthContext);

  if (!context) {
    throw new Error("useRBACAuth must be used within an RBACProvider");
  }

  return context;
}

export default RBACProvider;
