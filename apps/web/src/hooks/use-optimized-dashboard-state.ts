import { useState, useMemo, useCallback } from 'react';
import { useBatchedLocalStorage } from './use-debounced-local-storage';

/**
 * Optimized dashboard state hook that replaces 8 separate useEffect hooks
 * with a single batched localStorage solution
 * @epic-2.4-performance: Prevents excessive re-renders from localStorage persistence
 */

export type ChartType = 'bar' | 'line' | 'pie' | 'area';
export type ViewMode = 'standard' | 'custom';

export interface DashboardFilters {
  timeRange: '7d' | '30d' | '90d' | '1y';
  projectIds: string[];
  userIds: string[];
  priorities: string[];
  status: string[];
  tags: string[];
}

export interface DashboardWidget {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
}

interface DashboardState {
  viewMode: ViewMode;
  isEditMode: boolean;
  productivityChartType: ChartType;
  taskChartType: ChartType;
  projectHealthChartType: ChartType;
  workspaceHealthChartType: ChartType;
  filters: DashboardFilters;
  widgets: DashboardWidget[];
}

const defaultDashboardState: DashboardState = {
  viewMode: 'standard',
  isEditMode: false,
  productivityChartType: 'line',
  taskChartType: 'bar',
  projectHealthChartType: 'pie',
  workspaceHealthChartType: 'pie',
  filters: {
    timeRange: '30d',
    projectIds: [],
    userIds: [],
    priorities: [],
    status: [],
    tags: []
  },
  widgets: []
};

export function useOptimizedDashboardState() {
  // Single batched localStorage hook replaces 8 separate useEffect hooks
  const [dashboardState, updateDashboardState, isLoading] = useBatchedLocalStorage(
    'meridian-dashboard',
    defaultDashboardState,
    { delay: 300 } // Shorter delay for better UX
  );

  // Memoized individual getters to prevent unnecessary re-renders
  const viewMode = useMemo(() => dashboardState.viewMode, [dashboardState.viewMode]);
  const isEditMode = useMemo(() => dashboardState.isEditMode, [dashboardState.isEditMode]);
  const productivityChartType = useMemo(() => dashboardState.productivityChartType, [dashboardState.productivityChartType]);
  const taskChartType = useMemo(() => dashboardState.taskChartType, [dashboardState.taskChartType]);
  const projectHealthChartType = useMemo(() => dashboardState.projectHealthChartType, [dashboardState.projectHealthChartType]);
  const workspaceHealthChartType = useMemo(() => dashboardState.workspaceHealthChartType, [dashboardState.workspaceHealthChartType]);
  const filters = useMemo(() => dashboardState.filters, [dashboardState.filters]);
  const widgets = useMemo(() => dashboardState.widgets, [dashboardState.widgets]);

  // Memoized update functions to prevent re-renders
  const setViewMode = useCallback((mode: ViewMode) => {
    updateDashboardState({ viewMode: mode });
  }, [updateDashboardState]);

  const setIsEditMode = useCallback((editMode: boolean) => {
    updateDashboardState({ isEditMode: editMode });
  }, [updateDashboardState]);

  const setProductivityChartType = useCallback((type: ChartType) => {
    updateDashboardState({ productivityChartType: type });
  }, [updateDashboardState]);

  const setTaskChartType = useCallback((type: ChartType) => {
    updateDashboardState({ taskChartType: type });
  }, [updateDashboardState]);

  const setProjectHealthChartType = useCallback((type: ChartType) => {
    updateDashboardState({ projectHealthChartType: type });
  }, [updateDashboardState]);

  const setWorkspaceHealthChartType = useCallback((type: ChartType) => {
    updateDashboardState({ workspaceHealthChartType: type });
  }, [updateDashboardState]);

  const setFilters = useCallback((newFilters: DashboardFilters) => {
    updateDashboardState({ filters: newFilters });
  }, [updateDashboardState]);

  const setWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    updateDashboardState({ widgets: newWidgets });
  }, [updateDashboardState]);

  // Batch multiple updates for better performance
  const updateMultiple = useCallback((updates: Partial<DashboardState>) => {
    updateDashboardState(updates);
  }, [updateDashboardState]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    updateDashboardState(defaultDashboardState);
  }, [updateDashboardState]);

  return {
    // Current state
    viewMode,
    isEditMode,
    productivityChartType,
    taskChartType,
    projectHealthChartType,
    workspaceHealthChartType,
    filters,
    widgets,
    
    // Update functions
    setViewMode,
    setIsEditMode,
    setProductivityChartType,
    setTaskChartType,
    setProjectHealthChartType,
    setWorkspaceHealthChartType,
    setFilters,
    setWidgets,
    
    // Batch operations
    updateMultiple,
    resetToDefaults,
    
    // Loading state
    isLoading
  };
}

/**
 * Hook for optimized theme state management
 * Replaces multiple localStorage operations in useEnhancedTheme
 */
export function useOptimizedThemeState() {
  const [themeState, updateThemeState] = useBatchedLocalStorage(
    'meridian-theme',
    {
      mode: 'system' as 'light' | 'dark' | 'system',
      variant: 'default' as 'default' | 'enhanced',
      highContrast: false,
      reducedMotion: false
    },
    { delay: 200 }
  );

  const setThemeMode = useCallback((mode: 'light' | 'dark' | 'system') => {
    updateThemeState({ mode });
  }, [updateThemeState]);

  const setThemeVariant = useCallback((variant: 'default' | 'enhanced') => {
    updateThemeState({ variant });
  }, [updateThemeState]);

  const setHighContrast = useCallback((highContrast: boolean) => {
    updateThemeState({ highContrast });
  }, [updateThemeState]);

  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    updateThemeState({ reducedMotion });
  }, [updateThemeState]);

  return {
    ...themeState,
    setThemeMode,
    setThemeVariant,
    setHighContrast,
    setReducedMotion,
    updateMultiple: updateThemeState
  };
}