import { cn } from "@/lib/cn";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-10 bg-muted rounded w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-6 rounded-xl space-y-3">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-card p-6 rounded-xl space-y-4">
            <div className="h-6 bg-muted rounded w-40" />
            <div className="h-64 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card p-6 rounded-xl space-y-4">
        <div className="h-6 bg-muted rounded w-48" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="flex gap-3">
          <div className="h-10 bg-muted rounded w-24" />
          <div className="h-10 bg-muted rounded w-32" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded w-24" />
        ))}
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-8 w-8 bg-muted rounded-full" />
            </div>
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="flex justify-between">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TasksPageSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="flex gap-3">
          <div className="h-10 bg-muted rounded w-32" />
          <div className="h-10 bg-muted rounded w-24" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-4 rounded-lg space-y-2">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-lg">
        <div className="flex gap-3">
          <div className="h-10 bg-muted rounded flex-1" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded w-24" />
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-card p-4 rounded-lg flex items-center gap-4">
            <div className="h-5 w-5 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
            <div className="h-8 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-64" />
      <div className="glass-card p-6 rounded-xl space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className={cn("flex items-center justify-center min-h-[200px]", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-b-primary border-muted",
          sizeClasses[size]
        )}
      />
    </div>
  );
}

