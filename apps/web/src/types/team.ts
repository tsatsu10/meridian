/**
 * Team and team member type definitions
 */

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  joinedAt: string;
  lastActive?: string;
}

export interface TeamLead extends TeamMember {
  role: 'team-lead';
}

export interface TeamPerformance {
  tasksCompleted: number;
  weeklyGoal: number;
  trend: number;
}

export interface UnifiedTeam {
  id: string;
  name: string;
  description?: string;
  type: 'general' | 'project';
  memberCount: number;
  activeProjects: number;
  completedTasks: number;
  productivity: number;
  lead?: TeamLead;
  members?: TeamMember[];
  recentActivity?: string;
  performance?: TeamPerformance;
  technologies?: string[];
  color?: string;
  roles?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
}
