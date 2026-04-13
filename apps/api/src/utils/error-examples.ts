/**
 * 📚 Error Handling Examples
 * 
 * Demonstrates how to use the standardized error handling system.
 */

import type { Context } from 'hono';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  BusinessRuleViolationError,
  DatabaseError,
  RateLimitError,
} from '../utils/errors';
import { asyncHandler } from '../utils/error-handling';
import { validateRequiredFields, handleDatabaseError } from '../middlewares/error-handler';

/**
 * Example 1: Simple resource not found
 */
export const getUserExample = asyncHandler(async (c: Context) => {
  const userId = c.req.param('id');
  
  // Simulate user lookup
  const user = null; // await db.findUser(userId);
  
  if (!user) {
    throw new NotFoundError('User', { userId });
  }
  
  return c.json({ user });
});

/**
 * Example 2: Validation with required fields
 */
export const createUserExample = asyncHandler(async (c: Context) => {
  const body = await c.req.json();
  
  // Validate required fields - throws MissingFieldError automatically
  validateRequiredFields(body, ['email', 'name', 'password']);
  
  // Additional validation
  if (body.email && !body.email.includes('@')) {
    throw new ValidationError('Invalid email format', {
      field: 'email',
      value: body.email,
    });
  }
  
  // Create user...
  return c.json({ success: true });
});

/**
 * Example 3: Authorization check
 */
export const deleteProjectExample = asyncHandler(async (c: Context) => {
  const userId = c.get('userId');
  const projectId = c.req.param('id');
  
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }
  
  // Check permissions
  const hasPermission = false; // await checkPermission(userId, projectId);
  
  if (!hasPermission) {
    throw new ForbiddenError('You do not have permission to delete this project', {
      userId,
      projectId,
      requiredPermission: 'project:delete',
    });
  }
  
  // Delete project...
  return c.json({ success: true });
});

/**
 * Example 4: Business rule validation
 */
export const assignTaskExample = asyncHandler(async (c: Context) => {
  const { taskId, userId } = await c.req.json();
  
  // Check if user is already assigned
  const isAssigned = true; // await checkAssignment(taskId, userId);
  
  if (isAssigned) {
    throw new BusinessRuleViolationError(
      'User is already assigned to this task',
      { taskId, userId }
    );
  }
  
  // Check if task is already complete
  const isComplete = false; // await checkTaskStatus(taskId);
  
  if (isComplete) {
    throw new BusinessRuleViolationError(
      'Cannot assign users to a completed task',
      { taskId, status: 'completed' }
    );
  }
  
  // Assign task...
  return c.json({ success: true });
});

/**
 * Example 5: Database error handling
 */
export const updateWorkspaceExample = asyncHandler(async (c: Context) => {
  const workspaceId = c.req.param('id');
  const updates = await c.req.json();
  
  try {
    // Simulate database operation
    // const result = await db.update(workspace).set(updates).where(eq(workspace.id, workspaceId));
    throw new Error('Unique constraint violation'); // Simulated error
  } catch (error) {
    // Converts database errors to AppError
    handleDatabaseError(error, 'update workspace');
  }
  
  return c.json({ success: true });
});

/**
 * Example 6: Rate limiting
 */
export const sendNotificationExample = asyncHandler(async (c: Context) => {
  const userId = c.get('userId');
  
  // Check rate limit
  const limit = 10;
  const current = 11; // await getRateLimit(userId);
  
  if (current > limit) {
    throw new RateLimitError(
      'Too many notifications sent. Please try again later.',
      60, // Retry after 60 seconds
      {
        limit,
        current,
        window: '1 minute',
      }
    );
  }
  
  // Send notification...
  return c.json({ success: true });
});

/**
 * Example 7: Multiple validation errors
 */
export const validateProjectExample = asyncHandler(async (c: Context) => {
  const project = await c.req.json();
  
  const errors: Record<string, string> = {};
  
  if (!project.name || project.name.length < 3) {
    errors.name = 'Project name must be at least 3 characters';
  }
  
  if (project.dueDate && new Date(project.dueDate) < new Date()) {
    errors.dueDate = 'Due date cannot be in the past';
  }
  
  if (!project.workspaceId) {
    errors.workspaceId = 'Workspace ID is required';
  }
  
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Project validation failed', { errors });
  }
  
  return c.json({ success: true });
});

/**
 * Example 8: Async handler with try-catch (alternative pattern)
 */
export const complexOperationExample = async (c: Context) => {
  try {
    // Complex operation
    const result = await performComplexOperation();
    return c.json({ result });
  } catch (error) {
    // Can handle specific errors differently
    if (error instanceof NotFoundError) {
      // Handle not found
      throw error;
    }
    
    // Or convert to a different error type
    throw new DatabaseError('Failed to complete operation', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

async function performComplexOperation() {
  // Simulated complex operation
  return { data: 'success' };
}

/**
 * Example 9: Conditional error based on role
 */
export const roleBasedAccessExample = asyncHandler(async (c: Context) => {
  const user = c.get('user');
  const action = c.req.param('action');
  
  if (!user) {
    throw new UnauthorizedError();
  }
  
  // Role-based access control
  const allowedRoles = ['admin', 'workspace-manager'];
  
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      {
        userRole: user.role,
        requiredRoles: allowedRoles,
        action,
      }
    );
  }
  
  // Perform action...
  return c.json({ success: true });
});

/**
 * Example 10: Error with detailed context for debugging
 */
export const debuggableErrorExample = asyncHandler(async (c: Context) => {
  const taskId = c.req.param('id');
  const userEmail = c.get('userEmail');
  
  try {
    // Simulate complex operation
    const task = null; // await getTask(taskId);
    
    if (!task) {
      throw new NotFoundError('Task', {
        taskId,
        requestedBy: userEmail,
        timestamp: new Date().toISOString(),
        context: 'Attempting to update task status',
        additionalInfo: {
          method: c.req.method,
          path: c.req.path,
          query: c.req.query(),
        },
      });
    }
    
    return c.json({ task });
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof NotFoundError) {
      throw error; // Already has context
    }
    
    throw new DatabaseError('Unexpected error while fetching task', {
      taskId,
      userEmail,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
});


