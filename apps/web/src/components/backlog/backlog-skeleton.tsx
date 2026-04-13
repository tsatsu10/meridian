// Backlog Loading Skeleton
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function BacklogSkeleton() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* View Toggle Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-2 mt-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full ml-auto" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

