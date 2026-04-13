// @epic-3.1-communication: Core permissions hook for communication features
// @persona-sarah, @persona-david, @persona-mike: PM, Team Lead, and Developer communication needs
import { useMemo } from "react";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { useWorkspacePermission } from "./useWorkspacePermission";

export interface ChatPermissions {
  // Core chat permissions expected by ChatInterface
  canSendMessages: boolean;
  canShareFiles: boolean;
  canStartVideoCall: boolean;
  
  // Extended chat permissions
  canEditOwnMessages: boolean;
  canDeleteOwnMessages: boolean;
  canEditAnyMessage: boolean;
  canDeleteAnyMessage: boolean;
  canPinMessages: boolean;
  canCreateChannels: boolean;
  canManageChannels: boolean;
  canInviteToChannels: boolean;
  canRemoveFromChannels: boolean;
  canMentionUsers: boolean;
  canReactToMessages: boolean;
  canCreateThreads: boolean;
  canModerateChat: boolean;
  canViewChatHistory: boolean;
  canExportChatHistory: boolean;
  
  // File and media permissions
  canUploadFiles: boolean;
  canUploadImages: boolean;
  canUploadVideos: boolean;
  canShareScreen: boolean;
  canRecordCalls: boolean;
  
  // Notification and presence permissions
  canSeeOnlineStatus: boolean;
  canSetPresence: boolean;
  canReceiveNotifications: boolean;
  canManageNotificationSettings: boolean;
}

export interface GeneralPermissions extends ChatPermissions {
  // Workspace level permissions
  canViewWorkspace: boolean;
  canEditWorkspace: boolean;
  canManageWorkspaceMembers: boolean;
  canManageWorkspaceSettings: boolean;
  
  // Project permissions
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectMembers: boolean;
  
  // Task permissions
  canViewTasks: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canAssignTasks: boolean;
  
  // Team permissions
  canViewTeams: boolean;
  canCreateTeams: boolean;
  canManageTeams: boolean;
  
  // Analytics and reporting
  canViewAnalytics: boolean;
  canCreateReports: boolean;
  canExportData: boolean;
  
  // System permissions
  canAccessSettings: boolean;
  canManageIntegrations: boolean;
  canViewAuditLogs: boolean;
}

/**
 * Hook for checking user permissions across the application
 * Integrates with workspace permissions and RBAC system
 */
