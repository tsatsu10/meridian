/**
 * React Hooks for Project Health
 * Custom hooks for health calculation integration
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  calculateProjectHealth,
  compareProjectsHealth,
} from '@/utils/health/calculate-health-score';
import type { ProjectHealthMetrics, ProjectHealthInput } from '@/types/health';
import { API_BASE_URL, API_URL } from '@/constants/urls';

/**
 * Hook to calculate health for a single project
 * Includes caching and real-time updates
 */
export function useProjectHealth(projectId: string | undefined, workspaceId?: string) {
  const [healthInput, setHealthInput] = useState<ProjectHealthInput | null>(null);
  const [healthHistory, setHealthHistory] = useState<number[]>([]);

  // Validate workspaceId - if it's the known invalid ID, don't make API calls
  const isInvalidWorkspaceId = workspaceId === 'k8a0u6k7qmayguubd3f8t18s' ||
                              !workspaceId ||
                              workspaceId === 'undefined' ||
                              workspaceId === 'null';

  // Fetch project data
  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId || isInvalidWorkspaceId) {
        console.warn('⚠️ Skipping project fetch - invalid projectId or workspaceId:', { projectId, workspaceId });
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}?workspaceId=${workspaceId}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Project ${projectId} not found in workspace ${workspaceId}`);
          return null;
        }
        throw new Error('Failed to fetch project');
      }
      return response.json();
    },
    enabled: !!projectId && !isInvalidWorkspaceId,
  });

  // Fetch project tasks
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const response = await fetch(`${API_BASE_URL}/tasks/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Tasks for project ${projectId} not found`);
          return [];
        }
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    enabled: !!projectId,
  });

  // Fetch project team
  const { data: teamData, isLoading: isTeamLoading } = useQuery({
    queryKey: ['project', projectId, 'teams'],
    queryFn: async () => {
      if (!projectId) return null;

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/teams`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Teams for project ${projectId} not found`);
          return [];
        }
        throw new Error('Failed to fetch team');
      }
      return response.json();
    },
    enabled: !!projectId,
  });

  // Build health input from fetched data
  useMemo(() => {
    if (!projectData || !tasksData || isInvalidWorkspaceId) return;

    const now = new Date();
    const dueDate = projectData.dueDate ? new Date(projectData.dueDate) : null;
    const daysRemaining = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const startDate = projectData.createdAt ? new Date(projectData.createdAt) : null;
    const totalDays = dueDate && startDate
      ? Math.ceil((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const totalTasks = tasksData.length;
    const completedTasks = tasksData.filter(
      (t: any) => t.status === 'done' || t.completed
    ).length;

    const overdueTasks = tasksData.filter(
      (t: any) => t.dueDate && new Date(t.dueDate) < now && !t.completed
    ).length;

    const blockedTasks = tasksData.filter(
      (t: any) => t.status === 'blocked'
    ).length;

    // Calculate velocity (tasks completed in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentlyCompletedTasks = tasksData.filter(
      (t: any) => t.completedAt && new Date(t.completedAt) > sevenDaysAgo
    ).length;

    // Get blockers from tasks
    const blockers = tasksData
      .filter((t: any) => t.blocked)
      .map((t: any) => t.blockerReason || 'Unknown blocker')
      .slice(0, 5);

    // Calculate required hours
    const requiredHours = tasksData.reduce(
      (sum: number, t: any) => sum + (t.estimatedHours || 0),
      0
    );

    // Build health input
    const input: ProjectHealthInput = {
      projectId: projectId!,
      totalTasks,
      completedTasks,
      daysRemaining: daysRemaining || 30,
      totalDays: totalDays || 30,
      overdueTasks,
      blockedTasks,
      recentlyCompletedTasks,
      timeWindow: 7,
      teamMembers: teamData || [],
      allocatedHours: requiredHours,
      requiredHours,
      blockers,
      unmetDependencies: 0,
      criticalPathAtRisk: false,
      tasksWithMissedWarnings: 0,
    };

    setHealthInput(input);
  }, [projectData, tasksData, teamData, projectId]);

  // Calculate health metrics
  const health = useMemo<ProjectHealthMetrics | null>(() => {
    if (!healthInput || isInvalidWorkspaceId) return null;
    return calculateProjectHealth(healthInput, healthHistory);
  }, [healthInput, healthHistory, isInvalidWorkspaceId]);

  // Update health history
  useEffect(() => {
    if (health) {
      setHealthHistory((prev) => [...prev.slice(-9), health.overallScore]);
    }
  }, [health?.overallScore]);

  const isLoading = isProjectLoading || isTasksLoading || isTeamLoading;
  const error = (!projectData && !isProjectLoading) || isInvalidWorkspaceId
    ? (isInvalidWorkspaceId ? 'Invalid workspace' : 'Project not found')
    : null;

  return {
    health,
    isLoading,
    error,
    refetch: useCallback(() => {
      // Trigger refetch for all queries
    }, []),
  };
}

/**
 * Hook to calculate health for multiple projects
 */
export function useMultipleProjectsHealth(projectIds: string[]) {
  const queries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ['project-health', projectId],
      queryFn: async () => {
        // This would be implemented to fetch project data and calculate health
        // For now, returning a placeholder
        return null;
      },
      enabled: !!projectId,
    })),
  });

  const health = useMemo(() => {
    const allHealth = queries
      .map((q) => q.data)
      .filter((h) => h !== null) as ProjectHealthMetrics[];

    if (allHealth.length === 0) return null;

    return {
      all: allHealth,
      comparison: compareProjectsHealth(allHealth),
      averageHealth: allHealth.reduce((sum, h) => sum + h.overallScore, 0) / allHealth.length,
      healthByState: {
        ahead: allHealth.filter((h) => h.healthState === 'ahead').length,
        onTrack: allHealth.filter((h) => h.healthState === 'on-track').length,
        atRisk: allHealth.filter((h) => h.healthState === 'at-risk').length,
        behind: allHealth.filter((h) => h.healthState === 'behind').length,
        critical: allHealth.filter((h) => h.healthState === 'critical').length,
      },
    };
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  return { health, isLoading, isError };
}

/**
 * Hook for real-time health updates via WebSocket
 */
export function useRealtimeHealthUpdates(projectId: string | undefined) {
  const [realtimeHealth, setRealtimeHealth] = useState<ProjectHealthMetrics | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Subscribe to health updates via WebSocket
    // This would connect to Socket.IO and listen for health updates
    const handleHealthUpdate = (data: ProjectHealthMetrics) => {
      setRealtimeHealth(data);
    };

    // Placeholder for WebSocket subscription
    // const unsubscribe = subscribeToHealthUpdates(projectId, handleHealthUpdate);
    // return () => unsubscribe();
  }, [projectId]);

  return realtimeHealth;
}

/**
 * Hook for health factor details
 */
export function useHealthFactorDetails(
  projectId: string | undefined,
  workspaceId?: string,
  factorName?: string
) {
  // Validate workspaceId - if it's the known invalid ID, return null immediately
  const isInvalidWorkspaceId = workspaceId === 'k8a0u6k7qmayguubd3f8t18s' ||
                              !workspaceId ||
                              workspaceId === 'undefined' ||
                              workspaceId === 'null';

  const { health } = useProjectHealth(projectId, isInvalidWorkspaceId ? undefined : workspaceId);

  const factor = useMemo(() => {
    if (!health || !factorName) return null;
    return health.factors.find((f) => f.name === factorName);
  }, [health, factorName]);

  return factor;
}

/**
 * Hook for health alerts and notifications
 */
export function useHealthAlerts(projectId: string | undefined, workspaceId?: string) {
  // Validate workspaceId - if it's the known invalid ID, return empty array immediately
  const isInvalidWorkspaceId = workspaceId === 'k8a0u6k7qmayguubd3f8t18s' ||
                              !workspaceId ||
                              workspaceId === 'undefined' ||
                              workspaceId === 'null';

  const { health } = useProjectHealth(projectId, isInvalidWorkspaceId ? undefined : workspaceId);
  const [alerts, setAlerts] = useState<any[]>([]);

  useMemo(() => {
    if (!health) {
      setAlerts([]);
      return;
    }

    const newAlerts = [];

    // Critical alerts
    if (health.healthState === 'critical') {
      newAlerts.push({
        id: 'critical-health',
        type: 'critical',
        message: 'Project health is CRITICAL. Immediate action required.',
        icon: '🚨',
      });
    }

    // Risk alerts
    health.risks.forEach((risk) => {
      if (risk.severity === 'critical') {
        newAlerts.push({
          id: risk.id,
          type: 'risk',
          message: risk.description,
          icon: '⚠️',
        });
      }
    });

    // Factor alerts
    health.factors.forEach((factor) => {
      if (factor.score < 50) {
        newAlerts.push({
          id: `factor-${factor.name}`,
          type: 'factor',
          message: `${factor.name} factor critically low (${Math.round(factor.score)}/100)`,
          icon: '❌',
        });
      }
    });

    setAlerts(newAlerts);
  }, [health]);

  return alerts;
}

/**
 * Hook for health recommendations
 */
export function useHealthRecommendations(projectId: string | undefined, workspaceId?: string) {
  // Validate workspaceId - if it's the known invalid ID, return empty array immediately
  const isInvalidWorkspaceId = workspaceId === 'k8a0u6k7qmayguubd3f8t18s' ||
                              !workspaceId ||
                              workspaceId === 'undefined' ||
                              workspaceId === 'null';

  const { health } = useProjectHealth(projectId, isInvalidWorkspaceId ? undefined : workspaceId);

  const recommendations = useMemo(() => {
    if (!health) return [];

    return health.recommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] -
               priorityOrder[b.priority as keyof typeof priorityOrder];
      })
      .slice(0, 5); // Return top 5 recommendations
  }, [health]);

  return recommendations;
}

/**
 * Hook for health trend analysis
 */
export function useHealthTrend(projectId: string | undefined, workspaceId?: string) {
  // Validate workspaceId - if it's the known invalid ID, return null immediately
  const isInvalidWorkspaceId = workspaceId === 'k8a0u6k7qmayguubd3f8t18s' ||
                              !workspaceId ||
                              workspaceId === 'undefined' ||
                              workspaceId === 'null';

  const { health } = useProjectHealth(projectId, isInvalidWorkspaceId ? undefined : workspaceId);

  const trend = useMemo(() => {
    if (!health) return null;

    const history = health.scoreHistory || [];
    if (history.length < 2) {
      return { trend: 'stable', change: 0, percentChange: 0 };
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const change = latest - previous;
    const percentChange = (change / previous) * 100;

    return {
      trend: health.trend,
      change,
      percentChange,
      history,
    };
  }, [health]);

  return trend;
}

/**
 * Hook for health comparisons
 */
export function useHealthComparison(projectIds: string[]) {
  const { health } = useMultipleProjectsHealth(projectIds);

  const comparison = useMemo(() => {
    if (!health) return null;

    return {
      healthiest: health.comparison.healthiest,
      riskiest: health.comparison.riskiest,
      average: health.comparison.averageScore,
      distribution: health.health,
    };
  }, [health]);

  return comparison;
}

/**
 * Hook for quick health status
 */
export function useQuickHealthStatus(projectId: string | undefined, workspaceId?: string) {
  // Validate workspaceId - if it's the known invalid ID, return null immediately
  const isInvalidWorkspaceId = workspaceId === 'k8a0u6k7qmayguubd3f8t18s' ||
                              !workspaceId ||
                              workspaceId === 'undefined' ||
                              workspaceId === 'null';

  const { health, isLoading } = useProjectHealth(projectId, isInvalidWorkspaceId ? undefined : workspaceId);

  const status = useMemo(() => {
    if (!health) return null;

    return {
      score: Math.round(health.overallScore),
      state: health.healthState,
      icon: health.healthStateIcon,
      label: health.healthStateLabel,
      risks: health.risks.length,
      topRisk: health.risks[0],
      trend: health.trend,
    };
  }, [health]);

  return { status, isLoading };
}
