'use client'

import { Link } from '@/components/app-link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { label: 'Cadastro', href: '/getao/cadastro' },
  { label: 'Presença', href: '/getao/presenca' },
  { label: 'Vales', href: '/getao/vales' },
  { label: 'Fechamento', href: '/getao/fechamento' },
] as const

export function GetaoNav() {
  const pathname = usePathname()
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(`${it.href}/`)
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            {it.label}
          </Link>
        )
      })}
    </div>
  )
}
