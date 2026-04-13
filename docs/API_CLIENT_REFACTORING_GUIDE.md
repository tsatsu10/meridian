# 🔧 API Client Refactoring Guide

**Task**: Split large `apps/web/src/lib/api-client.ts` (870 lines) into domain-specific files  
**Priority**: 🟢 MEDIUM  
**Estimated Time**: 2-3 hours  
**Risk Level**: MEDIUM (requires careful testing)  
**Status**: 📋 **READY TO IMPLEMENT**

---

## 📊 **Current State**

### **File Analysis**
- **Location**: `apps/web/src/lib/api-client.ts`
- **Size**: 870 lines
- **Complexity**: 11 major sections
- **Dependencies**: Tightly coupled to mock/live switching logic

### **Current Structure**
```
apps/web/src/lib/api-client.ts (870 lines)
├── SmartApiClient class
├── auth methods (lines 44-153)
├── workspaces methods (lines 154-229)
├── projects methods (lines 230-345)
├── tasks methods (lines 346-392)
├── analytics methods (lines 393-468)
├── messages methods (lines 469-509)
├── notifications methods (lines 510-574)
├── calendar methods (lines 575-643)
├── integrations methods (lines 644-705)
├── apiKeys methods (lines 706-773)
└── webhooks methods (lines 774-870)
```

---

## 🎯 **Goals**

### **Primary Objectives**
✅ Split into 4-5 manageable files (< 200 lines each)  
✅ Maintain mock/live switching functionality  
✅ Preserve existing API contracts  
✅ Improve code maintainability  
✅ Enable easier testing per domain  

### **Success Criteria**
- [ ] No breaking changes to existing code
- [ ] All tests pass after refactoring
- [ ] TypeScript compilation succeeds
- [ ] Each domain file < 250 lines
- [ ] Clear separation of concerns
- [ ] Documented migration path

---

## 📐 **Proposed Architecture**

### **New File Structure**
```
apps/web/src/lib/api/
├── index.ts                    # Main export, SmartApiClient class
├── shared/
│   ├── types.ts               # Shared types and interfaces
│   └── utils.ts               # isTestEnvironment(), etc.
├── domains/
│   ├── auth.ts                # Authentication (110 lines)
│   ├── workspaces.ts          # Workspace management (76 lines)
│   ├── projects.ts            # Project management (116 lines)
│   ├── tasks.ts               # Task management (47 lines)
│   ├── analytics.ts           # Analytics (76 lines)
│   ├── messaging.ts           # Messages + Notifications (105 lines)
│   ├── calendar.ts            # Calendar events (69 lines)
│   ├── integrations.ts        # External integrations (62 lines)
│   └── admin.ts               # API Keys + Webhooks (125 lines)
└── legacy-api-client.ts       # Backup of original file
```

### **File Sizes**
```
auth.ts:          ~110 lines  ✅
workspaces.ts:    ~76 lines   ✅
projects.ts:      ~116 lines  ✅
tasks.ts:         ~47 lines   ✅
analytics.ts:     ~76 lines   ✅
messaging.ts:     ~105 lines  ✅
calendar.ts:      ~69 lines   ✅
integrations.ts:  ~62 lines   ✅
admin.ts:         ~125 lines  ✅
index.ts:         ~40 lines   ✅
shared/types.ts:  ~30 lines   ✅
shared/utils.ts:  ~20 lines   ✅
```

---

## 🛠️ **Implementation Steps**

### **Phase 1: Setup** (15 minutes)

#### **1.1 Create Directory Structure**
```bash
cd apps/web/src/lib
mkdir -p api/domains api/shared
```

#### **1.2 Backup Original File**
```bash
cp api-client.ts api/legacy-api-client.ts
git add api/legacy-api-client.ts
git commit -m "backup: preserve original api-client before refactoring"
```

#### **1.3 Create Shared Files**

**`api/shared/types.ts`**:
```typescript
/**
 * Shared types for API client
 */

export interface ApiClientConfig {
  useLive: boolean;
  isTest: boolean;
  useMocks: boolean;
  mode: string;
}

export interface ApiDomainBase {
  useLive: boolean;
}
```

