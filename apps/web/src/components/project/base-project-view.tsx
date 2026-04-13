import React, { useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  RefreshCw,
  Download,
  Settings,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import type { 
  BaseProjectViewComponent, 
  ViewConfiguration, 
  LoadingStates, 
  ErrorStates,
  ViewEventHandlers 
} from '@/types/project-view';
import { VIEW_CONFIGURATIONS } from '@/types/project-view';

// Standard header component for all views
interface ProjectViewHeaderProps {
  config: ViewConfiguration;
  viewState: any;
  onViewStateChange: (state: any) => void;
  loadingStates: LoadingStates;
  errorStates: ErrorStates;
  handlers: ViewEventHandlers;
  customActions?: React.ReactNode;
  showSearch?: boolean;
  showFilters?: boolean;
  showActions?: boolean;
}

const ProjectViewHeader: React.FC<ProjectViewHeaderProps> = ({
  config,
  viewState,
  onViewStateChange,
  loadingStates,
  errorStates,
  handlers,
  customActions,
  showSearch = true,
  showFilters = true,
  showActions = true
}) => {
  const handleSearchChange = useCallback((value: string) => {
    onViewStateChange({
      filters: { ...viewState.filters, search: value }
    });
  }, [viewState.filters, onViewStateChange]);

  const handleRefresh = useCallback(() => {
    if (errorStates.retryAction) {
      errorStates.retryAction();
    } else {
      window.location.reload();
    }
  }, [errorStates.retryAction]);

  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div className="flex items-center space-x-3">
        <config.icon />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        {errorStates.error && (
          <Badge variant="destructive" className="ml-2">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={viewState.filters?.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-64"
              disabled={loadingStates.isInitialLoading}
            />
          </div>
        )}

        {/* Custom Actions */}
        {customActions}

        {/* Standard Actions */}
        {showActions && (
          <div className="flex items-center space-x-2">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loadingStates.isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", loadingStates.isRefreshing && "animate-spin")} />
            </Button>

            {/* Create Button */}
            {config.supportedActions.includes('create') && (
              <Button size="sm" onClick={() => handlers.onTaskCreate({})}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            )}

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {config.supportedActions.includes('export') && (
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  View Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

// Standard loading skeleton for consistent loading states
const ProjectViewSkeleton: React.FC<{ config: ViewConfiguration }> = ({ config }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 bg-muted animate-pulse rounded" />
        <div>
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="flex space-x-2">
        <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        <div className="h-9 w-20 bg-muted animate-pulse rounded" />
        <div className="h-9 w-24 bg-muted animate-pulse rounded" />
      </div>
    </div>
    
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {Array.from({ length: config.view === 'board' ? 3 : 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Standard error component with recovery actions
const ProjectViewError: React.FC<{ 
  errorStates: ErrorStates; 
  config: ViewConfiguration;
}> = ({ errorStates, config }) => (
  <Card className="border-destructive">
    <CardHeader>
      <CardTitle className="text-destructive flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2" />
        Error Loading {config.title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          {errorStates.networkError 
            ? "Unable to connect to the server. Please check your internet connection."
            : errorStates.permissionError
            ? "You don't have permission to view this content."
            : errorStates.error?.message || "An unexpected error occurred."
          }
        </p>
        
        <div className="flex space-x-2">
          {errorStates.retryAction && (
            <Button onClick={errorStates.retryAction} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {errorStates.clearError && (
            <Button onClick={errorStates.clearError} variant="ghost">
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Base project view component that provides consistent structure
const BaseProjectView: React.FC<BaseProjectViewComponent & {
  children: (props: {
    config: ViewConfiguration;
    viewState: any;
    data: any;
    handlers: ViewEventHandlers;
    loadingStates: LoadingStates;
    errorStates: ErrorStates;
  }) => React.ReactNode;
}> = ({
  projectId,
  workspaceId,
  viewState,
  onViewStateChange,
  data,
  analytics,
  loadingStates,
  errorStates,
  permissions,
  handlers,
  className,
  showHeader = true,
  showToolbar = true,
  showFooter = true,
  customActions,
  children
}) => {
  // Get view configuration
  const config = useMemo(() => {
    // Extract view from current URL or viewState
    const currentView = viewState.activeView || 'overview';
    return VIEW_CONFIGURATIONS[currentView as keyof typeof VIEW_CONFIGURATIONS] || VIEW_CONFIGURATIONS.overview;
  }, [viewState]);

  // Error boundary effect
  useEffect(() => {
    if (errorStates.error) {
      console.error(`Error in ${config.title}:`, errorStates.error);
      
      // Auto-retry for network errors after 5 seconds
      if (errorStates.networkError && errorStates.retryAction) {
        const timeout = setTimeout(() => {
          errorStates.retryAction?.();
        }, 5000);
        
        return () => clearTimeout(timeout);
      }
    }
  }, [errorStates.error, errorStates.networkError, errorStates.retryAction, config.title]);

  // Loading state
  if (loadingStates.isInitialLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <ProjectViewSkeleton config={config} />
      </div>
    );
  }

  // Error state
  if (errorStates.error && !loadingStates.isRefreshing) {
    return (
      <div className={cn("space-y-6", className)}>
        <ProjectViewError errorStates={errorStates} config={config} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {showHeader && (
        <ProjectViewHeader
          config={config}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
          loadingStates={loadingStates}
          errorStates={errorStates}
          handlers={handlers}
          customActions={customActions}
        />
      )}

      {/* Main Content */}
      <div className="relative">
        {/* Refreshing Overlay */}
        {loadingStates.isRefreshing && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center space-x-2 bg-background/90 px-4 py-2 rounded-full shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Refreshing...</span>
            </div>
          </div>
        )}

        {/* Child Content */}
        {children({
          config,
          viewState,
          data,
          handlers,
          loadingStates,
          errorStates
        })}
      </div>

      {/* Footer with analytics */}
      {showFooter && analytics && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>{analytics.totalTasks} total tasks</span>
                <span>{analytics.completedTasks} completed</span>
                {analytics.overdueTasks > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {analytics.overdueTasks} overdue
                  </Badge>
                )}
              </div>
              <div className="text-xs">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BaseProjectView;
export { ProjectViewHeader, ProjectViewSkeleton, ProjectViewError };