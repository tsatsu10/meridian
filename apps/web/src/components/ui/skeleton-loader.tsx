import { cn } from "@/lib/utils"

/**
 * Skeleton Loader Component
 * Provides visual feedback while content is loading
 * Better UX than spinners for content-heavy sections
 */

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200 dark:bg-slate-800",
        className
      )}
    />
  )
}

/**
 * Profile Card Skeleton
 * Used while profile data is loading
 */
export function ProfileCardSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

/**
 * Experience/Education Item Skeleton
 * Used while experience or education data is loading
 */
export function ExperienceItemSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  )
}

/**
 * Connection Item Skeleton
 * Used while connections are loading
 */
export function ConnectionItemSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  )
}

/**
 * Form Input Skeleton
 * Used while form is initializing
 */
export function FormInputSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

/**
 * Project Card Skeleton
 * Used while projects are loading
 */
export function ProjectCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-3 w-48" />
    </div>
  )
}

/**
 * Full Page Skeleton
 * Used while entire page is loading
 */
export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>

        {/* Tabs */}
        <Skeleton className="h-12 w-full rounded-lg" />

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <FormInputSkeleton key={i} />
                ))}
              </div>
            </div>
            <div className="rounded-lg border p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              {[...Array(2)].map((_, i) => (
                <ExperienceItemSkeleton key={i} />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-lg border p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              {[...Array(3)].map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

