'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuotes } from '@/contexts/quotes-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuoteCard } from '@/components/dashboard/quote-card'
import { FileText, DollarSign, Calendar, CheckCircle } from 'lucide-react'
import type { Quote } from '@/lib/types'

const statusConfig = {
  completed: { label: 'Finalizado', className: 'bg-green-500/10 text-green-500' },
}

export default function FaturamentoPage() {
  const { quotes } = useQuotes()

  // Filtrar apenas orçamentos com status 'completed'
  const completedQuotes = useMemo(() => {
    return quotes.filter((quote) => quote.status === 'completed')
  }, [quotes])

  // Calcular total do faturamento
  const totalRevenue = useMemo(() => {
    return completedQuotes.reduce((sum, quote) => sum + quote.total, 0)
  }, [completedQuotes])

  // Agrupar por mês
  const quotesByMonth = useMemo(() => {
    const grouped: { [key: string]: Quote[] } = {}
    
    completedQuotes.forEach((quote) => {
      // Usar serviceCompletedAt se disponível, senão usar createdAt
      const date = quote.serviceCompletedAt 
        ? new Date(quote.serviceCompletedAt) 
        : new Date(quote.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(quote)
    })

    // Ordenar por mês (mais recente primeiro) e dentro de cada mês, ordenar por data de conclusão
    const entries = Object.entries(grouped).map(([key, quotes]) => {
      const sortedQuotes = quotes.sort((a, b) => {
        const dateA = a.serviceCompletedAt ? new Date(a.serviceCompletedAt) : new Date(a.createdAt)
        const dateB = b.serviceCompletedAt ? new Date(b.serviceCompletedAt) : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      return [key, sortedQuotes] as [string, Quote[]]
    })
    
    return entries.sort(([a], [b]) => b.localeCompare(a))
  }, [completedQuotes])

  const formattedTotal = totalRevenue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const formatMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const calculateMonthRevenue = (monthQuotes: Quote[]) => {
    return monthQuotes.reduce((sum, quote) => sum + quote.total, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
          <p className="text-muted-foreground">
            Servicos finalizados prontos para faturamento
          </p>
        </div>
      </div>

      {/* Total Revenue Card */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Faturado</p>
              <p className="text-3xl font-bold text-foreground">{formattedTotal}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes by Month */}
      {quotesByMonth.length > 0 ? (
        <div className="space-y-6">
          {quotesByMonth.map(([monthKey, monthQuotes]) => {
            const monthRevenue = calculateMonthRevenue(monthQuotes)
            const formattedMonthRevenue = monthRevenue.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })

            return (
              <Card key={monthKey} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg capitalize">
                      {formatMonthName(monthKey)}
                    </CardTitle>
                    <Badge variant="outline" className="ml-2">
                      {monthQuotes.length} {monthQuotes.length === 1 ? 'serviço' : 'serviços'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total do mês</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formattedMonthRevenue}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {monthQuotes.map((quote) => (
                    <QuoteCard key={quote.id} quote={quote} />
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum servico finalizado
              </h3>
              <p className="text-muted-foreground mb-4">
                Servicos finalizados aparecerao aqui automaticamente para faturamento.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">Voltar ao Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
