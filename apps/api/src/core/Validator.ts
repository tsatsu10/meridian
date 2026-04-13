/**
 * @epic-5.1-api-standardization - Centralized input validation
 * @persona-all - Consistent validation for all user inputs
 */

import { z } from 'zod';
import { ValidationError } from './ErrorHandler';

// Common validation schemas
export const CommonSchemas = {
  // ID validation
  id: z.string().min(1, 'ID is required'),
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Search
  search: z.object({
    query: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
    filters: z.record(z.any()).optional(),
  }),

  // Date ranges
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(data => data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),

  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  // Name validation
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // File validation
  file: z.object({
    name: z.string(),
    size: z.number().max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
    type: z.string(),
  }),
};

// User-related schemas
export const UserSchemas = {
  createUser: z.object({
    email: CommonSchemas.email,
    password: CommonSchemas.password,
    firstName: CommonSchemas.name,
    lastName: CommonSchemas.name,
    role: z.enum(['user', 'admin', 'manager']).default('user'),
  }),

  updateUser: z.object({
    firstName: CommonSchemas.name.optional(),
    lastName: CommonSchemas.name.optional(),
    avatar: CommonSchemas.url.optional(),
    preferences: z.record(z.any()).optional(),
  }),

  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
};

// Workspace schemas
export const WorkspaceSchemas = {
  createWorkspace: z.object({
    name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    settings: z.record(z.any()).optional(),
  }),

  updateWorkspace: z.object({
    name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    settings: z.record(z.any()).optional(),
  }),
};

// Project schemas
export const ProjectSchemas = {
  createProject: z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    workspaceId: CommonSchemas.id,
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['planning', 'active', 'completed', 'on-hold']).default('planning'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  }),

  updateProject: z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['planning', 'active', 'completed', 'on-hold']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  }),
};

