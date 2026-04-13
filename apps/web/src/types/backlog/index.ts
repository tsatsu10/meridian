import type Task from "@/types/task";

// @epic-1.1-subtasks @persona-sarah - PM needs theme-based task organization
export interface TaskTheme {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: Task[];
  targetRelease?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

// @epic-1.1-subtasks @persona-mike - Developer needs enhanced task context
export interface EnhancedTask extends Task {
  themeId?: string;
  storyPoints?: number;
  businessValue?: number;
  effort?: number;
  refinementStatus: 'draft' | 'refined' | 'ready';
  labels: string[];
  acceptanceCriteria: string[];
  ageInDays?: number;
}

// @epic-3.2-time @persona-david - Team Lead needs prioritization tools
export interface PriorityScore {
  reach: number; // 1-10
  impact: number; // 1-10
  confidence: number; // 1-10 (percentage as decimal)
  effort: number; // 1-10
  riceScore: number; // calculated: (reach * impact * confidence) / effort
}

export interface TaskWithPriority extends EnhancedTask {
  priorityScore?: PriorityScore;
  moscowCategory?: 'must' | 'should' | 'could' | 'wont';
}

// @epic-1.2-gantt @persona-jennifer - Executive needs backlog health metrics
export interface BacklogHealth {
  totalTasks: number;
  refinedTasks: number;
  readyTasks: number;
  averageAge: number;
  oldestTask: number;
  refinementPercentage: number;
  readyPercentage: number;
  velocityTrend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// @epic-1.1-subtasks @persona-sarah - PM needs sprint planning capabilities
export interface SprintCapacity {
  totalPoints: number;
  availablePoints: number;
  committedPoints: number;
  teamVelocity: number;
  sprintGoal?: string;
  warningLevel: 'none' | 'approaching' | 'over';
}

// Filtering and view options
export interface BacklogFilters {
  search: string;
  themeId?: string;
  priority?: string;
  assignee?: string;
  refinementStatus?: 'draft' | 'refined' | 'ready';
  moscowCategory?: 'must' | 'should' | 'could' | 'wont';
  ageRange?: { min: number; max: number };
  storyPointRange?: { min: number; max: number };
  labels?: string[];
}

export interface BacklogViewOptions {
  viewMode: 'list' | 'themes' | 'priority-matrix' | 'timeline' | 'releases';
  groupBy?: 'theme' | 'priority' | 'assignee' | 'release' | 'refinement';
  sortBy?: 'priority' | 'age' | 'storyPoints' | 'businessValue' | 'effort';
  sortOrder: 'asc' | 'desc';
}

// Theme management
export interface ThemeProgress {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  plannedTasks: number;
  progressPercentage: number;
  storyPointsTotal: number;
  storyPointsCompleted: number;
  estimatedCompletion?: string;
}

export interface ThemeWithProgress extends TaskTheme {
  progress: ThemeProgress;
  health: 'excellent' | 'good' | 'warning' | 'critical';
  risks: string[];
} 