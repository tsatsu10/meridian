# 🛡️ Error Handling Guide

## Overview

Meridian uses a standardized error handling system that provides:
- ✅ **Typed error classes** for type safety
- ✅ **Consistent error responses** across all endpoints
- ✅ **Automatic logging** with appropriate severity levels
- ✅ **Security audit trails** for auth failures and critical errors
- ✅ **Detailed error context** for debugging (dev mode only)
- ✅ **Rate limit headers** and retry-after information

---

## Quick Start

### 1. Basic Usage

```typescript
import { asyncHandler } from '../middlewares/error-handler';
import { NotFoundError, ValidationError } from '../utils/errors';

// Wrap your route handler with asyncHandler
export const getUser = asyncHandler(async (c) => {
  const userId = c.req.param('id');
  const user = await db.findUser(userId);
  
  if (!user) {
    throw new NotFoundError('User', { userId });
  }
  
  return c.json({ user });
});
```

### 2. Validation

```typescript
import { validateRequiredFields } from '../middlewares/error-handler';
import { ValidationError } from '../utils/errors';

export const createTask = asyncHandler(async (c) => {
  const body = await c.req.json();
  
  // Automatically throws MissingFieldError if fields are missing
  validateRequiredFields(body, ['title', 'projectId']);
  
  // Custom validation
  if (body.dueDate && new Date(body.dueDate) < new Date()) {
    throw new ValidationError('Due date cannot be in the past', {
      field: 'dueDate',
      value: body.dueDate,
    });
  }
  
  // Create task...
  return c.json({ task });
});
```

### 3. Authorization

```typescript
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export const deleteProject = asyncHandler(async (c) => {
  const userId = c.get('userId');
  
  if (!userId) {
    throw new UnauthorizedError();
  }
  
  const hasPermission = await checkPermission(userId, projectId, 'delete');
  
  if (!hasPermission) {
    throw new ForbiddenError('Insufficient permissions to delete project', {
      userId,
      projectId,
      requiredPermission: 'project:delete',
    });
  }
  
  // Delete project...
});
```

---

## Available Error Classes

### Authentication (401)
```typescript
UnauthorizedError       // Generic auth required
TokenExpiredError       // JWT/session expired
InvalidTokenError       // Malformed token
```

### Authorization (403)
```typescript
ForbiddenError                 // Generic access denied
InsufficientPermissionsError  // Missing required permissions
```

### Validation (400)
```typescript
ValidationError       // Generic validation failure
InvalidInputError     // Invalid input format
MissingFieldError     // Required field missing
```

### Resources (404, 409, 410)
```typescript
NotFoundError        // Resource not found
AlreadyExistsError   // Duplicate resource
ConflictError        // Operation conflict
GoneError            // Resource permanently deleted
```

### Business Logic (422)
```typescript
BusinessRuleViolationError  // Business rule violated
InvalidStateError           // Invalid state for operation
OperationNotAllowedError   // Operation not permitted
QuotaExceededError         // Quota/limit exceeded
```

### Rate Limiting (429)
```typescript
RateLimitError      // Rate limit exceeded
```

### External Services (502, 503)
```typescript
ExternalServiceError  // Third-party service error
IntegrationError      // Integration failure
```

### Database (500)
```typescript
DatabaseError            // Generic DB error
TransactionFailedError   // Transaction rollback
ConstraintViolationError // DB constraint violation
```

### Internal (500, 501, 503, 504)
```typescript
InternalError           // Generic server error
NotImplementedError     // Feature not implemented
ServiceUnavailableError // Service temporarily down
TimeoutError           // Request timeout
```

---

## Error Response Format

All errors return this consistent format:

```json
{
  "error": {
    "message": "User not found",
    "code": "RES_001",
    "statusCode": 404,
    "details": {
      "userId": "user_123"
    },
    "requestId": "req_abc123",
    "timestamp": "2025-10-30T12:00:00.000Z",
    "path": "/api/users/user_123"
  }
}
```

**In production**, `details` and `stack` are omitted for security.

---

## Helper Functions

### validateRequiredFields

Validates required fields and throws `MissingFieldError`:

```typescript
import { validateRequiredFields } from '../middlewares/error-handler';

const body = await c.req.json();
validateRequiredFields(body, ['email', 'password', 'name']);
```

### handleDatabaseError

Converts database errors to typed `AppError`:

```typescript
import { handleDatabaseError } from '../middlewares/error-handler';

try {
  await db.insert(users).values(userData);
} catch (error) {
  handleDatabaseError(error, 'create user');
}
```

Automatically handles:
- Unique constraint violations → `ConstraintViolationError`
- Foreign key violations → `ConstraintViolationError`
- NOT NULL violations → `ConstraintViolationError`
- Generic DB errors → `DatabaseError`

### handleExternalError

Converts external API errors to typed `AppError`:

```typescript
import { handleExternalError } from '../middlewares/error-handler';

try {
  const response = await fetch('https://api.external.com/data');
} catch (error) {
  handleExternalError(error, 'External API', 'fetch user data');
}
```

---

## Best Practices

### 1. Always Use asyncHandler

```typescript
// ✅ Good - Errors are caught automatically
export const handler = asyncHandler(async (c) => {
  throw new NotFoundError('Resource');
});

// ❌ Bad - Errors won't be caught by middleware
export const handler = async (c) => {
  throw new NotFoundError('Resource'); // Unhandled!
};
```

