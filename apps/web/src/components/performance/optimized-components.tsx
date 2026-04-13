import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Performance-optimized React components with memo and proper comparison
 * @epic-2.4-performance: Prevents unnecessary re-renders in dashboard components
 */

// Optimized Stats Card with memo and deep comparison
interface StatsCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  colorScheme?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export const OptimizedStatsCard = memo<StatsCardProps>(({
  title,
  value,
  description,
  icon: Icon,
  className,
  trend,
  trendValue,
  colorScheme = 'primary'
}) => {
  const colorClasses = useMemo(() => ({
    primary: 'text-blue-600 bg-blue-50 border-blue-200',
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    danger: 'text-red-600 bg-red-50 border-red-200',
    info: 'text-purple-600 bg-purple-50 border-purple-200'
  }), []);

  const trendIcon = useMemo(() => {
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '➡️';
  }, [trend]);

  return (
    <Card className={`${className} ${colorClasses[colorScheme]} transition-all duration-200 hover:shadow-md`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && trendValue !== undefined && (
              <div className="flex items-center mt-2 text-xs">
                <span className="mr-1">{trendIcon}</span>
                <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                  {trendValue}%
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="ml-4">
              <Icon className="h-8 w-8 opacity-80" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.description === nextProps.description &&
    prevProps.trend === nextProps.trend &&
    prevProps.trendValue === nextProps.trendValue &&
    prevProps.colorScheme === nextProps.colorScheme &&
    prevProps.className === nextProps.className
  );
});

OptimizedStatsCard.displayName = 'OptimizedStatsCard';

// Optimized Project Card with memo
interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    icon?: string;
    tasks?: any[];
    progress?: number;
  };
  workspace: { id: string };
  onNavigate?: (projectId: string) => void;
}

export const OptimizedProjectCard = memo<ProjectCardProps>(({
  project,
  workspace,
  onNavigate
}) => {
  const completedTasks = useMemo(() => {
    if (!project.tasks) return 0;
    return project.tasks.filter(task => task.status === 'done').length;
  }, [project.tasks]);

  const progressPercentage = useMemo(() => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    return Math.round((completedTasks / project.tasks.length) * 100);
  }, [completedTasks, project.tasks]);

  const handleClick = useCallback(() => {
    onNavigate?.(project.id);
  }, [onNavigate, project.id]);

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border-border/50"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-primary font-medium text-sm">
                {project.icon || project.name?.charAt(0)?.toUpperCase() || 'P'}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-sm">{project.name}</h3>
              <p className="text-xs text-muted-foreground">
                {project.tasks?.length || 0} tasks • {completedTasks} completed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium">{progressPercentage}%</div>
              <div className="w-16 bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for project object
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.name === nextProps.project.name &&
    prevProps.project.icon === nextProps.project.icon &&
    prevProps.project.progress === nextProps.project.progress &&
    JSON.stringify(prevProps.project.tasks) === JSON.stringify(nextProps.project.tasks) &&
    prevProps.workspace.id === nextProps.workspace.id
  );
});

OptimizedProjectCard.displayName = 'OptimizedProjectCard';

// Optimized Chart Component with memo and lazy loading
interface OptimizedChartProps {
  data: any[];
  chartType: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  height?: number;
  color?: string;
  onExport?: () => void;
  onChartTypeChange?: (type: 'bar' | 'line' | 'pie' | 'area') => void;
}

export const OptimizedChart = memo<OptimizedChartProps>(({
  data,
  chartType,
  title,
  height = 300,
  color = '#2563eb',
  onExport,
  onChartTypeChange
}) => {
  const chartTypes = useMemo(() => ['bar', 'line', 'pie', 'area'] as const, []);

  const handleExport = useCallback(() => {
    onExport?.();
  }, [onExport]);

  const handleChartTypeChange = useCallback((type: 'bar' | 'line' | 'pie' | 'area') => {
    onChartTypeChange?.(type);
  }, [onChartTypeChange]);

  // Simulate chart rendering - replace with actual chart library
  const chartElement = useMemo(() => {
    if (!data || data.length === 0) {
      return (
        <div 
          className="flex items-center justify-center bg-muted/30 rounded-lg"
          style={{ height }}
        >
          <p className="text-muted-foreground text-sm">No data available</p>
        </div>
      );
    }

    return (
      <div 
        className="flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border"
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-lg font-medium">{chartType.toUpperCase()} Chart</p>
          <p className="text-sm text-muted-foreground">{data.length} data points</p>
          <p className="text-xs text-muted-foreground mt-1">
            Mock chart - integrate with your preferred chart library
          </p>
        </div>
      </div>
    );
  }, [data, chartType, height]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <select
              value={chartType}
              onChange={(e) => handleChartTypeChange(e.target.value as any)}
              className="text-xs border rounded px-2 py-1"
            >
              {chartTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {onExport && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartElement}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.chartType === nextProps.chartType &&
    prevProps.title === nextProps.title &&
    prevProps.height === nextProps.height &&
    prevProps.color === nextProps.color &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});

OptimizedChart.displayName = 'OptimizedChart';

// Optimized Notification Item with memo
interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    priority: string;
    timestamp: string;
    isRead: boolean;
  };
  onMarkRead?: (id: string) => void;
}

