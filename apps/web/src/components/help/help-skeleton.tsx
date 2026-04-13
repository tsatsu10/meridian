// @epic-3.5-communication: Loading skeletons for help content
// Provides smooth loading states while content is being fetched

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

interface HelpSkeletonProps {
  type?: "article" | "faq" | "video";
  count?: number;
  className?: string;
}

/**
 * Article Card Skeleton
 */
export function ArticleCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full hover:shadow-lg transition-shadow", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-3/4" /> {/* Title */}
          <Skeleton className="h-5 w-16" /> {/* Badge */}
        </div>
        <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
        <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20" /> {/* Tag 1 */}
          <Skeleton className="h-6 w-24" /> {/* Tag 2 */}
          <Skeleton className="h-6 w-16" /> {/* Tag 3 */}
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" /> {/* Read time */}
            <Skeleton className="h-4 w-16" /> {/* Rating */}
          </div>
          <Skeleton className="h-8 w-20" /> {/* Button */}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * FAQ Skeleton
 */
export function FAQSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-full" /> {/* Question line 1 */}
            <Skeleton className="h-5 w-3/4" /> {/* Question line 2 */}
          </div>
          <Skeleton className="h-6 w-6 rounded-full" /> {/* Expand icon */}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <Skeleton className="h-4 w-full" /> {/* Answer line 1 */}
        <Skeleton className="h-4 w-full" /> {/* Answer line 2 */}
        <Skeleton className="h-4 w-5/6" /> {/* Answer line 3 */}
        <div className="flex items-center gap-3 pt-3 mt-3 border-t">
          <Skeleton className="h-8 w-24" /> {/* Helpful button */}
          <Skeleton className="h-8 w-24" /> {/* Not helpful button */}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Video Tutorial Skeleton
 */
export function VideoCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-shadow", className)}>
      <Skeleton className="h-48 w-full rounded-t-lg" /> {/* Thumbnail */}
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-full" /> {/* Title */}
        <Skeleton className="h-4 w-5/6" /> {/* Description */}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" /> {/* Duration */}
          <Skeleton className="h-4 w-16" /> {/* Views */}
        </div>
        <Skeleton className="h-9 w-full mt-2" /> {/* Watch button */}
      </CardContent>
    </Card>
  );
}

/**
 * Article Detail Skeleton (for detail page)
 */
export function ArticleDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" /> {/* Title */}
        <Skeleton className="h-5 w-full" /> {/* Description line 1 */}
        <Skeleton className="h-5 w-5/6" /> {/* Description line 2 */}
        
        {/* Metadata */}
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-6 w-24" /> {/* Category badge */}
          <Skeleton className="h-6 w-20" /> {/* Difficulty */}
          <Skeleton className="h-6 w-16" /> {/* Read time */}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-18" />
          <Skeleton className="h-6 w-22" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 pt-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        
        <div className="py-4">
          <Skeleton className="h-8 w-48" /> {/* Heading */}
        </div>
        
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        
        <div className="py-4">
          <Skeleton className="h-32 w-full rounded-lg" /> {/* Code block */}
        </div>
        
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 pt-6 border-t">
        <Skeleton className="h-10 w-32" /> {/* Rating */}
        <Skeleton className="h-10 w-28" /> {/* Helpful */}
        <Skeleton className="h-10 w-28" /> {/* Not helpful */}
      </div>
    </div>
  );
}

/**
 * Main Help Skeleton Component
 * Renders multiple skeletons based on type and count
 */
export function HelpSkeleton({ type = "article", count = 3, className }: HelpSkeletonProps) {
  const skeletonArray = Array.from({ length: count }, (_, i) => i);

  if (type === "article") {
    return (
      <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
        {skeletonArray.map((i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
        {skeletonArray.map((i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (type === "faq") {
    return (
      <div className={cn("space-y-4", className)}>
        {skeletonArray.map((i) => (
          <FAQSkeleton key={i} />
        ))}
      </div>
    );
  }

  return null;
}

/**
 * Search Results Skeleton
 */
export function SearchResultsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-2/3" /> {/* Title */}
              <Skeleton className="h-5 w-16" /> {/* Type badge */}
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24" /> {/* Button */}
              <Skeleton className="h-4 w-32" /> {/* Metadata */}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Category Navigation Skeleton
 */
export function CategoryNavSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-32 rounded-full" />
      ))}
    </div>
  );
}