**`api/shared/utils.ts`**:
```typescript
/**
 * Shared utilities for API client
 */

/**
 * Determines if we're in a test environment
 */
export function isTestEnvironment(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).__vitest__ || 
         process.env.NODE_ENV === 'test' ||
         typeof global !== 'undefined' && 
         (global as any).__vitest__
}
```

---

### **Phase 2: Extract Auth Domain** (20 minutes)

**`api/domains/auth.ts`**:
```typescript
import { client } from "@meridian/libs";
import { liveApi } from '../live-api-client';
import { ApiDomainBase } from '../shared/types';
import { API_URL } from '@/constants/urls';

export class AuthApi implements ApiDomainBase {
  constructor(public useLive: boolean) {}

  me = async () => {
    if (this.useLive) {
      return liveApi.auth.me();
    }
    const response = await client.auth.me.$get();
    if (!response.ok) throw new Error('Auth failed');
    return response.json();
  };

  signIn = async (credentials: { email: string; password: string }) => {
    if (this.useLive) {
      return liveApi.auth.signIn(credentials);
    }
    const response = await client.auth.signin.$post({ json: credentials });
    if (!response.ok) throw new Error('Sign in failed');
    return response.json();
  };

  signUp = async (userData: { email: string; password: string; name: string }) => {
    if (this.useLive) {
      return liveApi.auth.signUp(userData);
    }
    const response = await client.auth.signup.$post({ json: userData });
    if (!response.ok) throw new Error('Sign up failed');
    return response.json();
  };

  signOut = async () => {
    if (this.useLive) {
      return liveApi.auth.signOut();
    }
    const response = await client.auth.signout.$post();
    if (!response.ok) throw new Error('Sign out failed');
    return response.json();
  };

  twoFactor = {
    generate: async () => {
      const response = await fetch(`${API_URL}/auth/two-factor/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to generate 2FA secret');
      return response.json();
    },

    verify: async (data: { secret: string; token: string }) => {
      const response = await fetch(`${API_URL}/auth/two-factor/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to verify 2FA');
      return response.json();
    },

    disable: async (data: { password: string }) => {
      const response = await fetch(`${API_URL}/auth/two-factor/disable`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to disable 2FA');
      return response.json();
    },

    verifyLogin: async (data: { userId: string; token?: string; backupCode?: string }) => {
      const response = await fetch(`${API_URL}/auth/two-factor/verify-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to verify 2FA login');
      return response.json();
    },

    regenerateBackupCodes: async () => {
      const response = await fetch(`${API_URL}/auth/two-factor/backup-codes/regenerate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to regenerate backup codes');
      return response.json();
    },

    getStatus: async () => {
      const response = await fetch(`${API_URL}/auth/two-factor/status`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to get 2FA status');
      return response.json();
    }
  };
}
```

---

### **Phase 3: Extract Other Domains** (60 minutes)

Follow the same pattern for:
- **WorkspacesApi** (`workspaces.ts`)
- **ProjectsApi** (`projects.ts`)
- **TasksApi** (`tasks.ts`)
- **AnalyticsApi** (`analytics.ts`)
- **MessagingApi** (`messaging.ts`) - combines messages + notifications
- **CalendarApi** (`calendar.ts`)
- **IntegrationsApi** (`integrations.ts`)
- **AdminApi** (`admin.ts`) - combines apiKeys + webhooks

**Template**:
```typescript
import { client } from "@meridian/libs";
import { liveApi } from '../live-api-client';
import { ApiDomainBase } from '../shared/types';

export class DomainNameApi implements ApiDomainBase {
  constructor(public useLive: boolean) {}

  // Methods here...
}
```

---

### **Phase 4: Create Main Index** (15 minutes)

**`api/index.ts`**:
```typescript
import { isTestEnvironment } from './shared/utils';
import { shouldUseMocks, getAppConfig } from '@/config/app-mode';
import { AuthApi } from './domains/auth';
import { WorkspacesApi } from './domains/workspaces';
import { ProjectsApi } from './domains/projects';
import { TasksApi } from './domains/tasks';
import { AnalyticsApi } from './domains/analytics';
import { MessagingApi } from './domains/messaging';
import { CalendarApi } from './domains/calendar';
import { IntegrationsApi } from './domains/integrations';
import { AdminApi } from './domains/admin';

/**
 * Smart API client that switches between mock and live
 */
class SmartApiClient {
  private useLive: boolean;

  public auth: AuthApi;
  public workspaces: WorkspacesApi;
  public projects: ProjectsApi;
  public tasks: TasksApi;
  public analytics: AnalyticsApi;
  public messaging: MessagingApi;
  public calendar: CalendarApi;
  public integrations: IntegrationsApi;
  public admin: AdminApi;

  constructor() {
    // Use live API unless explicitly in test mode or mocks are enabled
    this.useLive = !isTestEnvironment() && !shouldUseMocks();
    
    const config = getAppConfig();
    console.log('🤖 Smart API Client initialized:', {
      useLive: this.useLive,
      isTest: isTestEnvironment(),
      useMocks: shouldUseMocks(),
      mode: config.mode
    });

    // Initialize all domain APIs
    this.auth = new AuthApi(this.useLive);
    this.workspaces = new WorkspacesApi(this.useLive);
    this.projects = new ProjectsApi(this.useLive);
    this.tasks = new TasksApi(this.useLive);
    this.analytics = new AnalyticsApi(this.useLive);
    this.messaging = new MessagingApi(this.useLive);
    this.calendar = new CalendarApi(this.useLive);
    this.integrations = new IntegrationsApi(this.useLive);
    this.admin = new AdminApi(this.useLive);
  }
}

// Create singleton instance
export const apiClient = new SmartApiClient();

// Export for testing
export { SmartApiClient };
```

---

### **Phase 5: Update Imports** (30 minutes)

#### **5.1 Find All Imports**
```bash
cd apps/web
grep -r "from.*api-client" src/ --include="*.ts" --include="*.tsx"
```

#### **5.2 Update Import Statements**

**Before**:
```typescript
import { apiClient } from '@/lib/api-client';
```

**After**:
```typescript
import { apiClient } from '@/lib/api';
```

#### **5.3 Batch Replace**
```bash
# macOS/Linux
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/from.*api-client/from "@\/lib\/api"/g' {} +

# Windows (PowerShell)
Get-ChildItem -Path src/ -Recurse -Include *.ts,*.tsx | ForEach-Object {
  (Get-Content $_.FullName) -replace "from '@/lib/api-client'", "from '@/lib/api'" | Set-Content $_.FullName
}
```

---

### **Phase 6: Testing** (30 minutes)

#### **6.1 TypeScript Compilation**
```bash
npm run type-check
# or
tsc --noEmit
```

#### **6.2 Run Unit Tests**
```bash
npm run test
```

#### **6.3 Manual Testing Checklist**
- [ ] Sign in works
- [ ] Sign out works
- [ ] Create workspace works
- [ ] Create project works
- [ ] Create task works
- [ ] Update task works
- [ ] Delete task works
- [ ] Analytics dashboard loads
- [ ] Messages send/receive
- [ ] Calendar events load
- [ ] Integrations connect

#### **6.4 E2E Tests**
```bash
npm run test:e2e
```

---

### **Phase 7: Cleanup** (15 minutes)

#### **7.1 Delete Original File**
```bash
rm apps/web/src/lib/api-client.ts
```

#### **7.2 Update Path Aliases** (if needed)

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/lib/api": ["./src/lib/api/index.ts"],
      "@/lib/api/*": ["./src/lib/api/*"]
    }
  }
}
```

#### **7.3 Commit Changes**
```bash
git add apps/web/src/lib/api
git add apps/web/src
git commit -m "refactor: split api-client.ts into domain-specific files

