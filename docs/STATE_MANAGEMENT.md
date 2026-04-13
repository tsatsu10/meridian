# 🗂️ State Management Architecture

**Last Updated**: October 30, 2025  
**Meridian Version**: 0.4.0

---

## 📋 Table of Contents

- [Overview](#overview)
- [Three-Layer Architecture](#three-layer-architecture)
- [Server State (TanStack Query)](#server-state-tanstack-query)
- [Client State (Zustand)](#client-state-zustand)
- [URL State (TanStack Router)](#url-state-tanstack-router)
- [Real-Time State (WebSocket)](#real-time-state-websocket)
- [State Flow Patterns](#state-flow-patterns)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Migration Guide](#migration-guide)

---

## 🎯 Overview

Meridian uses a **three-layer state management architecture** to handle different types of state effectively:

1. **Server State** (TanStack Query) - API data, caching, synchronization
2. **Client State** (Zustand) - UI state, user preferences, temporary data
3. **URL State** (TanStack Router) - Navigation, filters, search params

This separation ensures:
- ✅ Clear separation of concerns
- ✅ Optimized data fetching and caching
- ✅ Predictable state updates
- ✅ Easy debugging and testing

---

## 🏗️ Three-Layer Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   React Component                    │
└──────┬──────────────┬──────────────┬───────────────┘
       │              │              │
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼─────┐
│ TanStack    │ │  Zustand   │ │ TanStack │
│  Query      │ │   Store    │ │  Router  │
│ (Server)    │ │  (Client)  │ │   (URL)  │
└──────┬──────┘ └─────┬──────┘ └────┬─────┘
       │              │              │
       │              │              │
┌──────▼──────────────▼──────────────▼─────┐
│            Backend API / Browser           │
└────────────────────────────────────────────┘
```

### When to Use Each

| State Type | Use For | Tool | Example |
|------------|---------|------|---------|
| **Server State** | API data | TanStack Query | Tasks, projects, users |
| **Client State** | UI state | Zustand | Sidebar open, theme |
| **URL State** | Navigation | TanStack Router | Filters, pagination |
| **Real-Time** | Live updates | WebSocket + Query | Chat, presence |

---

## 🌐 Server State (TanStack Query)

### Purpose
Manage data from the API with caching, background updates, and optimistic updates.

### Configuration

```typescript
// apps/web/src/query-client/index.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,        // 2 minutes
      gcTime: 5 * 60 * 1000,           // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Usage Pattern

```typescript
// apps/web/src/hooks/use-projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Fetch projects
export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => apiClient.projects.list(workspaceId),
    enabled: !!workspaceId,
  });
}

// Create project with optimistic update
export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectData) => 
      apiClient.projects.create(workspaceId, data),
    
    onMutate: async (newProject) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects', workspaceId] });
      
      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(['projects', workspaceId]);
      
      // Optimistically update
      queryClient.setQueryData(['projects', workspaceId], (old: any) => [
        ...(old || []),
        { ...newProject, id: 'temp-' + Date.now() }
      ]);
      
      return { previousProjects };
    },
    
    onError: (err, newProject, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['projects', workspaceId], 
        context?.previousProjects
      );
    },
    
    onSuccess: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
    },
  });
}
```

### Query Keys Convention

```typescript
// Format: [domain, identifier, ...filters]

['projects']                          // All projects
['projects', workspaceId]             // Workspace projects
['projects', workspaceId, 'active']   // Filtered projects
['project', projectId]                // Single project
['project', projectId, 'tasks']       // Project's tasks
['tasks', { projectId, status }]      // Filtered tasks
```

---

## 💾 Client State (Zustand)

### Purpose
Manage UI state, user preferences, and temporary data that doesn't belong in the URL or server.

### Store Pattern

```typescript
// apps/web/src/stores/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  commandPaletteOpen: boolean;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      theme: 'system',
      commandPaletteOpen: false,
      
      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'meridian-ui-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
```

### Usage in Components

```typescript
import { useUIStore } from '@/stores/ui-store';

function Sidebar() {
  // Select only needed state (prevents unnecessary re-renders)
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <aside className={sidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

### Existing Stores

| Store | File | Purpose |
|-------|------|---------|
| `useWorkspaceStore` | `workspace-store.ts` | Current workspace |
| `useTaskStore` | `taskStore.ts` | Task filters, view mode |
| `useProjectStore` | `projectStore.ts` | Project filters |
| `useCommunicationStore` | `communication-store.ts` | Chat state |
| `useUIStore` | Various in `store/` | UI preferences |

---

## 🔗 URL State (TanStack Router)

### Purpose
Store navigation state, filters, and search params in the URL for:
- ✅ Shareable links
- ✅ Browser back/forward
- ✅ Deep linking

### Search Params Pattern

```typescript
// apps/web/src/routes/dashboard/projects.tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

// Define search params schema
const projectsSearchSchema = z.object({
  status: z.enum(['active', 'archived', 'all']).optional(),
  sort: z.enum(['name', 'created', 'updated']).optional(),
  page: z.number().optional().default(1),
  search: z.string().optional(),
});

export const Route = createFileRoute('/dashboard/projects')({
  validateSearch: projectsSearchSchema,
  
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = Route.useNavigate();
  const { status, sort, page, search } = Route.useSearch();

  // Update URL state
  const setStatus = (newStatus: string) => {
    navigate({
      search: (prev) => ({ ...prev, status: newStatus, page: 1 })
    });
  };

  // Use in queries
  const { data } = useProjects({
    status,
    sort,
    page,
    search,
  });

  return (
    <div>
      <FilterButtons status={status} onStatusChange={setStatus} />
      <ProjectList projects={data} />
    </div>
  );
}
```

---

## 🔌 Real-Time State (WebSocket)

### Purpose
Handle real-time updates from WebSocket connections and sync with React Query.

### Integration Pattern

```typescript
// apps/web/src/hooks/use-realtime-tasks.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/providers/realtime-provider';

export function useRealtimeTasks(projectId: string) {
  const queryClient = useQueryClient();
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for task updates
    const handleTaskUpdated = (task: Task) => {
      // Update single task
      queryClient.setQueryData(['task', task.id], task);
      
      // Invalidate task list to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', projectId] 
      });
    };

    const handleTaskCreated = (task: Task) => {
      // Optimistically add to list
      queryClient.setQueryData(
        ['tasks', projectId],
        (old: Task[] = []) => [...old, task]
      );
    };

    // Subscribe to events
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:created', handleTaskCreated);

    // Cleanup
    return () => {
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:created', handleTaskCreated);
    };
  }, [socket, projectId, queryClient]);
}
```

---

## 🔄 State Flow Patterns

### Pattern 1: Form Submission

```typescript
function CreateTaskForm() {
  // 1. URL State - Get current project from URL
  const { projectId } = Route.useParams();
  
  // 2. Client State - Form data (local component state)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // 3. Server State - Mutation
  const createTask = useCreateTask(projectId);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mutation automatically updates cache
    await createTask.mutateAsync({ title, description });
    
    // Reset form (client state)
    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="submit">Create</button>
    </form>
  );
}
```

### Pattern 2: Filtered List

```typescript
function TaskList() {
  // 1. URL State - Filter from URL
  const { status, assignee } = Route.useSearch();
  
  // 2. Client State - View mode preference
  const viewMode = useTaskStore((state) => state.viewMode);
  
  // 3. Server State - Fetch filtered data
  const { data: tasks } = useTasks({
    status,
    assignee,
  });
  
  // 4. Real-Time - Subscribe to updates
  useRealtimeTasks(projectId);

  return (
    <div>
      {viewMode === 'board' ? (
        <KanbanBoard tasks={tasks} />
      ) : (
        <TaskTable tasks={tasks} />
      )}
    </div>
  );
}
```

### Pattern 3: Real-Time Collaboration

```typescript
function CollaborativeEditor() {
  // 1. Server State - Initial data
  const { data: note } = useNote(noteId);
  
  // 2. Client State - Draft content
  const [content, setContent] = useState(note?.content || '');
  
  // 3. WebSocket - Real-time updates
  const { socket } = useWebSocket();
  
  useEffect(() => {
    if (!socket) return;

    // Receive updates from other users
    socket.on('note:updated', (update) => {
      setContent(update.content);
    });

    // Cleanup
    return () => socket.off('note:updated');
  }, [socket]);
  
  // Send updates (debounced)
  const sendUpdate = useDebouncedCallback((newContent: string) => {
    socket?.emit('note:update', { noteId, content: newContent });
  }, 300);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    sendUpdate(newContent);
  };

  return <Editor value={content} onChange={handleChange} />;
}
```

---

## 🔍 Server State (TanStack Query)

### Query Organization

**Location**: `apps/web/src/hooks/`

```
hooks/
├── use-projects.ts         # Project queries
├── use-tasks.ts            # Task queries
├── use-users.ts            # User queries
├── use-workspace.ts        # Workspace queries
├── use-analytics.ts        # Analytics queries
└── use-notifications.ts    # Notification queries
```

### Query Naming Convention

```typescript
// Queries (GET)
useProjects()              // List
useProject(id)             // Single
useProjectTasks(id)        // Related data

// Mutations (POST, PUT, DELETE)
useCreateProject()         // Create
useUpdateProject()         // Update
useDeleteProject()         // Delete
```

### Advanced Patterns

**Pagination:**
```typescript
export function useTasks(projectId: string, page = 1) {
  return useQuery({
    queryKey: ['tasks', projectId, page],
    queryFn: () => apiClient.tasks.list(projectId, { page, limit: 50 }),
    placeholderData: (previousData) => previousData, // Keep old data while loading
  });
}
```

**Infinite Scroll:**
```typescript
export function useInfiniteTasks(projectId: string) {
  return useInfiniteQuery({
    queryKey: ['tasks', projectId, 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.tasks.list(projectId, { page: pageParam }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length + 1 : undefined,
    initialPageParam: 1,
  });
}
```

**Dependent Queries:**
```typescript
export function useProjectWithTasks(projectId: string) {
  // First fetch project
  const { data: project } = useProject(projectId);
  
  // Then fetch tasks (only when project is loaded)
  const { data: tasks } = useTasks(projectId, {
    enabled: !!project,
  });

  return { project, tasks };
}
```

---

## 💻 Client State (Zustand)

### Store Organization

**Location**: `apps/web/src/stores/` and `apps/web/src/store/`

```
stores/
├── workspace-store.ts      # Current workspace context
├── taskStore.ts            # Task view preferences
├── projectStore.ts         # Project view preferences
└── communication-store.ts  # Chat UI state

store/
├── consolidated/           # Consolidated stores
│   ├── tasks.ts
│   └── workspace.ts
└── ... (legacy stores)
```

### Store Patterns

**Basic Store:**
```typescript
import { create } from 'zustand';

interface TaskViewStore {
  viewMode: 'board' | 'list' | 'gantt';
  groupBy: 'status' | 'assignee' | 'priority';
  filters: TaskFilters;
  
  setViewMode: (mode: 'board' | 'list' | 'gantt') => void;
  setGroupBy: (groupBy: string) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
}

export const useTaskViewStore = create<TaskViewStore>((set) => ({
  viewMode: 'board',
  groupBy: 'status',
  filters: {},
  
  setViewMode: (viewMode) => set({ viewMode }),
  setGroupBy: (groupBy) => set({ groupBy }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  resetFilters: () => set({ filters: {} }),
}));
```

**Persisted Store:**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'meridian-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Computed Values:**
```typescript
interface TaskStore {
  tasks: Task[];
  filter: string;
  
  // Computed (selector pattern)
  filteredTasks: () => Task[];
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  filter: 'all',
  
  filteredTasks: () => {
    const { tasks, filter } = get();
    if (filter === 'all') return tasks;
    return tasks.filter(task => task.status === filter);
  },
}));
```

---

## 🧭 URL State (TanStack Router)

### Route Parameters

```typescript
// Route: /dashboard/workspace/:workspaceId/project/:projectId

export const Route = createFileRoute(
  '/dashboard/workspace/$workspaceId/project/$projectId'
)({
  component: ProjectPage,
});

function ProjectPage() {
  const { workspaceId, projectId } = Route.useParams();
  
  // Use params in queries
  const { data: project } = useProject(projectId);
  
  return <div>{project?.name}</div>;
}
```

### Search Parameters

```typescript
// Route: /dashboard/tasks?status=active&assignee=123

const tasksSearchSchema = z.object({
  status: z.string().optional(),
  assignee: z.string().optional(),
  sort: z.string().optional(),
  page: z.number().optional().default(1),
});

export const Route = createFileRoute('/dashboard/tasks')({
  validateSearch: tasksSearchSchema,
  component: TasksPage,
});

function TasksPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const updateFilter = (key: string, value: any) => {
    navigate({
      search: (prev) => ({ ...prev, [key]: value, page: 1 })
    });
  };

  return (
    <div>
      <select value={search.status} onChange={(e) => updateFilter('status', e.target.value)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  );
}
```

---

## 🎨 Best Practices

### 1. State Colocation
Keep state as close to where it's used as possible.

```typescript
// ❌ Bad - Unnecessary global state
const useGlobalStore = create((set) => ({
  modalTitle: '',
  setModalTitle: (title) => set({ modalTitle: title }),
}));

// ✅ Good - Local component state
function Modal() {
  const [title, setTitle] = useState('');
  // ... only this component needs it
}
```

### 2. Selector Optimization

```typescript
// ❌ Bad - Re-renders on any store change
const store = useTaskStore();

// ✅ Good - Only re-renders when viewMode changes
const viewMode = useTaskStore((state) => state.viewMode);
```

### 3. Avoid State Duplication

```typescript
// ❌ Bad - Data in both Query and Zustand
const { data: tasks } = useTasks(projectId);
const tasksInStore = useTaskStore((state) => state.tasks);

// ✅ Good - Single source of truth (Query)
const { data: tasks } = useTasks(projectId);
```

### 4. Cache Invalidation

```typescript
// After mutation, invalidate related queries
const createTask = useMutation({
  mutationFn: apiClient.tasks.create,
  onSuccess: () => {
    // Invalidate task lists
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    // Also invalidate project (task count changed)
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  },
});
```

---

## 🔧 Common Patterns

### Pattern: Filter & Search

```typescript
function TaskFilters() {
  // URL state for shareability
  const navigate = Route.useNavigate();
  const { status, assignee, search } = Route.useSearch();
  
  // Client state for UI
  const [localSearch, setLocalSearch] = useState(search || '');
  
  // Debounced URL update
  const updateSearch = useDebouncedCallback((value: string) => {
    navigate({ search: (prev) => ({ ...prev, search: value }) });
  }, 300);

  return (
    <input
      value={localSearch}
      onChange={(e) => {
        setLocalSearch(e.target.value);
        updateSearch(e.target.value);
      }}
    />
  );
}
```

### Pattern: Optimistic Updates

```typescript
const updateTask = useMutation({
  mutationFn: (data) => apiClient.tasks.update(taskId, data),
  
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['task', taskId] });
    const previous = queryClient.getQueryData(['task', taskId]);
    
    // Optimistically update
    queryClient.setQueryData(['task', taskId], (old: Task) => ({
      ...old,
      ...newData,
    }));
    
    return { previous };
  },
  
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['task', taskId], context?.previous);
    toast.error('Failed to update task');
  },
});
```

### Pattern: Background Sync

```typescript
// Refetch data periodically
const { data } = useQuery({
  queryKey: ['notifications'],
  queryFn: apiClient.notifications.list,
  refetchInterval: 30 * 1000, // Every 30 seconds
});
```

---

## 🚨 Anti-Patterns to Avoid

### ❌ Don't Mix State Layers

```typescript
// ❌ Bad - Duplicating server state in Zustand
const useTaskStore = create((set) => ({
  tasks: [],  // This should be in TanStack Query!
  setTasks: (tasks) => set({ tasks }),
}));

