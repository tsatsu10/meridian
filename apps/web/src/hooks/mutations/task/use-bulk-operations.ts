/**
 * ☑️ Bulk Task Operations Hooks
 * 
 * Mutations for performing bulk operations on multiple tasks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_URL } from '@/constants/urls';
import { invalidateDashboardQueriesForWorkspace } from '@/lib/dashboard/invalidate-workspace-project-surface';
import useWorkspaceStore from '@/store/workspace';

// 🔄 Bulk Update Status
interface BulkUpdateStatusInput {
  taskIds: string[];
  status: 'todo' | 'in_progress' | 'done';
  userId: string;
  projectId: string;
}

export const useBulkUpdateStatus = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async ({ taskIds, status, userId }: BulkUpdateStatusInput) => {
      const response = await fetch(`${API_URL}/task/bulk/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, status, userId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task status');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || `Updated ${data.data.updated} task(s)`);
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      if (workspace?.id) {
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task status');
    },
  });
};

// 🎯 Bulk Update Priority
interface BulkUpdatePriorityInput {
  taskIds: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId: string;
  projectId: string;
}

export const useBulkUpdatePriority = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async ({ taskIds, priority, userId }: BulkUpdatePriorityInput) => {
      const response = await fetch(`${API_URL}/task/bulk/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, priority, userId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task priority');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || `Updated priority for ${data.data.updated} task(s)`);
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      if (workspace?.id) {
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task priority');
    },
  });
};

// 👤 Bulk Assign Tasks
interface BulkAssignTasksInput {
  taskIds: string[];
  assigneeId: string;
  assigneeEmail: string;
  userId: string;
  projectId: string;
}

export const useBulkAssignTasks = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async ({ taskIds, assigneeId, assigneeEmail, userId }: BulkAssignTasksInput) => {
      const response = await fetch(`${API_URL}/task/bulk/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, assigneeId, assigneeEmail, userId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign tasks');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || `Assigned ${data.data.updated} task(s)`);
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      if (workspace?.id) {
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign tasks');
    },
  });
};

// 📦 Bulk Archive Tasks
interface BulkArchiveTasksInput {
  taskIds: string[];
  userId: string;
  projectId: string;
}

export const useBulkArchiveTasks = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async ({ taskIds, userId }: BulkArchiveTasksInput) => {
      const response = await fetch(`${API_URL}/task/bulk/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, userId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive tasks');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || `Archived ${data.data.archived} task(s)`);
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      if (workspace?.id) {
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive tasks');
    },
  });
};

// 🗑️ Bulk Delete Tasks
interface BulkDeleteTasksInput {
  taskIds: string[];
  userId: string;
  projectId: string;
}

export const useBulkDeleteTasks = () => {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async ({ taskIds, userId }: BulkDeleteTasksInput) => {
      const response = await fetch(`${API_URL}/task/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds, userId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tasks');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || `Deleted ${data.data.deleted} task(s)`);
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
      if (workspace?.id) {
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tasks');
    },
  });
};

