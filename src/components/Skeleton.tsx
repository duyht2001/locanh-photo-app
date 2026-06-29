import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-shimmer bg-zinc-200 rounded-lg ${className}`} />
  );
}

export function SkeletonCard({ index = 0 }: { index?: number }) {
  // Generate deterministic height to simulate masonry heights and prevent hydration error
  const heights = ["h-64", "h-80", "h-72", "h-96", "h-60"];
  const deterministicHeight = heights[index % heights.length];
  
  return (
    <div className="break-inside-avoid mb-4 overflow-hidden rounded-lg border border-zinc-100 bg-white p-2">
      <Skeleton className={`${deterministicHeight} w-full`} />
      <div className="mt-3 flex items-center justify-between px-1">
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>
    </div>
  );
}
