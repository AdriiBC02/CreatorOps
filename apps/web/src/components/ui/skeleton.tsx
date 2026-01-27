'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted',
        className
      )}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('p-6 rounded-xl border bg-card', className)}>
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export function SkeletonList({ count = 5, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/50 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-b-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKanban({ columns = 4, cardsPerColumn = 3, className }: SkeletonProps & { columns?: number; cardsPerColumn?: number }) {
  return (
    <div className={cn('grid gap-6', className)} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="space-y-4">
          {/* Column header */}
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-1 h-6 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-5 w-8 rounded-full" />
          </div>
          {/* Cards */}
          <div className="space-y-3 p-3 rounded-xl bg-muted/30">
            {Array.from({ length: cardsPerColumn }).map((_, cardIndex) => (
              <div key={cardIndex} className="p-4 rounded-xl border bg-card">
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-3 w-full mb-2" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-14 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
