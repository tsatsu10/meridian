// @epic-3.1-dashboards: Advanced filtering component for dashboard data
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export interface DashboardFilters {
  timeRange: '7d' | '30d' | '90d' | '1y';
  projectIds: string[];
  userIds: string[];
  priorities: string[];
  status: string[];
  tags: string[];
}

interface AdvancedFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  availableProjects?: Array<{ id: string; name: string; }>;
  availableUsers?: Array<{ id: string; name: string; }>;
  className?: string;
}

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' }
] as const;

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100' },
  { value: 'high', label: 'High', color: 'bg-orange-100' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100' }
];

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'completed', label: 'Completed' }
];

export function AdvancedFilters({
  filters,
  onFiltersChange,
  availableProjects = [],
  availableUsers = [],
  className = ""
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <K extends keyof DashboardFilters>(
    key: K,
    value: string
  ) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as DashboardFilters[K]);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      timeRange: '30d',
      projectIds: [],
      userIds: [],
      priorities: [],
      status: [],
      tags: []
    });
  };

  const getActiveFilterCount = () => {
    return filters.projectIds.length + 
           filters.userIds.length + 
           filters.priorities.length + 
           filters.status.length + 
           filters.tags.length;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Time Range Filter - Always Visible */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Time Range:</span>
        <div className="flex items-center space-x-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={filters.timeRange === range.value ? "default" : "ghost"}
              size="sm"
              onClick={() => updateFilter('timeRange', range.value)}
              className="h-7 px-3 text-xs"
            >
              {range.label}
            </Button>
          ))}
        </div>
        
        {/* Filter Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4"
        >
          More Filters
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-2 h-4 w-4 p-0 text-xs">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>

        {/* Clear Filters */}
        {getActiveFilterCount() > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          {/* Priority Filter */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Priority:</span>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((priority) => (
                <Button
                  key={priority.value}
                  variant={filters.priorities.includes(priority.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('priorities', priority.value)}
                  className="h-7 text-xs"
                >
                  <div 
                    className={cn("w-2 h-2 rounded-full mr-2", priority.color)}
                  />
                  {priority.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Status:</span>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <Button
                  key={status.value}
                  variant={filters.status.includes(status.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('status', status.value)}
                  className="h-7 text-xs"
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Projects Filter */}
          {availableProjects.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Projects:</span>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableProjects.map((project) => (
                  <Button
                    key={project.id}
                    variant={filters.projectIds.includes(project.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayFilter('projectIds', project.id)}
                    className="h-7 text-xs"
                  >
                    {project.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Users Filter */}
          {availableUsers.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Team Members:</span>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant={filters.userIds.includes(user.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayFilter('userIds', user.id)}
                    className="h-7 text-xs"
                  >
                    {user.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {filters.priorities.map((priority) => (
            <Badge 
              key={`priority-${priority}`} 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => toggleArrayFilter('priorities', priority)}
            >
              Priority: {priority} ×
            </Badge>
          ))}
          
          {filters.status.map((status) => (
            <Badge 
              key={`status-${status}`} 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => toggleArrayFilter('status', status)}
            >
              Status: {status} ×
            </Badge>
          ))}
          
          {filters.projectIds.map((projectId) => {
            const project = availableProjects.find(p => p.id === projectId);
            return (
              <Badge 
                key={`project-${projectId}`} 
                variant="secondary" 
                className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => toggleArrayFilter('projectIds', projectId)}
              >
                Project: {project?.name || projectId} ×
              </Badge>
            );
          })}
          
          {filters.userIds.map((userId) => {
            const user = availableUsers.find(u => u.id === userId);
            return (
              <Badge 
                key={`user-${userId}`} 
                variant="secondary" 
                className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => toggleArrayFilter('userIds', userId)}
              >
                User: {user?.name || userId} ×
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Smart Alerts Component (non-AI based contextual insights)
export function SmartAlerts({ 
  dashboardData,
  filters
}: {
  dashboardData: any;
  filters: DashboardFilters;
}) {
  if (!dashboardData?.stats) return null;

  const alerts = [];
  const { stats, deadlines } = dashboardData;

  // High overdue task ratio alert
  const overdueRatio = stats.overdueTasks / stats.totalTasks;
  if (overdueRatio > 0.2) {
    alerts.push({
      type: 'warning',
      title: 'High Overdue Task Ratio',
      message: `${(overdueRatio * 100).toFixed(1)}% of tasks are overdue. Consider reviewing task priorities and deadlines.`,
      action: 'Review Tasks'
    });
  }

  // Low productivity alert
  if (stats.productivity < 50) {
    alerts.push({
      type: 'info',
      title: 'Productivity Opportunity',
      message: `Team productivity is at ${stats.productivity}%. Consider reviewing current workload distribution.`,
      action: 'View Analytics'
    });
  }

  // Upcoming deadlines alert
  const urgentDeadlines = deadlines?.filter(d => d.priority === 'urgent').length || 0;
  if (urgentDeadlines > 3) {
    alerts.push({
      type: 'urgent',
      title: 'Multiple Urgent Deadlines',
      message: `${urgentDeadlines} urgent tasks are approaching their deadlines.`,
      action: 'Review Deadlines'
    });
  }

  // High project load alert
  if (stats.activeProjects > 10) {
    alerts.push({
      type: 'info',
      title: 'High Project Load',
      message: `${stats.activeProjects} active projects. Consider project prioritization.`,
      action: 'Manage Projects'
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div 
          key={index}
          className={cn(
            "p-3 rounded-lg border-l-4",
            alert.type === 'urgent' && "bg-red-50 border-red-400",
            alert.type === 'warning' && "bg-yellow-50 border-yellow-400",
            alert.type === 'info' && "bg-blue-50 border-blue-400"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">{alert.title}</h4>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs">
              {alert.action}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
} 