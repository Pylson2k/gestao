'use client'

import { use } from 'react'
import { AppLink as Link } from '@/components/app-link'
import { useQuotes } from '@/contexts/quotes-context'
import { QuoteForm } from '@/components/quote/quote-form'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

export default function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { getQuoteById } = useQuotes()

  const quote = getQuoteById(id)

  if (!quote) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Orcamento nao encontrado</h2>
        <p className="text-muted-foreground mb-4">O orcamento solicitado nao existe.</p>
        <Link href="/dashboard">
          <Button>Voltar ao Dashboard</Button>
        </Link>
      </div>
    )
  }

  return <QuoteForm initialData={quote} />
}
