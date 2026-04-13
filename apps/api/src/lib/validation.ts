import { z } from 'zod';
import { createError } from './errors';

// Common validation schemas
export const commonSchemas = {
  // ID validation
  id: z.string()
    .uuid('Invalid ID format')
    .or(z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')),
  
  // Email validation
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  
  // Name validation
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
  
  // Phone validation
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number too short')
    .max(20, 'Phone number too long'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // Date validation
  date: z.string().datetime('Invalid date format'),
  
  // Pagination validation (accepts both sort/sortBy and order/sortOrder)
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    // Legacy alias fields
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    // Preferred fields
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }).passthrough(),
};

// User validation schemas
export const userSchemas = {
  // Register user (with password confirmation)
  register: z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username too long')
      .regex(/^[a-zA-Z0-9_\-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
    firstName: commonSchemas.name.optional(),
    lastName: commonSchemas.name.optional(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }),
  
  // Create user
  create: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    // Optional username for backward compatibility with existing tests/routes
    username: z.string().regex(/^[a-zA-Z0-9_\-]{3,30}$/,
      'Username must be 3-30 chars (letters, numbers, _ or -)').optional(),
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
    phone: commonSchemas.phone.optional(),
    role: z.enum(['member', 'admin', 'workspace-manager', 'team-lead', 'project-manager', 'department-head', 'project-viewer', 'guest']).default('member'),
  }),
  
  // Update user
  update: z.object({
    firstName: commonSchemas.name.optional(),
    lastName: commonSchemas.name.optional(),
    phone: commonSchemas.phone.optional(),
    role: z.enum(['member', 'admin', 'workspace-manager', 'team-lead', 'project-manager', 'department-head', 'project-viewer', 'guest']).optional(),
  }),
  
  // Change password
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
  
  // Login
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().default(false),
  }),
  
  // Forgot password
  forgotPassword: z.object({
    email: commonSchemas.email,
  }),
  
  // Reset password
  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
};

// Workspace validation schemas
export const workspaceSchemas = {
  // Create workspace
  create: z.object({
    name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  }),
  
  // Update workspace
  update: z.object({
    name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  }),
  
  // Invite user
  inviteUser: z.object({
    email: commonSchemas.email,
    role: z.enum(['member', 'admin', 'team-lead', 'project-manager', 'department-head', 'project-viewer', 'guest']).default('member'),
    message: z.string().max(500, 'Message too long').optional(),
  }),
};

// Project validation schemas
export const projectSchemas = {
  // Create project
  create: z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    status: z.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']).default('planning'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    budget: z.number().min(0, 'Budget cannot be negative').optional(),
    teamMembers: z.array(commonSchemas.id).optional(),
  }),
  
  // Update project
  update: z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    status: z.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    budget: z.number().min(0, 'Budget cannot be negative').optional(),
    teamMembers: z.array(commonSchemas.id).optional(),
  }),
  
  // Add team member
  addTeamMember: z.object({
    userId: commonSchemas.id,
    role: z.enum(['member', 'lead', 'viewer']).default('member'),
  }),
};

