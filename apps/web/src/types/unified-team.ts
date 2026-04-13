// Unified Team Management Types
// This file consolidates all team and user management interfaces

export type TeamRole = 
  | "workspace-manager" 
  | "department-head" 
  | "project-manager" 
  | "team-lead" 
  | "member" 
  | "client" 
  | "contractor" 
  | "stakeholder" 
  | "workspace-viewer" 
  | "project-viewer" 
  | "guest";

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';
export type UserAvailability = 'available' | 'meeting' | 'focused' | 'unavailable';
export type MembershipStatus = 'active' | 'pending' | 'inactive';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  scope?: 'workspace' | 'project' | 'team';
}

export interface PerformanceMetrics {
  tasksCompleted: number;
  currentTasks: number;
  overdueTasks: number;
  completionRate: number; // 0-100
  performanceScore: number; // 0-100
  trend: number; // -100 to +100
  weeklyGoal?: number;
}

export interface WorkloadData {
  currentLoad: number; // 0-100 percentage
  capacity: number; // Maximum tasks they can handle
  estimatedCompletion?: string; // ISO date string
  burnoutRisk: 'low' | 'medium' | 'high';
}

export interface TeamMembership {
  teamId: string;
  teamName: string;
  teamColor?: string;
  role: TeamRole;
  joinedAt: string; // ISO date string
  isLead: boolean;
  permissions: Permission[];
}

export interface UnifiedTeamMember {
  // Core Identity
  id: string;
  email: string;
  name: string;
  avatar?: string;
  
  // RBAC Integration
  role: TeamRole;
  permissions: Permission[];
  globalPermissions: string[]; // Legacy support
  
  // Status & Availability
  status: UserStatus;
  availability: UserAvailability;
  membershipStatus: MembershipStatus;
  lastActive: string; // ISO date string
  
  // Performance & Workload
  performance: PerformanceMetrics;
  workload: WorkloadData;
  
  // Team Assignments
  teamMemberships: TeamMembership[];
  primaryTeamId?: string;
  
  // Administrative Data
  joinedAt: string; // ISO date string
  invitedBy?: string;
  workspaceId: string;
  departmentId?: string;
  
  // Profile Information
  timezone?: string;
  preferredLanguage?: string;
  contactInfo?: {
    phone?: string;
    slack?: string;
    discord?: string;
  };
}

export interface TeamMetrics {
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  averagePerformance: number;
  averageWorkload: number;
  sprintProgress?: number;
  velocity?: number;
  burndown?: number;
}

export interface UnifiedTeam {
  // Core Team Data
  id: string;
  name: string;
  description: string;
  type: 'general' | 'project' | 'department';
  
  // Team Organization
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  departmentId?: string;
  parentTeamId?: string;
  
  // Visual & Branding
  color?: string;
  avatar?: string;
  technologies?: string[];
  
  // Team Leadership
  leaderId?: string;
  leadName?: string;
  leadAvatar?: string;
  
  // Members & Composition
  members: UnifiedTeamMember[];
  memberCount: number;
  roleDistribution: Record<TeamRole, number>;
  
  // Performance & Metrics
  metrics: TeamMetrics;
  performance: number; // 0-100
  workload: number; // 0-100
  
  // Activity & Status
  status: 'active' | 'inactive' | 'archived';
  recentActivity?: string;
  lastActivityAt: string; // ISO date string
  
  // Timestamps
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface WorkspaceStats {
  totalTeams: number;
  totalMembers: number;
  activeMembers: number;
  onlineMembers: number;
  pendingInvites: number;
  averagePerformance: number;
  averageWorkload: number;
  roleDistribution: Record<TeamRole, number>;
}

// API Response Types
export interface TeamMemberResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  assignment: {
    userId: string;
    workspaceId: string;
    role: TeamRole;
    assignedAt: string;
    isActive: boolean;
    departmentId?: string;
  };
  permissions: Permission[];
  teamMemberships: {
    teamId: string;
    teamName: string;
    role: TeamRole;
    joinedAt: string;
    isLead: boolean;
  }[];
}

export interface TeamResponse {
  id: string;
  name: string;
  description: string;
  type: 'general' | 'project';
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  color?: string;
  leaderId?: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMemberResponse[];
}

// Filter and Search Types
export interface TeamFilter {
  search?: string;
  teamType?: 'general' | 'project' | 'department';
  projectId?: string;
  status?: 'active' | 'inactive' | 'archived';
  role?: TeamRole;
  minPerformance?: number;
  maxWorkload?: number;
}

export interface MemberFilter {
  search?: string;
  role?: TeamRole;
  status?: UserStatus;
  availability?: UserAvailability;
  membershipStatus?: MembershipStatus;
  teamId?: string;
  minPerformance?: number;
  maxWorkload?: number;
}

// Action Types for Store
export type TeamAction = 
  | 'create'
  | 'update' 
  | 'delete'
  | 'archive'
  | 'activate'
  | 'add_member'
  | 'remove_member'
  | 'update_member_role'
  | 'set_team_lead';

export type MemberAction = 
  | 'invite'
  | 'activate'
  | 'deactivate'
  | 'remove'
  | 'update_role'
  | 'update_profile'
  | 'resend_invite'
  | 'assign_to_team'
  | 'remove_from_team';

// View Mode Types
export type TeamViewMode = 'teams' | 'members' | 'users' | 'analytics';
export type SortOption = 'name' | 'performance' | 'workload' | 'recent' | 'members';
export type SortOrder = 'asc' | 'desc';

// Settings Types
export interface TeamSettings {
  allowMemberInvites: boolean;
  requireAdminApproval: boolean;
  enableGuestAccess: boolean;
  autoRemoveInactive: boolean;
  inactivityDays: number;
  maxTeamSize?: number;
  defaultRole: TeamRole;
  enableRealTimeStatus: boolean;
  enablePerformanceTracking: boolean;
}