"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function UserCardSkeleton() {
  return (
    <div className="w-full">
      <div className="relative w-full h-24">
        <Skeleton className="w-full h-full" />
      </div>

      <div className="px-4 pb-4 -mt-10">
        <div className="flex items-end justify-between">
          <Skeleton className="w-20 h-20 rounded-full border-4 border-background" />

          <div className="flex gap-2 mb-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="flex gap-4 mt-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
