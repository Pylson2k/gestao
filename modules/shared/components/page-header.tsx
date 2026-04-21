'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description?: string
  /** Conteúdo à direita (ações primárias) */
  actions?: ReactNode
  className?: string
}

/**
 * Cabeçalho padrão de tela: título + descrição opcional + faixa de ações.
 * Padrão inspirado em dashboards densos (Stripe / Linear): uma linha de contexto, sem ruído.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
    </div>
  )
}
