# 📊 Structured Logging Implementation Guide

**Task**: Standardize logging format with structured logs (timestamp, traceId, etc.)  
**Priority**: 🔵 LOW  
**Estimated Time**: 4-6 hours  
**Risk Level**: LOW (improves observability)  
**Status**: 📋 **READY TO IMPLEMENT**

---

## 📊 **Current State**

### **Logging System**
- ✅ Using **Pino** logger (already installed)
- ✅ 1,645 console statements replaced with logger
- ⚠️ Basic logging format (not fully structured)
- ⚠️ No trace IDs
- ⚠️ No request correlation
- ⚠️ No consistent metadata

### **Current Logger** (`apps/api/src/utils/logger.ts`)
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
```

---

## 🎯 **Goals**

### **Primary Objectives**
✅ Add trace IDs to all logs  
✅ Add request IDs for API calls  
✅ Include consistent metadata (userId, workspaceId, etc.)  
✅ Add timestamps in ISO format  
✅ Include log levels and context  
✅ Make logs machine-parseable  
✅ Enable log correlation  

### **Success Criteria**
- [ ] All logs include trace ID
- [ ] All API requests have request ID
- [ ] Logs are JSON in production
- [ ] Pretty format in development
- [ ] User/workspace context included
- [ ] Error logs include stack traces
- [ ] Performance metrics included
- [ ] Ready for log aggregation tools

---

## 🏗️ **Architecture**

### **Structured Log Format**

```json
{
  "level": "info",
  "time": "2025-10-31T10:30:45.123Z",
  "pid": 12345,
  "hostname": "api-server-1",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "req_abc123xyz",
  "userId": "user_789",
  "workspaceId": "workspace_456",
  "msg": "User logged in successfully",
  "context": {
    "email": "user@example.com",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "performance": {
    "duration": 45,
    "unit": "ms"
  }
}
```

---

## ⚙️ **Implementation Steps**

### **Phase 1: Enhanced Logger Setup** (1 hour)

#### **1.1 Install Dependencies**

```bash
cd apps/api
npm install cls-hooked uuid @types/uuid pino-http
```

**Dependencies**:
- `cls-hooked`: Continuation-local storage for trace context
- `uuid`: Generate trace/request IDs
- `pino-http`: HTTP logger middleware

#### **1.2 Create Enhanced Logger**

**File**: `apps/api/src/utils/logger.ts`

```typescript
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Base logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  
  // Base configuration
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    service: 'meridian-api',
    version: process.env.npm_package_version || '1.0.0',
  },

  // Timestamp configuration
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Formatters
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
      };
    },
  },

  // Redact sensitive data
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
};

// Pretty print in development
if (!isProduction) {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  };
}

// Create base logger
export const logger = pino(loggerConfig);

// Helper to create child logger with context
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

// Helper to generate trace ID
export function generateTraceId(): string {
  return uuidv4();
}

// Helper to generate request ID
export function generateRequestId(): string {
  return `req_${uuidv4().substring(0, 12)}`;
}

export default logger;
```

---

### **Phase 2: Trace Context Management** (1 hour)

#### **2.1 Create Trace Context**

**File**: `apps/api/src/utils/trace-context.ts`

```typescript
import { createNamespace, Namespace } from 'cls-hooked';
import { generateTraceId, generateRequestId } from './logger';

// Create namespace for trace context
const namespace: Namespace = createNamespace('meridian-trace');