// ✅ Good - Server data stays in Query
const { data: tasks } = useTasks(projectId);
```

### ❌ Don't Over-Use Global State

```typescript
// ❌ Bad - Everything in global store
const useGlobalStore = create((set) => ({
  modalOpen: false,
  modalTitle: '',
  modalContent: '',
  formData: {},
  // ... 50 more fields
}));

// ✅ Good - Local state when possible
function Modal() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  // ... only this component needs it
}
```

### ❌ Don't Ignore Cache

```typescript
// ❌ Bad - Always fetching, ignoring cache
const { data } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  staleTime: 0,          // Always stale
  gcTime: 0,             // Never cached
  refetchOnMount: true,  // Always refetch
});

// ✅ Good - Use cache appropriately
const { data } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  staleTime: 2 * 60 * 1000,  // Fresh for 2 minutes
  gcTime: 5 * 60 * 1000,      // Keep in cache for 5 minutes
});
```

---

## 🧪 Testing State

### Testing Server State

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from './use-tasks';

test('useTasks fetches tasks', async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useTasks('project-1'), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(3);
});
```

### Testing Client State

```typescript
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from './ui-store';

test('toggleSidebar changes state', () => {
  const { result } = renderHook(() => useUIStore());

  expect(result.current.sidebarOpen).toBe(true);

  act(() => {
    result.current.toggleSidebar();
  });

  expect(result.current.sidebarOpen).toBe(false);
});
```

