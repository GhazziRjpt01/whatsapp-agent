import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, size = 20, label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
      <Loader2
        className={cn('animate-spin text-muted-foreground', className)}
        size={size}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
      {label && label !== 'Loading' ? (
        <span className="text-sm text-muted-foreground">{label}</span>
      ) : null}
    </div>
  )
}
