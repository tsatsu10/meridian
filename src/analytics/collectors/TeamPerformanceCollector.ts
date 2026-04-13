/**
 * @epic-6.1-advanced-analytics - Team Performance Collector
 * @persona-all - Track team performance for analytics insights
 */
import { getAnalyticsEngine, type AnalyticsEvent, type AnalyticsMetric } from '../AnalyticsEngine';
import { logger } from '../../utils/logger';

export interface TeamMetrics {
  teamId: string;
  memberCount: number;
  activeMembers: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  averageTaskCompletionTime: number;
  totalTimeSpent: number;
  communicationScore: number;
  collaborationScore: number;
  productivityScore: number;
  lastUpdated: Date;
}

export interface TeamMemberMetrics {
  userId: string;
  teamId: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  timeSpent: number;
  averageTaskTime: number;
  communicationCount: number;
  collaborationScore: number;
  lastActive: Date;
}

export interface TeamInsight {
  type: 'productivity' | 'collaboration' | 'communication' | 'workload' | 'performance';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  data: Record<string, any>;
  timestamp: Date;
}

export class TeamPerformanceCollector {
  private analyticsEngine = getAnalyticsEngine();
  private teamMetrics: Map<string, TeamMetrics> = new Map();
  private memberMetrics: Map<string, TeamMemberMetrics> = new Map();
  private isCollecting: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.analyticsEngine.on('team:member_joined', this.handleMemberJoined.bind(this));
    this.analyticsEngine.on('team:member_left', this.handleMemberLeft.bind(this));
    this.analyticsEngine.on('team:task_assigned', this.handleTaskAssigned.bind(this));
    this.analyticsEngine.on('team:task_completed', this.handleTaskCompleted.bind(this));
    this.analyticsEngine.on('team:communication', this.handleCommunication.bind(this));
    this.analyticsEngine.on('team:collaboration', this.handleCollaboration.bind(this));
  }

  startCollecting(): void {
    if (this.isCollecting) return;
    this.isCollecting = true;
    logger.info('Team Performance Collector started');
  }

  stopCollecting(): void {
    if (!this.isCollecting) return;
    this.isCollecting = false;
    logger.info('Team Performance Collector stopped');
  }

  async trackTeamCreated(teamId: string, data: {
    name: string;
    description?: string;
    createdBy: string;
    memberCount: number;
  }): Promise<void> {
    if (!this.isCollecting) return;

    const teamMetrics: TeamMetrics = {
      teamId,
      memberCount: data.memberCount,
      activeMembers: data.memberCount,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      averageTaskCompletionTime: 0,
      totalTimeSpent: 0,
      communicationScore: 0,
      collaborationScore: 0,
      productivityScore: 0,
      lastUpdated: new Date()
    };

    this.teamMetrics.set(teamId, teamMetrics);

    await this.analyticsEngine.trackEvent('team_created', {
      teamId,
      name: data.name,
      description: data.description,
      createdBy: data.createdBy,
      memberCount: data.memberCount
    });

    await this.analyticsEngine.recordMetric('teams_total', 1);
    await this.analyticsEngine.recordMetric('team_members_total', data.memberCount);
  }

  async trackMemberJoined(teamId: string, userId: string, data: {
    role: string;
    permissions: string[];
  }): Promise<void> {
    if (!this.isCollecting) return;

    const teamMetrics = this.teamMetrics.get(teamId);
    if (teamMetrics) {
      teamMetrics.memberCount++;
      teamMetrics.activeMembers++;
      teamMetrics.lastUpdated = new Date();
    }

    const memberMetrics: TeamMemberMetrics = {
      userId,
      teamId,
      tasksAssigned: 0,
      tasksCompleted: 0,
      tasksOverdue: 0,
      timeSpent: 0,
      averageTaskTime: 0,
      communicationCount: 0,
      collaborationScore: 0,
      lastActive: new Date()
    };

    this.memberMetrics.set(`${teamId}:${userId}`, memberMetrics);

    await this.analyticsEngine.trackEvent('team_member_joined', {
      teamId,
      userId,
      role: data.role,
      permissions: data.permissions
    });

    await this.analyticsEngine.recordMetric('team_members_total', 1);
  }

  async trackMemberLeft(teamId: string, userId: string): Promise<void> {
    if (!this.isCollecting) return;

    const teamMetrics = this.teamMetrics.get(teamId);
    if (teamMetrics) {
      teamMetrics.memberCount--;
      teamMetrics.activeMembers--;
      teamMetrics.lastUpdated = new Date();
    }

    this.memberMetrics.delete(`${teamId}:${userId}`);

    await this.analyticsEngine.trackEvent('team_member_left', {
      teamId,
      userId
    });

    await this.analyticsEngine.recordMetric('team_members_total', -1);
  }

  async trackTaskAssigned(teamId: string, taskId: string, userId: string, data: {
    priority: string;
    estimatedTime: number;
    dueDate: Date;
  }): Promise<void> {
    if (!this.isCollecting) return;

    const teamMetrics = this.teamMetrics.get(teamId);
    if (teamMetrics) {
      teamMetrics.totalTasks++;
      teamMetrics.lastUpdated = new Date();
    }

    const memberMetrics = this.memberMetrics.get(`${teamId}:${userId}`);
    if (memberMetrics) {
      memberMetrics.tasksAssigned++;
      memberMetrics.lastActive = new Date();
    }

    await this.analyticsEngine.trackEvent('team_task_assigned', {
      teamId,
      taskId,
      userId,
      priority: data.priority,
      estimatedTime: data.estimatedTime,
      dueDate: data.dueDate
    });
  }

  async trackTaskCompleted(teamId: string, taskId: string, userId: string, data: {
    actualTime: number;
    completedAt: Date;
  }): Promise<void> {
    if (!this.isCollecting) return;

    const teamMetrics = this.teamMetrics.get(teamId);
    if (teamMetrics) {
      teamMetrics.completedTasks++;
      teamMetrics.totalTimeSpent += data.actualTime;
      teamMetrics.averageTaskCompletionTime = teamMetrics.totalTimeSpent / teamMetrics.completedTasks;
      teamMetrics.lastUpdated = new Date();
    }

    const memberMetrics = this.memberMetrics.get(`${teamId}:${userId}`);
    if (memberMetrics) {
      memberMetrics.tasksCompleted++;
      memberMetrics.timeSpent += data.actualTime;
      memberMetrics.averageTaskTime = memberMetrics.timeSpent / memberMetrics.tasksCompleted;
      memberMetrics.lastActive = new Date();
    }

    await this.analyticsEngine.trackEvent('team_task_completed', {
      teamId,
      taskId,
      userId,
      actualTime: data.actualTime,
      completedAt: data.completedAt
    });

    await this.analyticsEngine.recordMetric('team_tasks_completed', 1);
    await this.analyticsEngine.recordMetric('team_time_spent', data.actualTime);
  }

  async trackCommunication(teamId: string, userId: string, data: {
    type: 'message' | 'comment' | 'mention' | 'reaction';
    channel: string;
    messageLength: number;
  }): Promise<void> {
    if (!this.isCollecting) return;

    const teamMetrics = this.teamMetrics.get(teamId);
    if (teamMetrics) {
      // Update communication score based on activity
      teamMetrics.communicationScore = Math.min(100, teamMetrics.communicationScore + 1);
      teamMetrics.lastUpdated = new Date();
    }

    const memberMetrics = this.memberMetrics.get(`${teamId}:${userId}`);
    if (memberMetrics) {
      memberMetrics.communicationCount++;
      memberMetrics.lastActive = new Date();
    }

    await this.analyticsEngine.trackEvent('team_communication', {
      teamId,
      userId,
      type: data.type,
      channel: data.channel,
      messageLength: data.messageLength
    });

    await this.analyticsEngine.recordMetric('team_communication_count', 1);
  }

  async trackCollaboration(teamId: string, userId: string, data: {
    type: 'file_shared' | 'task_collaboration' | 'review_requested' | 'feedback_given';
    collaborators: string[];
  }): Promise<void> {
    if (!this.isCollecting) return;

    const teamMetrics = this.teamMetrics.get(teamId);
    if (teamMetrics) {
      // Update collaboration score based on activity
      teamMetrics.collaborationScore = Math.min(100, teamMetrics.collaborationScore + 2);
      teamMetrics.lastUpdated = new Date();
    }

    const memberMetrics = this.memberMetrics.get(`${teamId}:${userId}`);
    if (memberMetrics) {
      memberMetrics.collaborationScore = Math.min(100, memberMetrics.collaborationScore + 2);
      memberMetrics.lastActive = new Date();
    }

    await this.analyticsEngine.trackEvent('team_collaboration', {
      teamId,
      userId,
      type: data.type,
      collaborators: data.collaborators
    });

    await this.analyticsEngine.recordMetric('team_collaboration_count', 1);
  }

  getTeamMetrics(teamId: string): TeamMetrics | null {
    return this.teamMetrics.get(teamId) || null;
  }

  getAllTeamMetrics(): TeamMetrics[] {
    return Array.from(this.teamMetrics.values());
  }

  getTeamMemberMetrics(teamId: string, userId: string): TeamMemberMetrics | null {
    return this.memberMetrics.get(`${teamId}:${userId}`) || null;
  }

  getTeamMembersMetrics(teamId: string): TeamMemberMetrics[] {
    return Array.from(this.memberMetrics.values()).filter(m => m.teamId === teamId);
  }

  async generateTeamInsights(teamId: string): Promise<TeamInsight[]> {
    const teamMetrics = this.getTeamMetrics(teamId);
    if (!teamMetrics) return [];

    const insights: TeamInsight[] = [];

    // Productivity insights
    if (teamMetrics.completedTasks > 0) {
      const completionRate = (teamMetrics.completedTasks / teamMetrics.totalTasks) * 100;
      if (completionRate < 70) {
        insights.push({
          type: 'productivity',
          title: 'Low Task Completion Rate',
          description: `Team has a ${completionRate.toFixed(1)}% completion rate. Consider reviewing task assignments and priorities.`,
          severity: 'medium',
          data: { completionRate, completedTasks: teamMetrics.completedTasks, totalTasks: teamMetrics.totalTasks },
          timestamp: new Date()
        });
      }
    }

    // Workload insights
    const averageTasksPerMember = teamMetrics.totalTasks / teamMetrics.memberCount;
    if (averageTasksPerMember > 10) {
      insights.push({
        type: 'workload',
        title: 'High Workload Distribution',
        description: `Average of ${averageTasksPerMember.toFixed(1)} tasks per team member. Consider redistributing workload.`,
        severity: 'high',
        data: { averageTasksPerMember, memberCount: teamMetrics.memberCount },
        timestamp: new Date()
      });
    }

    // Communication insights
    if (teamMetrics.communicationScore < 30) {
      insights.push({
        type: 'communication',
        title: 'Low Communication Activity',
        description: 'Team communication score is low. Encourage more team interactions.',
        severity: 'medium',
        data: { communicationScore: teamMetrics.communicationScore },
        timestamp: new Date()
      });
    }

    // Collaboration insights
    if (teamMetrics.collaborationScore < 40) {
      insights.push({
        type: 'collaboration',
        title: 'Limited Collaboration',
        description: 'Team collaboration score is low. Consider team-building activities.',
        severity: 'medium',
        data: { collaborationScore: teamMetrics.collaborationScore },
        timestamp: new Date()
      });
    }

    return insights;
  }

  async getTeamTrends(teamId: string, days: number = 30): Promise<Array<{
    date: string;
    memberCount: number;
    completedTasks: number;
    newTasks: number;
    communicationScore: number;
    collaborationScore: number;
    productivityScore: number;
  }>> {
    // This would typically query historical data
    // For now, return current metrics as a trend point
    const teamMetrics = this.getTeamMetrics(teamId);
    if (!teamMetrics) return [];

    return [{
      date: new Date().toISOString().split('T')[0],
      memberCount: teamMetrics.memberCount,
      completedTasks: teamMetrics.completedTasks,
      newTasks: teamMetrics.totalTasks,
      communicationScore: teamMetrics.communicationScore,
      collaborationScore: teamMetrics.collaborationScore,
      productivityScore: teamMetrics.productivityScore
    }];
  }

  calculateTeamProductivityScore(teamId: string): number {
    const teamMetrics = this.getTeamMetrics(teamId);
    if (!teamMetrics) return 0;

    const completionRate = teamMetrics.totalTasks > 0 ? (teamMetrics.completedTasks / teamMetrics.totalTasks) * 100 : 0;
    const timeEfficiency = teamMetrics.averageTaskCompletionTime > 0 ? Math.min(100, 100 / teamMetrics.averageTaskCompletionTime) : 0;
    const communicationWeight = teamMetrics.communicationScore * 0.2;
    const collaborationWeight = teamMetrics.collaborationScore * 0.3;
    const completionWeight = completionRate * 0.3;
    const efficiencyWeight = timeEfficiency * 0.2;

    return Math.round(communicationWeight + collaborationWeight + completionWeight + efficiencyWeight);
  }

  private handleMemberJoined(data: any): void {
    this.trackMemberJoined(data.teamId, data.userId, data);
  }

  private handleMemberLeft(data: any): void {
    this.trackMemberLeft(data.teamId, data.userId);
  }

  private handleTaskAssigned(data: any): void {
    this.trackTaskAssigned(data.teamId, data.taskId, data.userId, data);
  }

  private handleTaskCompleted(data: any): void {
    this.trackTaskCompleted(data.teamId, data.taskId, data.userId, data);
  }

  private handleCommunication(data: any): void {
    this.trackCommunication(data.teamId, data.userId, data);
  }

  private handleCollaboration(data: any): void {
    this.trackCollaboration(data.teamId, data.userId, data);
  }
}

export const getTeamPerformanceCollector = (): TeamPerformanceCollector => {
  return new TeamPerformanceCollector();
}; 