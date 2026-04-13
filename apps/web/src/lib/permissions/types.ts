/**
 * @epic-1.1-rbac Comprehensive Role-Based Access Control System
 * 
 * This file defines all user roles, permissions, and access control types
 * for the Meridian project management system.
 */

// ===== CORE ROLE DEFINITIONS =====

/**
 * Complete user role hierarchy for Meridian
 * Levels: 7 (highest) to 0 (lowest)
 */
export type UserRole = 
  // === WORKSPACE LEVEL ===
  | "workspace-manager"    // Level 7 - Creator, full workspace control
  | "department-head"      // Level 6 - Manages multiple projects across departments  
  | "workspace-viewer"     // Level 5 - Read-only workspace access
  
  // === PROJECT LEVEL ===
  | "project-manager"      // Level 4 - Full control over assigned projects
  | "project-viewer"       // Level 3 - Read-only project access
  
  // === TEAM LEVEL ===
  | "team-lead"           // Level 2 - Task assignment + subtask CRUD + member management
  | "member"              // Level 1 - Basic participation, task completion
  
  // === EXTERNAL/TEMPORARY ===
  | "client"              // External stakeholder with project visibility
  | "contractor"          // Temporary worker with specific project access
  | "stakeholder"         // Read-only visibility for decision makers
  | "guest";              // Minimal temporary access

/**
 * Role hierarchy mapping for permission comparisons
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  "workspace-manager": 7,
  "department-head": 6,
  "workspace-viewer": 5,
  "project-manager": 4,
  "project-viewer": 3,
  "team-lead": 2,
  "member": 1,
  "client": 1,
  "contractor": 1,
  "stakeholder": 1,
  "guest": 0,
};

// ===== PERMISSION INTERFACES =====

/**
 * Workspace-level permissions
 */
export interface WorkspacePermissions {
  // Core Workspace Management
  canManageWorkspace: boolean;
  canViewWorkspace: boolean;
  canDeleteWorkspace: boolean;
  canManageWorkspaceSettings: boolean;
  
  // Billing & Subscription
  canManageBilling: boolean;
  canViewBillingHistory: boolean;
  canChangePlan: boolean;
  
  // User & Role Management  
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canManageRoles: boolean;
  canAssignDepartmentHeads: boolean;
  canViewAllUsers: boolean;
  
  // Workspace Analytics & Reporting
  canViewWorkspaceAnalytics: boolean;
  canExportWorkspaceData: boolean;
  canCreateWorkspaceReports: boolean;
  canScheduleReports: boolean;
  
  // System & Integration
  canManageIntegrations: boolean;
  canAccessWorkspaceAPI: boolean;
  canManageWorkspaceSecurity: boolean;
  canViewAuditLogs: boolean;
  canManageBackups: boolean;
}

/**
 * Project-level permissions
 */
export interface ProjectPermissions {
  // Project Management
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canArchiveProjects: boolean;
  canCloneProjects: boolean;
  
  // Project Settings & Configuration
  canManageProjectSettings: boolean;
  canManageProjectTeam: boolean;
  canAssignProjectManagers: boolean;
  canInviteToProject: boolean;
  canRemoveFromProject: boolean;
  
  // Project Visibility & Access
  canViewAllProjects: boolean;
  canViewAssignedProjects: boolean;
  canViewProjectDetails: boolean;
  canAccessProjectFiles: boolean;
  
  // Project Analytics & Reporting
  canViewProjectAnalytics: boolean;
  canViewProjectReports: boolean;
  canExportProjectData: boolean;
  canViewProjectBudget: boolean;
  canManageProjectBudget: boolean;
  
  // Project Communication
  canAccessProjectChat: boolean;
  canCreateProjectAnnouncements: boolean;
  canModerateProjectDiscussion: boolean;
}

/**
 * Task-level permissions
 */
export interface TaskPermissions {
  // Task CRUD Operations
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canViewTasks: boolean;
  canViewAllTasks: boolean;
  
