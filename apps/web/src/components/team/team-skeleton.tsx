import { Skeleton } from "@/components/ui/skeleton"

export function TeamCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      {/* Team header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Team description */}
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />

      {/* Team stats */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  )
}

export function TeamsListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <TeamCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function TeamMemberSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-1 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-16" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

export function TeamDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-20 rounded-t-md" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <TeamMemberSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}