import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useProjectStore, { type ProjectView } from '@/store/project';
import { useProjectData } from './queries/project/use-project-data';

// Memory monitoring utilities
interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  percentUsed: number;
  isHighMemory: boolean;
  isCriticalMemory: boolean;
}

const getMemoryStats = (): MemoryStats => {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      percentUsed: 0,
      isHighMemory: false,
      isCriticalMemory: false
    };
  }

  const memory = (performance as any).memory;
  const percentUsed = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    percentUsed,
    isHighMemory: percentUsed > 60, // High memory usage
    isCriticalMemory: percentUsed > 80 // Critical memory usage
  };
};

// Data optimization strategies
const optimizeDataForMemory = (data: any, memoryStats: MemoryStats, view: ProjectView) => {
  if (!memoryStats.isHighMemory) return data;

  const optimization = {
    tasks: data.tasks,
    columns: data.columns,
    milestones: data.milestones,
    analytics: data.analytics
  };

  // Progressive optimization based on memory pressure
  if (memoryStats.isHighMemory) {
    // Level 1: Reduce task details
    optimization.tasks = data.tasks?.map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeEmail: task.assigneeEmail,
      dueDate: task.dueDate,
      // Remove heavy fields
      description: task.description?.substring(0, 100) + '...' || '',
      // Remove non-essential fields
      comments: undefined,
      attachments: undefined,
      history: undefined
    }));

    // Limit columns for board view
    if (view === 'board' && data.columns) {
      optimization.columns = data.columns.map((col: any) => ({
        ...col,
        tasks: col.tasks?.slice(0, 20) // Limit tasks per column
      }));
    }

    // Simplify analytics
    optimization.analytics = {
      totalTasks: data.analytics?.totalTasks || 0,
      completedTasks: data.analytics?.completedTasks || 0,
      overdueTasks: data.analytics?.overdueTasks || 0
      // Remove detailed analytics
    };
  }

  if (memoryStats.isCriticalMemory) {
    // Level 2: Aggressive optimization
    optimization.tasks = data.tasks?.slice(0, 50); // Severely limit tasks
    optimization.milestones = data.milestones?.slice(0, 10); // Limit milestones
    
    // Remove all non-essential data
    optimization.analytics = {
      totalTasks: data.tasks?.length || 0,
      completedTasks: data.tasks?.filter((t: any) => t.status === 'done').length || 0
    };
  }

  return optimization;
};

// Performance monitoring
const usePerformanceMonitoring = () => {
  const performanceRef = useRef({
    renderTimes: [] as number[],
    lastRenderTime: 0,
    averageRenderTime: 0
  });

  const trackRender = useCallback(() => {
    const renderTime = performance.now() - performanceRef.current.lastRenderTime;
    performanceRef.current.renderTimes.push(renderTime);
    
    // Keep only last 10 render times
    if (performanceRef.current.renderTimes.length > 10) {
      performanceRef.current.renderTimes.shift();
    }
    
    // Calculate average
    performanceRef.current.averageRenderTime = 
      performanceRef.current.renderTimes.reduce((a, b) => a + b, 0) / 
      performanceRef.current.renderTimes.length;
    
    performanceRef.current.lastRenderTime = performance.now();
  }, []);

  useEffect(() => {
    performanceRef.current.lastRenderTime = performance.now();
  });

  return {
    trackRender,
    averageRenderTime: performanceRef.current.averageRenderTime,
    isSlowRendering: performanceRef.current.averageRenderTime > 16.67 // > 60fps
  };
};

// Caching strategies based on memory and performance
const getCacheStrategy = (memoryStats: MemoryStats, view: ProjectView) => {
  if (memoryStats.isCriticalMemory) {
    return {
      staleTime: 10000, // 10 seconds
      gcTime: 30000, // 30 seconds
      refetchInterval: false,
      refetchOnWindowFocus: false
    };
  }

  if (memoryStats.isHighMemory) {
    return {
      staleTime: 30000, // 30 seconds
      gcTime: 60000, // 1 minute
      refetchInterval: view === 'board' ? 30000 : false, // Only board needs real-time
      refetchOnWindowFocus: false
    };
  }

  // Normal memory - standard caching
  return {
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchInterval: view === 'board' ? 30000 : false, // Real-time for board (reduced from 10s to 30s)
    refetchOnWindowFocus: true
  };
};

