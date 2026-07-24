'use client'

import { use } from 'react'
import { Link } from '@/components/app-link'
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
  const { getQuoteById, isLoading, error, refreshQuotes } = useQuotes()

  const quote = getQuoteById(id)

  if (isLoading && !quote) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando orçamento…</div>
      </div>
    )
  }

  if (error && !quote) {
    return (
      <div className="text-center py-12 space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Não foi possível carregar</h2>
        <p className="text-muted-foreground" role="alert">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => refreshQuotes()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Orçamento não encontrado</h2>
        <p className="text-muted-foreground mb-4">O orçamento solicitado não existe.</p>
        <Button asChild>
          <Link href="/orcamentos/historico">Voltar ao histórico</Link>
        </Button>
      </div>
    )
  }

  return <QuoteForm initialData={quote} />
}
