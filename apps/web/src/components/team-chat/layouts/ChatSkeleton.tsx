// Chat Skeleton - Loading state component

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

/**
 * ChatSkeleton - Loading placeholder for chat interface
 * 
 * Displays while messages are being fetched.
 */
export function ChatSkeleton() {
  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header skeleton */}
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Messages skeleton */}
      <CardContent className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full max-w-md rounded-lg" />
            </div>
          </div>
        ))}
      </CardContent>

      <Separator />

      {/* Input skeleton */}
      <CardContent className="flex-shrink-0 p-4">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </CardContent>
    </Card>
  );
}

