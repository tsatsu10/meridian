import type { ProjectView, ViewState } from '@/store/project';

// Analytics event types
interface WorkflowEvent {
  id: string;
  userId: string;
  projectId: string;
  workspaceId: string;
  timestamp: Date;
  type: WorkflowEventType;
  data: any;
  sessionId: string;
  userAgent: string;
  viewport: { width: number; height: number };
}

enum WorkflowEventType {
  VIEW_CHANGE = 'view_change',
  FILTER_APPLIED = 'filter_applied',
  SORT_CHANGED = 'sort_changed',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  BULK_ACTION = 'bulk_action',
  SEARCH_PERFORMED = 'search_performed',
  MILESTONE_CREATED = 'milestone_created',
  ERROR_ENCOUNTERED = 'error_encountered',
  PERFORMANCE_ISSUE = 'performance_issue',
  KEYBOARD_SHORTCUT = 'keyboard_shortcut',
  CONTEXT_MENU_USED = 'context_menu_used',
  DRAG_DROP = 'drag_drop',
  EXPORT_DATA = 'export_data',
  NOTIFICATION_CLICKED = 'notification_clicked'
}

// User session analytics
interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number; // milliseconds
  viewsVisited: ProjectView[];
  viewDurations: Record<ProjectView, number>;
  actionsPerformed: number;
  errorsEncountered: number;
  keyboardShortcutsUsed: number;
  tasksCompleted: number;
  productivityScore: number; // 0-100
}

// Workflow pattern analysis
interface WorkflowPattern {
  pattern: string;
  frequency: number;
  avgDuration: number;
  successRate: number;
  commonFollowup: string[];
  timeOfDay: number[];
  dayOfWeek: number[];
  userTypes: string[];
}

// Performance insights
interface PerformanceInsight {
  metric: string;
  value: number;
  trend: 'improving' | 'stable' | 'declining';
  comparison: number; // vs previous period
  recommendation?: string;
}

// Workflow optimization suggestions
interface OptimizationSuggestion {
  type: 'workflow' | 'performance' | 'usability';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: string[];
  metrics: string[];
}

class WorkflowAnalyticsEngine {
  private events: WorkflowEvent[] = [];
  private sessions: UserSession[] = [];
  private patterns: WorkflowPattern[] = [];
  private currentSession: UserSession | null = null;

  // Event tracking
  public trackEvent(
    type: WorkflowEventType,
    data: any,
    userId: string,
    projectId: string,
    workspaceId: string
  ): void {
    const event: WorkflowEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      projectId,
      workspaceId,
      timestamp: new Date(),
      type,
      data,
      sessionId: this.getCurrentSessionId(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    this.events.push(event);
    this.updateCurrentSession(event);
    
    // Keep only recent events (last 10000)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Real-time pattern detection
    this.detectPatterns();
  }

  // Session management
  private getCurrentSessionId(): string {
    if (!this.currentSession) {
      this.startNewSession();
    }
    return this.currentSession!.sessionId;
  }

  private startNewSession(): void {
    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'current-user', // Would come from auth
      startTime: new Date(),
      totalDuration: 0,
      viewsVisited: [],
      viewDurations: {} as Record<ProjectView, number>,
      actionsPerformed: 0,
      errorsEncountered: 0,
      keyboardShortcutsUsed: 0,
      tasksCompleted: 0,
      productivityScore: 0
    };
  }

  private updateCurrentSession(event: WorkflowEvent): void {
    if (!this.currentSession) return;

    this.currentSession.actionsPerformed++;
    
    switch (event.type) {
      case WorkflowEventType.VIEW_CHANGE:
        const view = event.data.view as ProjectView;
        if (!this.currentSession.viewsVisited.includes(view)) {
          this.currentSession.viewsVisited.push(view);
        }
        this.updateViewDuration(event.data.previousView, event.timestamp);
        break;
        
      case WorkflowEventType.ERROR_ENCOUNTERED:
        this.currentSession.errorsEncountered++;
        break;
        
      case WorkflowEventType.KEYBOARD_SHORTCUT:
        this.currentSession.keyboardShortcutsUsed++;
        break;
        
      case WorkflowEventType.TASK_UPDATED:
        if (event.data.status === 'done') {
          this.currentSession.tasksCompleted++;
        }
        break;
    }
    
    // Calculate productivity score
    this.calculateProductivityScore();
  }

