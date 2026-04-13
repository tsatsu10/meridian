/**
 * 🔍 Validation Middleware
 * 
 * Helpers for validating requests with Zod schemas.
 * 
 * @epic-infrastructure: Unified validation layer
 */

import type { Context, Next } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Enhanced Zod validator with better error messages
 */
export function validate<T extends ZodSchema>(
  target: 'json' | 'query' | 'param' | 'header' | 'form',
  schema: T,
  options?: {
    logErrors?: boolean;
    auditFailures?: boolean;
  }
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const zodError = result.error as ZodError;
      
      // Format Zod errors into readable format
      const errors = zodError.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      // Log validation failures if enabled
      if (options?.logErrors !== false) {
        logger.warn('Validation failed', {
          target,
          errors,
          path: c.req.path,
          method: c.req.method,
          userEmail: c.get('userEmail'),
        });
      }
      
      // Throw standardized validation error
      throw new ValidationError('Request validation failed', {
        target,
        errors,
        fields: errors.map(e => e.field),
      });
    }
  });
}

export interface ValidationSchemas {
  query?: ZodSchema;
  body?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Compatibility validator for routes that pass grouped schemas.
 * Prefer `validateBody/validateQuery/validateParams` for new code.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return async (c: Context, next: Next) => {
    try {
      if (schemas.query) {
        const queryParams = Object.fromEntries(new URL(c.req.url).searchParams.entries());
        c.set('validatedQuery', schemas.query.parse(queryParams));
      }

      if (schemas.body) {
        const body = await c.req.json().catch(() => ({}));
        c.set('validatedBody', schemas.body.parse(body));
      }

      if (schemas.params) {
        c.set('validatedParams', schemas.params.parse(c.req.param()));
      }

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Request validation failed', {
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }
      throw new ValidationError('Invalid request data');
    }
  };
}

/**
 * Validate request body with JSON schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return validate('json', schema);
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return validate('query', schema);
}

/**
 * Validate URL parameters
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return validate('param', schema);
}

/**
 * Validate request headers
 */
export function validateHeaders<T extends ZodSchema>(schema: T) {
  return validate('header', schema);
}

/**
 * Validate form data
 */
export function validateForm<T extends ZodSchema>(schema: T) {
  return validate('form', schema);
}

/**
 * Middleware to validate workspace access
 */
export async function validateWorkspaceAccess(c: Context, next: Next) {
  const workspaceId = c.req.query('workspaceId') || c.req.param('workspaceId');
  const userEmail = c.get('userEmail');
  
  if (!workspaceId) {
    throw new ValidationError('Workspace ID is required', {
      field: 'workspaceId',
    });
  }
  
  if (!userEmail) {
    throw new ValidationError('User authentication required');
  }
  
  // TODO: Check if user has access to workspace
  // const hasAccess = await checkWorkspaceAccess(userEmail, workspaceId);
  // if (!hasAccess) throw new ForbiddenError(...);
  
  await next();
}

/**
 * Middleware to validate project access
 */
export async function validateProjectAccess(c: Context, next: Next) {
  const projectId = c.req.param('projectId') || c.req.param('id');
  const userEmail = c.get('userEmail');
  
  if (!projectId) {
    throw new ValidationError('Project ID is required', {
      field: 'projectId',
    });
  }
  
  if (!userEmail) {
    throw new ValidationError('User authentication required');
  }
  
  // TODO: Check if user has access to project
  // const hasAccess = await checkProjectAccess(userEmail, projectId);
  // if (!hasAccess) throw new ForbiddenError(...);
  
  await next();
}

/**
 * Combine multiple validators
 */
export function validateAll<T extends ZodSchema>(
  validators: Array<{
    target: 'json' | 'query' | 'param' | 'header' | 'form';
    schema: T;
  }>
) {
  return async (c: Context, next: Next) => {
    for (const { target, schema } of validators) {
      const validator = validate(target, schema);
      await validator(c, async () => {});
    }
    await next();
  };
}

/**
 * Conditional validation based on request method
 */
export function validateByMethod<T extends ZodSchema>(
  methodSchemas: Partial<Record<string, T>>
) {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    const schema = methodSchemas[method];
    
    if (schema) {
      const validator = validate('json', schema);
      await validator(c, async () => {});
    }
    
    await next();
  };
}

/**
 * Transform and validate (coerce types)
 */
export function transformAndValidate<T extends ZodSchema>(
  target: 'json' | 'query' | 'param',
  schema: T,
  transform: (data: any) => any
) {
  return async (c: Context, next: Next) => {
    let data: any;
    
    switch (target) {
      case 'json':
        data = await c.req.json();
        break;
      case 'query':
        data = c.req.query();
        break;
      case 'param':
        data = c.req.param();
        break;
    }
    
    // Apply transformation
    const transformed = transform(data);
    
    // Validate transformed data
    const result = schema.safeParse(transformed);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      throw new ValidationError('Validation failed after transformation', {
        errors,
      });
    }
    
    // Store validated data
    c.set('validatedData', result.data);
    
    await next();
  };
}

/**
 * Pagination validator
 */
export const validatePagination = validate('query', 
  z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  })
);

/**
 * Date range validator
 */
export const validateDateRange = validate('query',
  z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
      message: 'Start date must be before or equal to end date',
      path: ['endDate'],
    }
  )
);

/**
 * ID validator for params
 */
export const validateId = validate('param',
  z.object({
    id: z.string().min(1, 'ID is required'),
  })
);

/**
 * Multiple IDs validator (for bulk operations)
 */
export const validateIds = validate('json',
  z.object({
    ids: z.array(z.string().min(1)).min(1, 'At least one ID required').max(100, 'Maximum 100 IDs'),
  })
);