---

## 📊 State Management Checklist

When adding new state, ask:

- [ ] **Is this server data?** → Use TanStack Query
- [ ] **Is this UI preference?** → Use Zustand (maybe persisted)
- [ ] **Should it be shareable?** → Use URL params
- [ ] **Is it temporary?** → Use local component state
- [ ] **Real-time updates?** → WebSocket + Query invalidation
- [ ] **Does it need persistence?** → Add Zustand persist middleware
- [ ] **Is it form data?** → Use React Hook Form or local state

---

## 🔄 Migration Guide

### From Redux to TanStack Query + Zustand

**Before (Redux):**
```typescript
// Redux slice
const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], loading: false },
  reducers: { /* ... */ },
  extraReducers: (builder) => {
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      state.items = action.payload;
    });
  },
});

// Component
const tasks = useSelector((state) => state.tasks.items);
const dispatch = useDispatch();
useEffect(() => { dispatch(fetchTasks()); }, []);
```

**After (TanStack Query):**
```typescript
// Hook
export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => apiClient.tasks.list(projectId),
  });
}

// Component
const { data: tasks, isLoading } = useTasks(projectId);
```

**Benefits:**
- ✅ Less boilerplate (no slices, reducers, actions)
- ✅ Automatic caching and refetching
- ✅ Better TypeScript inference
- ✅ Simpler testing

---

## 📚 Resources

### Official Documentation
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [TanStack Router Docs](https://tanstack.com/router/latest)

### Internal Resources
- API Client: `apps/web/src/lib/api-client.ts`
- Query Client: `apps/web/src/query-client/index.ts`
- WebSocket Provider: `apps/web/src/providers/realtime-provider.tsx`

---

**Maintained by**: Meridian Team  
**Last Review**: October 30, 2025  
**Next Review**: January 2026


