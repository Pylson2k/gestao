'use client'

import { useMemo, useEffect } from 'react'
import Link from 'next/link'
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

  // Calcular despesas desde o último fechamento (excluindo vales dos sócios)
  const expensesSinceLastClosing = useMemo(() => {
    const expensesInPeriod = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= startDate
    })

    // Separar vales dos sócios
    const gustavoVales = expensesInPeriod
      .filter((expense) => expense.category === 'vale_gustavo')
      .reduce((sum, expense) => sum + expense.amount, 0)

    const giovanniVales = expensesInPeriod
      .filter((expense) => expense.category === 'vale_giovanni')
      .reduce((sum, expense) => sum + expense.amount, 0)

    // Outras despesas (sem vales)
    const otherExpenses = expensesInPeriod
      .filter((expense) => expense.category !== 'vale_gustavo' && expense.category !== 'vale_giovanni')
      .reduce((sum, expense) => sum + expense.amount, 0)

    return {
      total: otherExpenses + gustavoVales + giovanniVales,
      other: otherExpenses,
      gustavoVales,
      giovanniVales,
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

    // Lucro restante após desconto do caixa da empresa
    const remainingProfit = profit - companyCash

    // Dividir entre os sócios (50% cada)
    const baseGustavoProfit = remainingProfit / 2
    const baseGiovanniProfit = remainingProfit / 2

    // Descontar vales
    const gustavoProfit = baseGustavoProfit - expensesSinceLastClosing.gustavoVales
    const giovanniProfit = baseGiovanniProfit - expensesSinceLastClosing.giovanniVales

    return {
      profit,
      companyCash,
      companyCashPercentageValue,
      gustavoProfit,
      giovanniProfit,
    }
  }, [revenueSinceLastClosing, expensesSinceLastClosing, settings.companyCashPercentage])

  const profit = profitCalculations.profit
  const companyCash = profitCalculations.companyCash
  const companyCashPercentageValue = profitCalculations.companyCashPercentageValue
  const gustavoProfit = profitCalculations.gustavoProfit
  const giovanniProfit = profitCalculations.giovanniProfit

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

  // Inadimplência total (orçamentos com saldo devedor)
  const overdueDebtSummary = useMemo(() => {
    let totalDebt = 0
    let countQuotes = 0
    const now = new Date()
    quotes.forEach((q) => {
      if (q.status !== 'approved' && q.status !== 'in_progress' && q.status !== 'completed') return
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
        href: '/dashboard/historico?status=sent',
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
        href: '/dashboard/historico?status=approved',
        count: approvedNotStarted.length,
      })
    }

    // Pagamentos em atraso (inadimplência)
    if (overdueDebtSummary.countQuotes > 0) {
      actions.push({
        id: 'collect',
        type: 'collect',
        label: 'Cobrar clientes',
        sublabel: `${overdueDebtSummary.countQuotes} orçamento(s) com saldo devedor (${overdueDebtSummary.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header - saudação */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {greeting}, {userName}!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          Visão geral do negócio · O que fazer agora
        </p>
      </div>

      {/* Próximas Ações - o cérebro sugere o que fazer */}
      {nextActions.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListTodo className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Próximas ações</h2>
            </div>
            <ul className="space-y-3">
              {nextActions.map((action) => (
                <li key={action.id}>
                  <Link href={action.href}>
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 hover:bg-accent/30 hover:border-primary/30 transition-all group">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary">{action.label}</p>
                        {action.sublabel && (
                          <p className="text-sm text-muted-foreground mt-0.5">{action.sublabel}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {action.count != null && action.count > 0 && (
                          <span className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-primary/20 text-primary text-xs font-bold">
                            {action.count}
                          </span>
                        )}
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-white/80">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Hoje</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entradas</span>
                <span className="font-semibold text-green-600">
                  {todaySummary.revenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saídas</span>
                <span className="font-semibold text-red-600">
                  {todaySummary.expensesAmountToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between text-sm font-medium">
                <span>Saldo do dia</span>
                <span className={todaySummary.revenueToday - todaySummary.expensesAmountToday >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {(todaySummary.revenueToday - todaySummary.expensesAmountToday).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-white/80">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Últimos 7 dias</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receita</span>
                <span className="font-semibold text-green-600">
                  {weekSummary.revenueWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Despesas</span>
                <span className="font-semibold text-red-600">
                  {weekSummary.expensesAmountWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between text-sm font-medium">
                <span>Saldo da semana</span>
                <span className={weekSummary.revenueWeek - weekSummary.expensesAmountWeek >= 0 ? 'text-green-600' : 'text-red-600'}>
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
          <Card className="border-2 border-amber-300/60 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 shadow-md hover:shadow-lg hover:border-amber-400/60 transition-all cursor-pointer">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="p-3 rounded-xl bg-amber-500/20 shrink-0">
                  <AlertCircle className="w-6 h-6 sm:w-5 sm:h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-base sm:text-lg">
                    Inadimplência: {overdueDebtSummary.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {overdueDebtSummary.countQuotes} orçamento(s) com saldo devedor · Clique para cobrar
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-600 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Alertas - orçamentos enviados há 3+ dias sem resposta */}
      {overduePendingQuotes.length > 0 && (
        <Card className="border-2 border-orange-300/50 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/40 shadow-lg animate-pulse">
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="p-3 rounded-xl bg-orange-500/20 shrink-0">
                <AlertCircle className="w-6 h-6 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-base sm:text-lg mb-1">
                  {overduePendingQuotes.length} orçamento(s) pendente(s)
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  Orçamentos enviados há mais de 3 dias sem resposta
                </p>
              </div>
              <Link href="/dashboard/historico?status=sent" className="w-full sm:w-auto">
                <Button variant="outline" className="rounded-xl border-2 hover:bg-orange-50 w-full sm:w-auto min-h-[48px] text-base sm:text-sm touch-manipulation">
                  Ver Pendentes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Cards grandes para PWA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Link href="/dashboard/novo-orcamento">
          <Card className="border-blue-200/50 hover:border-blue-400/50 hover:shadow-xl transition-all duration-300 cursor-pointer h-full bg-gradient-to-br from-blue-50 via-white to-blue-50/30 group active:scale-95 sm:hover:-translate-y-1">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[140px] sm:min-h-[160px]">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-4 sm:mb-5 group-active:scale-95 sm:group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                <Plus className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                Novo Orçamento
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Criar um novo orçamento rapidamente
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/despesas">
          <Card className="border-red-200/50 hover:border-red-400/50 hover:shadow-xl transition-all duration-300 cursor-pointer h-full bg-gradient-to-br from-red-50 via-white to-red-50/30 group active:scale-95 sm:hover:-translate-y-1">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[140px] sm:min-h-[160px]">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mb-4 sm:mb-5 group-active:scale-95 sm:group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                <Receipt className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 group-hover:text-red-600 transition-colors">
                Adicionar Despesa
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Registrar uma nova despesa
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/relatorios-financeiros">
          <Card className="border-green-200/50 hover:border-green-400/50 hover:shadow-xl transition-all duration-300 cursor-pointer h-full bg-gradient-to-br from-green-50 via-white to-green-50/30 group active:scale-95 sm:hover:-translate-y-1">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[140px] sm:min-h-[160px]">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 mb-4 sm:mb-5 group-active:scale-95 sm:group-hover:scale-110 transition-transform shadow-lg shadow-green-500/30">
                <LayoutDashboard className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 group-hover:text-green-600 transition-colors">
                Ver Dashboard
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Acessar relatórios completos
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Lucro Líquido Total */}
        <Card className={cn(
          "border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
          profit >= 0 
            ? "border-green-200/50 bg-gradient-to-br from-green-50/80 via-white to-green-50/40" 
            : "border-red-200/50 bg-gradient-to-br from-red-50/80 via-white to-red-50/40"
        )}>
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-medium text-muted-foreground mb-2">Lucro Líquido Total</p>
                <p className={cn(
                  "text-2xl sm:text-3xl font-bold tracking-tight",
                  profit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formattedProfit}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                  {profit >= 0 ? '✓ Lucro' : '⚠ Prejuízo'}
                </p>
              </div>
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl shadow-lg shrink-0 ml-3",
                profit >= 0 
                  ? "bg-gradient-to-br from-green-500 to-green-600" 
                  : "bg-gradient-to-br from-red-500 to-red-600"
              )}>
                <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Lucro Líquido Giovanni */}
        <Card className={cn(
          "border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
          giovanniProfit >= 0 
            ? "border-indigo-200/50 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40" 
            : "border-red-200/50 bg-gradient-to-br from-red-50/80 via-white to-red-50/40"
        )}>
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-medium text-muted-foreground mb-2">Lucro Líquido - Giovanni</p>
                <p className={cn(
                  "text-2xl sm:text-3xl font-bold tracking-tight",
                  giovanniProfit >= 0 ? "text-indigo-600" : "text-red-600"
                )}>
                  {giovanniProfit.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                  Após caixa empresa e vales
                </p>
              </div>
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl shadow-lg shrink-0 ml-3",
                giovanniProfit >= 0 
                  ? "bg-gradient-to-br from-indigo-500 to-indigo-600" 
                  : "bg-gradient-to-br from-red-500 to-red-600"
              )}>
                <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Caixa da Empresa e Lucro Gustavo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Caixa da Empresa Acumulado */}
        <Card className="border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-medium text-muted-foreground mb-2">Caixa da Empresa</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-purple-600">
                  {totalCompanyCash.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                  Total acumulado dos fechamentos
                </p>
                {companyCash > 0 && (
                  <p className="text-xs text-purple-600 mt-1 font-semibold">
                    + {companyCash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} pendente ({companyCashPercentageValue}%)
                  </p>
                )}
              </div>
              <div className="p-3 sm:p-4 rounded-2xl shadow-lg shrink-0 ml-3 bg-gradient-to-br from-purple-500 to-purple-600">
                <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido Gustavo (atualizado) */}
        <Card className={cn(
          "border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
          gustavoProfit >= 0 
            ? "border-blue-200/50 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40" 
            : "border-red-200/50 bg-gradient-to-br from-red-50/80 via-white to-red-50/40"
        )}>
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-medium text-muted-foreground mb-2">Lucro Líquido - Gustavo</p>
                <p className={cn(
                  "text-2xl sm:text-3xl font-bold tracking-tight",
                  gustavoProfit >= 0 ? "text-blue-600" : "text-red-600"
                )}>
                  {gustavoProfit.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                  Após caixa empresa e vales
                </p>
              </div>
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl shadow-lg shrink-0 ml-3",
                gustavoProfit >= 0 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                  : "bg-gradient-to-br from-red-500 to-red-600"
              )}>
                <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Orçamentos Recentes</h2>
            <Link href="/dashboard/historico" className="w-full sm:w-auto">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-accent/50 w-full sm:w-auto min-h-[48px] text-base sm:text-sm touch-manipulation">
                Ver todos
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} />)
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground mb-4 font-medium">Nenhum orçamento criado ainda</p>
                <Link href="/dashboard/novo-orcamento">
                  <Button variant="outline" className="rounded-xl">
                    Criar primeiro orçamento
                  </Button>
                </Link>
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