  private updateViewDuration(view: ProjectView, timestamp: Date): void {
    if (!this.currentSession || !view) return;
    
    const duration = timestamp.getTime() - this.currentSession.startTime.getTime();
    if (!this.currentSession.viewDurations[view]) {
      this.currentSession.viewDurations[view] = 0;
    }
    this.currentSession.viewDurations[view] += duration;
  }

  private calculateProductivityScore(): void {
    if (!this.currentSession) return;
    
    const duration = Date.now() - this.currentSession.startTime.getTime();
    const durationMinutes = duration / (1000 * 60);
    
    let score = 0;
    
    // Tasks completed (40% of score)
    score += Math.min(this.currentSession.tasksCompleted * 10, 40);
    
    // Actions efficiency (30% of score)
    const actionsPerMinute = durationMinutes > 0 ? this.currentSession.actionsPerformed / durationMinutes : 0;
    score += Math.min(actionsPerMinute * 5, 30);
    
    // Keyboard shortcuts usage (10% of score)
    const shortcutRatio = this.currentSession.actionsPerformed > 0 ? 
      this.currentSession.keyboardShortcutsUsed / this.currentSession.actionsPerformed : 0;
    score += shortcutRatio * 10;
    
    // Error penalty (negative impact)
    score -= this.currentSession.errorsEncountered * 5;
    
    // Focus score - fewer view changes is better (20% of score)
    const focusScore = this.currentSession.viewsVisited.length > 0 ? 
      Math.max(0, 20 - (this.currentSession.viewsVisited.length - 1) * 2) : 0;
    score += focusScore;
    
    this.currentSession.productivityScore = Math.max(0, Math.min(100, score));
  }

  // Pattern detection
  private detectPatterns(): void {
    const recentEvents = this.events.slice(-100); // Analyze last 100 events
    const sequences = this.extractSequences(recentEvents);
    
    sequences.forEach(sequence => {
      this.updatePatternFrequency(sequence);
    });
  }

  private extractSequences(events: WorkflowEvent[]): string[] {
    const sequences: string[] = [];
    
    for (let i = 0; i < events.length - 2; i++) {
      const sequence = events.slice(i, i + 3)
        .map(e => `${e.type}:${e.data.view || 'unknown'}`)
        .join(' -> ');
      sequences.push(sequence);
    }
    
    return sequences;
  }

  private updatePatternFrequency(sequence: string): void {
    const existingPattern = this.patterns.find(p => p.pattern === sequence);
    
    if (existingPattern) {
      existingPattern.frequency++;
    } else {
      this.patterns.push({
        pattern: sequence,
        frequency: 1,
        avgDuration: 0,
        successRate: 0,
        commonFollowup: [],
        timeOfDay: [new Date().getHours()],
        dayOfWeek: [new Date().getDay()],
        userTypes: ['current-user']
      });
    }
  }

  // Analytics queries
  public getViewAnalytics(timeRange: 'day' | 'week' | 'month' = 'week'): any {
    const cutoff = this.getTimeRangeCutoff(timeRange);
    const recentEvents = this.events.filter(e => e.timestamp >= cutoff);
    
    const viewChanges = recentEvents.filter(e => e.type === WorkflowEventType.VIEW_CHANGE);
    const viewStats: Record<string, any> = {};
    
    viewChanges.forEach(event => {
      const view = event.data.view;
      if (!viewStats[view]) {
        viewStats[view] = {
          visits: 0,
          totalDuration: 0,
          avgDuration: 0,
          bounceRate: 0,
          conversionRate: 0
        };
      }
      viewStats[view].visits++;
    });
    
    return {
      totalViews: viewChanges.length,
      uniqueViews: Object.keys(viewStats).length,
      viewStats,
      mostPopularView: Object.entries(viewStats).sort(([,a], [,b]) => (b as any).visits - (a as any).visits)[0]?.[0],
      trends: this.calculateViewTrends(viewStats)
    };
  }

