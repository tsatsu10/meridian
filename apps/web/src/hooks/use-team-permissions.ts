/**
 * @epic-1.1-rbac Team-specific permissions hook
 * 
 * Custom hook for managing team-specific permissions, integrating with the RBAC system
 */

import { useMemo } from 'react';
import { useUser } from './use-user';
import { useWorkspaceStore } from '@/store/workspace';

// Define permission types
export type Permission = 
  | 'canSendMessages'
  | 'canSendFiles'
  | 'canCreateChannels'
  | 'canManageChannels'
  | 'canStartDirectMessages'
  | 'canStartCalls'
  | 'canPinMessages'
  | 'canDeleteMessages'
  | 'canModerateMessages'
  | 'canInviteMembers'
  | 'canRemoveMembers'
  | 'canManageRoles';

// Define role types
export type Role = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

// Permission mapping for each role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'canSendMessages',
    'canSendFiles',
    'canCreateChannels',
    'canManageChannels',
    'canStartDirectMessages',
    'canStartCalls',
    'canPinMessages',
    'canDeleteMessages',
    'canModerateMessages',
    'canInviteMembers',
    'canRemoveMembers',
    'canManageRoles'
  ],
  admin: [
    'canSendMessages',
    'canSendFiles',
    'canCreateChannels',
    'canManageChannels',
    'canStartDirectMessages',
    'canStartCalls',
    'canPinMessages',
    'canDeleteMessages',
    'canModerateMessages',
    'canInviteMembers',
    'canRemoveMembers'
  ],
  moderator: [
    'canSendMessages',
    'canSendFiles',
    'canCreateChannels',
    'canStartDirectMessages',
    'canStartCalls',
    'canPinMessages',
    'canDeleteMessages',
    'canModerateMessages'
  ],
  member: [
    'canSendMessages',
    'canSendFiles',
    'canStartDirectMessages',
    'canStartCalls'
  ],
  guest: [
    'canSendMessages',
    'canStartDirectMessages'
  ]
};

interface UseTeamPermissionsOptions {
  workspaceId?: string;
  teamId?: string;
  channelId?: string;
}

export const useTeamPermissions = (workspaceId?: string) => {
  const { user } = useUser();
  const { workspace } = useWorkspaceStore();

  const userRole = useMemo(() => {
    if (!user || !workspace) return 'guest';

    // Check if user is workspace owner
    if (workspace.ownerEmail === user.email) {
      return 'owner';
    }

    // Check workspace user role
    const workspaceUser = workspace.users?.find(u => u.email === user.email);
    if (workspaceUser) {
      return workspaceUser.role as Role;
    }

    return 'guest';
  }, [user, workspace]);

  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!userRole) return false;
      
      const permissions = ROLE_PERMISSIONS[userRole] || [];
      return permissions.includes(permission);
    };
  }, [userRole]);

  const getUserRole = useMemo(() => {
    return (): Role => userRole;
  }, [userRole]);

  const getAllPermissions = useMemo(() => {
    return (): Permission[] => {
      if (!userRole) return [];
      return ROLE_PERMISSIONS[userRole] || [];
    };
  }, [userRole]);

  const canPerformAction = useMemo(() => {
    return (action: string, resource?: string): boolean => {
      // Map actions to permissions
      const actionPermissionMap: Record<string, Permission> = {
        'send_message': 'canSendMessages',
        'send_file': 'canSendFiles',
        'create_channel': 'canCreateChannels',
        'manage_channel': 'canManageChannels',
        'start_dm': 'canStartDirectMessages',
        'start_call': 'canStartCalls',
        'pin_message': 'canPinMessages',
        'delete_message': 'canDeleteMessages',
        'moderate': 'canModerateMessages',
        'invite_member': 'canInviteMembers',
        'remove_member': 'canRemoveMembers',
        'manage_roles': 'canManageRoles'
      };

      const permission = actionPermissionMap[action];
      if (!permission) return false;

      return hasPermission(permission);
    };
  }, [hasPermission]);

  return {
    hasPermission,
    getUserRole,
    getAllPermissions,
    canPerformAction,
    userRole,
    isOwner: userRole === 'owner',
    isAdmin: userRole === 'admin' || userRole === 'owner',
    isModerator: userRole === 'moderator' || userRole === 'admin' || userRole === 'owner',
    isMember: userRole === 'member' || userRole === 'moderator' || userRole === 'admin' || userRole === 'owner'
  };
};
