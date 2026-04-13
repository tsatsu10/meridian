import { z } from 'zod';
import { validateRequest } from '../validation/middleware';
export { validateRequest, type ValidationSchemas } from '../validation/middleware';

/**
 * Request Validation Middleware
 * Validates request query parameters, body, and params using Zod schemas
 */

// Legacy file kept for backward compatibility.

/**
 * Common validation schemas for profile endpoints
 */
export const ProfileValidationSchemas = {
  // Query parameter for userId
  userIdQuery: z.object({
    userId: z.string().optional(),
  }),

  // Pagination query parameters
  paginationQuery: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.enum(['createdAt', 'updatedAt', 'order']).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Profile GET query with pagination
  profileListQuery: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
  }),

  // Path parameter validation
  idParam: z.object({
    id: z.string().min(1),
  }),

  // User ID param
  userIdParam: z.object({
    userId: z.string().min(1),
  }),
};

export default validateRequest;


