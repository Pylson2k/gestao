'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Quote } from '@/lib/types'
import { FileText, ChevronRight } from 'lucide-react'

interface QuoteCardProps {
  quote: Quote
}

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary' },
  approved: { label: 'Aprovado', className: 'bg-accent/10 text-accent' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive' },
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const status = statusConfig[quote.status]
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')
  const formattedTotal = quote.total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
            <FileText className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate">{quote.number}</h3>
              <Badge variant="secondary" className={cn('text-xs', status.className)}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{quote.client.name}</p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-foreground">{formattedTotal}</p>
          </div>
          <Link href={`/dashboard/orcamento/${quote.id}`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