// Task validation schemas
export const taskSchemas = {
  // Create task
  create: z.object({
    title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
    description: z.string().max(2000, 'Description too long').optional(),
    status: z.enum(['todo', 'in-progress', 'done', 'cancelled']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    assigneeId: commonSchemas.id.optional(),
    projectId: commonSchemas.id.optional(),
    dueDate: commonSchemas.date.optional(),
    estimatedHours: z.number().min(0, 'Estimated hours cannot be negative').optional(),
    tags: z.array(z.string().max(50, 'Tag too long')).optional(),
  }),
  
  // Update task
  update: z.object({
    title: z.string().min(1, 'Task title is required').max(200, 'Title too long').optional(),
    description: z.string().max(2000, 'Description too long').optional(),
    status: z.enum(['todo', 'in-progress', 'done', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assigneeId: commonSchemas.id.optional(),
    projectId: commonSchemas.id.optional(),
    dueDate: commonSchemas.date.optional(),
    estimatedHours: z.number().min(0, 'Estimated hours cannot be negative').optional(),
    tags: z.array(z.string().max(50, 'Tag too long')).optional(),
  }),
  
  // Add comment
  addComment: z.object({
    content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long'),
    parentId: commonSchemas.id.optional(),
  }),
};

// Team validation schemas
export const teamSchemas = {
  // Create team
  create: z.object({
    name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    members: z.array(commonSchemas.id).optional(),
  }),
  
  // Update team
  update: z.object({
    name: z.string().min(1, 'Team name is required').max(100, 'Team name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    members: z.array(commonSchemas.id).optional(),
  }),
  
  // Add member
  addMember: z.object({
    userId: commonSchemas.id,
    role: z.enum(['member', 'lead']).default('member'),
  }),
};

// Notification validation schemas
export const notificationSchemas = {
  // Create notification
  create: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
    type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
    recipients: z.array(commonSchemas.id).min(1, 'At least one recipient is required'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    scheduledFor: commonSchemas.date.optional(),
  }),
  
  // Update notification preferences
  updatePreferences: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
    digest: z.enum(['none', 'daily', 'weekly']).default('daily'),
  }),
};

// Analytics validation schemas
export const analyticsSchemas = {
  // Get analytics
  getAnalytics: z.object({
    startDate: commonSchemas.date,
    endDate: commonSchemas.date,
    metrics: z.array(z.enum(['tasks', 'projects', 'users', 'performance'])).optional(),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
  }),
  
  // Export data
  exportData: z.object({
    format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    includeDeleted: z.boolean().default(false),
  }),
};

// Search validation schemas
export const searchSchemas = {
  // Search
  search: z.object({
    query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
    type: z.enum(['all', 'tasks', 'projects', 'users', 'teams']).default('all'),
    filters: z.record(z.any()).optional(),
    ...commonSchemas.pagination.shape,
  }),
};

// Validation middleware factory
export function createValidationMiddleware<T>(schemaOrMode: any, maybeSchema?: z.ZodSchema<T>) {
  const mode: 'json' | 'query' | 'form' = typeof schemaOrMode === 'string' ? schemaOrMode : 'json';
  const schema: z.ZodSchema<T> = (typeof schemaOrMode === 'string' ? maybeSchema : schemaOrMode) as z.ZodSchema<T>;

  return async (c: Context, next: Next) => {
    try {
      let input: any;
      if (mode === 'query') {
        input = Object.fromEntries(c.req.query());
      } else if (mode === 'form') {
        const form = await c.req.parseBody();
        input = form;
      } else {
        input = await c.req.json();
      }

      const validatedData = schema.parse(input);
      const key = mode as 'json' | 'query' | 'form';
      // Store under a consistent key to mirror hono zValidator's c.req.valid(key)
      // Also keep a generic 'validatedData' for existing handlers
      // Provide a minimal shim for c.req.valid(key)
      // @ts-ignore - augmenting request with helper
      c.req.valid = (_k: typeof key) => validatedData;
      c.set('validatedData', validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw createError.validationError('Validation failed', {
          errors: errorMessages,
        });
      }
      throw error;
    }
  };
}

// Query validation middleware
export function createQueryValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const query = Object.fromEntries(c.req.query());
      const validatedData = schema.parse(query);
      c.set('validatedQuery', validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        throw createError.validationError('Query validation failed', {
          errors: errorMessages,
        });
      }
      throw error;
    }
  };
}

// Sanitization middleware
export function createSanitizationMiddleware() {
  return async (c: Context, next: Next) => {
    // Sanitize request body
    const body = await c.req.json();
    const sanitizedBody = sanitizeObject(body);
    c.set('sanitizedBody', sanitizedBody);
    
    await next();
  };
}

// Sanitize object recursively
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Sanitize string
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/eval\s*\(/gi, '')
    .replace(/expression\s*\(/gi, '')
    .trim();
}

