import { useMemo } from 'react';
import { useAuthStore } from '@/store/consolidated/auth';
import useGetProject from '@/hooks/queries/project/use-get-project';

/**
 * Custom hook for project-level RBAC permissions
 * Determines what actions a user can perform on a specific project
 * 
 * @param projectId - The project ID to check permissions for
 * @param workspaceId - The workspace ID containing the project
 * @returns Permission flags for various project actions
 * 
 * @example
 * ```tsx
 * function ProjectPage() {
 *   const { canEditTasks, canDeleteTasks } = useProjectPermissions(projectId, workspaceId);
 *   
 *   return (
 *     <>
 *       {canEditTasks && <Button>Edit</Button>}
 *       {canDeleteTasks && <Button>Delete</Button>}
 *     </>
 *   );
 * }
 * ```
 */
export function useProjectPermissions(projectId: string, workspaceId?: string) {
  const { user } = useAuthStore();
  const { data: project, isLoading } = useGetProject({ 
    id: projectId, 
    workspaceId: workspaceId || '' 
  });

  const permissions = useMemo(() => {
    // No user = no permissions
    if (!user) {
      return {
        hasProjectAccess: false,
        canViewTasks: false,
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canManageProject: false,
        canInviteMembers: false,
        canManageWorkspace: false,
        userRole: 'guest' as const,
      };
    }

    // Get user role from context or default to 'member'
    const userRole = (user as any).role || 'member';
    
    // Project access check - everyone with valid user has basic access
    // Backend should enforce workspace membership
    const hasProjectAccess = true; // Backend will validate

    // Role-based permissions (aligned with Meridian role system)
    const rolePermissions = {
      // Guest - minimal access (external collaborators)
      guest: {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canManageProject: false,
        canInviteMembers: false,
        canManageWorkspace: false,
      },
      // Member - standard task management (default role)
      member: {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: false, // Members cannot delete
        canManageProject: false,
        canInviteMembers: false,
        canManageWorkspace: false,
      },
      // Project Viewer - read-only access
      'project-viewer': {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canManageProject: false,
        canInviteMembers: false,
        canManageWorkspace: false,
      },
      // Project Manager - full project control
      'project-manager': {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canManageProject: true,
        canInviteMembers: true,
        canManageWorkspace: false,
      },
      // Team Lead - team coordination and project oversight
      'team-lead': {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canManageProject: true,
        canInviteMembers: true,
        canManageWorkspace: false,
      },
      // Department Head - multi-project oversight
      'department-head': {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canManageProject: true,
        canInviteMembers: true,
        canManageWorkspace: false,
      },
      // Admin - workspace administration
      admin: {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canManageProject: true,
        canInviteMembers: true,
        canManageWorkspace: true,
      },
      // Workspace Manager - full workspace control
      'workspace-manager': {
        hasProjectAccess: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canManageProject: true,
        canInviteMembers: true,
        canManageWorkspace: true,
      },
    };

    // Get permissions for user's role, default to member
    const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || rolePermissions.member;

    return {
      ...permissions,
      userRole,
      isLoading,
    };
  }, [user, project, isLoading]);

  return permissions;
}

/**
 * Hook for bulk permission checks
 * Useful for optimizing multiple permission checks
 */
export function useBulkProjectPermissions(projectId: string, workspaceId?: string) {
  const permissions = useProjectPermissions(projectId, workspaceId);

  return {
    ...permissions,
    // Convenience flags
    canModifyTasks: permissions.canEditTasks || permissions.canDeleteTasks,
    isReadOnly: permissions.canViewTasks && !permissions.canCreateTasks && !permissions.canEditTasks,
    isFullAccess: permissions.canManageProject && permissions.canManageWorkspace,
    isPowerUser: permissions.canEditTasks && permissions.canDeleteTasks,
  };
}

export default useProjectPermissions;

