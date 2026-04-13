// Input Validation Schemas with Security Hardening
// Comprehensive Zod schemas for all API endpoints with security validation

import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long')
  .trim()
  .toLowerCase();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one lowercase letter, one uppercase letter, and one number');

const strongPasswordSchema = passwordSchema
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');

const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .trim()
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters');

const idSchema = z.string()
  .uuid('Invalid ID format')
  .or(z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format'));

// Security-focused text validation
const sanitizedTextSchema = z.string()
  .max(1000, 'Text too long')
  .trim()
  .transform(str => str.replace(/<script[^>]*>.*?<\/script>/gi, '')) // Remove script tags
  .transform(str => str.replace(/javascript:/gi, '')) // Remove javascript: protocol
  .transform(str => str.replace(/on\w+\s*=/gi, '')); // Remove event handlers

const sanitizedLongTextSchema = z.string()
  .max(5000, 'Text too long')
  .trim()
  .transform(str => str.replace(/<script[^>]*>.*?<\/script>/gi, ''))
  .transform(str => str.replace(/javascript:/gi, ''))
  .transform(str => str.replace(/on\w+\s*=/gi, ''));

// Authentication schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  name: nameSchema,
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Terms and conditions must be accepted'
  }).optional(),
  inviteCode: z.string().max(100, 'Invite code too long').optional()
}).strict(); // Reject additional properties

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
  rememberMe: z.boolean().optional(),
  deviceName: z.string().max(100, 'Device name too long').optional()
}).strict();

export const passwordResetRequestSchema = z.object({
  email: emailSchema
}).strict();

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required').max(255, 'Token too long'),
  newPassword: strongPasswordSchema
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128, 'Password too long'),
  newPassword: strongPasswordSchema
}).strict();

// User profile schemas
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  avatar: z.string().url('Invalid avatar URL').max(500, 'Avatar URL too long').optional(),
  timezone: z.string().max(50, 'Timezone too long').optional(),
  language: z.string().max(10, 'Language code too long').optional()
}).strict();

// Workspace schemas
export const createWorkspaceSchema = z.object({
  name: z.string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name too long')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Workspace name contains invalid characters'),
  description: sanitizedTextSchema.optional(),
  isPublic: z.boolean().optional().default(false)
}).strict();

export const updateWorkspaceSchema = z.object({
  name: z.string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name too long')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Workspace name contains invalid characters')
    .optional(),
  description: sanitizedTextSchema.optional(),
  isPublic: z.boolean().optional()
}).strict();

// Project schemas
export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name too long')
    .trim(),
  description: sanitizedLongTextSchema.optional(),
  workspaceId: idSchema,
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional().default('PLANNING'),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM')
}).strict();

export const updateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name too long')
    .trim()
    .optional(),
  description: sanitizedLongTextSchema.optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
}).strict();

// Task schemas
export const createTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title too long')
    .trim(),
  description: sanitizedLongTextSchema.optional(),
  projectId: idSchema,
  assigneeId: idSchema.optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']).optional().default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  dueDate: z.string().datetime({ offset: true }).optional(),
  estimatedHours: z.number().min(0, 'Estimated hours must be positive').max(1000, 'Estimated hours too large').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(10, 'Too many tags').optional()
}).strict();

export const updateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title too long')
    .trim()
    .optional(),
  description: sanitizedLongTextSchema.optional(),
  assigneeId: idSchema.optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  estimatedHours: z.number().min(0, 'Estimated hours must be positive').max(1000, 'Estimated hours too large').optional(),
  actualHours: z.number().min(0, 'Actual hours must be positive').max(1000, 'Actual hours too large').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(10, 'Too many tags').optional()
}).strict();