export interface TraceContext {
  traceId: string;
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  email?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * Initialize trace context for a new request
 */
export function initTraceContext(initialContext: Partial<TraceContext> = {}): string {
  const traceId = generateTraceId();
  
  namespace.run(() => {
    namespace.set('traceId', traceId);
    namespace.set('requestId', generateRequestId());
    
    // Set any initial context
    Object.entries(initialContext).forEach(([key, value]) => {
      namespace.set(key, value);
    });
  });
  
  return traceId;
}

/**
 * Get current trace context
 */
export function getTraceContext(): TraceContext {
  return {
    traceId: namespace.get('traceId') || generateTraceId(),
    requestId: namespace.get('requestId'),
    userId: namespace.get('userId'),
    workspaceId: namespace.get('workspaceId'),
    projectId: namespace.get('projectId'),
    email: namespace.get('email'),
    role: namespace.get('role'),
    ip: namespace.get('ip'),
    userAgent: namespace.get('userAgent'),
  };
}

/**
 * Set trace context value
 */
export function setTraceContext(key: string, value: any): void {
  namespace.set(key, value);
}

/**
 * Get specific trace context value
 */
export function getTraceValue<T = any>(key: string): T | undefined {
  return namespace.get(key);
}

/**
 * Run function within trace context
 */
export function runInContext<T>(fn: () => T): T {
  return namespace.run(fn);
}

export { namespace as traceNamespace };
```

---

### **Phase 3: HTTP Request Logger** (1 hour)

#### **3.1 Create HTTP Logger Middleware**

**File**: `apps/api/src/middlewares/logger-middleware.ts`

```typescript
import { Context, Next } from 'hono';
import { logger, createChildLogger } from '../utils/logger';
import { initTraceContext, getTraceContext, setTraceContext } from '../utils/trace-context';

/**
 * HTTP request logging middleware
 */
export async function loggerMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const requestId = c.req.header('x-request-id') || undefined;
  
