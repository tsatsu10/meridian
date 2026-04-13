/**
 * Dashboard Filter Types
 * Shared filter types for dashboard views
 */

export type FilterStatus = 'all' | 'pending' | 'in-progress' | 'done' | 'blocked' | 'overdue';
export type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent';
export type FilterTimeRange = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

export interface DashboardFilters {
  // Time-based filters
  timeRange: FilterTimeRange;
  customStartDate?: string;
  customEndDate?: string;
  
  // Entity filters
  projectIds: string[];
  userIds: string[];
  departmentIds?: string[];
  
  // Attribute filters
  priorities: FilterPriority[];
  status: FilterStatus[];
  tags: string[];
  
  // Advanced filters
  hasAttachments?: boolean;
  hasComments?: boolean;
  isOverdue?: boolean;
  assignedToMe?: boolean;
  createdByMe?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: DashboardFilters;
  isDefault?: boolean;
  isSystem?: boolean; // System presets cannot be deleted
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SYSTEM_FILTER_PRESETS: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'My Overdue Tasks',
    description: 'Tasks assigned to me that are past their due date',
    filters: {
      timeRange: 'all',
      projectIds: [],
      userIds: [],
      priorities: [],
      status: [],
      tags: [],
      isOverdue: true,
      assignedToMe: true
    },
    isSystem: true,
    isDefault: false,
    icon: 'alert-circle',
    color: 'red'
  },
  {
    name: "Team's This Week",
    description: 'All tasks for your team due this week',
    filters: {
      timeRange: '7d',
      projectIds: [],
      userIds: [],
      priorities: [],
      status: ['in-progress', 'pending'],
      tags: []
    },
    isSystem: true,
    isDefault: false,
    icon: 'users',
    color: 'blue'
  },
  {
    name: 'High Priority Incomplete',
    description: 'Urgent and high priority tasks not yet completed',
    filters: {
      timeRange: 'all',
      projectIds: [],
      userIds: [],
      priorities: ['urgent', 'high'],
      status: ['pending', 'in-progress'],
      tags: []
    },
    isSystem: true,
    isDefault: false,
    icon: 'flame',
    color: 'orange'
  },
  {
    name: 'Recently Updated',
    description: 'Tasks modified in the last 7 days',
    filters: {
      timeRange: '7d',
      projectIds: [],
      userIds: [],
      priorities: [],
      status: [],
      tags: []
    },
    isSystem: true,
    isDefault: false,
    icon: 'clock',
    color: 'green'
  },
  {
    name: 'All Active',
    description: 'All currently active tasks across projects',
    filters: {
      timeRange: 'all',
      projectIds: [],
      userIds: [],
      priorities: [],
      status: ['pending', 'in-progress'],
      tags: []
    },
    isSystem: true,
    isDefault: true,
    icon: 'check-circle',
    color: 'purple'
  }
];

