import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-10 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full" />
      ))}
    </div>
  )
}

export function StateGate({
  loading,
  error,
  isEmpty,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  skeleton,
  children,
}) {
  if (loading) return skeleton || <TableSkeleton />
  if (error) {
    return (
      <ErrorState
        description={typeof error === 'string' ? error : error.message}
        onRetry={onRetry}
      />
    )
  }
  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    )
  }
  return children
}
