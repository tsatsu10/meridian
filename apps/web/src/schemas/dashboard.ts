/**
 * 📋 Dashboard Data Validation Schemas
 * 
 * Runtime validation using Zod to ensure data integrity
 * and provide type-safe defaults when API data is malformed.
 */

import { z } from 'zod';

/**
 * Dashboard Statistics Schema
 */
export const DashboardStatsSchema = z.object({
  totalTasks: z.number().int().nonnegative().default(0),
  completedTasks: z.number().int().nonnegative().default(0),
  overdueTasks: z.number().int().nonnegative().default(0),
  dueTodayTasks: z.number().int().nonnegative().default(0),
  activeProjects: z.number().int().nonnegative().default(0).optional(),
  teamMembers: z.number().int().nonnegative().default(0),
  productivity: z.number().int().min(0).max(100).default(0).optional(),
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Task Status Schema
 */
export const TaskStatusSchema = z.enum([
  'pending',
  'in-progress',
  'review',
  'done',
  'blocked',
  'cancelled'
]).default('pending');

/**
 * Task Priority Schema
 */
export const TaskPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent'
]).default('medium');

/**
 * Task Schema
 */
export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().optional(), // Allow any date format
  createdAt: z.string().optional(), // Make optional for flexibility
  updatedAt: z.string().optional(), // Make optional for flexibility
  completedAt: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Project Status Schema
 */
export const ProjectStatusSchema = z.enum([
  'active',
  'completed',
  'archived',
  'on-hold'
]).default('active');

/**
 * Column Schema (for Kanban boards)
 */
export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  order: z.number().int().nonnegative().optional(),
  tasks: z.array(z.any()).default([]), // Allow any task structure
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Project Schema
 */
export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.string().optional(), // Allow any status
  icon: z.string().optional(),
  color: z.string().optional(), // Allow any color format
  progress: z.number().min(0).max(100).default(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  ownerId: z.string().optional(),
  workspaceId: z.string().optional(),
  // Allow any task/column structure
  tasks: z.array(z.any()).optional().default([]),
  columns: z.array(z.any()).optional().default([]),
  // Additional fields that might come from API
  teamSize: z.number().optional(),
  lastActivity: z.string().optional(),
  members: z.array(z.any()).optional(),
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Activity Type Schema
 */
export const ActivityTypeSchema = z.enum([
  'task_created',
  'task_completed',
  'task_updated',
  'project_created',
  'project_updated',
  'team_joined',
  'comment_added',
  'file_uploaded'
]);

/**
 * Activity Schema
 */
export const ActivitySchema = z.object({
  id: z.string().min(1),
  type: z.string(), // Allow any activity type
  description: z.string().min(1).max(500),
  project: z.string().max(200).optional(),
  userId: z.string().optional(),
  user: z.string().optional(), // User name
  timestamp: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Deadline Schema
 */
export const DeadlineSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(1).max(200),
  project: z.string().optional(), // Project name
  dueDate: z.string().optional(),
  isOverdue: z.boolean().default(false).optional(),
  priority: z.string().optional(), // Allow any priority
  assignee: z.string().optional(), // Assignee name
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Risk Alert Schema
 */
export const RiskAlertSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  severity: z.string().optional(), // Allow any severity
  affectedTasks: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Complete Dashboard Data Schema
 */
export const DashboardDataSchema = z.object({
  stats: DashboardStatsSchema,
  projects: z.array(z.any()).default([]), // Allow any project structure
  activities: z.array(z.any()).optional().default([]), // Allow any activity structure
  deadlines: z.array(z.any()).optional().default([]), // Allow any deadline structure
  risks: z.array(z.any()).optional().default([]), // Allow any risk structure
  teamMembers: z.array(z.any()).optional().default([]), // Team members array
}).passthrough(); // Changed from .strict() to allow extra fields

/**
 * Type exports
 */
export type DashboardData = z.infer<typeof DashboardDataSchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type Deadline = z.infer<typeof DeadlineSchema>;
export type RiskAlert = z.infer<typeof RiskAlertSchema>;

/**
 * Validation helper with safe defaults
 * Validates data and returns safe defaults if validation fails
 */
export function validateDashboardData(data: unknown): DashboardData {
  try {
    return DashboardDataSchema.parse(data);
  } catch (error) {
    console.error('Dashboard data validation failed:', error);
    
    // Return safe default structure
    return {
      stats: {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        dueTodayTasks: 0,
        teamMembers: 0,
      },
      projects: [],
      activities: [],
      deadlines: [],
      risks: [],
    };
  }
}

/**
 * Partial validation - validates only the data provided
 * Useful for updates where not all fields are present
 */
export function validatePartialDashboardData(data: unknown): Partial<DashboardData> {
  try {
    return DashboardDataSchema.partial().parse(data);
  } catch (error) {
    console.error('Partial dashboard data validation failed:', error);
    return {};
  }
}

/**
 * Validate individual project
 */
export function validateProject(data: unknown): Project | null {
  try {
    return ProjectSchema.parse(data);
  } catch (error) {
    console.error('Project validation failed:', error);
    return null;
  }
}

/**
 * Validate individual task
 */
export function validateTask(data: unknown): Task | null {
  try {
    return TaskSchema.parse(data);
  } catch (error) {
    console.error('Task validation failed:', error);
    return null;
  }
}

/**
 * Safe array validation - filters out invalid items
 */
export function validateProjectArray(data: unknown[]): Project[] {
  if (!Array.isArray(data)) return [];
  
  return data
    .map(item => validateProject(item))
    .filter((project): project is Project => project !== null);
}

/**
 * Safe array validation for tasks
 */
export function validateTaskArray(data: unknown[]): Task[] {
  if (!Array.isArray(data)) return [];
  
  return data
    .map(item => validateTask(item))
    .filter((task): task is Task => task !== null);
}

/**
 * Dashboard data with metadata
 */
export interface ValidatedDashboardData extends DashboardData {
  _metadata: {
    validatedAt: Date;
    validationErrors: number;
    hasWarnings: boolean;
  };
}

/**
 * Enhanced validation with metadata
 */
export function validateDashboardDataWithMetadata(data: unknown): ValidatedDashboardData {
  const validationStart = new Date();
  let validationErrors = 0;
  let hasWarnings = false;
  
  let validatedData: DashboardData;
  
  try {
    validatedData = DashboardDataSchema.parse(data);
  } catch (error) {
    validationErrors++;
    hasWarnings = true;
    console.error('❌ Dashboard validation failed:', error);
    console.log('📦 Data that failed validation:', JSON.stringify(data, null, 2));
    validatedData = validateDashboardData(data);
  }
  
  return {
    ...validatedData,
    _metadata: {
      validatedAt: validationStart,
      validationErrors,
      hasWarnings,
    },
  };
}

