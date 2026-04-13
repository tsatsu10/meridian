# Consolidated Store Architecture - Phase 3

## Current State Analysis

**Store Usage Audit Results:**
- Total store imports: 190 across codebase
- Most used stores:
  - `@/store/workspace` (104 imports) 
  - `@/store/project` (46 imports)
  - `@/store/settings` (18 imports)
  - `@/store/user-preferences` (11 imports)
  - Others: minimal usage

**Current Problems:**
- 39 store files for simple CRUD operations
- Redux Toolkit + Zustand + Context API overlap
- Complex middleware systems
- Redundant caching and event systems

## New Architecture: 8 Core Stores

### 1. `auth.ts` - Authentication & User State
**Purpose**: Single source of truth for user authentication and RBAC
**Consolidates**:
- Current: `authSlice.ts`, `user-preferences.ts`, RBAC provider state
- Replaces: Multiple auth contexts

```typescript
interface AuthStore {
  user: UnifiedUser | null;
  permissions: AllPermissions;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Actions
  signIn: (credentials) => Promise<void>;
  signOut: () => Promise<void>;
  updatePermissions: (permissions) => void;
  checkPermission: (action) => boolean;
}
```

### 2. `workspace.ts` - Workspace & Organization Data
**Purpose**: Current workspace, projects, and organizational structure
**Consolidates**:
- Current: `workspaceSlice.ts`, `workspace.ts` (Zustand)
- High usage: 104 imports

```typescript
interface WorkspaceStore {
  current: WorkspaceData | null;
  projects: ProjectData[];
  members: WorkspaceMember[];
  // Actions
  setWorkspace: (workspace) => void;
  loadProjects: () => Promise<void>;
  createProject: (project) => Promise<void>;
}
```

### 3. `tasks.ts` - Task Management & Project Data
**Purpose**: All task-related state and project workflow
**Consolidates**:
- Current: `taskSlice.ts`, `projectSlice.ts`, `project.ts` (Zustand)
- Medium usage: 46 imports

```typescript
interface TaskStore {
  tasks: TaskData[];
  activeProject: ProjectData | null;
  filters: TaskFilters;
  sorting: TaskSorting;
  // Actions
  createTask: (task) => Promise<void>;
  updateTask: (id, updates) => Promise<void>;
  setFilters: (filters) => void;
  reorderTasks: (sourceId, targetId) => void;
}
```

### 4. `ui.ts` - UI State & Theme Management
**Purpose**: Global UI state, modals, sidebar, theme
**Consolidates**:
- Current: `uiSlice.ts`, `settings.ts` (appearance), theme providers
- Medium usage: 18 imports

```typescript
interface UIStore {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  activeModal: string | null;
  notifications: NotificationData[];
  // Actions
  setTheme: (theme) => void;
  toggleSidebar: () => void;
  openModal: (modal) => void;
  closeModal: () => void;
}
```

### 5. `communication.ts` - Messages & Real-time State
**Purpose**: Chat, notifications, real-time features
**Consolidates**:
- Current: `communicationSlice.ts`, realtime provider, websocket hooks

```typescript
interface CommunicationStore {
  messages: MessageData[];
  channels: ChannelData[];
  unreadCount: number;
  isConnected: boolean;
  onlineUsers: string[];
  // Actions
  sendMessage: (message) => Promise<void>;
  markAsRead: (messageId) => void;
  joinChannel: (channelId) => void;
}
```

### 6. `settings.ts` - User Preferences & Configuration
**Purpose**: User-specific settings and preferences
**Consolidates**:
- Current: `settings.ts` (Zustand), `user-preferences.ts`, settings provider
- Low usage: 11 imports

```typescript
interface SettingsStore {
  profile: ProfileSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  // Actions
  updateProfile: (profile) => Promise<void>;
  updateNotifications: (settings) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}
```

### 7. `cache.ts` - Client-side Caching & Offline
**Purpose**: Optimistic updates, offline support, data synchronization
**Consolidates**:
- Current: `cacheManager.ts`, `cacheInvalidation.ts`, persistence middleware

```typescript
interface CacheStore {
  offlineQueue: OfflineAction[];
  lastSync: Date;
  isOnline: boolean;
  // Actions
  addToQueue: (action) => void;
  syncOfflineActions: () => Promise<void>;
  invalidateCache: (keys) => void;
}
```

### 8. `teams.ts` - Team Collaboration & Analytics
**Purpose**: Team management, collaboration features, simple analytics
**Consolidates**:
- Current: `teamSlice.ts`, `unified-team-store.ts`, analytics stores

```typescript
interface TeamStore {
  currentTeam: TeamData | null;
  members: TeamMember[];
  analytics: TeamAnalytics;
  // Actions
  joinTeam: (teamId) => Promise<void>;
  inviteMember: (email) => Promise<void>;
  getAnalytics: () => Promise<TeamAnalytics>;
}
```

## Eliminated Systems

### Redux Toolkit (Complete Removal)
- 8 slices with complex middleware
- Persistence layer
- DevTools integration
- Action creators and selectors

### Zustand Complexity (Simplified)
- 31 store files → 8 core stores
- 5 middleware systems → built-in persistence only
- Complex event systems → React Query for server sync
- Testing utilities → standard testing patterns

### Context API (Minimized)
- Multiple auth contexts → single UnifiedContext
- Settings context → settings store
- Theme context → ui store
- Workspace context → workspace store

## Migration Strategy

### Phase 3A: Setup New Stores (Week 1)
1. Create 8 consolidated store files
2. Implement basic state and actions
3. Add persistence for critical stores
4. Create store-specific hooks

### Phase 3B: Migrate Components (Week 2-3)
1. Update highest usage first (workspace, project)
2. Replace store imports component by component
3. Test functionality at each step
4. Maintain backward compatibility

### Phase 3C: Remove Legacy (Week 4)
1. Delete unused store files
2. Remove Redux dependencies
3. Clean up middleware
4. Update documentation

## Success Metrics

### Before (Current State)
- Store files: 39
- Total imports: 190
- Bundle size: ~2.1MB (estimated)
- Memory usage: High (multiple state systems)

### After (Target State)
- Store files: 8 (-79%)
- Total imports: <50 (-74%)
- Bundle size: ~1.6MB (-24%)
- Memory usage: Reduced by 30%

## Implementation Priority

1. **Critical Path**: `auth.ts`, `workspace.ts`, `ui.ts`
2. **High Usage**: `tasks.ts`, `communication.ts`  
3. **Cleanup**: `settings.ts`, `cache.ts`, `teams.ts`

This consolidation will resolve the architectural complexity while maintaining all functionality in a much simpler, maintainable structure.