export const OptimizedNotificationItem = memo<NotificationItemProps>(({
  notification,
  onMarkRead
}) => {
  const handleMarkRead = useCallback(() => {
    if (!notification.isRead) {
      onMarkRead?.(notification.id);
    }
  }, [notification.id, notification.isRead, onMarkRead]);

  const priorityColor = useMemo(() => {
    switch (notification.priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, [notification.priority]);

  const formattedDate = useMemo(() => {
    return new Date(notification.timestamp).toLocaleDateString();
  }, [notification.timestamp]);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
        notification.isRead ? 'bg-muted/30' : 'bg-blue-50 border-blue-200'
      }`}
      onClick={handleMarkRead}
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{notification.title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={`text-xs ${priorityColor}`}>
            {notification.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.isRead === nextProps.notification.isRead &&
    prevProps.notification.title === nextProps.notification.title &&
    prevProps.notification.message === nextProps.notification.message &&
    prevProps.notification.priority === nextProps.notification.priority &&
    prevProps.notification.timestamp === nextProps.notification.timestamp
  );
});

OptimizedNotificationItem.displayName = 'OptimizedNotificationItem';

// Lazy load heavy components for better code splitting
import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const LazyAnalyticsDashboard = lazy(() => import('@/components/analytics/analytics-dashboard'));
const LazyProjectAnalytics = lazy(() => import('@/components/analytics/project-analytics'));
const LazyKanbanBoard = lazy(() => import('@/components/kanban-board/kanban-board'));
const LazyTaskCalendar = lazy(() => import('@/components/task/task-calendar'));
const LazyNotificationCenter = lazy(() => import('@/components/shared/notifications/notification-center'));
const LazyFileUpload = lazy(() => import('@/components/file-upload/file-upload'));
const LazyMilestoneList = lazy(() => import('@/components/milestones/milestone-list'));

// Enhanced loading skeletons
const AnalyticsLoadingSkeleton = memo(() => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
));
AnalyticsLoadingSkeleton.displayName = 'AnalyticsLoadingSkeleton';

const KanbanLoadingSkeleton = memo(() => (
  <div className="space-y-4 animate-pulse">
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, columnIndex) => (
        <div key={columnIndex} className="min-w-80 space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <Card key={cardIndex}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
));
KanbanLoadingSkeleton.displayName = 'KanbanLoadingSkeleton';

const GenericLoadingSkeleton = memo(() => (
  <div className="space-y-4 animate-pulse">
    <Skeleton className="h-8 w-48" />
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  </div>
));
GenericLoadingSkeleton.displayName = 'GenericLoadingSkeleton';

// Higher-order component for optimized lazy loading
function withOptimizedLazyLoading<T extends Record<string, any>>(
  LazyComponent: React.ComponentType<T>,
  LoadingSkeleton: React.ComponentType = GenericLoadingSkeleton,
  displayName?: string
) {
  const OptimizedComponent = memo((props: T) => (
    <Suspense fallback={<LoadingSkeleton />}>
      <LazyComponent {...props} />
    </Suspense>
  ));
  
  OptimizedComponent.displayName = displayName || 'OptimizedLazyComponent';
  return OptimizedComponent;
}

// Optimized component exports with lazy loading
export const OptimizedAnalyticsDashboard = withOptimizedLazyLoading(
  LazyAnalyticsDashboard,
  AnalyticsLoadingSkeleton,
  'OptimizedAnalyticsDashboard'
);

export const OptimizedProjectAnalytics = withOptimizedLazyLoading(
  LazyProjectAnalytics,
  AnalyticsLoadingSkeleton,
  'OptimizedProjectAnalytics'
);

export const OptimizedKanbanBoard = withOptimizedLazyLoading(
  LazyKanbanBoard,
  KanbanLoadingSkeleton,
  'OptimizedKanbanBoard'
);

export const OptimizedTaskCalendar = withOptimizedLazyLoading(
  LazyTaskCalendar,
  GenericLoadingSkeleton,
  'OptimizedTaskCalendar'
);

export const OptimizedNotificationCenter = withOptimizedLazyLoading(
  LazyNotificationCenter,
  GenericLoadingSkeleton,
  'OptimizedNotificationCenter'
);

export const OptimizedFileUpload = withOptimizedLazyLoading(
  LazyFileUpload,
  GenericLoadingSkeleton,
  'OptimizedFileUpload'
);

export const OptimizedMilestoneList = withOptimizedLazyLoading(
  LazyMilestoneList,
  GenericLoadingSkeleton,
  'OptimizedMilestoneList'
);

// Preloading utilities for critical components
export const preloadAnalytics = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('@/components/analytics/analytics-dashboard');
      import('@/components/analytics/project-analytics');
    });
  } else {
    setTimeout(() => {
      import('@/components/analytics/analytics-dashboard');
      import('@/components/analytics/project-analytics');
    }, 100);
  }
};