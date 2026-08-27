"use client";

import type React from "react";
import { Suspense, useMemo } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Enhanced loading skeletons for different component types
const StatsCardSkeleton = () => (
  <Card className="glass-card animate-pulse">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-20 bg-gradient-to-r from-gray-200 to-gray-300" />
          <Skeleton className="h-8 w-16 bg-gradient-to-r from-gray-200 to-gray-300" />
          <Skeleton className="h-3 w-32 bg-gradient-to-r from-gray-200 to-gray-300" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl bg-gradient-to-r from-gray-200 to-gray-300" />
      </div>
    </CardContent>
  </Card>
);

const ChartSkeleton = () => (
  <Card className="glass-card animate-pulse">
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300" />
          <Skeleton className="h-8 w-20 bg-gradient-to-r from-gray-200 to-gray-300" />
        </div>
        <Skeleton className="h-48 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
      </div>
    </CardContent>
  </Card>
);

const TableSkeleton = () => (
  <Card className="glass-card animate-pulse">
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 bg-gradient-to-r from-gray-200 to-gray-300" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders never reorder
              key={i}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 bg-gradient-to-r from-gray-200 to-gray-300" />
                  <Skeleton className="h-3 w-16 bg-gradient-to-r from-gray-200 to-gray-300" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 bg-gradient-to-r from-gray-200 to-gray-300" />
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface LazyDashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  enablePerformanceMode?: boolean;
  loadingComponent?: "stats" | "chart" | "table" | "custom";
  customLoadingComponent?: React.ReactNode;
}

export default function LazyDashboardLayout({
  children,
  className,
  enablePerformanceMode = true,
  loadingComponent = "stats",
  customLoadingComponent,
}: LazyDashboardLayoutProps) {
  // Memoize layout configuration for performance
  const layoutConfig = useMemo(
    () => ({
      containerClass: cn(
        "min-h-screen relative",
        // Enhanced gradient backgrounds for better visual consistency
        "bg-gradient-to-br from-gray-50 via-white to-gray-100",
        "dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-800",
        "transition-all duration-300 ease-in-out",
        className,
      ),
      contentClass: cn("container mx-auto px-4 py-6 relative z-10"),
      // Note: `transform` and `contain: layout/paint` both make this element a new
      // containing block for `position: fixed` descendants (CSS spec), so any fixed
      // element inside (toolbars, floating buttons) would anchor to this box instead
      // of the real viewport and could render off-screen. Kept to opacity only, which
      // doesn't have that side effect.
      performanceOptimizations: enablePerformanceMode
        ? {
            willChange: "opacity",
          }
        : {},
    }),
    [className, enablePerformanceMode],
  );

  // Memoized loading component selection
  const LoadingComponent = useMemo(() => {
    if (customLoadingComponent) return customLoadingComponent;

    switch (loadingComponent) {
      case "chart":
        return <ChartSkeleton />;
      case "table":
        return <TableSkeleton />;
      default:
        return <StatsCardSkeleton />;
    }
  }, [loadingComponent, customLoadingComponent]);

  return (
    <div
      className={layoutConfig.containerClass}
      style={layoutConfig.performanceOptimizations}
    >
      {/* Main Content Area */}
      <div className={layoutConfig.contentClass}>
        <Suspense fallback={LoadingComponent}>{children}</Suspense>
      </div>
    </div>
  );
}

// Export loading components for reuse
export { StatsCardSkeleton, ChartSkeleton, TableSkeleton };
