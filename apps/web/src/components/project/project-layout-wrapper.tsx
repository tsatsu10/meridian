import React, { Suspense, useMemo } from 'react';
import { Outlet, useParams } from '@tanstack/react-router';
import ProjectErrorBoundary from './project-error-boundary';
import BaseProjectView, { ProjectViewSkeleton } from './base-project-view';
import { PerformanceMonitor } from '@/hooks/use-optimized-project-data';
import useProjectStore from '@/store/project';
import { useProjectNavigation } from '@/hooks/use-project-navigation';
import { VIEW_CONFIGURATIONS } from '@/types/project-view';
import { toast } from '@/lib/toast';

// Layout wrapper that provides consistent structure for all project views
const ProjectLayoutWrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const params = useParams({ 
    from: '/dashboard/workspace/$workspaceId/project/$projectId/_layout' 
  });
  const { workspaceId, projectId } = params;
  
  const { activeView } = useProjectStore();
  const { applyUrlState } = useProjectNavigation(workspaceId, projectId);
  
  // Get current view configuration
  const viewConfig = useMemo(() => {
    return VIEW_CONFIGURATIONS[activeView] || VIEW_CONFIGURATIONS.overview;
  }, [activeView]);

  // Apply URL state on mount
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.toString()) {
      applyUrlState(searchParams);
    }
  }, [applyUrlState]);

  // Performance issue handler
  const handlePerformanceIssue = React.useCallback((metrics: any) => {
    if (metrics.memoryUsage.isCriticalMemory) {
      toast.warning('High memory usage detected', {
        description: 'Some features may be limited to improve performance.'
      });
    }
    
    if (metrics.renderPerformance.isSlowRendering) {
      console.warn('Slow rendering detected:', metrics);
    }
  }, []);

  return (
    <PerformanceMonitor onPerformanceIssue={handlePerformanceIssue}>
      <ProjectErrorBoundary
        projectId={projectId}
        workspaceId={workspaceId}
        view={activeView}
        onError={(error, errorInfo) => {
          // Log error for debugging
          console.error('Project view error:', { error, errorInfo });
          
          // Send to error tracking service in production
          if (process.env.NODE_ENV === 'production') {
            // errorTrackingService.captureException(error, { extra: errorInfo });
          }
        }}
      >
        <Suspense 
          fallback={<ProjectViewSkeleton config={viewConfig} />}
        >
          {children || <Outlet />}
        </Suspense>
      </ProjectErrorBoundary>
    </PerformanceMonitor>
  );
};

export default ProjectLayoutWrapper;