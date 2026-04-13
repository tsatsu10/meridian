import React, { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

// @epic-3.2-time: Mike needs efficient component loading for better performance
// @persona-mike: Developer wants optimized bundle sizes and faster page loads

interface LazyComponentProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
  preload?: boolean;
}

// Default loading skeleton
const DefaultSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-4 p-6", className)}>
    <Skeleton className="h-8 w-1/3" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// Error boundary component
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyComponent Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-center">
          <div className="text-red-600 mb-2">⚠️ Failed to load component</div>
          <div className="text-sm text-muted-foreground">
            {this.state.error?.message || 'Unknown error occurred'}
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main lazy component wrapper
export const LazyComponent: React.FC<LazyComponentProps> = ({
  fallback,
  errorFallback,
  className,
  children,
}) => {
  return (
    <LazyErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <DefaultSkeleton className={className} />}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
};

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: LazyLoadOptions = {}
) {
  const { fallback, errorBoundary = true, preload = false } = options;

  const LazyWrapper = React.forwardRef<any, P>((props, ref) => {
    // Preload component if requested
    React.useEffect(() => {
      if (preload) {
        // Component is already loaded since it's passed directly
        // This could be extended for dynamic imports
      }
    }, []);

    const content = <Component {...(props as P)} ref={ref} />;

    if (!errorBoundary) {
      return <Suspense fallback={fallback || <DefaultSkeleton />}>{content}</Suspense>;
    }

    return (
      <LazyComponent fallback={fallback}>
        {content}
      </LazyComponent>
    );
  });

  LazyWrapper.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return LazyWrapper;
}

// Utility for creating lazy-loaded route components
export function createLazyRoute<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
) {
  const LazyRouteComponent = lazy(importFn);
  
  return withLazyLoading(LazyRouteComponent, {
    fallback: <DefaultSkeleton />,
    ...options,
  });
}

// Specific skeletons for common components
export const SkeletonVariants = {
  // Task list skeleton
  TaskList: ({ count = 5 }: { count?: number }) => (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded">
          <Skeleton className="h-4 w-4" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      ))}
    </div>
  ),

  // Kanban board skeleton
  KanbanBoard: () => (
    <div className="flex gap-4 p-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 space-y-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="p-4 border rounded space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),

  // Analytics dashboard skeleton
  Analytics: () => (
    <div className="space-y-6 p-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      
      {/* Table */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  ),

  // Team page skeleton
  Teams: () => (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-6 border rounded space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex -space-x-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export default LazyComponent; 