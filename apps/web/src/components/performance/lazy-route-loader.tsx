import React, { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Enhanced loading skeletons for different route types
const RouteLoadingSkeleton = ({ type = 'default' }: { type?: 'dashboard' | 'settings' | 'chat' | 'analytics' | 'default' }) => {
  switch (type) {
    case 'dashboard':
      return (
        <div className="space-y-6 p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      );

    case 'settings':
      return (
        <div className="space-y-6 p-6 animate-pulse">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Card className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-32 w-full" />
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );

    case 'chat':
      return (
        <div className="flex h-screen animate-pulse">
          <div className="w-1/4 border-r bg-gray-50 dark:bg-gray-900 p-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="border-b p-4">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex-1 p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-64' : 'w-48'} rounded-lg`} />
                </div>
              ))}
            </div>
            <div className="border-t p-4">
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      );

    case 'analytics':
      return (
        <div className="space-y-6 p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64 animate-pulse">
          <div className="space-y-4 text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      );
  }
};

// Higher-order component for lazy loading routes with enhanced error boundaries
export function withLazyLoading<T extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingType: 'dashboard' | 'settings' | 'chat' | 'analytics' | 'default' = 'default',
  fallbackComponent?: ComponentType
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: T) {
    const LoadingComponent = fallbackComponent || 
      (() => <RouteLoadingSkeleton type={loadingType} />);

    return (
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Preloading utility for critical routes
export function preloadRoute(importFn: () => Promise<any>) {
  // Preload the component on idle or on interaction
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn());
  } else {
    setTimeout(() => importFn(), 100);
  }
}

// Route-specific lazy loaders
export const LazyDashboardRoute = (importFn: () => Promise<{ default: ComponentType<any> }>) =>
  withLazyLoading(importFn, 'dashboard');

export const LazySettingsRoute = (importFn: () => Promise<{ default: ComponentType<any> }>) =>
  withLazyLoading(importFn, 'settings');

export const LazyChatRoute = (importFn: () => Promise<{ default: ComponentType<any> }>) =>
  withLazyLoading(importFn, 'chat');

export const LazyAnalyticsRoute = (importFn: () => Promise<{ default: ComponentType<any> }>) =>
  withLazyLoading(importFn, 'analytics');

export default RouteLoadingSkeleton;