/**
 * 📋 Unified Validation Schemas
 * 
 * Central repository of Zod schemas for request validation across the API.
 * 
 * @epic-infrastructure: Type-safe validation layer
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Common field schemas
 */
export const commonSchemas = {
  // IDs
  id: z.string().min(1, 'ID is required'),
  cuid: z.string().regex(/^[a-z0-9]{24,32}$/, 'Invalid ID format'),
  email: z.string().email('Invalid email address'),
  
  // Dates
  isoDate: z.string().datetime('Invalid ISO date format'),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  
  // Numbers
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonNegativeInt: z.number().int().nonnegative('Must be non-negative'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  
  // Strings
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
  url: z.string().url('Invalid URL'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  
  // Enums
  status: z.enum(['todo', 'in_progress', 'done'], {
    errorMap: () => ({ message: 'Invalid status' }),
  }),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Invalid priority' }),
  }),
  role: z.enum(['member', 'team-lead', 'project-manager', 'admin', 'workspace-manager', 'guest', 'department-head', 'project-viewer'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
};

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userSchemas = {
  /**
   * Sign up validation
   */
  signUp: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }),
  
  /**
   * Sign in validation
   */
  signIn: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
  
  /**
   * Update user profile
   */
  updateProfile: z.object({
    name: z.string().min(2).max(100).optional(),
    avatar: z.string().url().optional(),
    timezone: z.string().optional(),
    language: z.string().length(2).optional(), // ISO 639-1
    bio: z.string().max(500).optional(),
    jobTitle: z.string().max(100).optional(),
  }),
  
  /**
   * Update user settings
   */
  updateSettings: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      desktop: z.boolean().optional(),
    }).optional(),
    privacy: z.object({
      showOnlineStatus: z.boolean().optional(),
      showEmail: z.boolean().optional(),
    }).optional(),
  }),
};

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const projectSchemas = {
  /**
   * Create project
   */
  create: z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters').max(100),
    description: z.string().max(1000).optional(),
    workspaceId: commonSchemas.cuid,
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex').optional(),
    icon: z.string().max(50).optional(),
    priority: commonSchemas.priority.optional(),
    startDate: commonSchemas.isoDate.optional(),
    dueDate: commonSchemas.isoDate.optional(),
  }).refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return new Date(data.startDate) <= new Date(data.dueDate);
      }
      return true;
    },
    {
      message: 'Start date must be before due date',
      path: ['dueDate'],
    }
  ),
  
  /**
   * Update project
   */
  update: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(1000).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
    status: z.enum(['active', 'on-hold', 'completed', 'cancelled']).optional(),
    priority: commonSchemas.priority.optional(),
    startDate: commonSchemas.isoDate.optional(),
    dueDate: commonSchemas.isoDate.optional(),
    isArchived: z.boolean().optional(),
  }),
  
  /**
   * Query projects
   */
  query: z.object({
    workspaceId: commonSchemas.cuid,
    status: z.enum(['active', 'on-hold', 'completed', 'cancelled', 'all']).optional(),
    isArchived: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
};

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const taskSchemas = {
  /**
   * Create task
   */
  create: z.object({
    title: z.string().min(1, 'Task title is required').max(200),
    description: z.string().max(5000).optional(),
    projectId: commonSchemas.cuid,
    assigneeId: commonSchemas.cuid.optional(),
    status: commonSchemas.status.optional(),
    priority: commonSchemas.priority.optional(),
    dueDate: commonSchemas.isoDate.optional(),
    startDate: commonSchemas.isoDate.optional(),
    estimatedHours: commonSchemas.positiveInt.optional(),
    parentTaskId: commonSchemas.cuid.optional(),
  }),
  
  /**
   * Update task
   */
  update: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    assigneeId: commonSchemas.cuid.nullable().optional(),
    status: commonSchemas.status.optional(),
    priority: commonSchemas.priority.optional(),
    dueDate: commonSchemas.isoDate.nullable().optional(),
    startDate: commonSchemas.isoDate.nullable().optional(),
    estimatedHours: commonSchemas.positiveInt.nullable().optional(),
    actualHours: commonSchemas.nonNegativeInt.nullable().optional(),
    position: commonSchemas.nonNegativeInt.optional(),
  }),
  
  /**
   * Bulk update tasks
   */
  bulkUpdate: z.object({
    taskIds: z.array(commonSchemas.cuid).min(1, 'At least one task ID required').max(100, 'Maximum 100 tasks'),
    updates: z.object({
      status: commonSchemas.status.optional(),
      priority: commonSchemas.priority.optional(),
      assigneeId: commonSchemas.cuid.nullable().optional(),
    }),
  }),
  
  /**
   * Query tasks
   */
  query: z.object({
    projectId: commonSchemas.cuid.optional(),
    assigneeId: commonSchemas.cuid.optional(),
    status: commonSchemas.status.optional(),
    priority: commonSchemas.priority.optional(),
    search: z.string().max(200).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
};

// ============================================================================
// WORKSPACE SCHEMAS
// ============================================================================

export const workspaceSchemas = {
  /**
   * Create workspace
   */
  create: z.object({
    name: z.string().min(3, 'Workspace name must be at least 3 characters').max(100),
    description: z.string().max(500).optional(),
    slug: commonSchemas.slug.optional(),
  }),
  
  /**
   * Update workspace
   */
  update: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    logo: z.string().url().optional(),
    settings: z.record(z.any()).optional(),
  }),
  
  /**
   * Invite member
   */
  inviteMember: z.object({
    email: z.string().email(),
    role: commonSchemas.role,
    message: z.string().max(500).optional(),
  }),
  
  /**
   * Update member role
   */
  updateMemberRole: z.object({
    userId: commonSchemas.cuid,
    role: commonSchemas.role,
    permissions: z.array(z.string()).optional(),
  }),
};

