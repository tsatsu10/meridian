import type { ProjectView, ViewState } from '@/store/project';
import type { ProjectAnalytics } from '@/types/project-view';

// AI recommendation types
interface ViewRecommendation {
  view: ProjectView;
  confidence: number; // 0-1
  reason: string;
  priority: 'low' | 'medium' | 'high';
  timeToComplete?: number; // estimated minutes
  requiredActions?: string[];
}

interface UserBehaviorPattern {
  userId: string;
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  currentView: ProjectView;
  previousViews: ProjectView[];
  sessionDuration: number; // minutes
  tasksCompleted: number;
  actionsPerformed: string[];
  contextSwitches: number;
}

interface ProjectContext {
  totalTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  completionRate: number;
  averageTaskAge: number; // days
  upcomingDeadlines: number; // tasks due in next 7 days
  teamSize: number;
  projectPhase: 'planning' | 'execution' | 'review' | 'maintenance';
}

// Machine learning-like recommendation engine
class AIViewRecommendationEngine {
  private behaviorHistory: UserBehaviorPattern[] = [];
  private contextHistory: ProjectContext[] = [];
  private viewTransitionMatrix: Record<ProjectView, Record<ProjectView, number>> = this.initTransitionMatrix();

  private initTransitionMatrix(): Record<ProjectView, Record<ProjectView, number>> {
    const views: ProjectView[] = ['overview', 'board', 'list', 'timeline', 'milestones', 'backlog'];
    const matrix: any = {};
    
    views.forEach(from => {
      matrix[from] = {};
      views.forEach(to => {
        matrix[from][to] = 0;
      });
    });
    
    return matrix;
  }

  // Learn from user behavior
  public recordBehaviorPattern(pattern: UserBehaviorPattern): void {
    this.behaviorHistory.push(pattern);
    
    // Update transition matrix
    if (pattern.previousViews.length > 0) {
      const currentView = pattern.currentView;
      const previousView = pattern.previousViews[pattern.previousViews.length - 1];
      this.viewTransitionMatrix[previousView][currentView]++;
    }
    
    // Keep only recent history (last 1000 patterns)
    if (this.behaviorHistory.length > 1000) {
      this.behaviorHistory = this.behaviorHistory.slice(-1000);
    }
  }

  // Record project context
  public recordProjectContext(context: ProjectContext): void {
    this.contextHistory.push(context);
    
    // Keep only recent context (last 100 entries)
    if (this.contextHistory.length > 100) {
      this.contextHistory = this.contextHistory.slice(-100);
    }
  }

