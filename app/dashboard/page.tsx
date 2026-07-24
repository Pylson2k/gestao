'use client'

import { useMemo, useEffect } from 'react'
import { Link } from '@/components/app-link'
import { useQuotes } from '@/contexts/quotes-context'
import { useExpenses } from '@/contexts/expenses-context'
import { useAuth } from '@/contexts/auth-context'
import { useCashClosings } from '@/contexts/cash-closings-context'
import { useCompany } from '@/contexts/company-context'
import { usePayments } from '@/contexts/payments-context'
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
  AlertCircle,
  Wallet,
  Calendar,
  ListTodo,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InstallPrompt } from '@/components/pwa/install-prompt'

export default function DashboardPage() {
  const { quotes } = useQuotes()
  const { expenses } = useExpenses()
  const { user } = useAuth()
  const { lastClosing, closings } = useCashClosings()
  const { settings } = useCompany()
  const { payments, getTotalPaidByQuoteId } = usePayments()

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

  // Calcular receita desde o último fechamento (apenas orçamentos totalmente pagos)
  const revenueSinceLastClosing = useMemo(() => {
    return quotes
      .filter((quote) => {
        if (quote.status !== 'completed') return false
        const completionDate = quote.serviceCompletedAt 
          ? new Date(quote.serviceCompletedAt) 
          : new Date(quote.createdAt)
        if (completionDate < startDate) return false
        
        // Verificar se o orçamento foi totalmente pago
        const totalPaid = payments
          .filter(p => p.quoteId === quote.id)
          .reduce((sum, p) => sum + p.amount, 0)
        return totalPaid >= quote.total
      })
      .reduce((sum, quote) => sum + quote.total, 0)
  }, [quotes, startDate, payments])

  // Despesas desde o último fechamento (vales do proprietário tratados à parte)
  const expensesSinceLastClosing = useMemo(() => {
    const expensesInPeriod = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= startDate
    })

    const ownerVales = expensesInPeriod
      .filter((expense) => expense.category === 'vale_gustavo')
      .reduce((sum, expense) => sum + expense.amount, 0)

    const otherExpenses = expensesInPeriod
      .filter((expense) => expense.category !== 'vale_gustavo')
      .reduce((sum, expense) => sum + expense.amount, 0)

    return {
      total: otherExpenses + ownerVales,
      other: otherExpenses,
      ownerVales,
    }
  }, [expenses, startDate])

  // Calcular todos os valores de lucro em um único useMemo para evitar recálculos
  const profitCalculations = useMemo(() => {
    // Lucro líquido (receita - outras despesas, sem vales)
    const profit = revenueSinceLastClosing - expensesSinceLastClosing.other

    // Porcentagem do caixa da empresa
    const companyCashPercentage = settings.companyCashPercentage ?? 10
    const companyCashPercentageValue = Math.max(0, Math.min(50, companyCashPercentage))

    // Calcular caixa da empresa em tempo real
    const companyCash = profit * (companyCashPercentageValue / 100)

    // Lucro restante após desconto do caixa da empresa (100% do proprietário)
    const remainingProfit = profit - companyCash
    const gustavoProfit = remainingProfit - expensesSinceLastClosing.ownerVales

    return {
      profit,
      companyCash,
      companyCashPercentageValue,
      gustavoProfit,
    }
  }, [revenueSinceLastClosing, expensesSinceLastClosing, settings.companyCashPercentage])

  const profit = profitCalculations.profit
  const companyCash = profitCalculations.companyCash
  const companyCashPercentageValue = profitCalculations.companyCashPercentageValue
  const gustavoProfit = profitCalculations.gustavoProfit

  // Caixa da empresa acumulado (de todos os fechamentos)
  const totalCompanyCash = useMemo(() => {
    return closings.reduce((sum, closing) => sum + (closing.companyCash || 0), 0)
  }, [closings])


  // Manter cálculos mensais para os cards de estatísticas (apenas orçamentos totalmente pagos)
  const monthlyRevenue = useMemo(() => {
    return calculateMonthlyRevenue(quotes, (quoteId: string) => {
      return payments
        .filter(p => p.quoteId === quoteId)
        .reduce((sum, p) => sum + p.amount, 0)
    })
  }, [quotes, payments])
  const totalQuotes = quotes.length
  const approvedQuotes = quotes.filter((q) => q.status === 'approved').length
  const draftOrSentQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'draft').length
  
  // Calcular despesas do mês
  const monthlyExpenses = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date)
        return (
          expenseDate.getMonth() === currentMonth &&
          expenseDate.getFullYear() === currentYear
        )
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses])

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

  // Inadimplência: só orçamentos na lista manual + saldo devedor
  const overdueDebtSummary = useMemo(() => {
    let totalDebt = 0
    let countQuotes = 0
    quotes.forEach((q) => {
      if (q.status !== 'approved' && q.status !== 'in_progress' && q.status !== 'completed') return
      if (!q.inDelinquencyList) return
      const paid = getTotalPaidByQuoteId(q.id)
      const debt = q.total - paid
      if (debt > 0) {
        totalDebt += debt
        countQuotes += 1
      }
    })
    return { totalDebt, countQuotes }
  }, [quotes, getTotalPaidByQuoteId])

  // Resumo do dia: entradas (pagamentos de hoje) e saídas (despesas de hoje)
  const todaySummary = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endToday = new Date(today)
    endToday.setHours(23, 59, 59, 999)
    const paymentsToday = payments.filter((p) => {
      const d = new Date(p.paymentDate)
      return d >= today && d <= endToday
    })
    const expensesToday = expenses.filter((e) => {
      const d = new Date(e.date)
      return d >= today && d <= endToday
    })
    const revenueToday = paymentsToday.reduce((s, p) => s + p.amount, 0)
    const expensesAmountToday = expensesToday.reduce((s, e) => s + e.amount, 0)
    return { revenueToday, expensesAmountToday, paymentsToday: paymentsToday.length, expensesToday: expensesToday.length }
  }, [payments, expenses])

  // Resumo da semana (últimos 7 dias)
  const weekSummary = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    const paymentsWeek = payments.filter((p) => {
      const d = new Date(p.paymentDate)
      return d >= start && d <= end
    })
    const expensesWeek = expenses.filter((e) => {
      const d = new Date(e.date)
      return d >= start && d <= end
    })
    const revenueWeek = paymentsWeek.reduce((s, p) => s + p.amount, 0)
    const expensesAmountWeek = expensesWeek.reduce((s, e) => s + e.amount, 0)
    return { revenueWeek, expensesAmountWeek }
  }, [payments, expenses])

  // Próximas ações (o que fazer agora)
  const nextActions = useMemo(() => {
    const actions: Array<{ id: string; type: 'remind' | 'start_service' | 'collect' | 'close_cash'; label: string; sublabel?: string; href: string; count?: number }> = []
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // Orçamentos enviados há 3+ dias sem resposta
    const sentLongAgo = quotes.filter((q) => q.status === 'sent' && new Date(q.createdAt) < threeDaysAgo)
    if (sentLongAgo.length > 0) {
      actions.push({
        id: 'remind',
        type: 'remind',
        label: 'Lembrar clientes',
        sublabel: `${sentLongAgo.length} orçamento(s) enviado(s) há mais de 3 dias sem resposta`,
        href: '/orcamentos/historico?status=sent',
        count: sentLongAgo.length,
      })
    }

    // Serviços aprovados não iniciados
    const approvedNotStarted = quotes.filter((q) => q.status === 'approved')
    if (approvedNotStarted.length > 0) {
      actions.push({
        id: 'start',
        type: 'start_service',
        label: 'Iniciar serviços',
        sublabel: `${approvedNotStarted.length} orçamento(s) aprovado(s) aguardando início`,
        href: '/orcamentos/historico?status=approved',
        count: approvedNotStarted.length,
      })
    }

    // Cobrança (lista de inadimplentes)
    if (overdueDebtSummary.countQuotes > 0) {
      actions.push({
        id: 'collect',
        type: 'collect',
        label: 'Cobrar clientes',
        sublabel: `${overdueDebtSummary.countQuotes} orçamento(s) na lista de inadimplentes (${overdueDebtSummary.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
        href: '/dashboard/inadimplentes',
        count: overdueDebtSummary.countQuotes,
      })
    }

    return actions
  }, [quotes, overdueDebtSummary])

  // Memoizar valores formatados para evitar recálculos
  const formattedRevenue = useMemo(() => {
    return monthlyRevenue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }, [monthlyRevenue])

  const formattedExpenses = useMemo(() => {
    return monthlyExpenses.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }, [monthlyExpenses])

  const formattedProfit = useMemo(() => {
    return profit.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }, [profit])

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Header - saudação */}
      <div className="text-balance">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          {greeting}, {userName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          Visão geral e próximos passos
        </p>
      </div>

      {/* Próximas Ações - o cérebro sugere o que fazer */}
      {nextActions.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-2">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Próximas ações</h2>
            </div>
            <ul className="space-y-2">
              {nextActions.map((action) => (
                <li key={action.id}>
                  <Link href={action.href}>
                    <div className="group flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 p-3 transition-colors hover:border-primary/25 hover:bg-muted/35">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground group-hover:text-primary">{action.label}</p>
                        {action.sublabel && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{action.sublabel}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {action.count != null && action.count > 0 && (
                          <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-semibold tabular-nums text-primary">
                            {action.count}
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resumo do dia e da semana */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Hoje</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entradas</span>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {todaySummary.revenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saídas</span>
                <span className="font-semibold tabular-nums text-destructive">
                  {todaySummary.expensesAmountToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between text-sm font-medium">
                <span>Saldo do dia</span>
                <span
                  className={
                    todaySummary.revenueToday - todaySummary.expensesAmountToday >= 0
                      ? 'font-medium tabular-nums text-emerald-700 dark:text-emerald-400'
                      : 'font-medium tabular-nums text-destructive'
                  }
                >
                  {(todaySummary.revenueToday - todaySummary.expensesAmountToday).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Últimos 7 dias</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receita</span>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {weekSummary.revenueWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Despesas</span>
                <span className="font-semibold tabular-nums text-destructive">
                  {weekSummary.expensesAmountWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between text-sm font-medium">
                <span>Saldo da semana</span>
                <span
                  className={
                    weekSummary.revenueWeek - weekSummary.expensesAmountWeek >= 0
                      ? 'font-medium tabular-nums text-emerald-700 dark:text-emerald-400'
                      : 'font-medium tabular-nums text-destructive'
                  }
                >
                  {(weekSummary.revenueWeek - weekSummary.expensesAmountWeek).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inadimplência em destaque */}
      {overdueDebtSummary.totalDebt > 0 && (
        <Link href="/dashboard/inadimplentes">
          <Card className="cursor-pointer border-l-4 border-l-amber-500 transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="shrink-0 rounded-lg bg-amber-500/15 p-3">
                  <AlertCircle className="h-6 w-6 text-amber-700 dark:text-amber-500 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground sm:text-lg">
                    Inadimplência: {overdueDebtSummary.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {overdueDebtSummary.countQuotes} orçamento(s) na sua lista de cobrança · Clique para gerenciar
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Alertas - orçamentos enviados há 3+ dias sem resposta */}
      {overduePendingQuotes.length > 0 && (
        <Card className="border-orange-200/80 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="shrink-0 rounded-lg bg-orange-500/15 p-3">
                <AlertCircle className="h-6 w-6 text-orange-700 dark:text-orange-400 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-base font-semibold text-foreground sm:text-lg">
                  {overduePendingQuotes.length} orçamento(s) pendente(s)
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  Orçamentos enviados há mais de 3 dias sem resposta
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-orange-200 hover:bg-orange-50/80 sm:w-auto dark:border-orange-900/50 dark:hover:bg-orange-950/30"
                asChild
              >
                <Link href="/orcamentos/historico?status=sent">Ver Pendentes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 sm:gap-4">
        <Link href="/orcamentos/novo" className="block h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex min-h-[132px] flex-col items-center justify-center px-5 py-6 text-center sm:min-h-[148px]">
              <div className="mb-3 rounded-lg bg-primary/10 p-3">
                <Plus className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-foreground sm:text-lg">Novo orçamento</h3>
              <p className="text-xs text-muted-foreground sm:text-sm">Criar proposta comercial</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro/despesas" className="block h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex min-h-[132px] flex-col items-center justify-center px-5 py-6 text-center sm:min-h-[148px]">
              <div className="mb-3 rounded-lg bg-destructive/10 p-3">
                <Receipt className="h-7 w-7 text-destructive sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-foreground sm:text-lg">Nova despesa</h3>
              <p className="text-xs text-muted-foreground sm:text-sm">Registrar saída</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/relatorios-financeiros" className="block h-full">
          <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex min-h-[132px] flex-col items-center justify-center px-5 py-6 text-center sm:min-h-[148px]">
              <div className="mb-3 rounded-lg bg-chart-2/15 p-3">
                <LayoutDashboard className="h-7 w-7 text-chart-2 sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-foreground sm:text-lg">Relatórios</h3>
              <p className="text-xs text-muted-foreground sm:text-sm">Análise financeira</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <StatsCard
          title="Faturamento do Mês"
          value={formattedRevenue}
          icon={TrendingUp}
          description="Serviços finalizados"
          iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        />
        <StatsCard
          title="Despesas do Mês"
          value={formattedExpenses}
          icon={TrendingDown}
          description="Total de despesas"
          iconClassName="bg-destructive/10 text-destructive"
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

       <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-5">
        <Card
          className={cn(
            'border-l-4 transition-shadow hover:shadow-sm',
            profit >= 0 ? 'border-l-emerald-600' : 'border-l-destructive'
          )}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-medium text-muted-foreground">Lucro líquido total</p>
                <p
                  className={cn(
                    'text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl',
                    profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
                  )}
                >
                  {formattedProfit}
                </p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                  {profit >= 0 ? 'Resultado positivo no período' : 'Resultado negativo no período'}
                </p>
              </div>
              <div
                className={cn(
                  'shrink-0 rounded-lg p-3',
                  profit >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'
                )}
              >
                <DollarSign className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'border-l-4 transition-shadow hover:shadow-sm',
            gustavoProfit >= 0 ? 'border-l-primary' : 'border-l-destructive'
          )}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-medium text-muted-foreground">Seu lucro (após caixa e vales)</p>
                <p
                  className={cn(
                    'text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl',
                    gustavoProfit >= 0 ? 'text-primary' : 'text-destructive'
                  )}
                >
                  {gustavoProfit.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">Desde o último fechamento de caixa</p>
              </div>
              <div
                className={cn(
                  'shrink-0 rounded-lg p-3',
                  gustavoProfit >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                )}
              >
                <DollarSign className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-chart-3 md:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-medium text-muted-foreground">Caixa da empresa</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
                  {totalCompanyCash.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">Total acumulado dos fechamentos</p>
                {companyCash > 0 && (
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    + {companyCash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} pendente (
                    {companyCashPercentageValue}%)
                  </p>
                )}
              </div>
              <div className="shrink-0 rounded-lg bg-chart-3/15 p-3 text-chart-3">
                <Wallet className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Orçamentos recentes</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/orcamentos/historico">Ver todos</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} />)
            ) : (
              <div className="py-12 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="mb-4 font-medium text-muted-foreground">Nenhum orçamento criado ainda</p>
                <Button variant="outline" asChild>
                  <Link href="/orcamentos/novo">Criar primeiro orçamento</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  )
}
