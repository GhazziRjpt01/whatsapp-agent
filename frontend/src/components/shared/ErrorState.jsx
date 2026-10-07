import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorState({
  title = 'Couldn’t load data',
  description = 'Please try again.',
  onRetry,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100"
    >
      <AlertTriangle className="mb-3 h-6 w-6" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm opacity-80">{description}</p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