// ============================================================================
// TIME ENTRY SCHEMAS
// ============================================================================

export const timeEntrySchemas = {
  /**
   * Start time entry
   */
  start: z.object({
    taskId: commonSchemas.cuid.optional(),
    description: z.string().max(500).optional(),
  }),
  
  /**
   * Stop time entry
   */
  stop: z.object({
    id: commonSchemas.cuid,
  }),
  
  /**
   * Create manual time entry
   */
  create: z.object({
    taskId: commonSchemas.cuid.optional(),
    description: z.string().max(500).optional(),
    startTime: commonSchemas.isoDate,
    endTime: commonSchemas.isoDate,
    duration: commonSchemas.positiveInt, // in seconds
  }).refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    {
      message: 'Start time must be before end time',
      path: ['endTime'],
    }
  ),
  
  /**
   * Query time entries
   */
  query: z.object({
    userEmail: commonSchemas.email.optional(),
    taskId: commonSchemas.cuid.optional(),
    projectId: commonSchemas.cuid.optional(),
    startDate: commonSchemas.dateString.optional(),
    endDate: commonSchemas.dateString.optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  }),
};

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const notificationSchemas = {
  /**
   * Create notification
   */
  create: z.object({
    userId: commonSchemas.cuid,
    title: z.string().min(1).max(200),
    content: z.string().max(1000).optional(),
    type: z.enum(['info', 'success', 'warning', 'error', 'mention', 'task_assigned', 'comment']),
    resourceId: commonSchemas.cuid.optional(),
    resourceType: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  
  /**
   * Update notification
   */
  update: z.object({
    isRead: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  }),
  
  /**
   * Bulk mark as read
   */
  bulkMarkRead: z.object({
    notificationIds: z.array(commonSchemas.cuid).min(1).max(100),
  }),
};

// ============================================================================
// FILE SCHEMAS
// ============================================================================

export const fileSchemas = {
  /**
   * Upload file metadata
   */
  uploadMetadata: z.object({
    fileName: z.string().min(1).max(255),
    fileSize: commonSchemas.positiveInt.max(100 * 1024 * 1024, 'File too large (max 100MB)'),
    fileType: z.string().min(1).max(100),
    taskId: commonSchemas.cuid.optional(),
    projectId: commonSchemas.cuid.optional(),
    description: z.string().max(500).optional(),
  }),
  
  /**
   * File version
   */
  createVersion: z.object({
    fileId: commonSchemas.cuid,
    changes: z.string().max(500).optional(),
    versionNumber: commonSchemas.positiveInt,
  }),
};

// ============================================================================
// MILESTONE SCHEMAS
// ============================================================================

export const milestoneSchemas = {
  /**
   * Create milestone
   */
  create: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
    projectId: commonSchemas.cuid,
    type: z.enum(['phase', 'deadline', 'review', 'release', 'other']),
    dueDate: commonSchemas.isoDate,
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    stakeholderIds: z.array(commonSchemas.cuid).optional(),
  }),
  
  /**
   * Update milestone
   */
  update: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']).optional(),
    dueDate: commonSchemas.isoDate.optional(),
    completedAt: commonSchemas.isoDate.nullable().optional(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }),
};

// ============================================================================
// CHANNEL & MESSAGE SCHEMAS
// ============================================================================

export const channelSchemas = {
  /**
   * Create channel
   */
  create: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    workspaceId: commonSchemas.cuid,
    isPrivate: z.boolean().optional(),
  }),
  
  /**
   * Update channel
   */
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isArchived: z.boolean().optional(),
  }),
  
  /**
   * Send message
   */
  sendMessage: z.object({
    channelId: commonSchemas.cuid,
    content: z.string().min(1, 'Message cannot be empty').max(10000),
    attachments: z.array(z.object({
      id: commonSchemas.cuid,
      fileName: z.string(),
      fileUrl: z.string().url(),
    })).optional(),
  }),
  
  /**
   * Edit message
   */
  editMessage: z.object({
    content: z.string().min(1).max(10000),
  }),
};

// ============================================================================
// INTEGRATION SCHEMAS
// ============================================================================

