import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { ProjectWithTasks } from "@/types/project";
import useProjectStore from "@/store/project";
import getTasks from "@/fetchers/task/get-tasks";
import getProject from "@/fetchers/project/get-project";
import { toast } from '@/lib/toast';

// Unified data structure for all project views
interface ProjectDataResponse {
  project: ProjectWithTasks;
  tasks: any[];
  columns: any[];
  milestones: any[];
  analytics: any;
  teamMembers: any[];
}

// Data transformation utilities
const transformTasksForView = (data: any, view: string) => {
  if (!data) return [];
  
  switch (view) {
    case 'board':
      // Return as columns for kanban board
      return Array.isArray(data.columns) ? data.columns : 
             Array.isArray(data) ? [{ id: 'default', tasks: data }] : [];
    
    case 'list':
    case 'backlog':
      // Flatten tasks for list views
      if (Array.isArray(data)) return data;
      if (data.columns) {
        return data.columns.flatMap((col: any) => col.tasks || []);
      }
      return [];
    
    case 'timeline':
      // Filter tasks with due dates for timeline
      const tasks = Array.isArray(data) ? data : 
                   data.columns ? data.columns.flatMap((col: any) => col.tasks || []) : [];
      return tasks.filter((task: any) => task.dueDate);
    
    default:
      return data;
  }
};

// Memory optimization for large datasets
const optimizeDataForMemory = (data: any, isHighMemory: boolean) => {
  if (!isHighMemory) return data;
  
  // Reduce data size for high memory usage
  return {
    ...data,
    tasks: data.tasks?.slice(0, 100), // Limit task count
    columns: data.columns?.map((col: any) => ({
      ...col,
      tasks: col.tasks?.slice(0, 50) // Limit tasks per column
    }))
  };
};

/**
 * Unified project data hook for all views
 * Consolidates data fetching, caching, and state management
 */
export const useProjectData = (projectId: string, workspaceId: string) => {
  const queryClient = useQueryClient();
  const { activeView, contextPreservation } = useProjectStore();
  
  // Project metadata query
  const projectQuery = useQuery({
    queryKey: ['project', projectId, workspaceId],
    queryFn: () => getProject({ id: projectId, workspaceId }),
    enabled: !!projectId && !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Tasks data query
  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => getTasks(projectId),
    enabled: !!projectId,
    refetchInterval: contextPreservation ? 30000 : 5000, // Slower refetch if context preserved
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Milestones query
  const milestonesQuery = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      // Placeholder for milestones API call
      return [];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Transform data based on active view
  const transformedData = useMemo(() => {
    const tasks = transformTasksForView(tasksQuery.data, activeView);
    
    return {
      project: projectQuery.data,
      tasks,
      columns: activeView === 'board' ? tasks : [],
      milestones: milestonesQuery.data || [],
      analytics: {
        totalTasks: Array.isArray(tasks) ? tasks.length : 0,
        completedTasks: Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'done').length : 0,
        // Add more analytics as needed
      },
      teamMembers: [] // Placeholder
    };
  }, [projectQuery.data, tasksQuery.data, milestonesQuery.data, activeView]);

  // Invalidation utilities
  const invalidateProjectViews = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
  }, [projectId, queryClient]);

  const invalidateSpecificView = useCallback((view: string) => {
    if (view === 'overview') {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  }, [projectId, queryClient]);

  // Optimistic update mutation
  const optimisticUpdate = useMutation({
    mutationFn: async (update: { type: 'task' | 'project' | 'milestone'; data: any }) => {
      // This would call the appropriate API endpoint
      return update;
    },
    onMutate: async (update) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks', projectId]);
      
      // Optimistically update
      if (update.type === 'task') {
        queryClient.setQueryData(['tasks', projectId], (old: any) => {
          if (!old) return old;
          // Update logic based on update.data
          return old;
        });
      }
      
      return { previousTasks };
    },
    onError: (err, update, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
      toast.error('Failed to update. Changes have been reverted.');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  // Prefetch adjacent views for better UX
  const prefetchAdjacentViews = useCallback(() => {
    const viewOrder: string[] = ['overview', 'board', 'list', 'timeline', 'milestones'];
    const currentIndex = viewOrder.indexOf(activeView);
    
    // Prefetch next view
    if (currentIndex < viewOrder.length - 1) {
      queryClient.prefetchQuery({
        queryKey: ['tasks', projectId, viewOrder[currentIndex + 1]],
        queryFn: () => getTasks(projectId),
        staleTime: 60 * 1000, // 1 minute
      });
    }
  }, [activeView, projectId, queryClient]);

  // Combined loading state
  const isLoading = projectQuery.isLoading || tasksQuery.isLoading;
  const isError = projectQuery.isError || tasksQuery.isError;
  const error = projectQuery.error || tasksQuery.error;

  // Data freshness indicator
  const dataFreshness = useMemo(() => {
    const projectFetchTime = projectQuery.dataUpdatedAt;
    const tasksFetchTime = tasksQuery.dataUpdatedAt;
    const oldestFetch = Math.min(projectFetchTime, tasksFetchTime);
    const age = Date.now() - oldestFetch;
    
    if (age < 30000) return 'fresh'; // < 30 seconds
    if (age < 120000) return 'stale'; // < 2 minutes
    return 'very-stale'; // > 2 minutes
  }, [projectQuery.dataUpdatedAt, tasksQuery.dataUpdatedAt]);

  return {
    // Data
    data: transformedData,
    project: transformedData.project,
    tasks: transformedData.tasks,
    columns: transformedData.columns,
    milestones: transformedData.milestones,
    analytics: transformedData.analytics,
    
    // Loading states
    isLoading,
    isError,
    error,
    dataFreshness,
    
    // Utilities
    invalidateProjectViews,
    invalidateSpecificView,
    optimisticUpdate: optimisticUpdate.mutate,
    prefetchAdjacentViews,
    
    // Raw queries for advanced usage
    queries: {
      project: projectQuery,
      tasks: tasksQuery,
      milestones: milestonesQuery,
    }
  };
};

// Hook for view-specific optimizations
export const useOptimizedProjectData = (projectId: string, workspaceId: string) => {
  const { data, ...rest } = useProjectData(projectId, workspaceId);
  const { activeView } = useProjectStore();
  
  // Memory usage check (simplified)
  const isHighMemory = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (performance as any).memory?.usedJSHeapSize > 50 * 1024 * 1024; // 50MB
  }, []);
  
  const optimizedData = useMemo(() => {
    return optimizeDataForMemory(data, isHighMemory);
  }, [data, isHighMemory]);
  
  return {
    data: optimizedData,
    isHighMemory,
    activeView,
    ...rest
  };
};

export default useProjectData;