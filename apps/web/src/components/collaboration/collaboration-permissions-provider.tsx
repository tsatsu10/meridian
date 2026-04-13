/**
 * 🛡️ Collaboration Permissions Provider
 *
 * Central provider for managing collaboration permissions across all features
 * Provides context and permission checks for all collaboration components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useCollaborationPermissions, type CollaborationPermissions } from '@/hooks/useCollaborationPermissions';
import { useTeamPermissions, type TeamPermissions } from '@/hooks/useTeamPermissions';

interface CollaborationPermissionsContextType {
  collaborationPermissions: CollaborationPermissions;
  teamPermissions: TeamPermissions;
  canPerformCollaborationAction: (action: keyof CollaborationPermissions) => boolean;
  canCollaborateOnResource: (resourceType: 'task' | 'project' | 'document' | 'discussion') => boolean;
  shouldShowCollaborationFeatures: {
    liveCursors: boolean;
    presenceIndicators: boolean;
    activityStream: boolean;
    discussions: boolean;
    teamInsights: boolean;
    collaborativeEditing: boolean;
  };
  getNotificationPermissions: {
    presence: boolean;
    activity: boolean;
    discussions: boolean;
    insights: boolean;
  };
  userRole: string;
  isWorkspaceOwner: boolean;
}

const CollaborationPermissionsContext = createContext<CollaborationPermissionsContextType | null>(null);

interface CollaborationPermissionsProviderProps {
  children: ReactNode;
  team?: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      email: string;
      role: string;
      isActive?: boolean;
    }>;
    lead: string;
    isArchived?: boolean;
  } | null;
}

export function CollaborationPermissionsProvider({
  children,
  team
}: CollaborationPermissionsProviderProps) {
  const {
    userRole,
    teamPermissions,
    collaborationPermissions,
    canPerformCollaborationAction,
    canCollaborateOnResource,
    getNotificationPermissions,
    shouldShowCollaborationFeatures,
    isWorkspaceOwner,
  } = useCollaborationPermissions(team);

  const contextValue: CollaborationPermissionsContextType = {
    collaborationPermissions,
    teamPermissions,
    canPerformCollaborationAction,
    canCollaborateOnResource,
    shouldShowCollaborationFeatures,
    getNotificationPermissions,
    userRole,
    isWorkspaceOwner,
  };

  return (
    <CollaborationPermissionsContext.Provider value={contextValue}>
      {children}
    </CollaborationPermissionsContext.Provider>
  );
}

export function useCollaborationPermissionsContext() {
  const context = useContext(CollaborationPermissionsContext);
  if (!context) {
    throw new Error(
      'useCollaborationPermissionsContext must be used within a CollaborationPermissionsProvider'
    );
  }
  return context;
}

/**
 * HOC for protecting collaboration components with permission checks
 */
export function withCollaborationPermissions<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: keyof CollaborationPermissions,
  fallbackComponent?: React.ComponentType<T>
) {
  return function ProtectedCollaborationComponent(props: T) {
    const { canPerformCollaborationAction } = useCollaborationPermissionsContext();

    if (!canPerformCollaborationAction(requiredPermission)) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent;
        return <FallbackComponent {...props} />;
      }
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p>You don't have permission to access this collaboration feature.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Permission-aware wrapper for collaboration features
 */
interface PermissionWrapperProps {
  children: ReactNode;
  requiredPermission: keyof CollaborationPermissions;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function CollaborationPermissionWrapper({
  children,
  requiredPermission,
  fallback,
  showMessage = true
}: PermissionWrapperProps) {
  const { canPerformCollaborationAction } = useCollaborationPermissionsContext();

  if (!canPerformCollaborationAction(requiredPermission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <div className="p-2 text-sm text-muted-foreground bg-muted/10 rounded border">
          You don't have permission for this collaboration feature.
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

/**
 * Hook for checking specific collaboration permissions
 */
export function useCollaborationPermissionCheck(permission: keyof CollaborationPermissions) {
  const { canPerformCollaborationAction } = useCollaborationPermissionsContext();
  return canPerformCollaborationAction(permission);
}

/**
 * Hook for checking resource-specific permissions
 */
export function useResourcePermissionCheck(resourceType: 'task' | 'project' | 'document' | 'discussion') {
  const { canCollaborateOnResource } = useCollaborationPermissionsContext();
  return canCollaborateOnResource(resourceType);
}

export default CollaborationPermissionsProvider;