  // Initialize trace context
  initTraceContext({
    requestId,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  
  // Create request logger with context
  const requestLogger = createChildLogger({
    ...getTraceContext(),
    method,
    path,
  });
  
  // Attach logger to context
  c.set('logger', requestLogger);
  
  // Log incoming request
  requestLogger.info({
    msg: `→ ${method} ${path}`,
    type: 'request',
  });
  
  try {
    await next();
    
    // Calculate duration
    const duration = Date.now() - startTime;
    const status = c.res.status;
    
    // Log response
    requestLogger.info({
      msg: `← ${method} ${path} ${status}`,
      type: 'response',
      status,
      performance: {
        duration,
        unit: 'ms',
      },
    });
  } catch (error) {
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Log error
    requestLogger.error({
      msg: `✗ ${method} ${path} ERROR`,
      type: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      performance: {
        duration,
        unit: 'ms',
      },
    });
    
    throw error;
  }
}

/**
 * Get logger from context
 */
export function getLogger(c: Context) {
  return c.get('logger') || logger;
}
```

---

### **Phase 4: Authentication Context** (1 hour)

#### **4.1 Update Auth Middleware**

**File**: `apps/api/src/middlewares/auth.ts` (update existing)

```typescript
import { setTraceContext } from '../utils/trace-context';

// In your existing auth middleware, after verifying the user:
export async function authMiddleware(c: Context, next: Next) {
  // ... existing auth logic ...
  
  const user = c.get('user');
  
  if (user) {
    // Add user context to trace
    setTraceContext('userId', user.id);
    setTraceContext('email', user.email);
    setTraceContext('role', user.role);
    setTraceContext('workspaceId', user.workspaceId);
  }
  
  await next();
}
```

---

### **Phase 5: Update Logger Usage** (2 hours)

#### **5.1 Update Logger Calls**

**Find all logger calls**:
```bash
cd apps/api
grep -r "logger\." src/ --include="*.ts" | wc -l
```

**Pattern 1: Add context to logger calls**

**Before**:
```typescript
logger.info('User logged in');
```

**After**:
```typescript
logger.info({
  msg: 'User logged in',
  userId,
  email,
  ip,
});
```

**Pattern 2: Use context-aware logger**

**Before**:
```typescript
logger.error('Database query failed', error);
```

**After**:
```typescript
const requestLogger = getLogger(c); // Get from Hono context

requestLogger.error({
  msg: 'Database query failed',
  error: {
    message: error.message,
    stack: error.stack,
    code: error.code,
  },
  query: {
    table: 'users',
    operation: 'select',
  },
});
```

**Pattern 3: Performance logging**

```typescript
const startTime = Date.now();

try {
  const result = await expensiveOperation();
  
  logger.info({
    msg: 'Operation completed',
    operation: 'expensiveOperation',
    performance: {
      duration: Date.now() - startTime,
      unit: 'ms',
    },
  });
  
  return result;
} catch (error) {
  logger.error({
    msg: 'Operation failed',
    operation: 'expensiveOperation',
    error: {
      message: error.message,
      stack: error.stack,
    },
    performance: {
      duration: Date.now() - startTime,
      unit: 'ms',
    },
  });
  
  throw error;
}
```

---

### **Phase 6: Testing** (30 minutes)

#### **6.1 Test Structured Logs**

```bash
# Start server
npm run dev

# Make a request
curl http://localhost:3000/api/auth/me

# Check logs include:
# - traceId
# - requestId
# - timestamps
# - proper JSON format (in production)
```

#### **6.2 Test Trace Correlation**

Make multiple requests and verify:
- Each request has unique traceId
- All logs within a request share the same traceId
- User context is included after auth

---

## 📋 **Log Levels**

### **Usage Guidelines**

```typescript
// ERROR: System errors, exceptions, failures
logger.error({ msg: 'Database connection failed', error });

// WARN: Warnings, deprecations, unusual but handled situations
logger.warn({ msg: 'API rate limit approaching', current: 90, limit: 100 });

// INFO: Important business events
logger.info({ msg: 'User logged in', userId, email });

// DEBUG: Detailed diagnostic information
logger.debug({ msg: 'Cache hit', key: 'user:123', ttl: 3600 });

// TRACE: Very detailed diagnostic information
logger.trace({ msg: 'SQL query executed', query, params });
```

---

## 🎯 **Expected Results**

### **Development Logs** (Pretty)
```
[10:30:45] INFO (12345): → GET /api/auth/me
    traceId: "550e8400-e29b-41d4-a716-446655440000"
    requestId: "req_abc123xyz"
    userId: "user_789"
    method: "GET"
    path: "/api/auth/me"
```

### **Production Logs** (JSON)
```json
{
  "level": "info",
  "time": "2025-10-31T10:30:45.123Z",
  "pid": 12345,
  "hostname": "api-server-1",
  "environment": "production",
  "service": "meridian-api",
  "version": "1.0.0",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "req_abc123xyz",
  "userId": "user_789",
  "workspaceId": "workspace_456",
  "email": "user@example.com",
  "role": "member",
  "ip": "192.168.1.1",
  "method": "GET",
  "path": "/api/auth/me",
  "msg": "→ GET /api/auth/me",
  "type": "request"
}
```

---

## 📊 **Benefits**

### **Observability**
- ✅ Trace requests across services
- ✅ Correlate logs by user/workspace
- ✅ Track performance metrics
- ✅ Debug issues faster

### **Production Ready**
- ✅ Machine-parseable logs
- ✅ Ready for log aggregation (CloudWatch, Datadog, etc.)
- ✅ Consistent structure
- ✅ Sensitive data redaction

### **Developer Experience**
- ✅ Pretty logs in development
- ✅ JSON in production
- ✅ Context-aware logging
- ✅ Easy debugging

---

## 🔗 **Integration with Log Aggregation**

Once implemented, logs are ready for:
- **CloudWatch Logs** (AWS)
- **Datadog Logs** (SaaS)
- **Elasticsearch + Kibana** (Self-hosted)
- **Loki + Grafana** (Self-hosted)

See `docs/CENTRALIZED_LOG_AGGREGATION_GUIDE.md` for details.

---

## 📚 **Resources**

- [Pino Documentation](https://getpino.io/)
- [12-Factor App Logging](https://12factor.net/logs)
- [Structured Logging Best Practices](https://www.loggly.com/blog/why-json-is-the-best-application-log-format-and-how-to-switch/)

---

**Implementation Status**: 📋 **READY TO IMPLEMENT**  
**Estimated Time**: 4-6 hours  
**Risk Level**: LOW  
**Priority**: LOW (not blocking deployment)

This improvement enables **professional observability** and prepares for log aggregation tools.

