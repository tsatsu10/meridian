import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Dynamic imports for chart libraries - only load when needed
const AdvancedChartLibrary = lazy(() => import("@/components/dashboard/advanced-chart-library"));
const InteractiveChart = lazy(() => import("@/components/dashboard/interactive-chart"));

// Chart loading skeleton
const ChartSkeleton = ({ height = "h-64" }: { height?: string }) => (
  <div className={`${height} flex items-center justify-center`}>
    <div className="w-full max-w-md space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300" />
        <Skeleton className="h-6 w-16 bg-gradient-to-r from-gray-200 to-gray-300" />
      </div>
      <Skeleton className="h-48 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300" />
        <Skeleton className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300" />
        <Skeleton className="h-4 w-12 bg-gradient-to-r from-gray-200 to-gray-300" />
      </div>
    </div>
  </div>
);

interface LazyChartLoaderProps {
  type: 'advanced' | 'interactive';
  fallbackHeight?: string;
  [key: string]: any;
}

export default function LazyChartLoader({
  type,
  fallbackHeight = "h-64",
  ...props
}: LazyChartLoaderProps) {
  switch (type) {
    case 'advanced':
      return (
        <Suspense fallback={<ChartSkeleton height={fallbackHeight} />}>
          <AdvancedChartLibrary {...props} />
        </Suspense>
      );
    case 'interactive':
      return (
        <Suspense fallback={<ChartSkeleton height={fallbackHeight} />}>
          <InteractiveChart {...props} />
        </Suspense>
      );
    default:
      return <ChartSkeleton height={fallbackHeight} />;
  }
}

// Individual lazy chart components for specific use cases
export const LazyAdvancedChart = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <AdvancedChartLibrary {...props} />
  </Suspense>
);

export const LazyInteractiveChart = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <InteractiveChart {...props} />
  </Suspense>
);

// Pre-configured chart components with optimized loading
export const LazyProductivityChart = (props: any) => (
  <LazyChartLoader
    type="interactive"
    chartType="line"
    title="Productivity Trends"
    {...props}
  />
);

export const LazyTaskDistributionChart = (props: any) => (
  <LazyChartLoader
    type="advanced"
    chartType="pie"
    title="Task Distribution"
    {...props}
  />
);

export const LazyProjectHealthChart = (props: any) => (
  <LazyChartLoader
    type="interactive"
    chartType="bar"
    title="Project Health"
    {...props}
  />
);