  // Task Assignment & Management
  canAssignTasks: boolean;
  canReassignTasks: boolean;
  canAssignTasksToMembers: boolean;
  canUnassignTasks: boolean;
  
  // Subtask Management (Team Lead specific)
  canCreateSubtasks: boolean;
  canEditSubtasks: boolean;
  canDeleteSubtasks: boolean;
  canAssignSubtasks: boolean;
  canManageSubtaskHierarchy: boolean;
  
  // Task Properties
  canSetTaskPriority: boolean;
  canSetTaskDeadlines: boolean;
  canSetTaskStatus: boolean;
  canAddTaskLabels: boolean;
  canManageTaskDependencies: boolean;
  
  // Task Collaboration
  canCommentOnTasks: boolean;
  canMentionUsersInTasks: boolean;
  canAttachFilesToTasks: boolean;
  canLogTimeOnTasks: boolean;
  
  // Bulk Operations
  canBulkEditTasks: boolean;
  canBulkAssignTasks: boolean;
  canImportTasks: boolean;
  canExportTasks: boolean;
}

/**
 * Team management permissions
 */
export interface TeamPermissions {
  // Team Structure
  canCreateTeams: boolean;
  canEditTeams: boolean;
  canDeleteTeams: boolean;
  canArchiveTeams: boolean;
  
  // Member Management
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canInviteMembers: boolean;
  canManageTeamRoles: boolean;
  canViewTeamMembers: boolean;
  
  // Team Leadership
  canAssignTeamLeads: boolean;
  canMentorMembers: boolean;
  canViewTeamProgress: boolean;
  canManageTeamCapacity: boolean;
  
  // Team Communication
  canCreateTeamChannels: boolean;
  canManageTeamChannels: boolean;
  canModerateTeamChat: boolean;
  canCreateTeamAnnouncements: boolean;
}

/**
 * Communication permissions
 */
export interface CommunicationPermissions {
  // Messaging
  canSendMessages: boolean;
  canSendDirectMessages: boolean;
  canMentionUsers: boolean;
  canReactToMessages: boolean;
  
  // Channels
  canCreateChannels: boolean;
  canJoinChannels: boolean;
  canLeaveChannels: boolean;
  canManageChannels: boolean;
  canArchiveChannels: boolean;
  
  // Moderation
  canModerateChat: boolean;
  canDeleteMessages: boolean;
  canPinMessages: boolean;
  canManageChannelPermissions: boolean;
  
  // Advanced Communication
  canStartVideoCall: boolean;
  canShareScreen: boolean;
  canRecordMeetings: boolean;
  canScheduleMeetings: boolean;
}

/**
 * File and resource permissions
 */
export interface ResourcePermissions {
  // File Management
  canUploadFiles: boolean;
  canDownloadFiles: boolean;
  canDeleteFiles: boolean;
  canOrganizeFiles: boolean;
  canShareFiles: boolean;
  canManageFileVersions: boolean;
  
  // Calendar & Scheduling
  canViewCalendar: boolean;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canManageAvailability: boolean;
  canBookResources: boolean;
  canManageTimeOff: boolean;
  
  // Time Tracking
  canTrackTime: boolean;
  canViewTimeTracking: boolean;
  canEditTimeEntries: boolean;
  canApproveTimeEntries: boolean;
  canManageTimeTracking: boolean;
  
  // Knowledge Base
  canAccessKnowledgeBase: boolean;
  canCreateDocuments: boolean;
  canEditDocuments: boolean;
  canDeleteDocuments: boolean;
  canManageDocumentPermissions: boolean;
}

/**
 * Analytics and reporting permissions
 */
export interface AnalyticsPermissions {
  // Basic Analytics
  canViewAnalytics: boolean;
  canViewPersonalAnalytics: boolean;
  canViewTeamAnalytics: boolean;
  canViewProjectAnalytics: boolean;
  canViewWorkspaceAnalytics: boolean;
  
