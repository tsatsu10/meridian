# 🔧 Configuration Migration Guide

## Overview
This guide documents the migration from hardcoded configuration values to the centralized configuration management system in `src/config/app-config.ts`.

## Migration Progress

### ✅ Completed Migrations

#### 1. Main Server Configuration (`src/index.ts`)
```typescript
// Before: Hardcoded port and environment reading
const port = parseInt(process.env.API_PORT || '3001');

// After: Centralized configuration
import { getServerConfig } from "./config/app-config";
const serverConfig = getServerConfig();
const port = serverConfig.port;
```

#### 2. WebSocket Server Configuration (`src/realtime/unified-websocket-server.ts`)
```typescript
// Before: Hardcoded values scattered throughout
private readonly MAX_TOTAL_CONNECTIONS = 10000;
pingTimeout: 60000,
pingInterval: 25000,
this.healthMonitor.startMonitoring(30000);

// After: Centralized configuration
import { getWebSocketConfig } from '../config/app-config';
private readonly wsConfig = getWebSocketConfig();
private readonly MAX_TOTAL_CONNECTIONS = this.wsConfig.maxConnections;
pingTimeout: this.wsConfig.pongTimeout,
pingInterval: this.wsConfig.pingInterval,
this.healthMonitor.startMonitoring(this.wsConfig.pingInterval);
```

### 🔄 In Progress Migrations

#### 3. Database Configuration
Files to update:
- `src/database/index.ts` - Connection timeouts and pool settings
- `src/database/schema.ts` - Query timeouts and retry configurations

#### 4. File Upload Configuration
Files to update:
- `src/attachment/controllers/upload-attachment.ts` - File size limits
- `src/services/thumbnail-service.ts` - Thumbnail settings

#### 5. Pagination Configuration
Files to update:
- `src/dashboard/controllers/get-analytics.ts` - Default and max limits
- `src/project/controllers/get-projects.ts` - Page size configurations
- `src/task/controllers/get-tasks.ts` - Task listing limits

## Migration Pattern

### Step 1: Import Configuration Getter
```typescript
// Add import for specific configuration section
import { getServerConfig, getDatabaseConfig, getApiConfig } from '../config/app-config';
```

### Step 2: Replace Hardcoded Values
```typescript
// Before: Hardcoded values
const timeout = 30000;
const maxSize = 52428800; // 50MB
const defaultLimit = 50;

// After: Configuration-based values
const apiConfig = getApiConfig();
const fileConfig = getFileConfig();
const paginationConfig = getPaginationConfig();

const timeout = apiConfig.requestTimeout;
const maxSize = fileConfig.maxFileSize;
const defaultLimit = paginationConfig.defaultLimit;
```

### Step 3: Update Environment Variables
```bash
# Add new environment variables to .env
API_REQUEST_TIMEOUT=30000
MAX_FILE_SIZE=104857600
DEFAULT_PAGE_LIMIT=50
```

## Remaining Hardcoded Values by Category

### High Priority (Performance Impact)
1. **Memory Thresholds** - `src/services/memory-monitor.ts`
   - Memory usage thresholds: 0.85 (85%)
   - GC interval: 300000ms (5 minutes)

2. **Rate Limiting** - `src/utils/rate-limiter.ts`
   - Window size: 900000ms (15 minutes)
   - Max requests: 100

3. **Database Connection Pools** - `src/database/index.ts`
   - Max connections: 10
   - Idle timeout: 60000ms (1 minute)

### Medium Priority (User Experience)
1. **Pagination Defaults**
   - Various controllers using limit: 50, 100, 1000
   - Export limits: 10000

2. **WebSocket Message Queue**
   - Queue size: 1000
   - Broadcast throttle: 100ms

3. **File Processing**
   - Thumbnail size: 200px
   - Compression quality: 0.8

### Low Priority (Feature Specific)
1. **Calendar Integration**
   - Reminder defaults: 15 minutes
   - Sync interval: 1 hour

