"use client";

import React, { lazy, Suspense, useMemo } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load dock navigation for better performance
const DockNavigation = lazy(() => import("@/components/dashboard/dock-navigation"));

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
            <div key={i} className="flex items-center justify-between">
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

// Enhanced dock navigation skeleton with proper positioning
const DockNavigationSkeleton = () => (
  <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
    <div className="h-14 w-96 rounded-2xl bg-white/80 dark:bg-black/50 backdrop-blur-xl shadow-2xl border border-border/50 animate-pulse">
      <div className="flex items-center justify-center h-full space-x-3 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-300 to-gray-400" 
          />
        ))}
        <div className="w-px h-8 bg-border/50 mx-1" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton 
            key={`utility-${i}`} 
            className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-300 to-gray-400" 
          />
        ))}
      </div>
    </div>
  </div>
);

interface LazyDashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  showDockNavigation?: boolean;
  enablePerformanceMode?: boolean;
  loadingComponent?: "stats" | "chart" | "table" | "custom";
  customLoadingComponent?: React.ReactNode;
}

export default function LazyDashboardLayout({
  children,
  className,
  showDockNavigation = true,
  enablePerformanceMode = true,
  loadingComponent = "stats",
  customLoadingComponent,
}: LazyDashboardLayoutProps) {
  
  // Memoize layout configuration for performance
  const layoutConfig = useMemo(() => ({
    containerClass: cn(
      "min-h-screen relative",
      // Enhanced gradient backgrounds for better visual consistency
      "bg-gradient-to-br from-gray-50 via-white to-gray-100",
      "dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-800",
      "transition-all duration-300 ease-in-out",
      className
    ),
    contentClass: cn(
      "container mx-auto px-4 py-6",
      // Add appropriate bottom padding for dock navigation to prevent overlap
      showDockNavigation && "pb-32",
      // Ensure content doesn't go under the dock
      "relative z-10"
    ),
    dockAreaClass: cn(
      // Reserve space for dock navigation
      showDockNavigation && "h-20 w-full",
      // Ensure dock area is properly positioned
      "fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
    ),
    performanceOptimizations: enablePerformanceMode ? {
      willChange: "transform, opacity",
      contain: "layout style paint",
      transform: "translateZ(0)", // Force hardware acceleration
    } : {}
  }), [className, showDockNavigation, enablePerformanceMode]);

  // Memoized loading component selection
  const LoadingComponent = useMemo(() => {
    if (customLoadingComponent) return customLoadingComponent;
    
    switch (loadingComponent) {
      case "chart":
        return <ChartSkeleton />;
      case "table":
        return <TableSkeleton />;
      case "stats":
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
        <Suspense fallback={LoadingComponent}>
          {children}
        </Suspense>
      </div>

      {/* Dock Navigation Area - Fixed positioning with proper boundaries */}
      {showDockNavigation && (
        <div className={layoutConfig.dockAreaClass}>
          <Suspense fallback={<DockNavigationSkeleton />}>
            <DockNavigation />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// Export loading components for reuse
export {
  StatsCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  DockNavigationSkeleton,
}; 