// Message schemas
export const createMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(2000, 'Message too long')
    .trim(),
  channelId: idSchema.optional(),
  projectId: idSchema.optional(),
  recipientId: idSchema.optional(), // For direct messages
  replyToId: idSchema.optional(),
  messageType: z.enum(['TEXT', 'FILE', 'IMAGE', 'SYSTEM']).optional().default('TEXT')
}).strict()
.refine(data => 
  (data.channelId && !data.projectId && !data.recipientId) ||
  (!data.channelId && data.projectId && !data.recipientId) ||
  (!data.channelId && !data.projectId && data.recipientId), {
  message: 'Message must have exactly one target: channelId, projectId, or recipientId'
});

// File upload schemas
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Filename contains invalid characters'),
  mimeType: z.string()
    .max(100, 'MIME type too long')
    .regex(/^[a-zA-Z0-9\/\-\+\.]+$/, 'Invalid MIME type'),
  size: z.number()
    .min(1, 'File size must be positive')
    .max(50 * 1024 * 1024, 'File too large (max 50MB)'), // 50MB limit
  projectId: idSchema.optional(),
  taskId: idSchema.optional()
}).strict();

// Search schemas
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .trim(),
  type: z.enum(['ALL', 'PROJECTS', 'TASKS', 'MESSAGES', 'FILES']).optional().default('ALL'),
  workspaceId: idSchema.optional(),
  projectId: idSchema.optional(),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit too large').optional().default(20),
  offset: z.number().min(0, 'Offset must be non-negative').optional().default(0)
}).strict();

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be positive').max(1000, 'Page too large').optional().default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit too large').optional().default(20),
  sortBy: z.string().max(50, 'Sort field too long').optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).strict();

// Team schemas
export const createTeamSchema = z.object({
  name: z.string()
    .min(1, 'Team name is required')
    .max(100, 'Team name too long')
    .trim(),
  description: sanitizedTextSchema.optional(),
  workspaceId: idSchema,
  isPublic: z.boolean().optional().default(true)
}).strict();

export const addTeamMemberSchema = z.object({
  userId: idSchema,
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional().default('MEMBER')
}).strict();

// Notification schemas
export const createNotificationSchema = z.object({
  title: z.string()
    .min(1, 'Notification title is required')
    .max(200, 'Notification title too long')
    .trim(),
  message: sanitizedTextSchema,
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).optional().default('INFO'),
  userId: idSchema,
  actionUrl: z.string().url('Invalid action URL').max(500, 'Action URL too long').optional(),
  expiresAt: z.string().datetime({ offset: true }).optional()
}).strict();

// Settings schemas
export const updateSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    desktop: z.boolean().optional(),
    marketing: z.boolean().optional()
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['PUBLIC', 'TEAM', 'PRIVATE']).optional(),
    activityVisibility: z.enum(['PUBLIC', 'TEAM', 'PRIVATE']).optional()
  }).optional(),
  preferences: z.object({
    theme: z.enum(['LIGHT', 'DARK', 'AUTO']).optional(),
    language: z.string().max(10, 'Language code too long').optional(),
    timezone: z.string().max(50, 'Timezone too long').optional(),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional()
  }).optional()
}).strict();

// Export all schemas for use in middleware
export const validationSchemas = {
  // Auth
  signUp: signUpSchema,
  signIn: signInSchema,
  passwordResetRequest: passwordResetRequestSchema,
  passwordResetConfirm: passwordResetConfirmSchema,
  changePassword: changePasswordSchema,
  
  // User
  updateProfile: updateProfileSchema,
  
  // Workspace
  createWorkspace: createWorkspaceSchema,
  updateWorkspace: updateWorkspaceSchema,
  
  // Project
  createProject: createProjectSchema,
  updateProject: updateProjectSchema,
  
  // Task
  createTask: createTaskSchema,
  updateTask: updateTaskSchema,
  
  // Message
  createMessage: createMessageSchema,
  
  // File
  fileUpload: fileUploadSchema,
  
  // Search
  search: searchSchema,
  pagination: paginationSchema,
  
  // Team
  createTeam: createTeamSchema,
  addTeamMember: addTeamMemberSchema,
  
  // Notification
  createNotification: createNotificationSchema,
  
  // Settings
  updateSettings: updateSettingsSchema
};

