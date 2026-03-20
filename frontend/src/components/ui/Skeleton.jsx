import { cn } from '@/utils/cn'

export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md', className)}
      {...props}
    />
  )
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-5 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-4 px-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 px-4 py-3 border-t border-gray-50">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className={cn('h-3 flex-1', col === 0 && 'w-40')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ className }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 p-5',
        className
      )}
    >
      <Skeleton className="h-4 w-32 mb-6" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function SkeletonMap({ className }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 overflow-hidden',
        className
      )}
    >
      <Skeleton className="w-full h-full min-h-[300px]" />
    </div>
  )
}