### 2. Provide Context in Errors

```typescript
// ✅ Good - Helpful details for debugging
throw new NotFoundError('Project', {
  projectId,
  workspaceId,
  requestedBy: userEmail,
});

// ❌ Bad - No context
throw new NotFoundError('Project');
```

### 3. Use Specific Error Classes

```typescript
// ✅ Good - Clear error type
throw new InvalidStateError('Cannot assign task to archived project');

// ❌ Bad - Generic error
throw new Error('Cannot assign task to archived project');
```

### 4. Don't Leak Sensitive Information

```typescript
// ✅ Good - Safe error message
throw new UnauthorizedError('Invalid credentials');

// ❌ Bad - Reveals user existence
throw new NotFoundError('User with email user@example.com not found');
```

### 5. Handle Database Errors Consistently

```typescript
// ✅ Good - Converts to typed error
try {
  await db.insert(projects).values(data);
} catch (error) {
  handleDatabaseError(error, 'create project');
}

// ❌ Bad - Raw database error exposed
const result = await db.insert(projects).values(data);
```

---

## Error Codes Reference

### Authentication (1xxx)
- `AUTH_001` - Unauthorized
- `AUTH_002` - Forbidden
- `AUTH_003` - Token Expired
- `AUTH_004` - Token Invalid
- `AUTH_005` - Session Expired

### Validation (2xxx)
- `VAL_001` - Validation Error
- `VAL_002` - Invalid Input
- `VAL_003` - Missing Field
- `VAL_004` - Invalid Format

### Resources (3xxx)
- `RES_001` - Not Found
- `RES_002` - Already Exists
- `RES_003` - Conflict
- `RES_004` - Gone

### Business Logic (4xxx)
- `BIZ_001` - Business Rule Violation
- `BIZ_002` - Insufficient Permissions
- `BIZ_003` - Quota Exceeded
- `BIZ_004` - Invalid State
- `BIZ_005` - Operation Not Allowed

### External Services (5xxx)
- `EXT_001` - External Service Error
- `EXT_002` - Integration Error
- `EXT_003` - Third Party Error

### Database (6xxx)
- `DB_001` - Database Error
- `DB_002` - Transaction Failed
- `DB_003` - Constraint Violation
- `DB_004` - Connection Error

### Rate Limiting (7xxx)
- `RATE_001` - Rate Limit Exceeded
- `RATE_002` - Too Many Requests

### Internal (8xxx)
- `INT_001` - Internal Error
- `INT_002` - Not Implemented
- `INT_003` - Service Unavailable
- `INT_004` - Timeout

---

## Logging & Auditing

### Automatic Logging

Errors are automatically logged with appropriate severity:

- **500+**: Logged as `ERROR` with full stack trace
- **400-499**: Logged as `WARN` with details
- **Others**: Logged as `INFO`

### Audit Logging

Critical errors trigger audit logs:

- **Unauthorized access** (401): Auth attempt logged
- **Forbidden access** (403): Permission denial logged
- **Unexpected errors** (500): Critical error logged

### Log Context

All error logs include:
```typescript
{
  requestId,      // Unique request ID
  method,         // HTTP method
  path,           // Request path
  userEmail,      // Authenticated user
  userId,         // User ID
  statusCode,     // HTTP status
  code,           // Error code
  operational,    // Is operational error?
  duration,       // Request duration
  userAgent,      // User agent
  ipAddress,      // Client IP
}
```

---

## Rate Limiting

Rate limit errors include retry information:

```json
{
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_001",
    "statusCode": 429,
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "current": 105,
      "window": "1 minute"
    }
  }
}
```

Response headers:
- `Retry-After`: Seconds until retry
- `X-RateLimit-Reset`: Timestamp of reset

---

## Testing Errors

```typescript
import { describe, it, expect } from 'vitest';
import { NotFoundError, ValidationError } from '../utils/errors';

describe('Error Handling', () => {
  it('should throw NotFoundError with context', () => {
    expect(() => {
      throw new NotFoundError('User', { userId: '123' });
    }).toThrow(NotFoundError);
  });
  
  it('should return correct status code', () => {
    const error = new ValidationError('Invalid input');
    expect(error.status).toBe(400);
    expect(error.code).toBe('VAL_001');
  });
  
  it('should format error response correctly', () => {
    const error = new NotFoundError('Resource', { id: '123' });
    const json = error.toJSON();
    
    expect(json.error.message).toBe('Resource not found');
    expect(json.error.code).toBe('RES_001');
    expect(json.error.details).toEqual({ id: '123' });
  });
});
```

---

## Migration Guide

### Before
```typescript
export const handler = async (c) => {
  const user = await getUser(id);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ user });
};
```

### After
```typescript
import { asyncHandler } from '../middlewares/error-handler';
import { NotFoundError } from '../utils/errors';

export const handler = asyncHandler(async (c) => {
  const user = await getUser(id);
  if (!user) {
    throw new NotFoundError('User', { id });
  }
  return c.json({ user });
});
```

---

## Related Files

- `src/utils/errors.ts` - Error class definitions
- `src/middlewares/error-handler.ts` - Error handling middleware
- `src/utils/error-examples.ts` - Usage examples
- `src/index.ts` - Global error handler registration

---

## Support

For questions or issues with error handling:
1. Check this guide for examples
2. Review `error-examples.ts` for patterns
3. Search codebase for existing usage
4. Consult team lead for complex scenarios