// Task schemas
export const TaskSchemas = {
  createTask: z.object({
    title: z.string().min(1, 'Task title is required').max(200, 'Task title too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    projectId: CommonSchemas.id,
    assigneeId: CommonSchemas.id.optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    status: z.enum(['todo', 'in-progress', 'review', 'done']).default('todo'),
    dueDate: z.coerce.date().optional(),
    estimatedHours: z.number().min(0, 'Estimated hours cannot be negative').optional(),
    tags: z.array(z.string()).optional(),
  }),

  updateTask: z.object({
    title: z.string().min(1, 'Task title is required').max(200, 'Task title too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    assigneeId: CommonSchemas.id.optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
    dueDate: z.coerce.date().optional(),
    estimatedHours: z.number().min(0, 'Estimated hours cannot be negative').optional(),
    tags: z.array(z.string()).optional(),
  }),
};

// Team schemas
export const TeamSchemas = {
  createTeam: z.object({
    name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    workspaceId: CommonSchemas.id,
    projectId: CommonSchemas.id.optional(),
    type: z.enum(['general', 'project']).default('general'),
  }),

  updateTeam: z.object({
    name: z.string().min(1, 'Team name is required').max(100, 'Team name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    projectId: CommonSchemas.id.optional(),
  }),

  addMember: z.object({
    teamId: CommonSchemas.id,
    userEmail: CommonSchemas.email,
    role: z.enum(['owner', 'admin', 'member']).default('member'),
  }),
};

// Message schemas
export const MessageSchemas = {
  createMessage: z.object({
    content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
    channelId: CommonSchemas.id.optional(),
    recipientId: CommonSchemas.id.optional(),
    type: z.enum(['text', 'file', 'system']).default('text'),
    attachments: z.array(CommonSchemas.file).optional(),
  }),
};

// Time entry schemas
export const TimeEntrySchemas = {
  createTimeEntry: z.object({
    taskId: CommonSchemas.id,
    description: z.string().max(500, 'Description too long').optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date().optional(),
    duration: z.number().min(0, 'Duration cannot be negative').optional(),
  }),

  updateTimeEntry: z.object({
    description: z.string().max(500, 'Description too long').optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    duration: z.number().min(0, 'Duration cannot be negative').optional(),
  }),
};

// Validation helper functions
export class Validator {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        throw new ValidationError('Validation failed', details);
      }
      throw error;
    }
  }

  static validatePartial<T>(schema: z.ZodSchema<T>, data: unknown): Partial<T> {
    try {
      return schema.partial().parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        throw new ValidationError('Validation failed', details);
      }
      throw error;
    }
  }

  static validateQuery<T>(schema: z.ZodSchema<T>, query: Record<string, any>): T {
    // Convert query parameters to appropriate types
    const processedQuery = Object.fromEntries(
      Object.entries(query).map(([key, value]) => {
        // Handle array parameters
        if (Array.isArray(value)) {
          return [key, value];
        }
        // Handle boolean parameters
        if (value === 'true') return [key, true];
        if (value === 'false') return [key, false];
        // Handle number parameters
        if (!isNaN(Number(value)) && value !== '') return [key, Number(value)];
        // Default to string
        return [key, value];
      })
    );

    return this.validate(schema, processedQuery);
  }

  static validateId(id: string): string {
    return this.validate(CommonSchemas.id, id);
  }

  static validatePagination(query: Record<string, any>) {
    return this.validateQuery(CommonSchemas.pagination, query);
  }

  static validateSearch(query: Record<string, any>) {
    return this.validateQuery(CommonSchemas.search, query);
  }

  static validateDateRange(data: { startDate: string | Date; endDate: string | Date }) {
    return this.validate(CommonSchemas.dateRange, data);
  }

  static validateEmail(email: string): string {
    return this.validate(CommonSchemas.email, email);
  }

  static validatePassword(password: string): string {
    return this.validate(CommonSchemas.password, password);
  }

  static validateDate(date: string | Date): Date {
    return this.validate(z.coerce.date(), date);
  }

  static validateEnum<T extends string>(value: string, allowedValues: T[]): T {
    const enumSchema = z.enum(allowedValues as [T, ...T[]]);
    return this.validate(enumSchema, value);
  }

  static validateArray<T>(data: unknown, itemSchema: z.ZodSchema<T>): T[] {
    // First check if data is an array
    if (!Array.isArray(data)) {
      throw new ValidationError('Validation failed', [
        { field: 'array', message: 'Input must be an array', code: 'invalid_type' }
      ]);
    }

    // Validate each item in the array
    try {
      return data.map((item, index) => {
        try {
          return itemSchema.parse(item);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const details = error.errors.map(err => ({
              field: `[${index}].${err.path.join('.')}`,
              message: err.message,
              code: err.code,
            }));
            throw new ValidationError('Validation failed', details);
          }
          throw error;
        }
      });
    } catch (error) {
      throw error;
    }
  }

  static validateObject<T>(data: unknown, valueSchema: z.ZodSchema<T>): Record<string, T> {
    // First check if data is an object
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new ValidationError('Validation failed', [
        { field: 'object', message: 'Input must be an object', code: 'invalid_type' }
      ]);
    }

    // Validate each value in the object
    const obj = data as Record<string, unknown>;
    const result: Record<string, T> = {};

    try {
      for (const [key, value] of Object.entries(obj)) {
        try {
          result[key] = valueSchema.parse(value);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const details = error.errors.map(err => ({
              field: `${key}.${err.path.join('.')}`,
              message: err.message,
              code: err.code,
            }));
            throw new ValidationError('Validation failed', details);
          }
          throw error;
        }
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
}

// Export all schemas for easy access
export const Schemas = {
  common: CommonSchemas,
  user: UserSchemas,
  workspace: WorkspaceSchemas,
  project: ProjectSchemas,
  task: TaskSchemas,
  team: TeamSchemas,
  message: MessageSchemas,
  timeEntry: TimeEntrySchemas,
}; 