export const integrationSchemas = {
  /**
   * Create integration
   */
  create: z.object({
    name: z.string().min(1).max(100),
    provider: z.enum(['github', 'slack', 'jira', 'discord', 'teams', 'gitlab', 'bitbucket']),
    workspaceId: commonSchemas.cuid,
    config: z.record(z.any()),
    credentials: z.record(z.any()).optional(),
  }),
  
  /**
   * Update integration
   */
  update: z.object({
    config: z.record(z.any()).optional(),
    status: z.enum(['active', 'inactive', 'error']).optional(),
  }),
  
  /**
   * Create webhook
   */
  createWebhook: z.object({
    url: z.string().url('Invalid webhook URL'),
    secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
    events: z.array(z.string()).min(1, 'At least one event type required'),
    workspaceId: commonSchemas.cuid,
    integrationId: commonSchemas.cuid.optional(),
  }),
};

// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================

export const analyticsSchemas = {
  /**
   * Query analytics
   */
  query: z.object({
    workspaceId: commonSchemas.cuid,
    projectId: commonSchemas.cuid.optional(),
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    metrics: z.array(z.enum([
      'task_completion',
      'time_tracking',
      'team_performance',
      'project_health',
      'velocity',
      'burndown',
    ])).optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional(),
  }).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  ),
  
  /**
   * Export analytics
   */
  export: z.object({
    workspaceId: commonSchemas.cuid,
    format: z.enum(['csv', 'excel', 'pdf']),
    reportType: z.enum(['dashboard', 'project', 'tasks', 'time_entries', 'team']),
    filters: z.record(z.any()).optional(),
  }),
};

// ============================================================================
// AUTOMATION SCHEMAS
// ============================================================================

export const automationSchemas = {
  /**
   * Create automation rule
   */
  createRule: z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    workspaceId: commonSchemas.cuid,
    projectId: commonSchemas.cuid.optional(),
    trigger: z.object({
      type: z.enum(['task_created', 'task_updated', 'task_completed', 'time_based', 'milestone_reached']),
      config: z.record(z.any()),
    }),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
      value: z.any(),
    })).optional(),
    actions: z.array(z.object({
      type: z.enum(['assign_task', 'send_notification', 'update_field', 'create_task', 'send_webhook']),
      config: z.record(z.any()),
    })).min(1, 'At least one action required'),
    priority: commonSchemas.nonNegativeInt.optional(),
  }),
  
  /**
   * Update automation rule
   */
  updateRule: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    trigger: z.object({
      type: z.string(),
      config: z.record(z.any()),
    }).optional(),
    conditions: z.array(z.any()).optional(),
    actions: z.array(z.any()).optional(),
    isActive: z.boolean().optional(),
  }),
};

// ============================================================================
// AI SCHEMAS
// ============================================================================

export const aiSchemas = {
  /**
   * Request AI suggestion
   */
  requestSuggestion: z.object({
    taskId: commonSchemas.cuid.optional(),
    projectId: commonSchemas.cuid.optional(),
    context: z.string().max(2000),
    suggestionType: z.enum(['task_breakdown', 'priority', 'assignment', 'schedule', 'risk']),
  }),
  
  /**
   * Request document summary
   */
  summarizeDocument: z.object({
    documentId: commonSchemas.cuid,
    maxLength: z.number().int().min(50).max(1000).optional(),
    format: z.enum(['paragraph', 'bullets', 'key_points']).optional(),
  }),
  
  /**
   * Chat with AI
   */
  chat: z.object({
    message: z.string().min(1).max(2000),
    conversationId: commonSchemas.cuid.optional(),
    context: z.object({
      projectId: commonSchemas.cuid.optional(),
      taskIds: z.array(commonSchemas.cuid).optional(),
    }).optional(),
  }),
};

// ============================================================================
// CALENDAR SCHEMAS
// ============================================================================

export const calendarSchemas = {
  /**
   * Create event
   */
  create: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z.enum(['meeting', 'deadline', 'time-off', 'workload', 'milestone', 'other']),
    startTime: commonSchemas.isoDate,
    endTime: commonSchemas.isoDate,
    allDay: z.boolean().optional(),
    workspaceId: commonSchemas.cuid,
    projectId: commonSchemas.cuid.optional(),
    attendeeIds: z.array(commonSchemas.cuid).optional(),
    location: z.string().max(200).optional(),
    meetingLink: z.string().url().optional(),
    isRecurring: z.boolean().optional(),
  }).refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    {
      message: 'Start time must be before end time',
      path: ['endTime'],
    }
  ),
  
  /**
   * Update event
   */
  update: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    startTime: commonSchemas.isoDate.optional(),
    endTime: commonSchemas.isoDate.optional(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
    location: z.string().max(200).optional(),
    meetingLink: z.string().url().optional(),
  }),
};

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const schemas = {
  common: commonSchemas,
  user: userSchemas,
  project: projectSchemas,
  task: taskSchemas,
  workspace: workspaceSchemas,
  timeEntry: timeEntrySchemas,
  notification: notificationSchemas,
  file: fileSchemas,
  milestone: milestoneSchemas,
  channel: channelSchemas,
  integration: integrationSchemas,
  automation: automationSchemas,
  ai: aiSchemas,
  calendar: calendarSchemas,
};

export default schemas;


