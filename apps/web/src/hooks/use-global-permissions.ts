/**
 * @epic-1.1-rbac Global permissions hook for application-wide access control
 * 
 * Hook for getting global permissions that apply across all contexts.
 * Uses the RBAC system to determine user permissions.
 */

import { useMemo } from "react";
import { useRBACAuth } from "@/lib/permissions";
import type { AllPermissions } from "@/lib/permissions/types";

/**
 * Hook for accessing global (workspace-independent) permissions
 * @returns Global permissions object with all available permissions
 */
export function useGlobalPermissions(): AllPermissions {
  const { user } = useRBACAuth();

  return useMemo(() => {
    // If no user, return no permissions
    if (!user) {
      return {
        // Core permissions
        canViewWorkspace: false,
        canManageWorkspace: false,
        canViewAllProjects: false,
        canCreateProjects: false,
        canEditProjects: false,
        canDeleteProjects: false,
        canArchiveProjects: false,
        canManageProjectSettings: false,
        canManageProjectTeam: false,
        canCreateTeams: false,
        canEditTeams: false,
        canDeleteTeams: false,
        canManageTeamRoles: false,
        canAssignTeamLeads: false,
        canCreateTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        canAssignTasks: false,
        canInviteUsers: false,
        canRemoveUsers: false,
        canManageRoles: false,
        canViewAnalytics: false,
        canCreateReports: false,
        canExportData: false,
        canAccessSettings: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,

        // Communication permissions
        canCreateChannels: false,
        canManageChannels: false,
        canDeleteMessages: false,
        canModerateChat: false,
        canStartVideoCall: false,
        canShareScreen: false,
        canUploadFiles: false,
        canManageFiles: false,
        canDeleteFiles: false,
        canManageNotifications: false,

        // Special permissions
        canManageBilling: false,
        canAccessAPI: false,
        canConfigureWebhooks: false,
        canManageAutomation: false
      };
    }

    // Get base permissions from user role
    const rolePermissions = {
      // Core permissions
      canViewWorkspace: true, // All authenticated users can view
      canManageWorkspace: ["workspace-manager"].includes(user.role),
      canViewAllProjects: ["workspace-manager", "department-head", "project-manager"].includes(user.role),
      canCreateProjects: ["workspace-manager", "department-head", "project-manager"].includes(user.role),
      canEditProjects: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canDeleteProjects: ["workspace-manager"].includes(user.role),
      canArchiveProjects: ["workspace-manager", "department-head"].includes(user.role),
      canManageProjectSettings: ["workspace-manager", "department-head", "project-manager"].includes(user.role),
      canManageProjectTeam: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canCreateTeams: ["workspace-manager", "department-head"].includes(user.role),
      canEditTeams: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canDeleteTeams: ["workspace-manager"].includes(user.role),
      canManageTeamRoles: ["workspace-manager", "department-head"].includes(user.role),
      canAssignTeamLeads: ["workspace-manager", "department-head"].includes(user.role),
      canCreateTasks: ["workspace-manager", "department-head", "project-manager", "team-lead", "member"].includes(user.role),
      canEditTasks: ["workspace-manager", "department-head", "project-manager", "team-lead", "member"].includes(user.role),
      canDeleteTasks: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canAssignTasks: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canInviteUsers: ["workspace-manager", "department-head"].includes(user.role),
      canRemoveUsers: ["workspace-manager"].includes(user.role),
      canManageRoles: ["workspace-manager"].includes(user.role),
      canViewAnalytics: ["workspace-manager", "department-head", "project-manager"].includes(user.role),
      canCreateReports: ["workspace-manager", "department-head", "project-manager"].includes(user.role),
      canExportData: ["workspace-manager", "department-head", "project-manager"].includes(user.role),
      canAccessSettings: ["workspace-manager"].includes(user.role),
      canManageIntegrations: ["workspace-manager"].includes(user.role),
      canViewAuditLogs: ["workspace-manager"].includes(user.role),

      // Communication permissions
      canCreateChannels: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canManageChannels: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canDeleteMessages: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canModerateChat: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canStartVideoCall: ["workspace-manager", "department-head", "project-manager", "team-lead", "member"].includes(user.role),
      canShareScreen: ["workspace-manager", "department-head", "project-manager", "team-lead", "member"].includes(user.role),
      canUploadFiles: ["workspace-manager", "department-head", "project-manager", "team-lead", "member"].includes(user.role),
      canManageFiles: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),
      canDeleteFiles: ["workspace-manager", "department-head", "project-manager"].includes(user.role),
      canManageNotifications: ["workspace-manager", "department-head", "project-manager", "team-lead"].includes(user.role),

      // Special permissions
      canManageBilling: ["workspace-manager"].includes(user.role),
      canAccessAPI: ["workspace-manager"].includes(user.role),
      canConfigureWebhooks: ["workspace-manager"].includes(user.role),
      canManageAutomation: ["workspace-manager"].includes(user.role)
    };

    // Apply any custom permission overrides from user object
    return {
      ...rolePermissions,
      ...(user.permissions || {})
    };
  }, [user]);
}

export default useGlobalPermissions;
