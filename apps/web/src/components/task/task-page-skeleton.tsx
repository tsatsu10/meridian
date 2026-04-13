// Task Page Loading Skeleton
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TaskPageSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Breadcrumb Skeleton */}
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-1" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-1" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-8 w-3/4 max-w-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Main Content Skeleton */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Tabs Skeleton */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-6 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-20 lg:hidden" />
                  <div className="hidden lg:flex items-center gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:gap-0 sm:flex">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full sm:w-24" />
                ))}
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Description Card */}
              <Card className="shadow-sm border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>

              {/* Dependencies Card */}
              <Card className="shadow-sm border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-6 w-40" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full rounded" />
                    <Skeleton className="h-20 w-full rounded" />
                  </div>
                </CardContent>
              </Card>

              {/* Comments Card */}
              <Card className="shadow-sm border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Skeleton */}
        <aside className="hidden lg:block w-96 border-l border-border bg-muted/20 p-6">
          <div className="space-y-6">
            {/* Task Info Skeleton */}
            <Card className="shadow-sm border bg-card">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Insights Skeleton */}
            <Card className="shadow-sm border bg-card">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-12 w-full rounded" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