  public getUserProductivityAnalytics(): any {
    const recentSessions = this.sessions.slice(-30); // Last 30 sessions
    
    if (recentSessions.length === 0) return null;
    
    const avgProductivity = recentSessions.reduce((sum, s) => sum + s.productivityScore, 0) / recentSessions.length;
    const avgSessionDuration = recentSessions.reduce((sum, s) => sum + s.totalDuration, 0) / recentSessions.length;
    const avgTasksCompleted = recentSessions.reduce((sum, s) => sum + s.tasksCompleted, 0) / recentSessions.length;
    
    return {
      avgProductivityScore: avgProductivity,
      avgSessionDuration: avgSessionDuration / (1000 * 60), // minutes
      avgTasksCompleted,
      totalSessions: recentSessions.length,
      improvement: this.calculateProductivityTrend(recentSessions),
      bestPerformingTime: this.getBestPerformingTime(recentSessions),
      recommendations: this.generateProductivityRecommendations(recentSessions)
    };
  }

  public getWorkflowInsights(): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    
    // Task completion rate
    const taskEvents = this.events.filter(e => e.type === WorkflowEventType.TASK_UPDATED);
    const completedTasks = taskEvents.filter(e => e.data.status === 'done').length;
    const completionRate = taskEvents.length > 0 ? (completedTasks / taskEvents.length) * 100 : 0;
    
    insights.push({
      metric: 'Task Completion Rate',
      value: completionRate,
      trend: 'stable', // Would calculate based on historical data
      comparison: 5.2, // % change vs previous period
      recommendation: completionRate < 70 ? 'Focus on reducing task complexity or improving time management' : undefined
    });
    
    // Error rate
    const errorEvents = this.events.filter(e => e.type === WorkflowEventType.ERROR_ENCOUNTERED);
    const errorRate = this.events.length > 0 ? (errorEvents.length / this.events.length) * 100 : 0;
    
    insights.push({
      metric: 'Error Rate',
      value: errorRate,
      trend: errorRate > 2 ? 'declining' : 'stable',
      comparison: -1.3,
      recommendation: errorRate > 5 ? 'Review common error patterns and improve user experience' : undefined
    });
    
    // View switching frequency
    const viewChanges = this.events.filter(e => e.type === WorkflowEventType.VIEW_CHANGE);
    const avgViewSwitches = this.sessions.length > 0 ? viewChanges.length / this.sessions.length : 0;
    
    insights.push({
      metric: 'Avg View Switches per Session',
      value: avgViewSwitches,
      trend: 'stable',
      comparison: 0.8,
      recommendation: avgViewSwitches > 15 ? 'Consider improving navigation or providing better view defaults' : undefined
    });
    
