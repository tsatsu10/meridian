/**
 * Frontend Type Definitions
 * Centralized types for the web application
 */

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  workspaceId?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | 'workspace-manager'
  | 'admin'
  | 'project-manager'
  | 'team-lead'
  | 'member'
  | 'guest'
  | 'project-viewer'
  | 'department-head';

// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  ownerId: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: UserRole;
  joinedAt: string;
  user: User;
}

export interface WorkspaceSettings {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  ownerId: string;
  status: ProjectStatus;
  priority: Priority;
  startDate?: string;
  dueDate?: string;
  progress: number;
  health: ProjectHealth;
  tags: Tag[];
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'archived';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectHealth = 'good' | 'at-risk' | 'critical';

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  user: User;
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  parentId?: string; // For subtasks
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  reporterId: string;
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  tags: Tag[];
  attachments: Attachment[];
  comments: Comment[];
  subtasks: Task[];
  dependencies: string[]; // Task IDs
  position: number; // For ordering
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 
  | 'backlog'
  | 'todo'
  | 'in-progress'
  | 'review'
  | 'blocked'
  | 'done'
  | 'cancelled';

// Tag Types
export interface Tag {
  id: string;
  name: string;
  color: string;
  workspaceId: string;
}

// Attachment Types
export interface Attachment {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Comment Types
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  resourceType: 'task' | 'project';
  resourceId: string;
  parentId?: string;
  mentions: string[];
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'mention'
  | 'comment'
  | 'project_invite'
  | 'workspace_invite'
  | 'system';

// Activity Types
export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: ActivityAction;
  resource: string;
  resourceId: string;
  description: string;
  timestamp: string;
}

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'complete'
  | 'assign'
  | 'comment'
  | 'mention';

// Analytics Types
export interface DashboardAnalytics {
  overview: OverviewMetrics;
  taskMetrics: TaskMetrics;
  projectMetrics: ProjectMetrics;
  teamMetrics: TeamMetrics;
  timeRange: TimeRange;
}

export interface OverviewMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamMembers: number;
  projectsChange: number;
  tasksChange: number;
}

export interface TaskMetrics {
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<Priority, number>;
  completionRate: number;
  averageCompletionTime: number;
  overdueCount: number;
}

export interface ProjectMetrics {
  byStatus: Record<ProjectStatus, number>;
  byHealth: Record<ProjectHealth, number>;
  averageProgress: number;
  onTrackCount: number;
  atRiskCount: number;
}

export interface TeamMetrics {
  activeMembers: number;
  tasksPerMember: number;
  averageWorkload: number;
  topContributors: Contributor[];
}

export interface Contributor {
  userId: string;
  userName: string;
  userAvatar?: string;
  tasksCompleted: number;
  contribution: number; // percentage
}

export interface TimeRange {
  from: string;
  to: string;
  label: string;
}

// Time Tracking Types
export interface TimeEntry {
  id: string;
  userId: string;
  taskId?: string;
  projectId: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  billable: boolean;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form Types
export interface FormState<T = any> {
  data: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Filter & Sort Types
export interface FilterOptions {
  status?: TaskStatus[];
  priority?: Priority[];
  assignee?: string[];
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// UI State Types
export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  activeView: 'list' | 'board' | 'calendar' | 'timeline';
  filtersPanelOpen: boolean;
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

