// Unified Team Management API Layer
// This consolidates all team and user management API calls

import { API_URL } from "@/constants/urls";
import { logger } from "@/lib/logger";
import { 
  UnifiedTeamMember, 
  UnifiedTeam, 
  TeamMemberResponse, 
  TeamResponse,
  TeamRole, 
  WorkspaceStats,
  PerformanceMetrics,
  WorkloadData,
  TeamSettings
} from "@/types/unified-team";

// Base API utilities
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }});

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
};

// Data transformation utilities
const calculatePerformanceMetrics = (tasks: any[] = []): PerformanceMetrics => {
  const completed = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const current = tasks.filter(t => t.status === 'in_progress' || t.status === 'todo').length;
  const overdue = tasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'done'
  ).length;
  
  const total = completed + current;
  const completionRate = total > 0 ? (completed / total) * 100 : 100;
  const overdueImpact = Math.min(overdue * 10, 30);
  const performanceScore = Math.max(completionRate - overdueImpact, 0);

  return {
    tasksCompleted: completed,
    currentTasks: current,
    overdueTasks: overdue,
    completionRate: Math.round(completionRate),
    performanceScore: Math.round(performanceScore),
    trend: 0, // TODO: Calculate trend from historical data
  };
};

const calculateWorkloadData = (tasks: any[] = []): WorkloadData => {
  const currentTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'todo').length;
  const maxTasksForFullLoad = 10;
  const currentLoad = Math.min((currentTasks / maxTasksForFullLoad) * 100, 100);
  
  let burnoutRisk: 'low' | 'medium' | 'high' = 'low';
  if (currentLoad > 80) burnoutRisk = 'high';
  else if (currentLoad > 60) burnoutRisk = 'medium';

  return {
    currentLoad: Math.round(currentLoad),
    capacity: maxTasksForFullLoad,
    burnoutRisk
  };
};

const transformTeamMemberResponse = (response: TeamMemberResponse, tasks: any[] = []): UnifiedTeamMember => {
  const userTasks = tasks.filter(task => 
    task.assigneeEmail === response.user.email || 
    task.assignees?.some((assignee: any) => assignee.email === response.user.email)
  );

  const performance = calculatePerformanceMetrics(userTasks);
  const workload = calculateWorkloadData(userTasks);

  return {
    // Core Identity
    id: response.user.id,
    email: response.user.email,
    name: response.user.name || response.user.email,
    avatar: response.user.avatar,
    
    // RBAC Integration
    role: response.assignment.role,
    permissions: response.permissions || [],
    globalPermissions: [], // TODO: Transform permissions to legacy format if needed
    
    // Status & Availability
    status: 'offline', // TODO: Get from real-time status API
    availability: 'available',
    membershipStatus: response.assignment.isActive ? 'active' : 'inactive',
    lastActive: new Date().toISOString(), // TODO: Get real last active time
    
    // Performance & Workload
    performance,
    workload,
    
    // Team Assignments
    teamMemberships: response.teamMemberships?.map(tm => ({
      teamId: tm.teamId,
      teamName: tm.teamName,
      role: tm.role,
      joinedAt: tm.joinedAt,
      isLead: tm.isLead,
      permissions: [], // TODO: Get team-specific permissions
    })) || [],
    primaryTeamId: response.teamMemberships?.[0]?.teamId,
    
    // Administrative Data
    joinedAt: response.assignment.assignedAt,
    workspaceId: response.assignment.workspaceId,
    departmentId: response.assignment.departmentId
  };
};

