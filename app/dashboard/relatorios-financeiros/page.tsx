'use client'

import { useState, useMemo } from 'react'
import { useQuotes } from '@/contexts/quotes-context'
import { useExpenses } from '@/contexts/expenses-context'
import { usePayments } from '@/contexts/payments-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RelatoriosFinanceirosPage() {
  const { quotes } = useQuotes()
  const { expenses } = useExpenses()
  const { getTotalPaidByQuoteId } = usePayments()
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // Primeiro dia do mês
    return date.toISOString().split('T')[0]
  })
  
  const [endDate, setEndDate] = useState(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })

  const [bankBalance, setBankBalance] = useState('')

  // Filtrar receitas (serviços finalizados e totalmente pagos) no período
  const revenue = useMemo(() => {
    return quotes
      .filter((quote) => {
        if (quote.status !== 'completed') return false
        
        const completionDate = quote.serviceCompletedAt 
          ? new Date(quote.serviceCompletedAt) 
          : new Date(quote.createdAt)
        
        if (
          completionDate < new Date(startDate) ||
          completionDate > new Date(endDate + 'T23:59:59')
        ) return false
        
        // Verificar se o orçamento foi totalmente pago
        const totalPaid = getTotalPaidByQuoteId(quote.id)
        return totalPaid >= quote.total
      })
      .reduce((sum, quote) => sum + quote.total, 0)
  }, [quotes, startDate, endDate, getTotalPaidByQuoteId])

  // Filtrar despesas no período (separar vales dos sócios)
  const expensesData = useMemo(() => {
    const expensesInPeriod = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return (
        expenseDate >= new Date(startDate) &&
        expenseDate <= new Date(endDate + 'T23:59:59')
      )
    })

    // Separar vales dos sócios das outras despesas
    const gustavoVales = expensesInPeriod
      .filter((expense) => expense.category === 'vale_gustavo')
      .reduce((sum, expense) => sum + expense.amount, 0)

    const giovanniVales = expensesInPeriod
      .filter((expense) => expense.category === 'vale_giovanni')
      .reduce((sum, expense) => sum + expense.amount, 0)

    // Outras despesas (excluindo vales dos sócios)
    const otherExpenses = expensesInPeriod
      .filter((expense) => expense.category !== 'vale_gustavo' && expense.category !== 'vale_giovanni')
      .reduce((sum, expense) => sum + expense.amount, 0)

    // Total de despesas (para exibição)
    const totalExpenses = otherExpenses + gustavoVales + giovanniVales

    return {
      total: totalExpenses,
      other: otherExpenses,
      gustavoVales,
      giovanniVales,
    }
  }, [expenses, startDate, endDate])

  // Lucro líquido (receita - outras despesas, sem vales dos sócios)
  const netProfit = revenue - expensesData.other

  // Despesas por categoria
  const expensesByCategory = useMemo(() => {
    const categoryLabels: Record<string, string> = {
      material: 'Material',
      combustivel: 'Combustível',
      almoco: 'Almoço',
      almoco_funcionario: 'Almoço para Funcionário',
      vale_funcionario: 'Vale para Funcionários',
      pagamento_funcionario: 'Pagamento de Funcionários',
      vale_gustavo: 'Vale Gustavo',
      vale_giovanni: 'Vale Giovanni',
    }

    const filtered = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return (
        expenseDate >= new Date(startDate) &&
        expenseDate <= new Date(endDate + 'T23:59:59')
      )
    })

    const grouped: Record<string, number> = {}
    filtered.forEach((expense) => {
      if (!grouped[expense.category]) {
        grouped[expense.category] = 0
      }
      grouped[expense.category] += expense.amount
    })

    return Object.entries(grouped).map(([category, total]) => ({
      category,
      label: categoryLabels[category] || category,
      total,
    })).sort((a, b) => b.total - a.total)
  }, [expenses, startDate, endDate])

  // Comparação com saldo do banco
  const bankBalanceNum = parseFloat(bankBalance) || 0
  const difference = bankBalanceNum - netProfit

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const resetToCurrentMonth = () => {
    const date = new Date()
    date.setDate(1)
    setStartDate(date.toISOString().split('T')[0])
    setEndDate(new Date().toISOString().split('T')[0])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">
            Controle completo das finanças da empresa
          </p>
        </div>
      </div>

      {/* Period Filter */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={resetToCurrentMonth} className="w-full">
                Mês Atual
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receita */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(revenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Serviços finalizados</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Despesas Total</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(expensesData.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">Todas as despesas</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido */}
        <Card className={cn(
          "border-border",
          netProfit >= 0 ? "border-green-500/20" : "border-red-500/20"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lucro Líquido</p>
                <p className={cn(
                  "text-2xl font-bold",
                  netProfit >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formatCurrency(netProfit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {netProfit >= 0 ? 'Lucro' : 'Prejuízo'}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg",
                netProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                <DollarSign className={cn(
                  "w-6 h-6",
                  netProfit >= 0 ? "text-green-500" : "text-red-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Balance Comparison */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Comparação com Saldo do Banco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Saldo do Banco (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Digite o saldo atual da conta bancária para comparar
            </p>
          </div>

          {bankBalanceNum > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lucro Líquido Calculado</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(netProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo do Banco</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(bankBalanceNum)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Diferença</p>
                <p className={cn(
                  "text-xl font-semibold",
                  difference >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formatCurrency(Math.abs(difference))}
                </p>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "mt-1",
                    difference >= 0 ? "border-green-500 text-green-500" : "border-red-500 text-red-500"
                  )}
                >
                  {difference >= 0 ? 'Saldo maior' : 'Saldo menor'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses by Category */}
      {expensesByCategory.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesByCategory.map(({ category, label, total }) => {
                const percentage = expensesData.total > 0 ? (total / expensesData.total) * 100 : 0
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(total)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Receita Total</span>
              <span className="font-semibold text-foreground">{formatCurrency(revenue)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Despesas Total</span>
              <span className="font-semibold text-red-500">-{formatCurrency(expensesData.total)}</span>
            </div>
            <div className="flex justify-between py-2 pt-4 border-t-2">
              <span className="font-semibold text-foreground">Lucro Líquido</span>
              <span className={cn(
                "font-bold text-xl",
                netProfit >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
