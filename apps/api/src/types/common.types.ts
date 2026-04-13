/**
 * Common Type Definitions
 * Shared types across the entire API
 */

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  duration?: number;
  version?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// Sorting
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// Filtering
export interface FilterParams {
  [key: string]: any;
}

// Date Range
export interface DateRange {
  from: Date | string;
  to: Date | string;
}

// User Context (for requests)
export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  workspaceId?: string;
  permissions?: string[];
  ip?: string;
  userAgent?: string;
}

// User Roles
export type UserRole = 
  | 'workspace-manager'
  | 'admin'
  | 'project-manager'
  | 'team-lead'
  | 'member'
  | 'guest'
  | 'project-viewer'
  | 'department-head';

// File Upload
export interface FileUpload {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  originalname: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
  path: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// Database Entity Base
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Audit Trail
export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
  deletedBy?: string | null;
}

// Metadata
export interface Metadata {
  [key: string]: string | number | boolean | null | undefined;
}

// Error Types
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
  stack?: string; // Only in development
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Request Context
export interface RequestContext {
  user?: UserContext;
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  workspaceId?: string;
  projectId?: string;
}

// WebSocket Message
export interface WebSocketMessage<T = any> {
  type: string;
  event: string;
  data: T;
  timestamp: number;
  userId?: string;
  workspaceId?: string;
  channelId?: string;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Metadata;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'mention'
  | 'comment'
  | 'project_invite'
  | 'workspace_invite'
  | 'system'
  | 'reminder';

// Activity Log
export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  action: ActivityAction;
  resource: string;
  resourceId: string;
  description: string;
  metadata?: Metadata;
  timestamp: Date;
}

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'assign'
  | 'unassign'
  | 'comment'
  | 'mention'
  | 'complete'
  | 'reopen';

// Time Tracking
export interface TimeEntry {
  id: string;
  userId: string;
  taskId?: string;
  projectId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  billable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Comment
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  resourceType: 'task' | 'project' | 'workspace';
  resourceId: string;
  parentId?: string; // For nested comments
  mentions?: string[]; // User IDs
  attachments?: UploadedFile[];
  reactions?: Reaction[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

// Tag
export interface Tag {
  id: string;
  name: string;
  color: string;
  workspaceId: string;
  createdAt: Date;
}

// Health Check
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  services: ServiceHealth[];
  version: string;
  environment: string;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

// Analytics
export interface AnalyticsData {
  workspaceId: string;
  projectId?: string;
  userId?: string;
  timeRange: TimeRange;
  metrics: Metric[];
  aggregations?: Aggregation[];
}

export interface TimeRange {
  from: Date;
  to: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface Metric {
  name: string;
  value: number;
  unit?: string;
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'stable';
}

export interface Aggregation {
  field: string;
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  value: number;
}

// Export common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Without<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type With<T, K extends keyof T> = Required<Pick<T, K>>;

// ID types for type safety
export type UserId = string & { readonly __brand: 'UserId' };
export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type TaskId = string & { readonly __brand: 'TaskId' };

// Helper to create branded IDs
export function createUserId(id: string): UserId {
  return id as UserId;
}

export function createWorkspaceId(id: string): WorkspaceId {
  return id as WorkspaceId;
}

export function createProjectId(id: string): ProjectId {
  return id as ProjectId;
}

export function createTaskId(id: string): TaskId {
  return id as TaskId;
}


