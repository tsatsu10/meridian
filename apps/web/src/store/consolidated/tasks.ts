/**
 * Consolidated Tasks Store - Phase 3 Store Migration
 * 
 * Consolidates task-related stores:
 * - taskSlice.ts (Redux slice with comprehensive task management)
 * - Any task-related Zustand stores
 * 
 * This creates a single source of truth for all task management.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from '@/lib/toast';

// ===== CORE TYPES =====

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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  type: 'comment' | 'status_change' | 'assignment' | 'priority_change';
  metadata?: Record<string, any>;
  userId: string;
  user: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  parentCommentId?: string;
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskBoard {
  id: string;
  name: string;
  projectId: string;
  type: 'kanban' | 'scrum' | 'custom';
  columns: Array<{
    id: string;
    name: string;
    status: Task['status'];
    position: number;
    wipLimit?: number;
    color?: string;
  }>;
  filters: {
    assignee?: string[];
    priority?: Task['priority'][];
    type?: Task['type'][];
    labels?: string[];
  };
  settings: {
    showEstimates: boolean;
    showAssignee: boolean;
    showPriority: boolean;
    groupBy?: 'assignee' | 'priority' | 'type';
    swimlanes?: boolean;
  };
}

export interface TaskFilter {
  assignee?: string[];
  status?: Task['status'][];
  priority?: Task['priority'][];
  type?: Task['type'][];
  project?: string[];
  labels?: string[];
  search?: string;
  dueDate?: {
    from?: string;
    to?: string;
  };
  createdDate?: {
    from?: string;
    to?: string;
  };
}

export interface BulkAction {
  selectedTasks: string[];
  action: 'assign' | 'status' | 'priority' | 'delete' | null;
  targetValue?: any;
}

export interface ActiveEditor {
  taskId: string;
  userId: string;
  user: {
    displayName: string;
    avatar?: string;
  };
  field?: string;
  since: string;
}

export interface LoadingStates {
  tasks: boolean;
  task: boolean;
  comments: boolean;
  boards: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  moving: boolean;
}

export interface ErrorStates {
  tasks: string | null;
  task: string | null;
  comments: string | null;
  boards: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ===== CONSOLIDATED TASKS STATE =====

export interface ConsolidatedTasksState {
  // Core data
  tasks: Task[];
  activeTask: Task | null;
  comments: TaskComment[];
  boards: TaskBoard[];
  activeBoard: TaskBoard | null;
  subtasks: Task[];
  
  // Loading states
  loading: LoadingStates;
  
  // Error states
  errors: ErrorStates;
  
  // UI state
  modals: {
    create: boolean;
    edit: boolean;
    board: boolean;
  };
  
  // Selection and interaction
  selectedTaskIds: string[];
  draggedTaskId: string | null;
  
  // Filters and sorting
  filters: TaskFilter;
  sortBy: 'title' | 'created' | 'updated' | 'dueDate' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
  groupBy: 'none' | 'status' | 'assignee' | 'priority' | 'project';
  
  // View preferences
  viewMode: 'list' | 'board' | 'calendar' | 'timeline';
  showCompletedTasks: boolean;
  compactView: boolean;
  
  // Bulk operations
  bulkActions: BulkAction;
  
  // Real-time collaboration
  activeEditors: ActiveEditor[];
  
  // Pagination
  pagination: Pagination;
  
  // Cache
  lastUpdated: string | null;
}

// ===== CONSOLIDATED TASKS STORE =====

interface ConsolidatedTasksStore extends ConsolidatedTasksState {
  // ===== TASK CRUD =====
  loadTasks: (params?: {
    projectId?: string;
    workspaceId?: string;
    page?: number;
    limit?: number;
    filters?: TaskFilter;
  }) => Promise<void>;
  loadTask: (taskId: string) => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    projectId: string;
    assigneeId?: string;
    priority?: Task['priority'];
    type?: Task['type'];
    dueDate?: string;
    labels?: string[];
    parentTaskId?: string;
    estimatedHours?: number;
    storyPoints?: number;
  }) => Promise<Task | null>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  bulkUpdateTasks: (taskIds: string[], data: Partial<Task>) => Promise<void>;
  moveTask: (taskId: string, targetStatus: Task['status'], position: number) => Promise<void>;
  
  // ===== TASK COMMENTS =====
  loadTaskComments: (taskId: string) => Promise<void>;
  addTaskComment: (taskId: string, content: string, type?: TaskComment['type'], parentCommentId?: string) => Promise<void>;
  updateTaskComment: (commentId: string, data: Partial<TaskComment>) => void;
  
  // ===== SUBTASKS =====
  loadSubtasks: (parentTaskId: string) => Promise<void>;
  
  // ===== TIME TRACKING =====
  logTime: (taskId: string, hours: number, description: string, date?: string) => Promise<void>;
  
  // ===== TASK BOARDS =====
  loadTaskBoards: (projectId: string) => Promise<void>;
  createTaskBoard: (data: {
    name: string;
    projectId: string;
    type: TaskBoard['type'];
    columns?: TaskBoard['columns'];
  }) => Promise<void>;
  setActiveBoard: (board: TaskBoard | null) => void;
  
  // ===== UI ACTIONS =====
  setModal: (modal: keyof ConsolidatedTasksState['modals'], open: boolean) => void;
  setActiveTask: (task: Task | null) => void;
  
  // ===== SELECTION =====
  setSelectedTasks: (taskIds: string[]) => void;
  toggleTaskSelection: (taskId: string) => void;
  selectAllTasks: () => void;
  clearTaskSelection: () => void;
  setDraggedTask: (taskId: string | null) => void;
  
  // ===== FILTERS & SORTING =====
  setFilters: (filters: TaskFilter) => void;
  updateFilter: <K extends keyof TaskFilter>(key: K, value: TaskFilter[K]) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: ConsolidatedTasksState['sortBy']) => void;
  setSortOrder: (sortOrder: ConsolidatedTasksState['sortOrder']) => void;
  setGroupBy: (groupBy: ConsolidatedTasksState['groupBy']) => void;
  
  // ===== VIEW PREFERENCES =====
  setViewMode: (viewMode: ConsolidatedTasksState['viewMode']) => void;
  setShowCompletedTasks: (show: boolean) => void;
  setCompactView: (compact: boolean) => void;
  
  // ===== BULK ACTIONS =====
  setBulkAction: (action: BulkAction['action'], targetValue?: any) => void;
  clearBulkAction: () => void;
  executeBulkAction: () => Promise<void>;
  
  // ===== REAL-TIME COLLABORATION =====
  addActiveEditor: (editor: ActiveEditor) => void;
  removeActiveEditor: (taskId: string, userId: string, field?: string) => void;
  clearActiveEditors: (taskId: string) => void;
  
  // ===== OPTIMISTIC UPDATES =====
  updateTaskLocally: (taskId: string, data: Partial<Task>) => void;
  reorderTasks: (sourceIndex: number, destinationIndex: number, status?: Task['status']) => void;
  
  // ===== PAGINATION =====
  setPagination: (pagination: Partial<Pagination>) => void;
  loadMore: () => Promise<void>;
  
  // ===== COMPUTED GETTERS =====
  getFilteredTasks: () => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getTaskById: (taskId: string) => Task | undefined;
  getOverdueTasks: () => Task[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
  getActiveEditorsForTask: (taskId: string) => ActiveEditor[];
  
  // ===== UTILITY =====
  resetTasks: () => void;
  resetActiveTask: () => void;
  clearErrors: () => void;
}

// ===== DEFAULT STATE =====

const getDefaultLoadingStates = (): LoadingStates => ({
  tasks: false,
  task: false,
  comments: false,
  boards: false,
  creating: false,
  updating: false,
  deleting: false,
  moving: false
});

const getDefaultErrorStates = (): ErrorStates => ({
  tasks: null,
  task: null,
  comments: null,
  boards: null
});

const getDefaultPagination = (): Pagination => ({
  page: 1,
  limit: 50,
  total: 0,
  hasMore: false
});

const defaultState: ConsolidatedTasksState = {
  tasks: [],
  activeTask: null,
  comments: [],
  boards: [],
  activeBoard: null,
  subtasks: [],
  loading: getDefaultLoadingStates(),
  errors: getDefaultErrorStates(),
  modals: {
    create: false,
    edit: false,
    board: false
  },
  selectedTaskIds: [],
  draggedTaskId: null,
  filters: {},
  sortBy: 'updated',
  sortOrder: 'desc',
  groupBy: 'none',
  viewMode: 'list',
  showCompletedTasks: false,
  compactView: false,
  bulkActions: {
    selectedTasks: [],
    action: null
  },
  activeEditors: [],
  pagination: getDefaultPagination(),
  lastUpdated: null
};

// ===== API HELPERS =====

const apiRequest = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// ===== STORE IMPLEMENTATION =====

export const useTasksStore = create<ConsolidatedTasksStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      // ===== TASK CRUD =====
      loadTasks: async (params = {}) => {
        set(state => ({
          loading: { ...state.loading, tasks: true },
          errors: { ...state.errors, tasks: null }
        }));

        try {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
              if (key === 'filters') {
                searchParams.append('filters', JSON.stringify(value));
              } else {
                searchParams.append(key, value.toString());
              }
            }
          });

          const data = await apiRequest(`/api/tasks?${searchParams}`);
          
          set(state => {
            const { tasks, pagination } = data;
            const newTasks = pagination.page === 1 ? tasks : [...state.tasks, ...tasks];
            
            return {
              tasks: newTasks,
              pagination: pagination || state.pagination,
              loading: { ...state.loading, tasks: false },
              lastUpdated: new Date().toISOString()
            };
          });
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, tasks: false },
            errors: { ...state.errors, tasks: error instanceof Error ? error.message : 'Failed to load tasks' }
          }));
        }
      },

      loadTask: async (taskId: string) => {
        set(state => ({
          loading: { ...state.loading, task: true },
          errors: { ...state.errors, task: null }
        }));

        try {
          const data = await apiRequest(`/api/tasks/${taskId}`);
          
          set(state => {
            const task = data.task;
            const taskIndex = state.tasks.findIndex(t => t.id === taskId);
            const updatedTasks = [...state.tasks];
            
            if (taskIndex !== -1) {
              updatedTasks[taskIndex] = task;
            } else {
              updatedTasks.unshift(task);
            }

            return {
              activeTask: task,
              tasks: updatedTasks,
              loading: { ...state.loading, task: false }
            };
          });
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, task: false },
            errors: { ...state.errors, task: error instanceof Error ? error.message : 'Failed to load task' }
          }));
        }
      },

      createTask: async (data) => {
        set(state => ({
          loading: { ...state.loading, creating: true },
          errors: { ...state.errors, tasks: null }
        }));

        try {
          const response = await apiRequest('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(data)
          });

          const newTask = response.task;

          set(state => ({
            tasks: [newTask, ...state.tasks],
            loading: { ...state.loading, creating: false },
            modals: { ...state.modals, create: false }
          }));

          toast.success('Task created successfully');
          return newTask;
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, creating: false },
            errors: { ...state.errors, tasks: error instanceof Error ? error.message : 'Failed to create task' }
          }));
          toast.error('Failed to create task');
          return null;
        }
      },

      updateTask: async (taskId: string, data: Partial<Task>) => {
        set(state => ({
          loading: { ...state.loading, updating: true }
        }));

        try {
          const response = await apiRequest(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
          });

          const updatedTask = response.task;

          set(state => {
            const taskIndex = state.tasks.findIndex(t => t.id === taskId);
            const updatedTasks = [...state.tasks];
            const updatedSubtasks = [...state.subtasks];

            if (taskIndex !== -1) {
              updatedTasks[taskIndex] = updatedTask;
            }

            const subtaskIndex = state.subtasks.findIndex(t => t.id === taskId);
            if (subtaskIndex !== -1) {
              updatedSubtasks[subtaskIndex] = updatedTask;
            }

            return {
              tasks: updatedTasks,
              subtasks: updatedSubtasks,
              activeTask: state.activeTask?.id === taskId ? updatedTask : state.activeTask,
              loading: { ...state.loading, updating: false }
            };
          });

          toast.success('Task updated successfully');
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, updating: false },
            errors: { ...state.errors, task: error instanceof Error ? error.message : 'Failed to update task' }
          }));
          toast.error('Failed to update task');
        }
      },

      deleteTask: async (taskId: string) => {
        set(state => ({
          loading: { ...state.loading, deleting: true }
        }));

        try {
          await apiRequest(`/api/tasks/${taskId}`, {
            method: 'DELETE'
          });

          set(state => ({
            tasks: state.tasks.filter(t => t.id !== taskId),
            subtasks: state.subtasks.filter(t => t.id !== taskId),
            activeTask: state.activeTask?.id === taskId ? null : state.activeTask,
            comments: state.activeTask?.id === taskId ? [] : state.comments,
            selectedTaskIds: state.selectedTaskIds.filter(id => id !== taskId),
            activeEditors: state.activeEditors.filter(e => e.taskId !== taskId),
            loading: { ...state.loading, deleting: false }
          }));

          toast.success('Task deleted successfully');
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, deleting: false },
            errors: { ...state.errors, task: error instanceof Error ? error.message : 'Failed to delete task' }
          }));
          toast.error('Failed to delete task');
        }
      },

      bulkUpdateTasks: async (taskIds: string[], data: Partial<Task>) => {
        try {
          const response = await apiRequest('/api/tasks/bulk-update', {
            method: 'PATCH',
            body: JSON.stringify({ taskIds, data })
          });

          const updatedTasks = response.tasks;

          set(state => {
            const taskMap = new Map(updatedTasks.map((task: Task) => [task.id, task]));
            const updatedTaskList = state.tasks.map(task => 
              taskMap.has(task.id) ? taskMap.get(task.id)! : task
            );

            return {
              tasks: updatedTaskList,
              bulkActions: { selectedTasks: [], action: null },
              selectedTaskIds: []
            };
          });

          toast.success(`Updated ${taskIds.length} tasks`);
        } catch (error) {
          toast.error('Failed to update tasks');
        }
      },

      moveTask: async (taskId: string, targetStatus: Task['status'], position: number) => {
        set(state => ({
          loading: { ...state.loading, moving: true }
        }));

        try {
          const response = await apiRequest(`/api/tasks/${taskId}/move`, {
            method: 'POST',
            body: JSON.stringify({ status: targetStatus, position })
          });

          const updatedTask = response.task;

          set(state => {
            const taskIndex = state.tasks.findIndex(t => t.id === taskId);
            const updatedTasks = [...state.tasks];

            if (taskIndex !== -1) {
              updatedTasks[taskIndex] = updatedTask;
            }

            return {
              tasks: updatedTasks,
              activeTask: state.activeTask?.id === taskId ? updatedTask : state.activeTask,
              loading: { ...state.loading, moving: false }
            };
          });
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, moving: false },
            errors: { ...state.errors, task: error instanceof Error ? error.message : 'Failed to move task' }
          }));
          toast.error('Failed to move task');
        }
      },

      // ===== TASK COMMENTS =====
      loadTaskComments: async (taskId: string) => {
        set(state => ({
          loading: { ...state.loading, comments: true },
          errors: { ...state.errors, comments: null }
        }));

        try {
          const data = await apiRequest(`/api/tasks/${taskId}/comments`);
          
          set(state => ({
            comments: data.comments,
            loading: { ...state.loading, comments: false }
          }));
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, comments: false },
            errors: { ...state.errors, comments: error instanceof Error ? error.message : 'Failed to load comments' }
          }));
        }
      },

      addTaskComment: async (taskId: string, content: string, type = 'comment', parentCommentId?: string) => {
        try {
          const response = await apiRequest(`/api/tasks/${taskId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content, type, parentCommentId })
          });

          set(state => ({
            comments: [response.comment, ...state.comments]
          }));
        } catch (error) {
          toast.error('Failed to add comment');
        }
      },

      updateTaskComment: (commentId: string, data: Partial<TaskComment>) => {
        set(state => ({
          comments: state.comments.map(comment =>
            comment.id === commentId ? { ...comment, ...data } : comment
          )
        }));
      },

      // ===== SUBTASKS =====
      loadSubtasks: async (parentTaskId: string) => {
        try {
          const data = await apiRequest(`/api/tasks/${parentTaskId}/subtasks`);
          set({ subtasks: data.subtasks });
        } catch (error) {
          toast.error('Failed to load subtasks');
        }
      },

      // ===== TIME TRACKING =====
      logTime: async (taskId: string, hours: number, description: string, date?: string) => {
        try {
          const response = await apiRequest(`/api/tasks/${taskId}/time`, {
            method: 'POST',
            body: JSON.stringify({ hours, description, date })
          });

          const { timeEntry } = response;

          set(state => {
            const updatedTasks = state.tasks.map(task => {
              if (task.id === taskId) {
                return {
                  ...task,
                  timeTracking: {
                    ...task.timeTracking,
                    logged: task.timeTracking.logged + hours,
                    entries: [timeEntry, ...task.timeTracking.entries]
                  }
                };
              }
              return task;
            });

            const updatedActiveTask = state.activeTask?.id === taskId
              ? updatedTasks.find(t => t.id === taskId) || state.activeTask
              : state.activeTask;

            return {
              tasks: updatedTasks,
              activeTask: updatedActiveTask
            };
          });

          toast.success('Time logged successfully');
        } catch (error) {
          toast.error('Failed to log time');
        }
      },

      // ===== TASK BOARDS =====
      loadTaskBoards: async (projectId: string) => {
        set(state => ({
          loading: { ...state.loading, boards: true },
          errors: { ...state.errors, boards: null }
        }));

        try {
          const data = await apiRequest(`/api/projects/${projectId}/boards`);
          
          set(state => ({
            boards: data.boards,
            loading: { ...state.loading, boards: false }
          }));
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, boards: false },
            errors: { ...state.errors, boards: error instanceof Error ? error.message : 'Failed to load boards' }
          }));
        }
      },

      createTaskBoard: async (data) => {
        try {
          const response = await apiRequest('/api/task-boards', {
            method: 'POST',
            body: JSON.stringify(data)
          });

          set(state => ({
            boards: [...state.boards, response.board],
            modals: { ...state.modals, board: false }
          }));

          toast.success('Board created successfully');
        } catch (error) {
          toast.error('Failed to create board');
        }
      },

      setActiveBoard: (board: TaskBoard | null) => {
        set({ activeBoard: board });
      },

      // ===== UI ACTIONS =====
      setModal: (modal: keyof ConsolidatedTasksState['modals'], open: boolean) => {
        set(state => ({
          modals: { ...state.modals, [modal]: open }
        }));
      },

      setActiveTask: (task: Task | null) => {
        set({ 
          activeTask: task,
          comments: task ? [] : [], // Clear comments when changing tasks
          subtasks: task ? [] : [], // Clear subtasks when changing tasks
        });
      },

      // ===== SELECTION =====
      setSelectedTasks: (taskIds: string[]) => {
        set({ selectedTaskIds: taskIds });
      },

      toggleTaskSelection: (taskId: string) => {
        set(state => {
          const index = state.selectedTaskIds.indexOf(taskId);
          const newSelection = [...state.selectedTaskIds];
          
          if (index > -1) {
            newSelection.splice(index, 1);
          } else {
            newSelection.push(taskId);
          }
          
          return { selectedTaskIds: newSelection };
        });
      },

      selectAllTasks: () => {
        set(state => ({
          selectedTaskIds: state.tasks.map(task => task.id)
        }));
      },

      clearTaskSelection: () => {
        set({ selectedTaskIds: [] });
      },

      setDraggedTask: (taskId: string | null) => {
        set({ draggedTaskId: taskId });
      },

      // ===== FILTERS & SORTING =====
      setFilters: (filters: TaskFilter) => {
        set({ filters });
      },

      updateFilter: (key, value) => {
        set(state => ({
          filters: { ...state.filters, [key]: value }
        }));
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      setSortOrder: (sortOrder) => {
        set({ sortOrder });
      },

      setGroupBy: (groupBy) => {
        set({ groupBy });
      },

      // ===== VIEW PREFERENCES =====
      setViewMode: (viewMode) => {
        set({ viewMode });
      },

      setShowCompletedTasks: (show) => {
        set({ showCompletedTasks: show });
      },

      setCompactView: (compact) => {
        set({ compactView: compact });
      },

      // ===== BULK ACTIONS =====
      setBulkAction: (action, targetValue) => {
        set(state => ({
          bulkActions: {
            selectedTasks: state.selectedTaskIds,
            action,
            targetValue
          }
        }));
      },

      clearBulkAction: () => {
        set({
          bulkActions: { selectedTasks: [], action: null }
        });
      },

      executeBulkAction: async () => {
        const { bulkActions } = get();
        if (!bulkActions.action || bulkActions.selectedTasks.length === 0) return;

        const updateData: Partial<Task> = {};

        switch (bulkActions.action) {
          case 'assign':
            updateData.assigneeId = bulkActions.targetValue;
            break;
          case 'status':
            updateData.status = bulkActions.targetValue;
            break;
          case 'priority':
            updateData.priority = bulkActions.targetValue;
            break;
          case 'delete':
            // Handle delete separately
            for (const taskId of bulkActions.selectedTasks) {
              await get().deleteTask(taskId);
            }
            get().clearBulkAction();
            return;
        }

        await get().bulkUpdateTasks(bulkActions.selectedTasks, updateData);
      },

      // ===== REAL-TIME COLLABORATION =====
      addActiveEditor: (editor) => {
        set(state => {
          const existingIndex = state.activeEditors.findIndex(e => 
            e.taskId === editor.taskId && e.userId === editor.userId && e.field === editor.field
          );

          const updatedEditors = [...state.activeEditors];

          if (existingIndex > -1) {
            updatedEditors[existingIndex] = editor;
          } else {
            updatedEditors.push(editor);
          }

          return { activeEditors: updatedEditors };
        });
      },

      removeActiveEditor: (taskId, userId, field) => {
        set(state => ({
          activeEditors: state.activeEditors.filter(e => 
            !(e.taskId === taskId && e.userId === userId && (field ? e.field === field : true))
          )
        }));
      },

      clearActiveEditors: (taskId) => {
        set(state => ({
          activeEditors: state.activeEditors.filter(e => e.taskId !== taskId)
        }));
      },

      // ===== OPTIMISTIC UPDATES =====
      updateTaskLocally: (taskId, data) => {
        set(state => {
          const taskIndex = state.tasks.findIndex(t => t.id === taskId);
          const updatedTasks = [...state.tasks];
          const updatedSubtasks = [...state.subtasks];

          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...data };
          }

          const subtaskIndex = state.subtasks.findIndex(t => t.id === taskId);
          if (subtaskIndex !== -1) {
            updatedSubtasks[subtaskIndex] = { ...updatedSubtasks[subtaskIndex], ...data };
          }

          return {
            tasks: updatedTasks,
            subtasks: updatedSubtasks,
            activeTask: state.activeTask?.id === taskId 
              ? { ...state.activeTask, ...data } 
              : state.activeTask
          };
        });
      },

      reorderTasks: (sourceIndex, destinationIndex, status) => {
        set(state => {
          const tasks = status ? state.tasks.filter(t => t.status === status) : [...state.tasks];
          
          if (sourceIndex !== destinationIndex && tasks[sourceIndex]) {
            const [movedTask] = tasks.splice(sourceIndex, 1);
            tasks.splice(destinationIndex, 0, movedTask);
            
            // Update positions
            tasks.forEach((task, index) => {
              task.position = index;
            });

            return { tasks };
          }

          return state;
        });
      },

      // ===== PAGINATION =====
      setPagination: (pagination) => {
        set(state => ({
          pagination: { ...state.pagination, ...pagination }
        }));
      },

      loadMore: async () => {
        const { pagination, filters } = get();
        if (!pagination.hasMore) return;

        await get().loadTasks({
          page: pagination.page + 1,
          limit: pagination.limit,
          filters
        });
      },

      // ===== COMPUTED GETTERS =====
      getFilteredTasks: () => {
        const state = get();
        const { tasks, filters, sortBy, sortOrder, showCompletedTasks } = state;
        
        let filtered = [...tasks];
        
        // Filter out completed tasks if not showing them
        if (!showCompletedTasks) {
          filtered = filtered.filter(task => task.status !== 'done');
        }
        
        // Apply filters
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(task =>
            task.title.toLowerCase().includes(search) ||
            task.description?.toLowerCase().includes(search) ||
            task.labels.some(label => label.toLowerCase().includes(search))
          );
        }
        
        if (filters.assignee?.length) {
          filtered = filtered.filter(task => 
            task.assigneeId && filters.assignee!.includes(task.assigneeId)
          );
        }
        
        if (filters.status?.length) {
          filtered = filtered.filter(task => filters.status!.includes(task.status));
        }
        
        if (filters.priority?.length) {
          filtered = filtered.filter(task => filters.priority!.includes(task.priority));
        }
        
        if (filters.type?.length) {
          filtered = filtered.filter(task => filters.type!.includes(task.type));
        }
        
        if (filters.project?.length) {
          filtered = filtered.filter(task => filters.project!.includes(task.projectId));
        }
        
        if (filters.labels?.length) {
          filtered = filtered.filter(task =>
            filters.labels!.some(label => task.labels.includes(label))
          );
        }
        
        // Apply date filters
        if (filters.dueDate?.from || filters.dueDate?.to) {
          filtered = filtered.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            const from = filters.dueDate?.from ? new Date(filters.dueDate.from) : null;
            const to = filters.dueDate?.to ? new Date(filters.dueDate.to) : null;
            
            if (from && dueDate < from) return false;
            if (to && dueDate > to) return false;
            return true;
          });
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (sortBy) {
            case 'title':
              aValue = a.title.toLowerCase();
              bValue = b.title.toLowerCase();
              break;
            case 'created':
              aValue = new Date(a.createdAt);
              bValue = new Date(b.createdAt);
              break;
            case 'updated':
              aValue = new Date(a.updatedAt);
              bValue = new Date(b.updatedAt);
              break;
            case 'dueDate':
              aValue = a.dueDate ? new Date(a.dueDate) : new Date(0);
              bValue = b.dueDate ? new Date(b.dueDate) : new Date(0);
              break;
            case 'priority':
              const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
              aValue = priorityOrder[a.priority];
              bValue = priorityOrder[b.priority];
              break;
            case 'status':
              const statusOrder = { todo: 1, in_progress: 2, review: 3, done: 4, cancelled: 5 };
              aValue = statusOrder[a.status];
              bValue = statusOrder[b.status];
              break;
            default:
              aValue = a.updatedAt;
              bValue = b.updatedAt;
          }
          
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
        
        return filtered;
      },

      getTasksByStatus: (status) => {
        return get().tasks.filter(task => task.status === status);
      },

      getTaskById: (taskId) => {
        return get().tasks.find(task => task.id === taskId);
      },

      getOverdueTasks: () => {
        const now = new Date();
        return get().tasks.filter(task => 
          task.dueDate && 
          new Date(task.dueDate) < now && 
          task.status !== 'done' && 
          task.status !== 'cancelled'
        );
      },

      getTasksByProject: (projectId) => {
        return get().tasks.filter(task => task.projectId === projectId);
      },

      getTasksByAssignee: (assigneeId) => {
        return get().tasks.filter(task => task.assigneeId === assigneeId);
      },

      getActiveEditorsForTask: (taskId) => {
        return get().activeEditors.filter(editor => editor.taskId === taskId);
      },

      // ===== UTILITY =====
      resetTasks: () => {
        set(defaultState);
      },

      resetActiveTask: () => {
        set({
          activeTask: null,
          comments: [],
          subtasks: [],
          activeEditors: []
        });
      },

      clearErrors: () => {
        set({ errors: getDefaultErrorStates() });
      }
    }),
    {
      name: 'meridian-consolidated-tasks',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist user preferences and view settings
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        groupBy: state.groupBy,
        viewMode: state.viewMode,
        showCompletedTasks: state.showCompletedTasks,
        compactView: state.compactView,
        filters: state.filters,
        // Don't persist tasks, comments, or temporary state
      })
    }
  )
);

// ===== SELECTOR HOOKS =====

// Basic selectors
export const useTasks = () => useTasksStore(state => state.tasks);
export const useActiveTask = () => useTasksStore(state => state.activeTask);
export const useTaskComments = () => useTasksStore(state => state.comments);
export const useTaskBoards = () => useTasksStore(state => state.boards);
export const useTaskLoading = () => useTasksStore(state => state.loading);
export const useTaskErrors = () => useTasksStore(state => state.errors);

// Computed selectors
export const useFilteredTasks = () => useTasksStore(state => state.getFilteredTasks());
export const useTasksByStatus = (status: Task['status']) => 
  useTasksStore(state => state.getTasksByStatus(status));
export const useOverdueTasks = () => useTasksStore(state => state.getOverdueTasks());

// Selection selectors
export const useSelectedTasks = () => useTasksStore(state => ({
  selectedTaskIds: state.selectedTaskIds,
  bulkActions: state.bulkActions,
  setSelected: state.setSelectedTasks,
  toggleSelection: state.toggleTaskSelection,
  selectAll: state.selectAllTasks,
  clearSelection: state.clearTaskSelection
}));

// View selectors
export const useTaskView = () => useTasksStore(state => ({
  viewMode: state.viewMode,
  showCompleted: state.showCompletedTasks,
  compactView: state.compactView,
  setViewMode: state.setViewMode,
  setShowCompleted: state.setShowCompletedTasks,
  setCompactView: state.setCompactView
}));

// Filter selectors
export const useTaskFilters = () => useTasksStore(state => ({
  filters: state.filters,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  groupBy: state.groupBy,
  setFilters: state.setFilters,
  updateFilter: state.updateFilter,
  clearFilters: state.clearFilters,
  setSortBy: state.setSortBy,
  setSortOrder: state.setSortOrder,
  setGroupBy: state.setGroupBy
}));

export default useTasksStore;