import { useCallback, useMemo, useEffect, useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import type { Task, TaskComment } from '../../stores/taskStore';

export interface UseTaskReturn {
  // State
  currentTask: Task | undefined;
  tasks: Task[];
  filteredTasks: Task[];
  subtasks: Task[];
  comments: TaskComment[];
  timeEntries: any[];
  attachments: any[];
  boardColumns: any[];
  analytics: any;
  loading: boolean;
  errors: string | null;

  // Actions
  loadTasks: (filters?: any) => Promise<any>;
  loadTask: (taskId: string) => Promise<any>;
  createTask: (data: any) => Promise<any>;
  updateTask: (taskId: string, data: any) => Promise<any>;
  deleteTask: (taskId: string) => Promise<any>;
  completeTask: (taskId: string) => Promise<any>;

  // Assignment
  assignTask: (taskId: string, userId: string) => Promise<any>;
  unassignTask: (taskId: string, userId: string) => Promise<any>;

  // Subtasks
  loadSubtasks: (taskId: string) => Promise<any>;
  createSubtask: (taskId: string, data: any) => Promise<any>;

  // Comments
  loadComments: (taskId: string) => Promise<any>;
  addComment: (taskId: string, content: string) => Promise<any>;
  updateComment: (commentId: string, content: string) => Promise<any>;
  deleteComment: (commentId: string) => Promise<any>;

  // Time tracking
  loadTimeEntries: (taskId: string) => Promise<any>;
  startTimeTracking: (taskId: string) => Promise<any>;
  stopTimeTracking: (taskId: string) => Promise<any>;
  addTimeEntry: (taskId: string, entry: any) => Promise<any>;

  // Attachments
  loadAttachments: (taskId: string) => Promise<any>;
  addAttachment: (taskId: string, file: File) => Promise<any>;
  removeAttachment: (attachmentId: string) => Promise<any>;

  // UI actions
  setSelectedTaskId: (id: string | null) => void;
  setShowCreateModal: (show: boolean) => void;
  setShowEditModal: (show: boolean) => void;

  // Filter and search
  setSearchQuery: (query: string) => void;
  setFilters: (filters: any) => void;

  // Utility functions
  getTaskById: (id: string) => Task | undefined;
  getTasksByProject: (projectId: string) => Task[];
  getSubtasks: (taskId: string) => Task[];
  getTaskComments: (taskId: string) => TaskComment[];
}

export function useTask(): UseTaskReturn {
  const taskStore = useTaskStore();

  // State getters
  const currentTask = taskStore.getSelectedTask();
  const tasks = taskStore.tasks;
  const filteredTasks = taskStore.getFilteredTasks();

  // Get subtasks for current task
  const subtasks = useMemo(() => {
    return currentTask ? taskStore.getTaskHierarchy(currentTask.id) : [];
  }, [currentTask, taskStore]);

  // Get comments for current task
  const comments = useMemo(() => {
    return currentTask ? taskStore.getTaskComments(currentTask.id) : [];
  }, [currentTask, taskStore]);

  // Loading and error states
  const loading = taskStore.loading.tasks;
  const errors = taskStore.errors.tasks;

  // Placeholder values for missing functionality
  const timeEntries: any[] = [];
  const attachments: any[] = [];
  const boardColumns: any[] = [];
  const analytics: any = {};

  // Actions
  const loadTasks = useCallback(async (filters?: any) => {
    try {
      taskStore.setLoading('tasks', true);
      // TODO: Implement actual API call
      setTimeout(() => {
        taskStore.setLoading('tasks', false);
      }, 1000);
    } catch (error) {
      taskStore.setError('tasks', 'Failed to load tasks');
      taskStore.setLoading('tasks', false);
    }
  }, [taskStore]);

  const loadTask = useCallback(async (taskId: string) => {
    try {
      taskStore.setLoading('task', true);
      taskStore.setSelectedTaskId(taskId);
      // TODO: Implement actual API call
      setTimeout(() => {
        taskStore.setLoading('task', false);
      }, 500);
    } catch (error) {
      taskStore.setError('task', 'Failed to load task');
      taskStore.setLoading('task', false);
    }
  }, [taskStore]);

  const createTask = useCallback(async (data: any) => {
    try {
      taskStore.setLoading('task', true);

      const newTask: Task = {
        id: `task_${Date.now()}`,
        title: data.title,
        description: data.description || '',
        projectId: data.projectId,
        workspaceId: data.workspaceId || 'default-workspace',
        parentTaskId: data.parentTaskId,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        type: data.type || 'task',
        assigneeId: data.assigneeId,
        reporterId: 'current-user', // TODO: Get from auth
        labels: data.labels || [],
        tags: data.tags || [],
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours || 0,
        storyPoints: data.storyPoints,
        position: data.position || taskStore.tasks.length,
        startDate: data.startDate,
        dueDate: data.dueDate,
        dependencies: data.dependencies || [],
        attachments: [],
        customFields: data.customFields || {},
        timeTracking: {
          logged: 0,
          remaining: data.estimatedHours || 0,
          entries: []
        },
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user', // TODO: Get from auth
        lastModifiedBy: 'current-user', // TODO: Get from auth
      };

      taskStore.addTask(newTask);
      taskStore.setLoading('task', false);
      return newTask;
    } catch (error) {
      taskStore.setError('task', 'Failed to create task');
      taskStore.setLoading('task', false);
      throw error;
    }
  }, [taskStore]);

  const updateTask = useCallback(async (taskId: string, data: any) => {
    try {
      taskStore.updateTask(taskId, data);
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to update task');
      throw error;
    }
  }, [taskStore]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      taskStore.removeTask(taskId);
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to delete task');
      throw error;
    }
  }, [taskStore]);

  const completeTask = useCallback(async (taskId: string) => {
    try {
      taskStore.updateTask(taskId, {
        status: 'done',
        completedAt: new Date().toISOString(),
        progress: 100
      });
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to complete task');
      throw error;
    }
  }, [taskStore]);

  const assignTask = useCallback(async (taskId: string, userId: string) => {
    try {
      taskStore.updateTask(taskId, { assigneeId: userId });
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to assign task');
      throw error;
    }
  }, [taskStore]);

  const unassignTask = useCallback(async (taskId: string, userId: string) => {
    try {
      const task = taskStore.getTaskById(taskId);
      if (task?.assigneeId === userId) {
        taskStore.updateTask(taskId, { assigneeId: undefined });
      }
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to unassign task');
      throw error;
    }
  }, [taskStore]);

  const loadSubtasks = useCallback(async (taskId: string) => {
    try {
      // Subtasks are already loaded in the store
      return taskStore.getTaskHierarchy(taskId);
    } catch (error) {
      taskStore.setError('tasks', 'Failed to load subtasks');
      throw error;
    }
  }, [taskStore]);

  const createSubtask = useCallback(async (taskId: string, data: any) => {
    try {
      const subtask = await createTask({
        ...data,
        parentTaskId: taskId,
        projectId: taskStore.getTaskById(taskId)?.projectId,
      });
      return subtask;
    } catch (error) {
      taskStore.setError('task', 'Failed to create subtask');
      throw error;
    }
  }, [createTask, taskStore]);

  const loadComments = useCallback(async (taskId: string) => {
    try {
      // Comments are already loaded in the store
      return taskStore.getTaskComments(taskId);
    } catch (error) {
      taskStore.setError('comments', 'Failed to load comments');
      throw error;
    }
  }, [taskStore]);

  const addComment = useCallback(async (taskId: string, content: string) => {
    try {
      const newComment: TaskComment = {
        id: `comment_${Date.now()}`,
        taskId,
        content,
        authorId: 'current-user', // TODO: Get from auth
        authorName: 'Current User', // TODO: Get from auth
        createdAt: new Date().toISOString(),
      };

      taskStore.addComment(newComment);
      return newComment;
    } catch (error) {
      taskStore.setError('comments', 'Failed to add comment');
      throw error;
    }
  }, [taskStore]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    try {
      taskStore.updateComment(commentId, {
        content,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      taskStore.setError('comments', 'Failed to update comment');
      throw error;
    }
  }, [taskStore]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      taskStore.removeComment(commentId);
      return { success: true };
    } catch (error) {
      taskStore.setError('comments', 'Failed to delete comment');
      throw error;
    }
  }, [taskStore]);

  const loadTimeEntries = useCallback(async (taskId: string) => {
    try {
      // Time entries are already loaded in the store
      const task = taskStore.getTaskById(taskId);
      return task?.timeTracking.entries || [];
    } catch (error) {
      taskStore.setError('task', 'Failed to load time entries');
      throw error;
    }
  }, [taskStore]);

  const startTimeTracking = useCallback(async (taskId: string) => {
    try {
      // TODO: Implement time tracking session management
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to start time tracking');
      throw error;
    }
  }, [taskStore]);

  const stopTimeTracking = useCallback(async (taskId: string) => {
    try {
      // TODO: Implement time tracking session management
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to stop time tracking');
      throw error;
    }
  }, [taskStore]);

  const addTimeEntry = useCallback(async (taskId: string, entry: any) => {
    try {
      taskStore.addTimeEntry(taskId, {
        id: `time_${Date.now()}`,
        userId: 'current-user', // TODO: Get from auth
        hours: entry.hours,
        description: entry.description,
        date: entry.date || new Date().toISOString(),
      });
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to add time entry');
      throw error;
    }
  }, [taskStore]);

  const loadAttachments = useCallback(async (taskId: string) => {
    try {
      const task = taskStore.getTaskById(taskId);
      return task?.attachments || [];
    } catch (error) {
      taskStore.setError('task', 'Failed to load attachments');
      throw error;
    }
  }, [taskStore]);

  const addAttachment = useCallback(async (taskId: string, file: File) => {
    try {
      // TODO: Implement file upload
      const attachment = {
        id: `attachment_${Date.now()}`,
        name: file.name,
        url: '#', // TODO: Get from upload
        type: file.type,
        size: file.size,
      };

      taskStore.updateTask(taskId, {
        attachments: [...(taskStore.getTaskById(taskId)?.attachments || []), attachment]
      });
      return attachment;
    } catch (error) {
      taskStore.setError('task', 'Failed to add attachment');
      throw error;
    }
  }, [taskStore]);

  const removeAttachment = useCallback(async (attachmentId: string) => {
    try {
      // Find task containing this attachment
      const task = taskStore.tasks.find(t =>
        t.attachments.some(a => a.id === attachmentId)
      );

      if (task) {
        taskStore.updateTask(task.id, {
          attachments: task.attachments.filter(a => a.id !== attachmentId)
        });
      }
      return { success: true };
    } catch (error) {
      taskStore.setError('task', 'Failed to remove attachment');
      throw error;
    }
  }, [taskStore]);

  // UI actions
  const setSelectedTaskId = useCallback((id: string | null) => {
    taskStore.setSelectedTaskId(id);
  }, [taskStore]);

  const setShowCreateModal = useCallback((show: boolean) => {
    taskStore.setShowCreateModal(show);
  }, [taskStore]);

  const setShowEditModal = useCallback((show: boolean) => {
    taskStore.setShowEditModal(show);
  }, [taskStore]);

  // Filter and search actions
  const setSearchQuery = useCallback((query: string) => {
    taskStore.setSearchQuery(query);
  }, [taskStore]);

  const setFilters = useCallback((filters: any) => {
    taskStore.setFilters(filters);
  }, [taskStore]);

  // Utility functions
  const getTaskById = useCallback((id: string) => {
    return taskStore.getTaskById(id);
  }, [taskStore]);

  const getTasksByProject = useCallback((projectId: string) => {
    return taskStore.getTasksByProject(projectId);
  }, [taskStore]);

  const getSubtasks = useCallback((taskId: string) => {
    return taskStore.getTaskHierarchy(taskId);
  }, [taskStore]);

  const getTaskComments = useCallback((taskId: string) => {
    return taskStore.getTaskComments(taskId);
  }, [taskStore]);

  return {
    // State
    currentTask,
    tasks,
    filteredTasks,
    subtasks,
    comments,
    timeEntries,
    attachments,
    boardColumns,
    analytics,
    loading,
    errors,

    // Actions
    loadTasks,
    loadTask,
    createTask,
    updateTask,
    deleteTask,
    completeTask,

    // Assignment
    assignTask,
    unassignTask,

    // Subtasks
    loadSubtasks,
    createSubtask,

    // Comments
    loadComments,
    addComment,
    updateComment,
    deleteComment,

    // Time tracking
    loadTimeEntries,
    startTimeTracking,
    stopTimeTracking,
    addTimeEntry,

    // Attachments
    loadAttachments,
    addAttachment,
    removeAttachment,

    // UI actions
    setSelectedTaskId,
    setShowCreateModal,
    setShowEditModal,

    // Filter and search
    setSearchQuery,
    setFilters,

    // Utility functions
    getTaskById,
    getTasksByProject,
    getSubtasks,
    getTaskComments,
  };
}