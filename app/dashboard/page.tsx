'use client'

import Link from 'next/link'
import { useQuotes } from '@/contexts/quotes-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { QuoteCard } from '@/components/dashboard/quote-card'
import { calculateMonthlyRevenue } from '@/lib/utils'
import { Plus, DollarSign, FileText, CheckCircle, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { quotes } = useQuotes()

  const monthlyRevenue = calculateMonthlyRevenue(quotes)
  const totalQuotes = quotes.length
  const approvedQuotes = quotes.filter((q) => q.status === 'approved').length
  const pendingQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'draft').length

  const recentQuotes = quotes.slice(0, 5)

  const formattedRevenue = monthlyRevenue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Ola, Usuario
          </h1>
          <p className="text-muted-foreground">Gerencie seus orcamentos e acompanhe seu faturamento</p>
        </div>
        <Link href="/dashboard/novo-orcamento">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Orcamento
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Faturamento do Mes"
          value={formattedRevenue}
          icon={DollarSign}
          description="Servicos finalizados"
          iconClassName="bg-accent/10 text-accent"
        />
        <StatsCard
          title="Total de Orcamentos"
          value={totalQuotes}
          icon={FileText}
          description="Todos os orcamentos"
        />
        <StatsCard
          title="Aprovados"
          value={approvedQuotes}
          icon={CheckCircle}
          description="Orcamentos confirmados"
          iconClassName="bg-accent/10 text-accent"
        />
        <StatsCard
          title="Pendentes"
          value={pendingQuotes}
          icon={Clock}
          description="Aguardando resposta"
          iconClassName="bg-chart-4/10 text-chart-4"
        />
      </div>

      {/* Recent Quotes */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Orcamentos Recentes</CardTitle>
          <Link href="/dashboard/historico">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Ver todos
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentQuotes.length > 0 ? (
            recentQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} />)
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum orcamento criado ainda</p>
              <Link href="/dashboard/novo-orcamento">
                <Button variant="link" className="mt-2">
                  Criar primeiro orcamento
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
