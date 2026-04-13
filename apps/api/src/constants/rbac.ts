/**
 * 🛡️ RBAC Constants for API
 * 
 * Shared role permissions and hierarchy definitions
 */

import type { UserRole } from "../types/rbac";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  "guest": 0,
  "stakeholder": 1,
  "contractor": 1,
  "client": 1,
  "member": 1,
  "team-lead": 2,
  "project-viewer": 3,
  "project-manager": 4,
  "workspace-viewer": 5,
  "department-head": 6,
  "workspace-manager": 10, // 🏆 OWNER LEVEL - Highest authority with all powers
};

export const ROLE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  "guest": {
    canViewPublicProjects: true,
  },
  "stakeholder": {
    canViewPublicProjects: true,
    canViewReports: true,
  },
  "contractor": {
    canViewPublicProjects: true,
    canViewAssignedTasks: true,
    canUpdateAssignedTasks: true,
  },
  "client": {
    canViewPublicProjects: true,
    canViewReports: true,
    canCreateFeedback: true,
  },
  "member": {
    canViewProjects: true,
    canViewTasks: true,
    canUpdateOwnTasks: true,
    canCreateComments: true,
    canViewTeam: true,
  },
  "team-lead": {
    canViewProjects: true,
    canCreateTasks: true,
    canUpdateTasks: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canCreateSubtasks: true,
    canEditSubtasks: true,
    canDeleteSubtasks: true,
    canAssignSubtasks: true,
    canManageSubtaskHierarchy: true,
    canViewTeam: true,
    canManageTeamMembers: true,
  },
  "project-viewer": {
    canViewProjects: true,
    canViewTasks: true,
    canViewReports: true,
  },
  "project-manager": {
    canViewProjects: true,
    canCreateProjects: true,
    canUpdateProjects: true,
    canDeleteProjects: true,
    canManageProjectMembers: true,
    canCreateTasks: true,
    canUpdateTasks: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canCreateSubtasks: true,
    canEditSubtasks: true,
    canDeleteSubtasks: true,
    canAssignSubtasks: true,
    canManageSubtaskHierarchy: true,
  },
  "workspace-viewer": {
    canViewWorkspace: true,
    canViewProjects: true,
    canViewTasks: true,
    canViewReports: true,
    canViewTeam: true,
  },
  "department-head": {
    canViewWorkspace: true,
    canManageDepartment: true,
    canViewProjects: true,
    canCreateProjects: true,
    canUpdateProjects: true,
    canManageProjectMembers: true,
    canCreateTasks: true,
    canUpdateTasks: true,
    canDeleteTasks: true,
    canAssignTasks: true,
    canCreateSubtasks: true,
    canEditSubtasks: true,
    canDeleteSubtasks: true,
    canAssignSubtasks: true,
    canManageSubtaskHierarchy: true,
    canViewTeam: true,
    canManageTeamMembers: true,
  },
  "workspace-manager": {
    // 🏆 === WORKSPACE OWNER POWERS === 🏆
    // This role has ALL permissions - equivalent to workspace owner
    // Can perform any action within the workspace without restrictions
    // Workspace Management
    canViewWorkspace: true,
    canEditWorkspace: true,
    canDeleteWorkspace: true,
    canManageWorkspace: true,
    canManageWorkspaceSettings: true,
    canManageWorkspaceMembers: true,
    canManageWorkspaceSecurity: true,
    canManageBilling: true,
    canViewBillingHistory: true,
    canChangePlan: true,
    canAccessWorkspaceAPI: true,
    canManageIntegrations: true,
    canManageBackups: true,
    canExportWorkspaceData: true,
    canViewAuditLogs: true,
    canAccessAuditLogs: true,
    canExportAuditData: true,
    canManageDataGovernance: true,
    canManageDataRetention: true,
    canManageCompliance: true,
    
    // User & Role Management
    canManageRoles: true,
    canInviteUsers: true,
    canRemoveUsers: true,
    canViewAllUsers: true,
    canAssignDepartmentHeads: true,
    canManageSSO: true,
    canManage2FA: true,
    canManageSecurity: true,
    canViewSecurityLogs: true,
    
    // Project Management
    canViewProjects: true,
    canViewAllProjects: true,
    canViewAssignedProjects: true,
    canViewProjectDetails: true,
    canCreateProjects: true,
    canEditProjects: true,
    canUpdateProjects: true,
    canDeleteProjects: true,
    canArchiveProjects: true,
    canCloneProjects: true,
    canManageProjectSettings: true,
    canManageProjectMembers: true,
    canManageProjectTeam: true,
    canAssignProjectManagers: true,
    canInviteToProject: true,
    canRemoveFromProject: true,
    canAccessProjectFiles: true,
    canViewProjectBudget: true,
    canManageProjectBudget: true,
    canAccessProjectChat: true,
    canCreateProjectAnnouncements: true,
    canModerateProjectDiscussion: true,
    
    // Task Management
    canCreateTasks: true,
    canEditTasks: true,
    canUpdateTasks: true,
    canDeleteTasks: true,
    canViewTasks: true,
    canViewAllTasks: true,
    canAssignTasks: true,
    canReassignTasks: true,
    canAssignTasksToMembers: true,
    canUnassignTasks: true,
    canCreateSubtasks: true,
    canEditSubtasks: true,
    canDeleteSubtasks: true,
    canAssignSubtasks: true,
    canManageSubtaskHierarchy: true,
    canSetTaskPriority: true,
    canSetTaskDeadlines: true,
    canSetTaskStatus: true,
    canAddTaskLabels: true,
    canManageTaskDependencies: true,
    canCommentOnTasks: true,
    canMentionUsersInTasks: true,
    canAttachFilesToTasks: true,
    canLogTimeOnTasks: true,
    canBulkEditTasks: true,
    canBulkAssignTasks: true,
    canImportTasks: true,
    canExportTasks: true,
    
    // Team Management
    canViewTeam: true,
    canViewTeamMembers: true,
    canManageTeamMembers: true,
    canCreateTeams: true,
    canEditTeams: true,
    canDeleteTeams: true,
    canArchiveTeams: true,
    canAddMembers: true,
    canRemoveMembers: true,
    canInviteMembers: true,
    canManageTeamRoles: true,
    canAssignTeamLeads: true,
    canMentorMembers: true,
    canViewTeamProgress: true,
    canManageTeamCapacity: true,
    canCreateTeamChannels: true,
    canManageTeamChannels: true,
    canModerateTeamChat: true,
    canCreateTeamAnnouncements: true,
    
    // Communication
    canSendMessages: true,
    canSendDirectMessages: true,
    canMentionUsers: true,
    canReactToMessages: true,
    canCreateChannels: true,
    canJoinChannels: true,
    canLeaveChannels: true,
    canManageChannels: true,
    canArchiveChannels: true,
    canModerateChat: true,
    canDeleteMessages: true,
    canPinMessages: true,
    canManageChannelPermissions: true,
    canStartVideoCall: true,
    canShareScreen: true,
    canRecordMeetings: true,
    canScheduleMeetings: true,
    
    // Files & Documents
    canUploadFiles: true,
    canDownloadFiles: true,
    canDeleteFiles: true,
    canOrganizeFiles: true,
    canShareFiles: true,
    canManageFileVersions: true,
    canAccessKnowledgeBase: true,
    canCreateDocuments: true,
    canEditDocuments: true,
    canDeleteDocuments: true,
    canManageDocumentPermissions: true,
    
    // Calendar & Time
    canViewCalendar: true,
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: true,
    canManageAvailability: true,
    canBookResources: true,
    canManageTimeOff: true,
    canTrackTime: true,
    canViewTimeTracking: true,
    canEditTimeEntries: true,
    canApproveTimeEntries: true,
    canManageTimeTracking: true,
    
    // Analytics & Reporting
    canViewReports: true,
    canViewAnalytics: true,
    canViewPersonalAnalytics: true,
    canViewTeamAnalytics: true,
    canViewWorkspaceAnalytics: true,
    canViewTeamPerformance: true,
    canViewIndividualPerformance: true,
    canViewProductivityMetrics: true,
    canViewBudgetAnalytics: true,
    canViewTimeReports: true,
    canViewProjectAnalytics: true,
    canViewProjectReports: true,
    canCreateReports: true,
    canCreateWorkspaceReports: true,
    canCustomizeReports: true,
    canExportReports: true,
    canShareReports: true,
    canScheduleReports: true,
    canExportProjectData: true,
    canCreateDashboards: true,
    canAccessAdvancedAnalytics: true,
    canCreateCustomMetrics: true,
    
    // System & Advanced
    canManageSettings: true,
    canAccessSystemSettings: true,
    canManageSystemIntegrations: true,
    canManageAPIAccess: true,
    canViewSystemHealth: true,
    canManageSystemBackups: true,
    canAccessBetaFeatures: true,
    canUseAI: true,
    canManageAISettings: true,
    canAccessDeveloperTools: true,
    
    // Basic permissions for completeness
    canViewPublicProjects: true,
    canUpdateOwnTasks: true,
    canCreateComments: true,
    canCreateFeedback: true,
  },
};

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(role: UserRole): Record<string, boolean> {
  return ROLE_PERMISSIONS[role] || {};
}

/**
 * Check if one role is higher than another in hierarchy
 */
export function isRoleHigher(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: UserRole[]): UserRole {
  return roles.reduce((highest, current) => 
    isRoleHigher(current, highest) ? current : highest, 
    "guest"
  );
} 