    return insights;
  }

  public getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const analytics = this.getViewAnalytics();
    const productivity = this.getUserProductivityAnalytics();
    
    // High view switching
    const avgViewSwitches = this.sessions.length > 0 ? 
      this.events.filter(e => e.type === WorkflowEventType.VIEW_CHANGE).length / this.sessions.length : 0;
    
    if (avgViewSwitches > 10) {
      suggestions.push({
        type: 'workflow',
        priority: 'medium',
        title: 'Reduce Context Switching',
        description: 'Users are switching views frequently, which may indicate inefficient workflows.',
        expectedImpact: '15-20% improvement in task completion time',
        implementation: [
          'Add more information to each view to reduce need for switching',
          'Implement smart defaults based on user patterns',
          'Provide contextual actions within views'
        ],
        metrics: ['Average view switches per session', 'Task completion time', 'User satisfaction']
      });
    }
    
    // Low keyboard shortcut usage
    const shortcutUsage = this.events.filter(e => e.type === WorkflowEventType.KEYBOARD_SHORTCUT).length;
    const totalActions = this.events.filter(e => 
      [WorkflowEventType.TASK_CREATED, WorkflowEventType.TASK_UPDATED, WorkflowEventType.FILTER_APPLIED].includes(e.type)
    ).length;
    
    if (shortcutUsage / totalActions < 0.1) {
      suggestions.push({
        type: 'usability',
        priority: 'low',
        title: 'Improve Keyboard Shortcut Adoption',
        description: 'Low keyboard shortcut usage detected. Power users could benefit from better shortcut discovery.',
        expectedImpact: '10-15% improvement in power user productivity',
        implementation: [
          'Add shortcut hints in tooltips',
          'Create a shortcuts help overlay',
          'Show shortcuts in context menus'
        ],
        metrics: ['Keyboard shortcut usage rate', 'Power user productivity score']
      });
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Helper methods
  private getTimeRangeCutoff(timeRange: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateViewTrends(viewStats: Record<string, any>): Record<string, string> {
    // Simplified trend calculation - in reality would compare with historical data
    const trends: Record<string, string> = {};
    Object.keys(viewStats).forEach(view => {
      trends[view] = 'stable'; // Would calculate actual trends
    });
    return trends;
  }

  private calculateProductivityTrend(sessions: UserSession[]): number {
    if (sessions.length < 2) return 0;
    
    const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
    const secondHalf = sessions.slice(Math.floor(sessions.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s.productivityScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.productivityScore, 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  private getBestPerformingTime(sessions: UserSession[]): { hour: number; day: number } {
    // Simplified - would analyze actual session performance by time
    return { hour: 10, day: 2 }; // 10 AM on Tuesday
  }

  private generateProductivityRecommendations(sessions: UserSession[]): string[] {
    const recommendations: string[] = [];
    
    const avgProductivity = sessions.reduce((sum, s) => sum + s.productivityScore, 0) / sessions.length;
    
    if (avgProductivity < 60) {
      recommendations.push('Focus on completing tasks rather than exploring multiple views');
      recommendations.push('Use keyboard shortcuts to improve efficiency');
    }
    
    const avgErrors = sessions.reduce((sum, s) => sum + s.errorsEncountered, 0) / sessions.length;
    if (avgErrors > 2) {
      recommendations.push('Take time to learn the interface to reduce errors');
    }
    
    return recommendations;
  }

  // End session
  public endCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.totalDuration = 
        this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
      
      this.sessions.push(this.currentSession);
      this.currentSession = null;
      
      // Keep only recent sessions
      if (this.sessions.length > 100) {
        this.sessions = this.sessions.slice(-100);
      }
    }
  }
}

// Singleton instance
const workflowAnalytics = new WorkflowAnalyticsEngine();

// Export functions for use in components
export const trackWorkflowEvent = (
  type: WorkflowEventType,
  data: any,
  userId: string,
  projectId: string,
  workspaceId: string
) => {
  workflowAnalytics.trackEvent(type, data, userId, projectId, workspaceId);
};

export const getViewAnalytics = (timeRange?: 'day' | 'week' | 'month') => {
  return workflowAnalytics.getViewAnalytics(timeRange);
};

export const getUserProductivityAnalytics = () => {
  return workflowAnalytics.getUserProductivityAnalytics();
};

export const getWorkflowInsights = () => {
  return workflowAnalytics.getWorkflowInsights();
};

export const getOptimizationSuggestions = () => {
  return workflowAnalytics.getOptimizationSuggestions();
};

export const endSession = () => {
  workflowAnalytics.endCurrentSession();
};

export { WorkflowEventType };
export type { 
  WorkflowEvent, 
  UserSession, 
  WorkflowPattern, 
  PerformanceInsight, 
  OptimizationSuggestion 
};