  // Performance Metrics
  canViewTeamPerformance: boolean;
  canViewIndividualPerformance: boolean;
  canViewProductivityMetrics: boolean;
  canViewBudgetAnalytics: boolean;
  canViewTimeReports: boolean;
  
  // Report Generation
  canCreateReports: boolean;
  canScheduleReports: boolean;
  canCustomizeReports: boolean;
  canExportReports: boolean;
  canShareReports: boolean;
  
  // Advanced Analytics
  canAccessAdvancedAnalytics: boolean;
  canCreateDashboards: boolean;
  canManageDashboards: boolean;
  canCreateCustomMetrics: boolean;
}

/**
 * System and security permissions
 */
export interface SystemPermissions {
  // System Administration
  canAccessSystemSettings: boolean;
  canManageSystemIntegrations: boolean;
  canManageAPIAccess: boolean;
  canViewSystemHealth: boolean;
  canManageSystemBackups: boolean;
  
  // Security Management
  canManageSecurity: boolean;
  canViewSecurityLogs: boolean;
  canManageSSO: boolean;
  canManage2FA: boolean;
  canManageDataRetention: boolean;
  
  // Compliance & Audit
  canAccessAuditLogs: boolean;
  canManageCompliance: boolean;
  canExportAuditData: boolean;
  canManageDataGovernance: boolean;
  
  // Advanced Features
  canAccessBetaFeatures: boolean;
  canUseAI: boolean;
  canManageAISettings: boolean;
  canAccessDeveloperTools: boolean;
}

// ===== COMBINED PERMISSIONS INTERFACE =====

/**
 * Complete permission set combining all permission categories
 */
export interface AllPermissions extends 
  WorkspacePermissions,
  ProjectPermissions, 
  TaskPermissions,
  TeamPermissions,
  CommunicationPermissions,
  ResourcePermissions,
  AnalyticsPermissions,
  SystemPermissions {
  
  // Meta properties
  role: UserRole;
  inheritedFromRole?: UserRole;
  customPermissions?: Partial<AllPermissions>;
  restrictions?: string[];
  
  // Context-specific properties
  hasTimeLimit?: boolean;
  expiresAt?: Date;
  scopedToProjects?: string[];
  scopedToDepartments?: string[];
}

// ===== CONTEXT INTERFACES =====

/**
 * Context for permission checking
 */
export interface PermissionContext {
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  teamId?: string;
  departmentId?: string;
  userId?: string;
  resourceId?: string;
}

/**
 * Role assignment with context
 */
export interface RoleAssignment {
  id: string;
  userId: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  
  // Context scope
  workspaceId?: string;
  projectIds?: string[];
  departmentIds?: string[];
  
  // Metadata
  reason?: string;
  restrictions?: string[];
  isActive: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  role: UserRole;
  reason?: string;
  restrictions?: string[];
  context?: PermissionContext;
}

// ===== HELPER TYPES =====

/**
 * Permission action type for granular checking
 */
export type PermissionAction = keyof AllPermissions;

/**
 * Resource type for context-aware permissions
 */
export type ResourceType = 
  | "workspace" 
  | "project" 
  | "task" 
  | "team" 
  | "user" 
  | "file" 
  | "report" 
  | "channel"
  | "calendar"
  | "document";

/**
 * Access level for quick permission categorization
 */
export type AccessLevel = 
  | "none"     // No access
  | "view"     // Read-only access  
  | "edit"     // Can modify
  | "manage"   // Can manage and configure
  | "admin"    // Full administrative access
  | "owner";   // Complete ownership

// ===== ROLE DESCRIPTION METADATA =====

/**
 * Role metadata for UI display and documentation
 */
export interface RoleMetadata {
  role: UserRole;
  displayName: string;
  description: string;
  level: number;
  category: "workspace" | "project" | "team" | "external";
  icon?: string;
  color?: string;
  isExternal?: boolean;
  hasTimeLimit?: boolean;
  commonUseCases: string[];
  restrictions?: string[];
}