// Main optimized hook
export const useOptimizedProjectData = (projectId: string, workspaceId: string) => {
  const { activeView, contextPreservation } = useProjectStore();
  const queryClient = useQueryClient();
  const performanceMonitoring = usePerformanceMonitoring();
  
  // Memory monitoring
  const memoryStats = useMemo(() => getMemoryStats(), []);
  
  // Update memory stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newStats = getMemoryStats();
      if (newStats.isCriticalMemory && !memoryStats.isCriticalMemory) {
        console.warn('Critical memory usage detected, applying aggressive optimizations');
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
        // Clear non-essential queries
        queryClient.getQueryCache().getAll().forEach(query => {
          if (query.queryKey.includes('prefetch') || query.queryKey.includes('optional')) {
            queryClient.removeQueries({ queryKey: query.queryKey });
          }
        });
      }
    }, 30000); // Reduced from 5s to 30s to prevent excessive polling

    return () => clearInterval(interval);
  }, [memoryStats.isCriticalMemory, queryClient]);

  // Base data with optimized caching
  const cacheStrategy = useMemo(() => getCacheStrategy(memoryStats, activeView), [memoryStats, activeView]);
  
  const baseQuery = useQuery({
    queryKey: ['project-optimized', projectId, workspaceId, activeView],
    queryFn: async () => {
      const { data } = useProjectData(projectId, workspaceId);
      return data;
    },
    ...cacheStrategy,
    enabled: !!projectId && !!workspaceId
  });

  // Optimized data based on memory constraints
  const optimizedData = useMemo(() => {
    if (!baseQuery.data) return null;
    
    performanceMonitoring.trackRender();
    
    return optimizeDataForMemory(baseQuery.data, memoryStats, activeView);
  }, [baseQuery.data, memoryStats, activeView, performanceMonitoring]);

  // Prefetching strategy based on memory
  const prefetchStrategy = useCallback((targetView: ProjectView) => {
    if (memoryStats.isCriticalMemory) return; // No prefetching in critical memory
    
    if (memoryStats.isHighMemory && Math.random() > 0.5) return; // Reduced prefetching
    
    // Prefetch data for target view
    queryClient.prefetchQuery({
      queryKey: ['project-optimized', projectId, workspaceId, targetView],
      queryFn: async () => {
        const { data } = useProjectData(projectId, workspaceId);
        return optimizeDataForMemory(data, memoryStats, targetView);
      },
      staleTime: 30000
    });
  }, [memoryStats, projectId, workspaceId, queryClient]);

  // Memory cleanup
  const cleanupMemory = useCallback(() => {
    // Remove stale queries
    queryClient.getQueryCache().getAll().forEach(query => {
      const lastUpdated = query.state.dataUpdatedAt;
      const isStale = Date.now() - lastUpdated > 300000; // 5 minutes
      
      if (isStale && !query.queryKey.includes(projectId)) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  }, [queryClient, projectId]);

  // Auto cleanup on critical memory
  useEffect(() => {
    if (memoryStats.isCriticalMemory) {
      cleanupMemory();
    }
  }, [memoryStats.isCriticalMemory, cleanupMemory]);

  // Performance metrics
  const performanceMetrics = useMemo(() => ({
    memoryUsage: memoryStats,
    renderPerformance: {
      averageRenderTime: performanceMonitoring.averageRenderTime,
      isSlowRendering: performanceMonitoring.isSlowRendering
    },
    dataSize: optimizedData ? JSON.stringify(optimizedData).length : 0,
    cacheStrategy: {
      staleTime: cacheStrategy.staleTime,
      gcTime: cacheStrategy.gcTime,
      hasRealTimeUpdates: !!cacheStrategy.refetchInterval
    }
  }), [memoryStats, performanceMonitoring, optimizedData, cacheStrategy]);

  return {
    // Data
    data: optimizedData,
    isLoading: baseQuery.isLoading,
    error: baseQuery.error,
    isError: baseQuery.isError,
    
    // Performance
    performanceMetrics,
    memoryStats,
    
    // Utilities
    prefetchStrategy,
    cleanupMemory,
    
    // Status indicators
    isOptimized: memoryStats.isHighMemory,
    optimizationLevel: memoryStats.isCriticalMemory ? 'aggressive' : 
                     memoryStats.isHighMemory ? 'moderate' : 'none',
    
    // Raw query for advanced usage
    baseQuery
  };
};

// Hook for memory-aware component rendering
export const useMemoryAwareRendering = () => {
  const memoryStats = useMemo(() => getMemoryStats(), []);
  
  return {
    shouldUseVirtualization: memoryStats.isHighMemory,
    shouldLimitAnimations: memoryStats.isCriticalMemory,
    shouldDeferNonCritical: memoryStats.isHighMemory,
    maxRenderItems: memoryStats.isCriticalMemory ? 20 : 
                   memoryStats.isHighMemory ? 50 : 100,
    memoryStats
  };
};

// Performance monitoring component
export const PerformanceMonitor: React.FC<{ 
  children: React.ReactNode;
  onPerformanceIssue?: (metrics: any) => void;
}> = ({ children, onPerformanceIssue }) => {
  const { performanceMetrics } = useOptimizedProjectData('', '');
  
  useEffect(() => {
    if (performanceMetrics.renderPerformance.isSlowRendering ||
        performanceMetrics.memoryUsage.isCriticalMemory) {
      onPerformanceIssue?.(performanceMetrics);
    }
  }, [performanceMetrics, onPerformanceIssue]);
  
  return <>{children}</>;
};

export default useOptimizedProjectData;