/**
 * 🛡️ RBAC Constants for API
 *
 * Shared role permissions and hierarchy definitions
 */

import type { UserRole } from "../types/rbac";

/**
 * Authority ladder, used by `requireRole(role, minimum)` and by the
 * hierarchy ceiling in roles/lib/role-ceiling.ts.
 *
 * 🚨 This was ordered by scope rather than by authority, which put *viewers*
 * above *managers*: `project-viewer: 3` outranked `team-lead: 2`, and
 * `workspace-viewer: 5` outranked `project-manager: 4`. So
 * `requireRole("project-manager", true)` admitted a workspace-viewer — a
 * read-only role clearing a manager-level bar.
 *
 * That was largely inert while `requireRole` sampled one arbitrary assignment
 * and only `workspace-manager` held `canManageRoles`. It is now load-bearing:
 * `requireRole` binds to the MINIMUM level across a caller's assignments, so a
 * wrong ranking mis-binds the decision in both directions.
 *
 * Ordering rule: read-only roles rank below any role that can write at the
 * same scope. A viewer never outranks a manager.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  // Limited-participation roles: can see and act only where invited.
  stakeholder: 1,
  contractor: 1,
  client: 1,
  "project-viewer": 1, // read-only — was 3, above team-lead
  member: 2,
  "workspace-viewer": 2, // read-only, workspace-wide — was 5, above project-manager
  "team-lead": 3,
  "project-manager": 4,
  "department-head": 6,
  "workspace-manager": 10, // 🏆 OWNER LEVEL - Highest authority with all powers
};

export const ROLE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  guest: {
    canViewPublicProjects: true,
  },
  stakeholder: {
    canViewPublicProjects: true,
    canViewReports: true,
  },
  contractor: {
    canViewPublicProjects: true,
    canViewAssignedTasks: true,
    canUpdateAssignedTasks: true,
  },
  client: {
    canViewPublicProjects: true,
    canViewReports: true,
    canCreateFeedback: true,
  },
  member: {
    canViewProjects: true,
    canViewTasks: true,
    canUpdateOwnTasks: true,
    canCreateComments: true,
    canViewTeam: true,
    canViewProjectMilestones: true,
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
    canViewProjectMilestones: true,
    canManageProjectMilestones: true,
  },
  "project-viewer": {
    canViewProjects: true,
    canViewTasks: true,
    canViewReports: true,
    canViewProjectMilestones: true,
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
    canViewProjectMilestones: true,
    canManageProjectMilestones: true,
  },
  "workspace-viewer": {
    canViewWorkspace: true,
    canViewProjects: true,
    canViewTasks: true,
    canViewReports: true,
    canViewTeam: true,
    canViewProjectMilestones: true,
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
    canViewProjectMilestones: true,
    canManageProjectMilestones: true,
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
    canCreateProjectAnnouncements: true,
    canViewProjectMilestones: true,
    canManageProjectMilestones: true,

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
    canCreateTeamAnnouncements: true,

    // Communication
    canMentionUsers: true,
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
  return roles.reduce(
    (highest, current) => (isRoleHigher(current, highest) ? current : highest),
    "guest",
  );
}
