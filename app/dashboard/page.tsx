'use client'

import { useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useQuotes } from '@/contexts/quotes-context'
import { useExpenses } from '@/contexts/expenses-context'
import { useAuth } from '@/contexts/auth-context'
import { useCashClosings } from '@/contexts/cash-closings-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { QuoteCard } from '@/components/dashboard/quote-card'
import { calculateMonthlyRevenue } from '@/lib/utils'
import { 
  Plus, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock, 
  Receipt,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { quotes } = useQuotes()
  const { expenses } = useExpenses()
  const { user } = useAuth()
  const { lastClosing } = useCashClosings()

  // Função para obter saudação baseada no horário
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      return 'Bom dia'
    } else if (hour >= 12 && hour < 18) {
      return 'Boa tarde'
    } else {
      return 'Boa noite'
    }
  }

  const greeting = getGreeting()
  const userName = user?.name || 'Usuário'

  // Data de início: último fechamento ou início do mês atual
  const startDate = useMemo(() => {
    if (lastClosing) {
      return new Date(lastClosing.endDate)
    }
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [lastClosing])

  // Calcular receita desde o último fechamento
  const revenueSinceLastClosing = useMemo(() => {
    return quotes
      .filter((quote) => {
        if (quote.status !== 'completed') return false
        const completionDate = quote.serviceCompletedAt 
          ? new Date(quote.serviceCompletedAt) 
          : new Date(quote.createdAt)
        return completionDate >= startDate
      })
      .reduce((sum, quote) => sum + quote.total, 0)
  }, [quotes, startDate])

  // Calcular despesas desde o último fechamento
  const expensesSinceLastClosing = useMemo(() => {
    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date)
        return expenseDate >= startDate
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses, startDate])

  const monthlyProfit = revenueSinceLastClosing - expensesSinceLastClosing

  // Manter cálculos mensais para os cards de estatísticas
  const monthlyRevenue = calculateMonthlyRevenue(quotes)
  const totalQuotes = quotes.length
  const approvedQuotes = quotes.filter((q) => q.status === 'approved').length
  const draftOrSentQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'draft').length
  
  // Calcular despesas do mês
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthlyExpenses = expenses
    .filter((expense) => {
      const expenseDate = new Date(expense.date)
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, expense) => sum + expense.amount, 0)

  const recentQuotes = quotes.slice(0, 5)

  // Orçamentos pendentes (enviados há mais de 3 dias)
  const overduePendingQuotes = useMemo(() => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    return quotes.filter(q => {
      if (q.status !== 'sent') return false
      const sentDate = new Date(q.createdAt)
      return sentDate < threeDaysAgo
    })
  }, [quotes])

  const formattedRevenue = monthlyRevenue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const formattedExpenses = monthlyExpenses.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const formattedProfit = monthlyProfit.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {overduePendingQuotes.length > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {overduePendingQuotes.length} orçamento(s) pendente(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  Orçamentos enviados há mais de 3 dias sem resposta
                </p>
              </div>
              <Link href="/dashboard/historico?status=sent">
                <Button variant="outline" size="sm">
                  Ver Pendentes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Cards grandes para PWA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/novo-orcamento">
          <Card className="border-border hover:shadow-lg transition-all cursor-pointer h-full bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
              <div className="p-4 rounded-full bg-blue-500/20 mb-4">
                <Plus className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Novo Orçamento
              </h3>
              <p className="text-sm text-muted-foreground">
                Criar um novo orçamento rapidamente
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/despesas">
          <Card className="border-border hover:shadow-lg transition-all cursor-pointer h-full bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
              <div className="p-4 rounded-full bg-red-500/20 mb-4">
                <Receipt className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Adicionar Despesa
              </h3>
              <p className="text-sm text-muted-foreground">
                Registrar uma nova despesa
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/relatorios-financeiros">
          <Card className="border-border hover:shadow-lg transition-all cursor-pointer h-full bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
              <div className="p-4 rounded-full bg-green-500/20 mb-4">
                <LayoutDashboard className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ver Dashboard
              </h3>
              <p className="text-sm text-muted-foreground">
                Acessar relatórios completos
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground">Gerencie seus orçamentos e acompanhe seu faturamento</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Faturamento do Mês"
          value={formattedRevenue}
          icon={TrendingUp}
          description="Serviços finalizados"
          iconClassName="bg-green-500/10 text-green-500"
        />
        <StatsCard
          title="Despesas do Mês"
          value={formattedExpenses}
          icon={TrendingDown}
          description="Total de despesas"
          iconClassName="bg-red-500/10 text-red-500"
        />
        <StatsCard
          title="Total de Orçamentos"
          value={totalQuotes}
          icon={FileText}
          description="Todos os orçamentos"
        />
        <StatsCard
          title="Aprovados"
          value={approvedQuotes}
          icon={CheckCircle}
          description="Orçamentos confirmados"
          iconClassName="bg-accent/10 text-accent"
        />
      </div>

      {/* Lucro Líquido Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lucro Líquido Total */}
        <Card className={cn(
          "border-border",
          monthlyProfit >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lucro Líquido Total</p>
                <p className={cn(
                  "text-3xl font-bold",
                  monthlyProfit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formattedProfit}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {monthlyProfit >= 0 ? 'Lucro' : 'Prejuízo'}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg",
                monthlyProfit >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                <DollarSign className={cn(
                  "w-8 h-8",
                  monthlyProfit >= 0 ? "text-green-500" : "text-red-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido Gustavo */}
        <Card className={cn(
          "border-border",
          monthlyProfit >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lucro Líquido - Gustavo</p>
                <p className={cn(
                  "text-3xl font-bold",
                  monthlyProfit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {(monthlyProfit / 2).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% do lucro líquido
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg",
                monthlyProfit >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                <DollarSign className={cn(
                  "w-8 h-8",
                  monthlyProfit >= 0 ? "text-green-500" : "text-red-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido Giovanni */}
        <Card className={cn(
          "border-border",
          monthlyProfit >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lucro Líquido - Giovanni</p>
                <p className={cn(
                  "text-3xl font-bold",
                  monthlyProfit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {(monthlyProfit / 2).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  50% do lucro líquido
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg",
                monthlyProfit >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                <DollarSign className={cn(
                  "w-8 h-8",
                  monthlyProfit >= 0 ? "text-green-500" : "text-red-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Orçamentos Recentes</h2>
            <Link href="/dashboard/historico">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Ver todos
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} />)
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">Nenhum orçamento criado ainda</p>
                <Link href="/dashboard/novo-orcamento">
                  <Button variant="outline">
                    Criar primeiro orçamento
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
