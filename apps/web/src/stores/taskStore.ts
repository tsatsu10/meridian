import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types (migrated from Redux slice)
export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  workspaceId: string;
  parentTaskId?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'task' | 'bug' | 'feature' | 'epic' | 'story';
  assigneeId?: string;
  reporterId: string;
  labels: string[];
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  position: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  blockedBy?: string[];
  blocks?: string[];
  dependencies: string[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  customFields: Record<string, any>;
  milestone?: {
    id: string;
    name: string;
    dueDate: string;
  };
  timeTracking: {
    logged: number;
    remaining: number;
    entries: Array<{
      id: string;
      userId: string;
      hours: number;
      description: string;
      date: string;
    }>;
  };
  comments: Array<{
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    updatedAt?: string;
    parentId?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
}

export interface TaskFilter {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  type?: string[];
  labels?: string[];
  projectId?: string;
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  search?: string;
}

export interface TaskSort {
  field: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'position';
  direction: 'asc' | 'desc';
}

// State interface
interface TaskState {
  // Data
  tasks: Task[];
  comments: TaskComment[];

  // UI State
  loading: {
    tasks: boolean;
    task: boolean;
    comments: boolean;
  };
  errors: {
    tasks: string | null;
    task: string | null;
    comments: string | null;
  };

  // Selection state
  selectedTaskId: string | null;
  selectedTaskIds: string[];
  showCreateModal: boolean;
  showEditModal: boolean;
  showBulkEditModal: boolean;

  // Filters and search
  filters: TaskFilter;
  sort: TaskSort;
  searchQuery: string;
  currentPage: number;
  pageSize: number;
}

// Actions interface
interface TaskActions {
  // Data actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  bulkUpdateTasks: (taskIds: string[], updates: Partial<Task>) => void;
  moveTask: (taskId: string, newPosition: number, newParentId?: string) => void;

  // Comment actions
  setComments: (comments: TaskComment[]) => void;
  addComment: (comment: TaskComment) => void;
  updateComment: (id: string, updates: Partial<TaskComment>) => void;
  removeComment: (id: string) => void;

  // Time tracking actions
  addTimeEntry: (taskId: string, entry: Task['timeTracking']['entries'][0]) => void;
  updateTimeEntry: (taskId: string, entryId: string, updates: Partial<Task['timeTracking']['entries'][0]>) => void;
  removeTimeEntry: (taskId: string, entryId: string) => void;

  // Loading and error actions
  setLoading: (key: keyof TaskState['loading'], value: boolean) => void;
  setError: (key: keyof TaskState['errors'], value: string | null) => void;
  clearErrors: () => void;

  // Selection actions
  setSelectedTaskId: (id: string | null) => void;
  setSelectedTaskIds: (ids: string[]) => void;
  toggleTaskSelection: (id: string) => void;
  clearSelection: () => void;

  // UI actions
  setShowCreateModal: (show: boolean) => void;
  setShowEditModal: (show: boolean) => void;
  setShowBulkEditModal: (show: boolean) => void;

  // Filter and search actions
  setFilters: (filters: Partial<TaskFilter>) => void;
  setSort: (sort: TaskSort) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearFilters: () => void;

  // Computed getters
  getFilteredTasks: () => Task[];
  getSelectedTask: () => Task | undefined;
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
  getOverdueTasks: () => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getTaskComments: (taskId: string) => TaskComment[];
  getTaskHierarchy: (parentId?: string) => Task[];
  getTaskDependencies: (taskId: string) => Task[];
  getBlockedTasks: (taskId: string) => Task[];
  getTotalTimeLogged: (taskId: string) => number;

  // Utility functions
  getTaskById: (id: string) => Task | undefined;
  isTaskSelected: (id: string) => boolean;
  getSelectedTasks: () => Task[];
  validateTaskDependencies: (taskId: string) => boolean;
  calculateTaskProgress: (taskId: string) => number;
}

// Initial state
const initialState: TaskState = {
  tasks: [],
  comments: [],

  loading: {
    tasks: false,
    task: false,
    comments: false,
  },

  errors: {
    tasks: null,
    task: null,
    comments: null,
  },

  selectedTaskId: null,
  selectedTaskIds: [],
  showCreateModal: false,
  showEditModal: false,
  showBulkEditModal: false,

  filters: {},
  sort: {
    field: 'position',
    direction: 'asc',
  },
  searchQuery: '',
  currentPage: 1,
  pageSize: 20,
};

// Create the Zustand store
export const useTaskStore = create<TaskState & TaskActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Data actions
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, task]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === id ? {
            ...t,
            ...updates,
            updatedAt: new Date().toISOString(),
            lastModifiedBy: 'current-user' // TODO: Get from auth
          } : t
        )
      })),
      removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      })),
      bulkUpdateTasks: (taskIds, updates) => set((state) => ({
        tasks: state.tasks.map(t =>
          taskIds.includes(t.id) ? {
            ...t,
            ...updates,
            updatedAt: new Date().toISOString(),
            lastModifiedBy: 'current-user' // TODO: Get from auth
          } : t
        )
      })),
      moveTask: (taskId, newPosition, newParentId) => set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? {
            ...t,
            position: newPosition,
            parentTaskId: newParentId,
            updatedAt: new Date().toISOString()
          } : t
        )
      })),

      // Comment actions
      setComments: (comments) => set({ comments }),
      addComment: (comment) => set((state) => ({
        comments: [...state.comments, comment]
      })),
      updateComment: (id, updates) => set((state) => ({
        comments: state.comments.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      })),
      removeComment: (id) => set((state) => ({
        comments: state.comments.filter(c => c.id !== id)
      })),

      // Time tracking actions
      addTimeEntry: (taskId, entry) => set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? {
            ...t,
            timeTracking: {
              ...t.timeTracking,
              logged: t.timeTracking.logged + entry.hours,
              remaining: Math.max(0, t.timeTracking.remaining - entry.hours),
              entries: [...t.timeTracking.entries, entry]
            },
            updatedAt: new Date().toISOString()
          } : t
        )
      })),
      updateTimeEntry: (taskId, entryId, updates) => set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? {
            ...t,
            timeTracking: {
              ...t.timeTracking,
              logged: updates.hours
                ? t.timeTracking.logged - t.timeTracking.entries.find(e => e.id === entryId)?.hours! + updates.hours
                : t.timeTracking.logged,
              remaining: updates.hours
                ? Math.max(0, t.timeTracking.remaining + t.timeTracking.entries.find(e => e.id === entryId)?.hours! - updates.hours)
                : t.timeTracking.remaining,
              entries: t.timeTracking.entries.map(e =>
                e.id === entryId ? { ...e, ...updates } : e
              )
            },
            updatedAt: new Date().toISOString()
          } : t
        )
      })),
      removeTimeEntry: (taskId, entryId) => set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? {
            ...t,
            timeTracking: {
              ...t.timeTracking,
              logged: t.timeTracking.logged - t.timeTracking.entries.find(e => e.id === entryId)?.hours!,
              remaining: t.timeTracking.remaining + t.timeTracking.entries.find(e => e.id === entryId)?.hours!,
              entries: t.timeTracking.entries.filter(e => e.id !== entryId)
            },
            updatedAt: new Date().toISOString()
          } : t
        )
      })),

      // Loading and error actions
      setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value }
      })),
      setError: (key, value) => set((state) => ({
        errors: { ...state.errors, [key]: value }
      })),
      clearErrors: () => set({
        errors: {
          tasks: null,
          task: null,
          comments: null,
        }
      }),

      // Selection actions
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setSelectedTaskIds: (ids) => set({ selectedTaskIds: ids }),
      toggleTaskSelection: (id) => set((state) => ({
        selectedTaskIds: state.selectedTaskIds.includes(id)
          ? state.selectedTaskIds.filter(selectedId => selectedId !== id)
          : [...state.selectedTaskIds, id]
      })),
      clearSelection: () => set({
        selectedTaskId: null,
        selectedTaskIds: []
      }),

      // UI actions
      setShowCreateModal: (show) => set({ showCreateModal: show }),
      setShowEditModal: (show) => set({ showEditModal: show }),
      setShowBulkEditModal: (show) => set({ showBulkEditModal: show }),

      // Filter and search actions
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),
      setSort: (sort) => set({ sort }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size }),
      clearFilters: () => set({
        filters: {},
        searchQuery: '',
        currentPage: 1
      }),

      // Computed getters
      getFilteredTasks: () => {
        const state = get();
        let filtered = state.tasks;

        // Apply search filter
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query) ||
            t.labels.some(label => label.toLowerCase().includes(query)) ||
            t.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }

        // Apply status filter
        if (state.filters.status?.length) {
          filtered = filtered.filter(t => state.filters.status!.includes(t.status));
        }

        // Apply priority filter
        if (state.filters.priority?.length) {
          filtered = filtered.filter(t => state.filters.priority!.includes(t.priority));
        }

        // Apply assignee filter
        if (state.filters.assignee?.length) {
          filtered = filtered.filter(t => t.assigneeId && state.filters.assignee!.includes(t.assigneeId));
        }

        // Apply type filter
        if (state.filters.type?.length) {
          filtered = filtered.filter(t => state.filters.type!.includes(t.type));
        }

        // Apply labels filter
        if (state.filters.labels?.length) {
          filtered = filtered.filter(t =>
            t.labels.some(label => state.filters.labels!.includes(label))
          );
        }

        // Apply project filter
        if (state.filters.projectId) {
          filtered = filtered.filter(t => t.projectId === state.filters.projectId);
        }

        // Apply due date range filter
        if (state.filters.dueDateRange) {
          filtered = filtered.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            const { start, end } = state.filters.dueDateRange!;
            if (start && dueDate < new Date(start)) return false;
            if (end && dueDate > new Date(end)) return false;
            return true;
          });
        }

        // Apply sorting
        filtered.sort((a, b) => {
          const aValue = a[state.sort.field as keyof Task] as any;
          const bValue = b[state.sort.field as keyof Task] as any;

          let comparison = 0;
          if (aValue > bValue) comparison = 1;
          if (aValue < bValue) comparison = -1;

          return state.sort.direction === 'desc' ? -comparison : comparison;
        });

        return filtered;
      },

      getSelectedTask: () => {
        const state = get();
        return state.tasks.find(t => t.id === state.selectedTaskId);
      },

      getTasksByProject: (projectId) => {
        const state = get();
        return state.tasks.filter(t => t.projectId === projectId);
      },

      getTasksByAssignee: (assigneeId) => {
        const state = get();
        return state.tasks.filter(t => t.assigneeId === assigneeId);
      },

      getOverdueTasks: () => {
        const state = get();
        const now = new Date();
        return state.tasks.filter(t =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== 'done' &&
          t.status !== 'cancelled'
        );
      },

      getTasksByStatus: (status) => {
        const state = get();
        return state.tasks.filter(t => t.status === status);
      },

      getTaskComments: (taskId) => {
        const state = get();
        return state.comments
          .filter(c => c.taskId === taskId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      },

      getTaskHierarchy: (parentId) => {
        const state = get();
        return state.tasks.filter(t => t.parentTaskId === parentId);
      },

      getTaskDependencies: (taskId) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return [];

        return state.tasks.filter(t => task.dependencies.includes(t.id));
      },

      getBlockedTasks: (taskId) => {
        const state = get();
        return state.tasks.filter(t => t.blockedBy?.includes(taskId));
      },

      getTotalTimeLogged: (taskId) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        return task?.timeTracking.logged || 0;
      },

      // Utility functions
      getTaskById: (id) => {
        const state = get();
        return state.tasks.find(t => t.id === id);
      },

      isTaskSelected: (id) => {
        const state = get();
        return state.selectedTaskIds.includes(id);
      },

      getSelectedTasks: () => {
        const state = get();
        return state.tasks.filter(t => state.selectedTaskIds.includes(t.id));
      },

      validateTaskDependencies: (taskId) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return false;

        // Check for circular dependencies
        const visited = new Set<string>();
        const checkCircular = (id: string): boolean => {
          if (visited.has(id)) return true;
          visited.add(id);

          const currentTask = state.tasks.find(t => t.id === id);
          if (!currentTask) return false;

          for (const depId of currentTask.dependencies) {
            if (checkCircular(depId)) return true;
          }

          return false;
        };

        return !checkCircular(taskId);
      },

      calculateTaskProgress: (taskId) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return 0;

        if (task.status === 'done') return 100;
        if (task.status === 'todo') return 0;

        // Calculate based on subtasks
        const subtasks = state.tasks.filter(t => t.parentTaskId === taskId);
        if (subtasks.length === 0) return 50; // In progress but no subtasks

        const completedSubtasks = subtasks.filter(st => st.status === 'done').length;
        return Math.round((completedSubtasks / subtasks.length) * 100);
      },
    }),
    {
      name: 'meridian-task-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data
        tasks: state.tasks,
        comments: state.comments,
        filters: state.filters,
        sort: state.sort,
        searchQuery: state.searchQuery,
        selectedTaskId: state.selectedTaskId,
      }),
    }
  )
);

// Export types for use in components
export type { TaskState, TaskActions };