export const ROLE_METADATA: Record<UserRole, RoleMetadata> = {
  "workspace-manager": {
    role: "workspace-manager",
    displayName: "Workspace Manager",
    description: "Complete workspace control with all permissions",
    level: 7,
    category: "workspace",
    icon: "Crown",
    color: "purple",
    commonUseCases: ["Company owner", "CEO", "Workspace creator"],
  },
  
  "department-head": {
    role: "department-head", 
    displayName: "Department Head",
    description: "Manages multiple projects within a department",
    level: 6,
    category: "workspace",
    icon: "Building",
    color: "blue",
    commonUseCases: ["VP Engineering", "Director of Marketing", "Department manager"],
  },
  
  "workspace-viewer": {
    role: "workspace-viewer",
    displayName: "Workspace Viewer", 
    description: "Read-only access to workspace overview and reports",
    level: 5,
    category: "workspace",
    icon: "Eye",
    color: "gray",
    commonUseCases: ["Executive oversight", "Board member", "Auditor"],
  },
  
  "project-manager": {
    role: "project-manager",
    displayName: "Project Manager",
    description: "Full control over assigned projects and teams",
    level: 4, 
    category: "project",
    icon: "Briefcase",
    color: "green",
    commonUseCases: ["Project lead", "Product manager", "Scrum master"],
  },
  
  "project-viewer": {
    role: "project-viewer",
    displayName: "Project Viewer",
    description: "Read-only access to assigned projects", 
    level: 3,
    category: "project",
    icon: "Search",
    color: "gray",
    commonUseCases: ["Stakeholder", "Observer", "Quality assurance"],
  },
  
  "team-lead": {
    role: "team-lead",
    displayName: "Team Lead",
    description: "Manages tasks, subtasks, and team coordination",
    level: 2,
    category: "team", 
    icon: "Users",
    color: "orange",
    commonUseCases: ["Senior developer", "Team coordinator", "Technical lead"],
  },
  
  "member": {
    role: "member",
    displayName: "Member",
    description: "Standard team member with task completion abilities",
    level: 1,
    category: "team",
    icon: "User", 
    color: "blue",
    commonUseCases: ["Developer", "Designer", "Analyst", "Regular employee"],
  },
  
  "client": {
    role: "client",
    displayName: "Client",
    description: "External client with visibility into their projects",
    level: 1,
    category: "external",
    icon: "Building2",
    color: "teal",
    isExternal: true,
    commonUseCases: ["Paying client", "Customer", "External stakeholder"],
    restrictions: ["Can only see their own projects", "Cannot see internal discussions"],
  },
  
  "contractor": {
    role: "contractor", 
    displayName: "Contractor",
    description: "Temporary worker with project-specific access",
    level: 1,
    category: "external",
    icon: "Hammer",
    color: "amber",
    isExternal: true,
    hasTimeLimit: true,
    commonUseCases: ["Freelancer", "Consultant", "Temporary specialist"],
    restrictions: ["Time-limited access", "Project-specific only"],
  },
  
  "stakeholder": {
    role: "stakeholder",
    displayName: "Stakeholder", 
    description: "High-level visibility for decision makers",
    level: 1,
    category: "external",
    icon: "TrendingUp",
    color: "indigo",
    isExternal: true,
    commonUseCases: ["Investor", "Board member", "Executive sponsor"],
    restrictions: ["High-level view only", "No task details"],
  },
  
  "guest": {
    role: "guest",
    displayName: "Guest",
    description: "Minimal temporary access for visitors",
    level: 0,
    category: "external", 
    icon: "UserCheck",
    color: "gray",
    isExternal: true,
    hasTimeLimit: true,
    commonUseCases: ["Potential client", "Demo user", "Temporary visitor"],
    restrictions: ["Very limited access", "Time-limited", "No sensitive data"],
  },
}; 