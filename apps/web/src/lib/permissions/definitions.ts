/**
 * 🛡️ Permission Definitions & Role Permissions Matrix
 *
 * Central configuration for all role permissions and hierarchies.
 * Used by both frontend components and backend middleware.
 *
 * @epic-1.1-subtasks - Team leads have special subtask management powers
 * @epic-2.1-files - File access based on role
 * @epic-3.2-time - Time tracking permissions by role
 */

import type { UserRole, AllPermissions } from "./types";
import {
  BACKEND_ROLE_PERMISSIONS,
  FRONTEND_ONLY_ROLE_PERMISSIONS,
} from "./backend-matrix.generated";

/**
 * Role hierarchy levels - higher numbers = more authority.
 *
 * 🚨 Must match apps/api/src/constants/rbac.ts. It previously did not, in two
 * ways: it was ordered by scope rather than authority (so `project-viewer: 3`
 * outranked `team-lead: 2`, and `workspace-viewer: 5` outranked
 * `project-manager: 4` — read-only roles clearing manager-level bars), and it
 * capped `workspace-manager` at 7 where the backend uses 10. `hasMinimumRole`
 * reads this, so the UI gated features on a different ladder than the server.
 *
 * Ordering rule: read-only roles rank below any role that can write at the
 * same scope. A viewer never outranks a manager.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest: 0,
  stakeholder: 1,
  contractor: 1,
  client: 1,
  "project-viewer": 1, // read-only
  member: 2,
  "workspace-viewer": 2, // read-only, workspace-wide
  "team-lead": 3, // @epic-1.1-subtasks - Enhanced subtask powers
  "project-manager": 4,
  "department-head": 6,
  "workspace-manager": 10,
};

/**
 * Base permissions for guest role (all false)
 */
