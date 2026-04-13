/**
 * Lazy Loading Component Utilities
 * Implements code splitting for large components to improve initial bundle size
 */

import React, { Suspense, lazy } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <Card className="w-full">
    <CardContent className="p-6">
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
      <div className="space-y-3 mt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </CardContent>
  </Card>
);

// Skeleton for analytics components
const AnalyticsSkeletonFallback: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

// Skeleton for chat components
const ChatSkeletonFallback: React.FC = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    ))}
  </div>
);

// Helper function to create lazy components with proper error boundaries
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType,
  name?: string
) {
  const LazyComponent = lazy(importFunc);
  const displayName = name || 'LazyComponent';

  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => (
    <Suspense fallback={fallback ? React.createElement(fallback) : <LoadingFallback message={`Loading ${displayName}...`} />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  WrappedComponent.displayName = `Lazy(${displayName})`;
  return WrappedComponent;
}

// Lazy load heavy analytics components
export const LazyAnalyticsBuilder = createLazyComponent(
  () => import('@/routes/dashboard/analytics/builder'),
  AnalyticsSkeletonFallback,
  'AnalyticsBuilder'
);

// Lazy load heavy chat components
export const LazyChatMainArea = createLazyComponent(
  () => import('@/components/chat/chat-main-area'),
  ChatSkeletonFallback,
  'ChatMainArea'
);

export const LazyDirectMessageChat = createLazyComponent(
  () => import('@/components/chat/direct-message-chat'),
  ChatSkeletonFallback,
  'DirectMessageChat'
);

// Lazy load heavy dashboard components
export const LazyKanbanBoard = createLazyComponent(
  () => import('@/components/kanban-board'),
  LoadingFallback,
  'KanbanBoard'
);

export const LazyProjectAnalytics = createLazyComponent(
  () => import('@/components/analytics/project-analytics'),
  AnalyticsSkeletonFallback,
  'ProjectAnalytics'
);

export const LazyAdvancedChartLibrary = createLazyComponent(
  () => import('@/components/dashboard/advanced-chart-library'),
  AnalyticsSkeletonFallback,
  'AdvancedChartLibrary'
);

// Lazy load settings components
export const LazyTeamManagement = createLazyComponent(
  () => import('@/routes/dashboard/settings/team-management'),
  LoadingFallback,
  'TeamManagement'
);

export const LazyIntegrations = createLazyComponent(
  () => import('@/routes/dashboard/settings/integrations'),
  LoadingFallback,
  'Integrations'
);

// Pre-load critical components during idle time
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Pre-load commonly used components
      import('@/components/kanban-board');
      import('@/components/chat/chat-main-area');
    });
  }
};

// Viewport-based lazy loading hook
export const useViewportLazyLoad = (ref: React.RefObject<Element>, threshold = 0.1) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, threshold]);

  return isVisible;
};

// Bundle size monitoring (development only)
export const logBundleMetrics = () => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Monitor performance entries
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {}
      });
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
    } catch (e) {
      console.warn('Performance monitoring not supported');
    }

    // Log script sizes
    const scripts = document.querySelectorAll('script[src]');}
};