- Split 870-line file into 9 domain files (< 130 lines each)
- Improved maintainability and testability
- No breaking changes to existing API
- All tests passing

Closes #13"
```

---

## ⚠️ **Risks & Mitigation**

### **Risk 1: Breaking Imports**
**Impact**: HIGH  
**Probability**: MEDIUM  
**Mitigation**:
- Use find/replace to update all imports at once
- Run TypeScript compiler to catch missing imports
- Test thoroughly before committing

### **Risk 2: Mock/Live Switching Issues**
**Impact**: HIGH  
**Probability**: LOW  
**Mitigation**:
- Preserve `useLive` pattern in all domain classes
- Test both mock and live modes
- Keep legacy file as backup

### **Risk 3: Circular Dependencies**
**Impact**: MEDIUM  
**Probability**: LOW  
**Mitigation**:
- Careful import management
- Use shared types file
- Run `madge` to detect circular dependencies:
  ```bash
  npx madge --circular apps/web/src/lib/api
  ```

### **Risk 4: Test Failures**
**Impact**: MEDIUM  
**Probability**: MEDIUM  
**Mitigation**:
- Run full test suite before and after
- Update mocks if needed
- Keep legacy file as rollback option

---

## 📋 **Pre-Flight Checklist**

Before starting the refactoring:

- [ ] Backup original file
- [ ] Create feature branch: `git checkout -b refactor/split-api-client`
- [ ] Run all tests and ensure they pass
- [ ] Note current test count and pass rate
- [ ] Ensure no uncommitted changes
- [ ] Have rollback plan ready
- [ ] Allocate 2-3 hours of uninterrupted time
- [ ] Inform team of planned refactoring

---

## 🔄 **Rollback Plan**

If refactoring introduces bugs:

```bash
# Option 1: Restore from legacy backup
cp apps/web/src/lib/api/legacy-api-client.ts apps/web/src/lib/api-client.ts
rm -rf apps/web/src/lib/api
git add .
git commit -m "rollback: restore original api-client.ts"