  // Generate recommendations based on current context
  public getRecommendations(
    currentView: ProjectView,
    projectContext: ProjectContext,
    userPattern: Partial<UserBehaviorPattern>,
    analytics: ProjectAnalytics
  ): ViewRecommendation[] {
    const recommendations: ViewRecommendation[] = [];
    
    // Time-based recommendations
    recommendations.push(...this.getTimeBasedRecommendations(currentView, userPattern));
    
    // Context-based recommendations
    recommendations.push(...this.getContextBasedRecommendations(currentView, projectContext, analytics));
    
    // Pattern-based recommendations
    recommendations.push(...this.getPatternBasedRecommendations(currentView, userPattern));
    
    // Workflow optimization recommendations
    recommendations.push(...this.getWorkflowOptimizationRecommendations(currentView, projectContext));
    
    // Sort by confidence and priority
    return recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] * b.confidence) - (priorityWeight[a.priority] * a.confidence);
      })
      .slice(0, 3); // Return top 3 recommendations
  }

  private getTimeBasedRecommendations(
    currentView: ProjectView,
    userPattern: Partial<UserBehaviorPattern>
  ): ViewRecommendation[] {
    const recommendations: ViewRecommendation[] = [];
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    // Morning recommendations (8-12)
    if (currentHour >= 8 && currentHour < 12) {
      if (currentView !== 'overview') {
        recommendations.push({
          view: 'overview',
          confidence: 0.7,
          reason: 'Start your day with a project overview to plan your priorities',
          priority: 'medium',
          timeToComplete: 5,
          requiredActions: ['Review project health', 'Check upcoming deadlines']
        });
      }
      
      if (currentView !== 'milestones') {
        recommendations.push({
          view: 'milestones',
          confidence: 0.6,
          reason: 'Morning is ideal for milestone planning and goal setting',
          priority: 'medium',
          timeToComplete: 10
        });
      }
    }

    // Afternoon recommendations (12-17)
    if (currentHour >= 12 && currentHour < 17) {
      if (currentView !== 'board') {
        recommendations.push({
          view: 'board',
          confidence: 0.8,
          reason: 'Peak productivity hours - perfect for active task management',
          priority: 'high',
          timeToComplete: 3,
          requiredActions: ['Update task statuses', 'Move tasks through workflow']
        });
      }
    }

    // End of day recommendations (17-20)
    if (currentHour >= 17 && currentHour < 20) {
      if (currentView !== 'timeline') {
        recommendations.push({
          view: 'timeline',
          confidence: 0.7,
          reason: 'Review progress and plan for tomorrow',
          priority: 'medium',
          timeToComplete: 8
        });
      }
    }

    return recommendations;
  }

  private getContextBasedRecommendations(
    currentView: ProjectView,
    projectContext: ProjectContext,
    analytics: ProjectAnalytics
  ): ViewRecommendation[] {
    const recommendations: ViewRecommendation[] = [];

    // High overdue tasks
    if (analytics.overdueTasks > 5 && currentView !== 'list') {
      recommendations.push({
        view: 'list',
        confidence: 0.9,
        reason: `You have ${analytics.overdueTasks} overdue tasks that need immediate attention`,
        priority: 'high',
        timeToComplete: 15,
        requiredActions: ['Review overdue tasks', 'Update priorities', 'Reassign if needed']
      });
    }

    // Low completion rate
    if (projectContext.completionRate < 0.6 && currentView !== 'board') {
      recommendations.push({
        view: 'board',
        confidence: 0.8,
        reason: 'Low completion rate detected - board view helps identify bottlenecks',
        priority: 'high',
        timeToComplete: 10,
        requiredActions: ['Identify blocked tasks', 'Balance workload across columns']
      });
    }

    // Upcoming deadlines
    if (projectContext.upcomingDeadlines > 10 && currentView !== 'timeline') {
      recommendations.push({
        view: 'timeline',
        confidence: 0.85,
        reason: `${projectContext.upcomingDeadlines} tasks due soon - timeline view helps with scheduling`,
        priority: 'high',
        timeToComplete: 12,
        requiredActions: ['Review deadlines', 'Reschedule if needed', 'Identify dependencies']
      });
    }

    // Project planning phase
    if (projectContext.projectPhase === 'planning' && currentView !== 'backlog') {
      recommendations.push({
        view: 'backlog',
        confidence: 0.75,
        reason: 'Planning phase - organize and prioritize your backlog',
        priority: 'medium',
        timeToComplete: 20,
        requiredActions: ['Add user stories', 'Estimate story points', 'Set priorities']
      });
    }

    // Review phase
    if (projectContext.projectPhase === 'review' && currentView !== 'milestones') {
      recommendations.push({
        view: 'milestones',
        confidence: 0.8,
        reason: 'Review phase - assess milestone completion and project progress',
        priority: 'medium',
        timeToComplete: 15
      });
    }

    return recommendations;
  }

  private getPatternBasedRecommendations(
    currentView: ProjectView,
    userPattern: Partial<UserBehaviorPattern>
  ): ViewRecommendation[] {
    const recommendations: ViewRecommendation[] = [];

    // Find most common transitions from current view
    const transitions = this.viewTransitionMatrix[currentView];
    const sortedTransitions = Object.entries(transitions)
      .sort(([, a], [, b]) => b - a)
      .filter(([view]) => view !== currentView);

    if (sortedTransitions.length > 0) {
      const [mostCommonView, frequency] = sortedTransitions[0];
      if (frequency > 5) { // Only recommend if we have enough data
        recommendations.push({
          view: mostCommonView as ProjectView,
          confidence: Math.min(frequency / 20, 0.7), // Cap at 0.7 confidence
          reason: `Based on your usage patterns, you typically move to ${mostCommonView} from here`,
          priority: 'low',
          timeToComplete: 5
        });
      }
    }

    // High context switching pattern
    if (userPattern.contextSwitches && userPattern.contextSwitches > 10) {
      recommendations.push({
        view: 'overview',
        confidence: 0.6,
        reason: 'Frequent view switching detected - overview can help you focus',
        priority: 'medium',
        timeToComplete: 5,
        requiredActions: ['Review current priorities', 'Identify main focus areas']
      });
    }

    return recommendations;
  }

  private getWorkflowOptimizationRecommendations(
    currentView: ProjectView,
    projectContext: ProjectContext
  ): ViewRecommendation[] {
    const recommendations: ViewRecommendation[] = [];

    // Suggest complementary views for better workflow
    const complementaryViews: Record<ProjectView, { view: ProjectView; reason: string; confidence: number }[]> = {
      overview: [
        { view: 'board', reason: 'Dive deeper into active task management', confidence: 0.6 },
        { view: 'timeline', reason: 'Check upcoming deadlines and dependencies', confidence: 0.5 }
      ],
      board: [
        { view: 'list', reason: 'Get detailed view of all tasks with filtering options', confidence: 0.7 },
        { view: 'milestones', reason: 'Align board tasks with project milestones', confidence: 0.5 }
      ],
      list: [
        { view: 'board', reason: 'Visualize workflow and identify bottlenecks', confidence: 0.6 },
        { view: 'timeline', reason: 'See task relationships and scheduling conflicts', confidence: 0.6 }
      ],
      timeline: [
        { view: 'milestones', reason: 'Connect timeline tasks to project goals', confidence: 0.7 },
        { view: 'board', reason: 'Focus on current sprint execution', confidence: 0.5 }
      ],
      milestones: [
        { view: 'timeline', reason: 'Plan detailed timeline to achieve milestones', confidence: 0.8 },
        { view: 'backlog', reason: 'Prioritize backlog items for next milestone', confidence: 0.6 }
      ],
      backlog: [
        { view: 'board', reason: 'Move prioritized items to active development', confidence: 0.7 },
        { view: 'milestones', reason: 'Align backlog items with project milestones', confidence: 0.6 }
      ]
    };

    const complementary = complementaryViews[currentView] || [];
    recommendations.push(...complementary.map(item => ({
      view: item.view,
      confidence: item.confidence,
      reason: item.reason,
      priority: 'low' as const,
      timeToComplete: 7
    })));

    return recommendations;
  }

  // Get smart shortcuts based on current context
  public getSmartShortcuts(
    currentView: ProjectView,
    projectContext: ProjectContext,
    recentActions: string[]
  ): { action: string; shortcut: string; description: string; confidence: number }[] {
    const shortcuts: { action: string; shortcut: string; description: string; confidence: number }[] = [];

    // Context-aware shortcuts
    if (projectContext.overdueTasks > 0) {
      shortcuts.push({
        action: 'filter:overdue',
        shortcut: 'Ctrl+Shift+O',
        description: 'Quickly filter to show only overdue tasks',
        confidence: 0.9
      });
    }

    if (projectContext.inProgressTasks > 10) {
      shortcuts.push({
        action: 'filter:in-progress',
        shortcut: 'Ctrl+Shift+P',
        description: 'Focus on tasks in progress',
        confidence: 0.8
      });
    }

    // Recent action patterns
    if (recentActions.includes('create-task')) {
      shortcuts.push({
        action: 'bulk-create',
        shortcut: 'Ctrl+Shift+N',
        description: 'Create multiple tasks quickly',
        confidence: 0.7
      });
    }

    return shortcuts.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
}

// Singleton instance
const aiRecommendationEngine = new AIViewRecommendationEngine();

// Export functions for use in components
export const recordUserBehavior = (pattern: UserBehaviorPattern) => {
  aiRecommendationEngine.recordBehaviorPattern(pattern);
};

export const recordProjectContext = (context: ProjectContext) => {
  aiRecommendationEngine.recordProjectContext(context);
};

export const getViewRecommendations = (
  currentView: ProjectView,
  projectContext: ProjectContext,
  userPattern: Partial<UserBehaviorPattern>,
  analytics: ProjectAnalytics
): ViewRecommendation[] => {
  return aiRecommendationEngine.getRecommendations(currentView, projectContext, userPattern, analytics);
};

export const getSmartShortcuts = (
  currentView: ProjectView,
  projectContext: ProjectContext,
  recentActions: string[]
) => {
  return aiRecommendationEngine.getSmartShortcuts(currentView, projectContext, recentActions);
};

export type { ViewRecommendation, UserBehaviorPattern, ProjectContext };
export { AIViewRecommendationEngine };