import type { ProjectView, ViewState } from '@/store/project';

// Standardized interfaces for all project view components
export interface ProjectViewComponent {
  projectId: string;
  workspaceId: string;
  viewState: ViewState;
  onViewStateChange: (state: Partial<ViewState>) => void;
  onDataChange: (change: DataChange) => void;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
}

// Data change events for cross-view synchronization
export interface DataChange {
  type: 'task' | 'milestone' | 'project' | 'bulk';
  action: 'create' | 'update' | 'delete' | 'reorder' | 'bulk-update';
  entityId?: string;
  entityIds?: string[];
  data?: any;
  previousData?: any;
  metadata?: Record<string, any>;
}

// Common view configurations
export interface ViewConfig {
  id: string;
  name: string;
  type: 'kanban' | 'list' | 'calendar' | 'timeline' | 'dashboard';
  settings: Record<string, any>;
  permissions: string[];
  isDefault?: boolean;
  isCustom?: boolean;
}

// Filter and sorting interfaces
export interface FilterConfig {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: any;
  enabled: boolean;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

// View state management
export interface ViewStateManager {
  currentView: ViewConfig;
  filters: FilterConfig[];
  sorts: SortConfig[];
  pagination: {
    page: number;
    size: number;
    total: number;
  };
  selection: {
    selectedIds: string[];
    selectAll: boolean;
  };
}

// Performance and optimization
export interface ViewPerformanceConfig {
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  cacheSize: number;
  debounceMs: number;
}

// Export all types
export type {
  ProjectView,
  ViewState
};