const BASE_PERMISSIONS: Omit<AllPermissions, "role"> = {
  // Workspace permissions
  canManageWorkspace: false,
  canViewWorkspace: false,
  canDeleteWorkspace: false,
  canManageWorkspaceSettings: false,
  canManageBilling: false,
  canViewBillingHistory: false,
  canChangePlan: false,
  canInviteUsers: false,
  canRemoveUsers: false,
  canManageRoles: false,
  canAssignDepartmentHeads: false,
  canViewAllUsers: false,
  canViewWorkspaceAnalytics: false,
  canExportWorkspaceData: false,
  canCreateWorkspaceReports: false,
  canScheduleReports: false,
  canManageIntegrations: false,
  canAccessWorkspaceAPI: false,
  canManageWorkspaceSecurity: false,
  canViewAuditLogs: false,
  canManageBackups: false,

  // Project permissions
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canArchiveProjects: false,
  canCloneProjects: false,
  canManageProjectSettings: false,
  canManageProjectTeam: false,
  canAssignProjectManagers: false,
  canInviteToProject: false,
  canRemoveFromProject: false,
  canViewAllProjects: false,
  canViewAssignedProjects: false,
  canViewProjectDetails: false,
  canAccessProjectFiles: false,
  canViewProjectAnalytics: false,
  canViewProjectReports: false,
  canExportProjectData: false,
  canViewProjectBudget: false,
  canManageProjectBudget: false,
  canAccessProjectChat: false,
  canCreateProjectAnnouncements: false,
  canModerateProjectDiscussion: false,

  // Task permissions
  canCreateTasks: false,
  canEditTasks: false,
  canDeleteTasks: false,
  canViewTasks: false,
  canViewAllTasks: false,
  canAssignTasks: false,
  canReassignTasks: false,
  canAssignTasksToMembers: false,
  canUnassignTasks: false,
  canCreateSubtasks: false,
  canEditSubtasks: false,
  canDeleteSubtasks: false,
  canAssignSubtasks: false,
  canManageSubtaskHierarchy: false,
  canSetTaskPriority: false,
  canSetTaskDeadlines: false,
  canSetTaskStatus: false,
  canAddTaskLabels: false,
  canManageTaskDependencies: false,
  canCommentOnTasks: false,
  canMentionUsersInTasks: false,
  canAttachFilesToTasks: false,
  canLogTimeOnTasks: false,
  canBulkEditTasks: false,
  canBulkAssignTasks: false,
  canImportTasks: false,
  canExportTasks: false,

  // Team permissions
  canCreateTeams: false,
  canEditTeams: false,
  canDeleteTeams: false,
  canArchiveTeams: false,
  canAddMembers: false,
  canRemoveMembers: false,
  canInviteMembers: false,
  canManageTeamRoles: false,
  canViewTeamMembers: false,
  canAssignTeamLeads: false,
  canMentorMembers: false,
  canViewTeamProgress: false,
  canManageTeamCapacity: false,
  canCreateTeamChannels: false,
  canManageTeamChannels: false,
  canModerateTeamChat: false,
  canCreateTeamAnnouncements: false,

  // Communication permissions
  canSendMessages: false,
  canSendDirectMessages: false,
  canMentionUsers: false,
  canReactToMessages: false,
  canCreateChannels: false,
  canJoinChannels: false,
  canLeaveChannels: false,
  canManageChannels: false,
  canArchiveChannels: false,
  canModerateChat: false,
  canDeleteMessages: false,
  canPinMessages: false,
  canManageChannelPermissions: false,
  canStartVideoCall: false,
  canShareScreen: false,
  canRecordMeetings: false,
  canScheduleMeetings: false,

  // Resource permissions
  canUploadFiles: false,
  canDownloadFiles: false,
  canDeleteFiles: false,
  canOrganizeFiles: false,
  canShareFiles: false,
  canManageFileVersions: false,
  canViewCalendar: false,
  canCreateEvents: false,
  canEditEvents: false,
  canDeleteEvents: false,
  canManageAvailability: false,
  canBookResources: false,
  canManageTimeOff: false,
  canTrackTime: false,
  canViewTimeTracking: false,
  canEditTimeEntries: false,
  canApproveTimeEntries: false,
  canManageTimeTracking: false,
  canAccessKnowledgeBase: false,
  canCreateDocuments: false,
  canEditDocuments: false,
  canDeleteDocuments: false,
  canManageDocumentPermissions: false,

  // Analytics permissions
  canViewAnalytics: false,
  canViewPersonalAnalytics: false,
  canViewTeamAnalytics: false,
  canViewTeamPerformance: false,
  canViewIndividualPerformance: false,
  canViewProductivityMetrics: false,
  canViewBudgetAnalytics: false,
  canViewTimeReports: false,
  canCreateReports: false,
  canCustomizeReports: false,
  canExportReports: false,
  canShareReports: false,
  canAccessAdvancedAnalytics: false,
  canCreateDashboards: false,
  canManageDashboards: false,
  canCreateCustomMetrics: false,

  // System permissions
  canAccessSystemSettings: false,
  canManageSystemIntegrations: false,
  canManageAPIAccess: false,
  canViewSystemHealth: false,
  canManageSystemBackups: false,
  canManageSecurity: false,
  canViewSecurityLogs: false,
  canManageSSO: false,
  canManage2FA: false,
  canManageDataRetention: false,
  canAccessAuditLogs: false,
  canManageCompliance: false,
  canExportAuditData: false,
  canManageDataGovernance: false,
  canAccessBetaFeatures: false,
  canUseAI: false,
  canManageAISettings: false,
  canAccessDeveloperTools: false,
};

/**
 * Complete role permissions matrix.
 *
 * 🚨 This was a hand-maintained copy of the backend's matrix and had drifted
 * to 290 disagreements across the 11 roles — 231 of them cases where the UI
 * granted a permission the server denies, i.e. the app offered actions that
 * would be refused. It is now COMPOSED so the backend always wins:
 *
 *   BASE_PERMISSIONS        every key false — guarantees no key is `undefined`
 *   FRONTEND_ONLY_...       the 23 UI-only keys (chat, video, billing,
 *                           dashboards) the backend has no concept of
 *   BACKEND_ROLE_PERMISSIONS  the authority — mirrors what the server enforces
 *
 * Order matters: the backend layer is applied last, so it overrides anything
 * the earlier layers said about a shared key. To change a real permission,
 * change apps/api/src/constants/rbac.ts and regenerate the mirror.
 */
export const ROLE_PERMISSIONS: Record<UserRole, AllPermissions> =
  Object.fromEntries(
    (Object.keys(BACKEND_ROLE_PERMISSIONS) as UserRole[]).map((role) => [
      role,
      {
        ...BASE_PERMISSIONS,
        ...FRONTEND_ONLY_ROLE_PERMISSIONS[role],
        ...BACKEND_ROLE_PERMISSIONS[role],
        role,
      } as AllPermissions,
    ]),
  ) as Record<UserRole, AllPermissions>;

/**
 * Check if one role is higher than another in hierarchy
 */
export function isRoleHigher(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Check if a role has minimum level access
 */
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(role: UserRole): AllPermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.guest;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: keyof AllPermissions,
): boolean {
  const rolePermissions = getRolePermissions(role);
  return rolePermissions[permission] === true;
}
