import { Card, CardContent } from '@/components/ui/card'
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
    <Card className={cn('border-border', className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 sm:w-10 sm:h-10 rounded-lg shrink-0 ml-3',
              iconClassName || 'bg-primary/10'
            )}
          >
            <Icon className={cn('w-6 h-6 sm:w-5 sm:h-5', iconClassName ? 'text-current' : 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
