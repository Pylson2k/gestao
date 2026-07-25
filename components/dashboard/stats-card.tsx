import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  className?: string
  iconClassName?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  iconClassName,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'surface-card group rounded-lg border border-border/80 bg-card p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {title}
          </p>
          <p className="font-display text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
            {value}
          </p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
            iconClassName || 'bg-primary/8 text-primary'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