const transformTeamResponse = (response: TeamResponse, allTasks: any[] = []): UnifiedTeam => {
  const members = response.members?.map(member => 
    transformTeamMemberResponse(member, allTasks)
  ) || [];

  // Calculate team metrics
  const teamTasks = allTasks.filter(task => 
    members.some(member => 
      task.assigneeEmail === member.email || 
      task.assignees?.some((assignee: any) => assignee.email === member.email)
    )
  );

  const activeTasks = teamTasks.filter(t => t.status === 'in_progress' || t.status === 'todo').length;
  const completedTasks = teamTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const overdueTasks = teamTasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'done'
  ).length;

  const averagePerformance = members.length > 0 
    ? Math.round(members.reduce((sum, member) => sum + member.performance.performanceScore, 0) / members.length)
    : 0;
  const averageWorkload = members.length > 0
    ? Math.round(members.reduce((sum, member) => sum + member.workload.currentLoad, 0) / members.length)
    : 0;

  // Calculate role distribution
  const roleDistribution: Record<TeamRole, number> = {
    "workspace-manager": 0,
    "department-head": 0,
    "project-manager": 0,
    "team-lead": 0,
    "member": 0,
    "client": 0,
    "contractor": 0,
    "stakeholder": 0,
    "workspace-viewer": 0,
    "project-viewer": 0,
    "guest": 0
  };

  members.forEach(member => {
    roleDistribution[member.role] = (roleDistribution[member.role] || 0) + 1;
  });

  return {
    // Core Team Data
    id: response.id,
    name: response.name,
    description: response.description,
    type: response.type === 'project' ? 'project' : 'general',
    
    // Team Organization
    workspaceId: response.workspaceId,
    projectId: response.projectId,
    projectName: response.projectName,
    
    // Visual & Branding
    color: response.color,
    
    // Team Leadership
    leaderId: response.leaderId,
    leadName: members.find(m => m.id === response.leaderId)?.name,
    leadAvatar: members.find(m => m.id === response.leaderId)?.avatar,
    
    // Members & Composition
    members,
    memberCount: members.length,
    roleDistribution,
    
    // Performance & Metrics
    metrics: {
      activeTasks,
      completedTasks,
      overdueTasks,
      averagePerformance,
      averageWorkload
    },
    performance: averagePerformance,
    workload: averageWorkload,
    
    // Activity & Status
    status: 'active',
    lastActivityAt: new Date().toISOString(),
    
    // Timestamps
    createdAt: response.createdAt,
    updatedAt: response.updatedAt
  };
};

// API Functions
export class UnifiedTeamAPI {
  
  // Team Management
  static async getTeams(workspaceId: string): Promise<UnifiedTeam[]> {
    try {
      const [teamsResponse, tasksResponse] = await Promise.all([
        apiRequest(`/team/${workspaceId}`),
        apiRequest(`/task/all`).catch(() => ({ tasks: [] })) // Fallback if tasks API fails
      ]);

      const teams = teamsResponse.teams || [];
      const allTasks = tasksResponse.tasks || [];

      return teams.map((team: TeamResponse) => transformTeamResponse(team, allTasks));
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      return [];
    }
  }

  static async getTeamById(teamId: string): Promise<UnifiedTeam | null> {
    try {
      const [teamResponse, tasksResponse] = await Promise.all([
        apiRequest(`/team/single/${teamId}`),
        apiRequest(`/task/all`).catch(() => ({ tasks: [] }))
      ]);

      const allTasks = tasksResponse.tasks || [];
      return transformTeamResponse(teamResponse, allTasks);
    } catch (error) {
      console.error('Failed to fetch team:', error);
      return null;
    }
  }

  static async createTeam(teamData: Partial<UnifiedTeam>): Promise<UnifiedTeam> {
    const response = await apiRequest('/team', {
      method: 'POST',
      body: JSON.stringify({
        name: teamData.name,
        description: teamData.description,
        type: teamData.type,
        projectId: teamData.projectId,
        color: teamData.color
      })
    });

    return transformTeamResponse(response);
  }

  static async updateTeam(teamId: string, updates: Partial<UnifiedTeam>): Promise<UnifiedTeam> {
    const response = await apiRequest(`/team/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    return transformTeamResponse(response);
  }

  static async deleteTeam(teamId: string): Promise<void> {
    await apiRequest(`/team/${teamId}`, {
      method: 'DELETE'
    });
  }

  // Member Management
  static async getWorkspaceMembers(workspaceId: string): Promise<UnifiedTeamMember[]> {
    try {
      const [membersResponse, tasksResponse] = await Promise.all([
        apiRequest('/rbac/assignments'),
        apiRequest('/task/all').catch(() => ({ tasks: [] }))
      ]);

      const assignments = membersResponse.assignments || [];
      const allTasks = tasksResponse.tasks || [];

      return assignments
        .filter((assignment: any) => assignment.assignment?.workspaceId === workspaceId)
        .map((assignment: TeamMemberResponse) => transformTeamMemberResponse(assignment, allTasks));
    } catch (error) {
      console.error('Failed to fetch workspace members:', error);
      return [];
    }
  }

  static async inviteMember(email: string, role: TeamRole, workspaceId: string): Promise<UnifiedTeamMember> {
    const response = await apiRequest('/rbac/assignments', {
      method: 'POST',
      body: JSON.stringify({
        userEmail: email,
        role,
        workspaceId,
        reason: `Invited as ${role}`
      })
    });

    return transformTeamMemberResponse(response);
  }

  static async updateMemberRole(userId: string, newRole: TeamRole): Promise<UnifiedTeamMember> {
    const response = await apiRequest(`/rbac/assignments/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({
        role: newRole,
        reason: `Role changed to ${newRole}`
      })
    });

