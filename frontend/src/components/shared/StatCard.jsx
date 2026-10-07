import * as Icons from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({ label, value, change, trend, icon }) {
  const Icon = Icons[icon] || Icons.Activity

  return (
    <Card className="group hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p
              className={cn(
                'text-xs font-medium',
                trend === 'up' ? 'text-emerald-600' : 'text-sky-600',
              )}
            >
              {change}
            </p>
          </div>
          <div className="rounded-xl bg-accent p-2.5 text-accent-foreground transition-transform duration-200 group-hover:scale-105">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