2. **Analytics Aggregation**
   - Batch size: 1000
   - Retention: 365 days

3. **Automation Rules**
   - Max conditions: 10
   - Max actions: 10

## Migration Checklist

### For Each File Migration:
- [ ] Identify hardcoded configuration values
- [ ] Determine appropriate configuration category
- [ ] Import configuration getter function
- [ ] Replace hardcoded values with configuration
- [ ] Add environment variables to .env.example
- [ ] Update related documentation
- [ ] Test configuration changes

### Testing Migration:
```bash
# Test with different configuration values
DEFAULT_PAGE_LIMIT=25 npm run dev
MAX_FILE_SIZE=209715200 npm run dev  # 200MB
WS_MAX_CONNECTIONS=5000 npm run dev
```

## Environment Variable Mapping

| Configuration Category | Getter Function | Key Environment Variables |
|------------------------|-----------------|---------------------------|
| Server | `getServerConfig()` | `API_PORT`, `SERVER_TIMEOUT`, `KEEP_ALIVE_TIMEOUT` |
| Database | `getDatabaseConfig()` | `DB_CONNECTION_TIMEOUT`, `DB_MAX_CONNECTIONS` |
| WebSocket | `getWebSocketConfig()` | `WS_PING_INTERVAL`, `WS_MAX_CONNECTIONS` |
| Security | `getSecurityConfig()` | `RATE_LIMIT_MAX`, `SESSION_TIMEOUT` |
| Files | `getFileConfig()` | `MAX_FILE_SIZE`, `UPLOAD_TIMEOUT` |
| API | `getApiConfig()` | `API_REQUEST_TIMEOUT`, `SLOW_QUERY_THRESHOLD` |
| Pagination | `getPaginationConfig()` | `DEFAULT_PAGE_LIMIT`, `MAX_PAGE_LIMIT` |
| Performance | `getPerformanceConfig()` | `MEMORY_THRESHOLD`, `GC_INTERVAL` |

## Benefits of Migration

### 1. Operational Benefits
- ✅ No code changes for configuration tuning
- ✅ Environment-specific defaults
- ✅ Centralized configuration management
- ✅ Production vs development settings

### 2. Development Benefits
- ✅ Type-safe configuration access
- ✅ Validation at startup
- ✅ Clear configuration documentation
- ✅ Easier testing with different settings

### 3. Deployment Benefits
- ✅ Environment variable override capability
- ✅ Configuration validation before startup
- ✅ Consistent defaults across environments
- ✅ Easier container configuration

## Configuration Testing

### Development Environment
```bash
# Balanced settings for development
LOG_LEVEL=info
DEFAULT_PAGE_LIMIT=25
WS_PING_INTERVAL=15000
MEMORY_THRESHOLD=0.7
```

### Production Environment
```bash
# Optimized settings for production
LOG_LEVEL=warn
DEFAULT_PAGE_LIMIT=50
WS_PING_INTERVAL=30000
MEMORY_THRESHOLD=0.85
ENABLE_FILE_LOGGING=true
```

### Testing Environment
```bash
# Fast settings for tests
LOG_LEVEL=silent
DEFAULT_PAGE_LIMIT=10
WS_PING_INTERVAL=5000
MEMORY_THRESHOLD=0.9
```

## Next Steps

1. **Complete High Priority Migrations**
   - Memory monitoring configuration
   - Rate limiting configuration
   - Database connection configuration

2. **Update Documentation**
   - Environment variable reference
   - Configuration examples
   - Troubleshooting guide

3. **Add Configuration Validation**
   - Startup validation
   - Environment-specific constraints
   - Warning for suboptimal settings

4. **Create Configuration Profiles**
   - Development profile
   - Production profile
   - Testing profile
   - Performance tuning profile

## Migration Status: 30% Complete

- ✅ **Infrastructure**: Centralized configuration system
- ✅ **Core Server**: Main server and WebSocket configuration
- 🔄 **In Progress**: Database and file handling configuration
- ⏳ **Pending**: API endpoints and feature-specific configuration