    return transformTeamMemberResponse(response);
  }

  static async removeMember(userId: string): Promise<void> {
    await apiRequest(`/rbac/assignments/${userId}`, {
      method: 'DELETE'
    });
  }

  static async resendInvite(email: string): Promise<void> {
    await apiRequest('/rbac/resend-invite', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Team Membership Management
  static async addMemberToTeam(userId: string, teamId: string, role: TeamRole = 'member'): Promise<void> {
    await apiRequest(`/team/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        role
      })
    });
  }

  static async removeMemberFromTeam(userId: string, teamId: string): Promise<void> {
    await apiRequest(`/team/${teamId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  static async updateTeamMemberRole(userId: string, teamId: string, role: TeamRole): Promise<void> {
    await apiRequest(`/team/${teamId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  // Real-time Status
  static async getOnlineMembers(workspaceId: string): Promise<{ userId: string; status: string; lastSeen: string }[]> {
    try {
      const response = await apiRequest(
        `/api/presence/online?workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      const users = Array.isArray(response.users) ? response.users : [];
      return users.map((u: { userId?: string; isOnline?: boolean; lastSeen?: string | null }) => ({
        userId: u.userId ?? "",
        status: u.isOnline === false ? "offline" : "online",
        lastSeen: u.lastSeen ? String(u.lastSeen) : "",
      }));
    } catch (error) {
      logger.error("Failed to fetch online members", { error });
      return [];
    }
  }

  // Analytics & Stats
  static async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
    try {
      const members = await this.getWorkspaceMembers(workspaceId);
      const teams = await this.getTeams(workspaceId);
      const onlineMembers = await this.getOnlineMembers(workspaceId);

      const roleDistribution: Record<TeamRole, number> = {
        "workspace-manager": 0,
        "department-head": 0,
        "project-manager": 0,
        "team-lead": 0,
        "member": 0,
        "client": 0,
        "contractor": 0,
        "stakeholder": 0,
        "workspace-viewer": 0,
        "project-viewer": 0,
        "guest": 0
      };

      members.forEach(member => {
        roleDistribution[member.role] = (roleDistribution[member.role] || 0) + 1;
      });

      return {
        totalTeams: teams.length,
        totalMembers: members.length,
        activeMembers: members.filter(m => m.membershipStatus === 'active').length,
        onlineMembers: onlineMembers.length,
        pendingInvites: members.filter(m => m.membershipStatus === 'pending').length,
        averagePerformance: members.length > 0 
          ? Math.round(members.reduce((sum, m) => sum + m.performance.performanceScore, 0) / members.length)
          : 0,
        averageWorkload: members.length > 0
          ? Math.round(members.reduce((sum, m) => sum + m.workload.currentLoad, 0) / members.length)
          : 0,
        roleDistribution
      };
    } catch (error) {
      console.error('Failed to get workspace stats:', error);
      throw error;
    }
  }

  // Settings Management
  static async getTeamSettings(workspaceId: string): Promise<TeamSettings> {
    try {
      const response = await apiRequest(`/workspace/${workspaceId}/team-settings`);
      return response.settings;
    } catch (error) {
      console.error('Failed to fetch team settings:', error);
      // Return default settings
      return {
        allowMemberInvites: false,
        requireAdminApproval: true,
        enableGuestAccess: false,
        autoRemoveInactive: false,
        inactivityDays: 90,
        defaultRole: 'member',
        enableRealTimeStatus: true,
        enablePerformanceTracking: true
      };
    }
  }

  static async updateTeamSettings(workspaceId: string, settings: Partial<TeamSettings>): Promise<TeamSettings> {
    const response = await apiRequest(`/workspace/${workspaceId}/team-settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });

    return response.settings;
  }
}