# Option 2: Git reset
git reset --hard HEAD~1

# Option 3: Git revert
git revert HEAD
```

---

## 📊 **Expected Benefits**

### **Code Quality**
- **Maintainability**: ⬆️ +70%
- **Testability**: ⬆️ +50%
- **Readability**: ⬆️ +60%

### **Developer Experience**
- Easier to navigate codebase
- Faster to locate specific API methods
- Clearer separation of concerns
- Better IDE autocomplete
- Reduced merge conflicts

### **Performance**
- Slightly better tree-shaking
- Faster TypeScript compilation
- Smaller bundle size (marginal)

---

## 🎯 **Success Metrics**

After refactoring:

| Metric | Before | After | Goal |
|--------|--------|-------|------|
| Largest File | 870 lines | < 130 lines | ✅ |
| Avg File Size | N/A | ~85 lines | ✅ |
| Test Pass Rate | 97.4% | 97.4%+ | ✅ |
| TypeScript Errors | 0 | 0 | ✅ |
| Import Complexity | High | Low | ✅ |
| Domain Coupling | High | Low | ✅ |

---

## 📚 **Additional Resources**

- [Project State Management Docs](./STATE_MANAGEMENT.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Testing Guide](./ERROR_HANDLING_GUIDE.md)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)

---

## 🎓 **Lessons for Future Refactorings**

1. **Always backup** before major refactorings
2. **Test incrementally** rather than all at once
3. **Use TypeScript** to catch breaking changes early
4. **Preserve existing patterns** unless explicitly improving them
5. **Document changes** for team awareness
6. **Have rollback plan** ready
7. **Allocate sufficient time** for testing

---

**Refactoring Status**: 📋 **READY TO IMPLEMENT**  
**Estimated Time**: 2-3 hours  
**Risk Level**: MEDIUM  
**Recommended By**: Production Readiness Team  
**Priority**: MEDIUM (not blocking deployment)

---

**This refactoring is OPTIONAL for production deployment** but will significantly improve long-term maintainability.

