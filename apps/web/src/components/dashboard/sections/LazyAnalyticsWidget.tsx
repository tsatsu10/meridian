import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Dynamic imports for analytics widgets
const AdvancedVisualizations = lazy(() => import("@/components/analytics/AdvancedVisualizations"));
const InsightCards = lazy(() => import("@/components/analytics/InsightCards").then(module => ({ default: module.InsightCards })));
const ReportGenerator = lazy(() => import("@/components/analytics/ReportGenerator").then(module => ({ default: module.ReportGenerator })));
const ProjectAnalytics = lazy(() => import("@/components/analytics/project-analytics").then(module => ({ default: module.ProjectAnalytics })));
const VisualizationPreview = lazy(() => import("@/components/analytics/visualization-preview").then(module => ({ default: module.VisualizationPreview })));

// Loading skeleton for analytics widgets
const AnalyticsWidgetSkeleton = () => (
  <Card className="glass-card animate-pulse">
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 bg-gradient-to-r from-blue-200 to-blue-300" />
          <Skeleton className="h-8 w-20 bg-gradient-to-r from-blue-200 to-blue-300" />
        </div>
        <Skeleton className="h-48 w-full bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg" />
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-16 bg-gradient-to-r from-blue-200 to-blue-300" />
          <Skeleton className="h-6 w-16 bg-gradient-to-r from-blue-200 to-blue-300" />
          <Skeleton className="h-6 w-16 bg-gradient-to-r from-blue-200 to-blue-300" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface LazyAnalyticsWidgetProps {
  type: 'advanced' | 'insights' | 'reports' | 'project' | 'visualization';
  workspaceId?: string;
  projectId?: string;
  data?: any;
  variant?: string;
  chartType?: string;
  showMetrics?: boolean;
  title?: string;
  className?: string;
}

export default function LazyAnalyticsWidget({
  type,
  workspaceId,
  projectId,
  data,
  variant,
  chartType,
  showMetrics,
  title,
  className
}: LazyAnalyticsWidgetProps) {
  const renderWidget = () => {
    switch (type) {
      case 'advanced':
        return (
          <Suspense fallback={<AnalyticsWidgetSkeleton />}>
            <AdvancedVisualizations
              workspaceId={workspaceId || ''}
              className={className}
            />
          </Suspense>
        );
      case 'insights':
        return (
          <Suspense fallback={<AnalyticsWidgetSkeleton />}>
            <InsightCards
              workspaceId={workspaceId || ''}
              className={className}
            />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<AnalyticsWidgetSkeleton />}>
            <ReportGenerator />
          </Suspense>
        );
      case 'project':
        return (
          <Suspense fallback={<AnalyticsWidgetSkeleton />}>
            <ProjectAnalytics
              projectId={projectId || workspaceId || ''}
            />
          </Suspense>
        );
      case 'visualization':
        return (
          <Suspense fallback={<AnalyticsWidgetSkeleton />}>
            <VisualizationPreview
              metrics={[{
                id: 'tasks-completed',
                name: 'Tasks Completed',
                category: 'productivity'
              }]}
              visualization={{
                id: chartType || 'bar',
                name: title || 'Chart Visualization',
                description: 'Analytics visualization'
              }}
              data={data}
              className={className}
            />
          </Suspense>
        );
      default:
        return <AnalyticsWidgetSkeleton />;
    }
  };

  return renderWidget();
}

// Export individual lazy components for direct use
export const LazyAdvancedVisualizations = () => (
  <Suspense fallback={<AnalyticsWidgetSkeleton />}>
    <AdvancedVisualizations />
  </Suspense>
);

export const LazyInsightCards = () => (
  <Suspense fallback={<AnalyticsWidgetSkeleton />}>
    <InsightCards />
  </Suspense>
);

export const LazyReportGenerator = () => (
  <Suspense fallback={<AnalyticsWidgetSkeleton />}>
    <ReportGenerator />
  </Suspense>
);

export const LazyProjectAnalytics = (props: any) => (
  <Suspense fallback={<AnalyticsWidgetSkeleton />}>
    <ProjectAnalytics {...props} />
  </Suspense>
);

export const LazyVisualizationPreview = (props: any) => (
  <Suspense fallback={<AnalyticsWidgetSkeleton />}>
    <VisualizationPreview {...props} />
  </Suspense>
);