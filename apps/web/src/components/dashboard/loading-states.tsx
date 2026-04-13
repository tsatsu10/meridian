/**
 * 💫 Enhanced Loading States
 * 
 * Comprehensive loading skeletons and indicators for dashboard components
 */

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Dashboard Stats Cards Loading
 */
export function DashboardStatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-32" />
            </div>
            {/* Trend indicator */}
            <div className="mt-2 flex items-center gap-1">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Project List Loading
 */
export function ProjectListLoading({ count = 6 }: { count?: number }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 border rounded-lg animate-pulse">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <Skeleton className="h-4 w-12 mb-1" />
                <Skeleton className="h-1.5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Milestone Dashboard Loading
 */
export function MilestoneDashboardLoading() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Progress Rings Loading (Gamification)
 */
export function ProgressRingsLoading() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="flex justify-center items-center py-8">
        <div className="relative">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Activity Feed Loading
 */
export function ActivityFeedLoading({ count = 5 }: { count?: number }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-3/4 mb-1" />
              <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Chart Loading
 */
export function ChartLoading({ height = 300 }: { height?: number }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="flex items-end justify-between gap-2 animate-pulse" 
          style={{ height: `${height}px` }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="w-full rounded-t" 
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stale Data Indicator
 * Shows when data is outdated and needs refresh
 */
export function StaleDataIndicator({ 
  lastUpdated, 
  threshold = 5 * 60 * 1000 // 5 minutes
}: { 
  lastUpdated: Date; 
  threshold?: number;
}) {
  const now = Date.now();
  const ageMs = now - lastUpdated.getTime();
  
  if (ageMs < threshold) return null;
  
  const minutesAgo = Math.floor(ageMs / 60000);
  const hoursAgo = Math.floor(minutesAgo / 60);
  
  const timeStr = hoursAgo > 0 
    ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`
    : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
      <RefreshCw className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <span className="text-xs text-yellow-800 dark:text-yellow-200">
        Data from {timeStr}
      </span>
    </div>
  );
}

/**
 * Loading Overlay
 * For showing loading state over existing content
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline Loading Spinner
 */
export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <RefreshCw className="h-4 w-4 animate-spin" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

/**
 * Progressive Loading
 * Shows loading progress for multi-step operations
 */
export function ProgressiveLoading({ 
  steps, 
  currentStep 
}: { 
  steps: string[]; 
  currentStep: number;
}) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      {steps.map((step, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        const isPending = i > currentStep;
        
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={cn(
                'flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium',
                isComplete && 'bg-green-500 text-white',
                isCurrent && 'bg-primary text-primary-foreground animate-pulse',
                isPending && 'bg-muted text-muted-foreground'
              )}
            >
              {isComplete ? '✓' : i + 1}
            </div>
            <span
              className={cn(
                'text-sm',
                isComplete && 'text-muted-foreground line-through',
                isCurrent && 'text-foreground font-medium',
                isPending && 'text-muted-foreground'
              )}
            >
              {step}
            </span>
            {isCurrent && (
              <RefreshCw className="h-3 w-3 animate-spin text-primary ml-auto" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Shimmer Loading Effect
 * Alternative to skeleton with shimmer animation
 */
export function ShimmerLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted rounded',
        'before:absolute before:inset-0',
        'before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        className
      )}
    />
  );
}

/**
 * Pulse Dots Loading
 * Simple dot animation for compact spaces
 */
export function PulseDotsLoading() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 bg-primary rounded-full animate-pulse"
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
}

/**
 * Full Page Loading
 * For initial page load
 */
export function FullPageLoading({ message = 'Loading Dashboard...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50/50 dark:bg-gradient-dark">
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary/50" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">This won't take long...</p>
        </div>
        <PulseDotsLoading />
      </div>
    </div>
  );
}