export function usePermissions(): GeneralPermissions {
  const { user } = useAuth();
  const workspacePermission = useWorkspacePermission();

  return useMemo(() => {
    // If no user or no workspace access, return minimal permissions
    if (!user || !workspacePermission.hasWorkspaceAccess) {
      return {
        // Basic read-only permissions for guests
        canSendMessages: false,
        canShareFiles: false,
        canStartVideoCall: false,
        canEditOwnMessages: false,
        canDeleteOwnMessages: false,
        canEditAnyMessage: false,
        canDeleteAnyMessage: false,
        canPinMessages: false,
        canCreateChannels: false,
        canManageChannels: false,
        canInviteToChannels: false,
        canRemoveFromChannels: false,
        canMentionUsers: false,
        canReactToMessages: false,
        canCreateThreads: false,
        canModerateChat: false,
        canViewChatHistory: false,
        canExportChatHistory: false,
        canUploadFiles: false,
        canUploadImages: false,
        canUploadVideos: false,
        canShareScreen: false,
        canRecordCalls: false,
        canSeeOnlineStatus: true,
        canSetPresence: false,
        canReceiveNotifications: false,
        canManageNotificationSettings: false,
        canViewWorkspace: false,
        canEditWorkspace: false,
        canManageWorkspaceMembers: false,
        canManageWorkspaceSettings: false,
        canViewProjects: false,
        canCreateProjects: false,
        canEditProjects: false,
        canDeleteProjects: false,
        canManageProjectMembers: false,
        canViewTasks: false,
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canAssignTasks: false,
        canViewTeams: false,
        canCreateTeams: false,
        canManageTeams: false,
        canViewAnalytics: false,
        canCreateReports: false,
        canExportData: false,
        canAccessSettings: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
    }

    // Check if user is owner or has elevated permissions
    const isOwner = workspacePermission.isOwner;
    const isDemoUser = workspacePermission.isDemoUser;
    const hasBasicAccess = workspacePermission.checkPermission("member");
    const hasAdvancedAccess = workspacePermission.checkPermission("admin") || isOwner;

    // Demo users get enhanced permissions for testing
    if (isDemoUser) {
      return {
        // Chat permissions - full access for demo
        canSendMessages: true,
        canShareFiles: true,
        canStartVideoCall: true,
        canEditOwnMessages: true,
        canDeleteOwnMessages: true,
        canEditAnyMessage: true,
        canDeleteAnyMessage: true,
        canPinMessages: true,
        canCreateChannels: true,
        canManageChannels: true,
        canInviteToChannels: true,
        canRemoveFromChannels: true,
        canMentionUsers: true,
        canReactToMessages: true,
        canCreateThreads: true,
        canModerateChat: true,
        canViewChatHistory: true,
        canExportChatHistory: true,
        canUploadFiles: true,
        canUploadImages: true,
        canUploadVideos: true,
        canShareScreen: true,
        canRecordCalls: true,
        canSeeOnlineStatus: true,
        canSetPresence: true,
        canReceiveNotifications: true,
        canManageNotificationSettings: true,
        // General permissions - enhanced for demo
        canViewWorkspace: true,
        canEditWorkspace: true,
        canManageWorkspaceMembers: true,
        canManageWorkspaceSettings: true,
        canViewProjects: true,
        canCreateProjects: true,
        canEditProjects: true,
        canDeleteProjects: true,
        canManageProjectMembers: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canAssignTasks: true,
        canViewTeams: true,
        canCreateTeams: true,
        canManageTeams: true,
        canViewAnalytics: true,
        canCreateReports: true,
        canExportData: true,
        canAccessSettings: true,
        canManageIntegrations: true,
        canViewAuditLogs: true,
      };
    }

    // Owner permissions - full access
    if (isOwner) {
      return {
        // Chat permissions - full access
        canSendMessages: true,
        canShareFiles: true,
        canStartVideoCall: true,
        canEditOwnMessages: true,
        canDeleteOwnMessages: true,
        canEditAnyMessage: true,
        canDeleteAnyMessage: true,
        canPinMessages: true,
        canCreateChannels: true,
        canManageChannels: true,
        canInviteToChannels: true,
        canRemoveFromChannels: true,
        canMentionUsers: true,
        canReactToMessages: true,
        canCreateThreads: true,
        canModerateChat: true,
        canViewChatHistory: true,
        canExportChatHistory: true,
        canUploadFiles: true,
        canUploadImages: true,
        canUploadVideos: true,
        canShareScreen: true,
        canRecordCalls: true,
        canSeeOnlineStatus: true,
        canSetPresence: true,
        canReceiveNotifications: true,
        canManageNotificationSettings: true,
        // General permissions - full access
        canViewWorkspace: true,
        canEditWorkspace: true,
        canManageWorkspaceMembers: true,
        canManageWorkspaceSettings: true,
        canViewProjects: true,
        canCreateProjects: true,
        canEditProjects: true,
        canDeleteProjects: true,
        canManageProjectMembers: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canAssignTasks: true,
        canViewTeams: true,
        canCreateTeams: true,
        canManageTeams: true,
        canViewAnalytics: true,
        canCreateReports: true,
        canExportData: true,
        canAccessSettings: true,
        canManageIntegrations: true,
        canViewAuditLogs: true,
      };
    }

    // Advanced user permissions (admin level)
    if (hasAdvancedAccess) {
      return {
        // Chat permissions - most access
        canSendMessages: true,
        canShareFiles: true,
        canStartVideoCall: true,
        canEditOwnMessages: true,
        canDeleteOwnMessages: true,
        canEditAnyMessage: true,
        canDeleteAnyMessage: true,
        canPinMessages: true,
        canCreateChannels: true,
        canManageChannels: true,
        canInviteToChannels: true,
        canRemoveFromChannels: true,
        canMentionUsers: true,
        canReactToMessages: true,
        canCreateThreads: true,
        canModerateChat: true,
        canViewChatHistory: true,
        canExportChatHistory: false, // Restricted for non-owners
        canUploadFiles: true,
        canUploadImages: true,
        canUploadVideos: true,
        canShareScreen: true,
        canRecordCalls: true,
        canSeeOnlineStatus: true,
        canSetPresence: true,
        canReceiveNotifications: true,
        canManageNotificationSettings: true,
        // General permissions - elevated access
        canViewWorkspace: true,
        canEditWorkspace: false, // Owner only
        canManageWorkspaceMembers: true,
        canManageWorkspaceSettings: false, // Owner only
        canViewProjects: true,
        canCreateProjects: true,
        canEditProjects: true,
        canDeleteProjects: true,
        canManageProjectMembers: true,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true,
        canDeleteTasks: true,
        canAssignTasks: true,
        canViewTeams: true,
        canCreateTeams: true,
        canManageTeams: true,
        canViewAnalytics: true,
        canCreateReports: true,
        canExportData: false, // Owner only
        canAccessSettings: true,
        canManageIntegrations: false, // Owner only
        canViewAuditLogs: false, // Owner only
      };
    }

    // Basic member permissions
    if (hasBasicAccess) {
      return {
        // Chat permissions - standard access
        canSendMessages: true,
        canShareFiles: true,
        canStartVideoCall: true,
        canEditOwnMessages: true,
        canDeleteOwnMessages: true,
        canEditAnyMessage: false,
        canDeleteAnyMessage: false,
        canPinMessages: false,
        canCreateChannels: false,
        canManageChannels: false,
        canInviteToChannels: false,
        canRemoveFromChannels: false,
        canMentionUsers: true,
        canReactToMessages: true,
        canCreateThreads: true,
        canModerateChat: false,
        canViewChatHistory: true,
        canExportChatHistory: false,
        canUploadFiles: true,
        canUploadImages: true,
        canUploadVideos: false, // Restricted for basic users
        canShareScreen: true,
        canRecordCalls: false,
        canSeeOnlineStatus: true,
        canSetPresence: true,
        canReceiveNotifications: true,
        canManageNotificationSettings: true,
        // General permissions - basic access
        canViewWorkspace: true,
        canEditWorkspace: false,
        canManageWorkspaceMembers: false,
        canManageWorkspaceSettings: false,
        canViewProjects: true,
        canCreateProjects: false,
        canEditProjects: false,
        canDeleteProjects: false,
        canManageProjectMembers: false,
        canViewTasks: true,
        canCreateTasks: true,
        canEditTasks: true, // Can edit own tasks
        canDeleteTasks: false,
        canAssignTasks: false,
        canViewTeams: true,
        canCreateTeams: false,
        canManageTeams: false,
        canViewAnalytics: false,
        canCreateReports: false,
        canExportData: false,
        canAccessSettings: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
    }

    // Fallback to minimal permissions
    return {
      canSendMessages: false,
      canShareFiles: false,
      canStartVideoCall: false,
      canEditOwnMessages: false,
      canDeleteOwnMessages: false,
      canEditAnyMessage: false,
      canDeleteAnyMessage: false,
      canPinMessages: false,
      canCreateChannels: false,
      canManageChannels: false,
      canInviteToChannels: false,
      canRemoveFromChannels: false,
      canMentionUsers: false,
      canReactToMessages: false,
      canCreateThreads: false,
      canModerateChat: false,
      canViewChatHistory: false,
      canExportChatHistory: false,
      canUploadFiles: false,
      canUploadImages: false,
      canUploadVideos: false,
      canShareScreen: false,
      canRecordCalls: false,
      canSeeOnlineStatus: true,
      canSetPresence: false,
      canReceiveNotifications: false,
      canManageNotificationSettings: false,
      canViewWorkspace: false,
      canEditWorkspace: false,
      canManageWorkspaceMembers: false,
      canManageWorkspaceSettings: false,
      canViewProjects: false,
      canCreateProjects: false,
      canEditProjects: false,
      canDeleteProjects: false,
      canManageProjectMembers: false,
      canViewTasks: false,
      canCreateTasks: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canAssignTasks: false,
      canViewTeams: false,
      canCreateTeams: false,
      canManageTeams: false,
      canViewAnalytics: false,
      canCreateReports: false,
      canExportData: false,
      canAccessSettings: false,
      canManageIntegrations: false,
      canViewAuditLogs: false,
    };
  }, [user, workspacePermission]);
}

/**
 * Hook for checking specific permissions
 * @param permission - The permission key to check
 * @returns boolean indicating if user has the permission
 */
export function useHasPermission(permission: keyof GeneralPermissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}

/**
 * Hook for checking multiple permissions (AND logic)
 * @param permissions - Array of permission keys to check
 * @returns boolean indicating if user has ALL the permissions
 */
export function useHasPermissions(permissions: (keyof GeneralPermissions)[]): boolean {
  const userPermissions = usePermissions();
  return permissions.every(permission => userPermissions[permission]);
}

/**
 * Hook for checking multiple permissions (OR logic)
 * @param permissions - Array of permission keys to check
 * @returns boolean indicating if user has ANY of the permissions
 */
export function useHasAnyPermission(permissions: (keyof GeneralPermissions)[]): boolean {
  const userPermissions = usePermissions();
  return permissions.some(permission => userPermissions[permission]);
} 