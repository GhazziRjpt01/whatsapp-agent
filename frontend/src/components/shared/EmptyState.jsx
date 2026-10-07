import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'Data will appear once it is available.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-accent p-3 text-accent-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
