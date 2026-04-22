import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  className?: string
  children?: ReactNode
  actions?: ReactNode
}

/**
 * Cabeçalho de página padrão: título, subtítulo e ações alinhados (mobile + desktop).
 */
export function PageHeader({ title, description, className, children, actions }: PageHeaderProps) {
  const rightSide = actions ?? children

  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
          {title}
        </h1>
        {description ? (
          <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {rightSide ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {rightSide}
        </div>
      ) : null}
    </div>
  )
}
