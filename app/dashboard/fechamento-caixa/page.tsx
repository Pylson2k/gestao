'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuotes } from '@/contexts/quotes-context'
import { useExpenses } from '@/contexts/expenses-context'
import { useCashClosings } from '@/contexts/cash-closings-context'
import { useCompany } from '@/contexts/company-context'
import { usePayments } from '@/contexts/payments-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Wallet, Calendar, DollarSign, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CashClosing, PeriodType } from '@/lib/types'

export default function FechamentoCaixaPage() {
  const { quotes } = useQuotes()
  const { expenses } = useExpenses()
  const { lastClosing, addClosing, refreshClosings } = useCashClosings()
  const { settings } = useCompany()
  const { getTotalPaidByQuoteId } = usePayments()
  
  const [periodType, setPeriodType] = useState<PeriodType>('mensal')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [observations, setObservations] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Calcular datas baseado no tipo de período
  const calculatePeriodDates = (type: PeriodType) => {
    const today = new Date()
    let start: Date
    let end: Date = new Date(today)

    if (type === 'semanal') {
      // Última segunda-feira ou início do período desde último fechamento
      const dayOfWeek = today.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      start = new Date(today)
      start.setDate(today.getDate() - daysToMonday)
      if (lastClosing && new Date(lastClosing.endDate) > start) {
        start = new Date(lastClosing.endDate)
        start.setDate(start.getDate() + 1) // Dia seguinte ao fechamento
      }
    } else if (type === 'quinzenal') {
      // Primeiro ou segundo dia do período de 15 dias
      const dayOfMonth = today.getDate()
      if (dayOfMonth <= 15) {
        start = new Date(today.getFullYear(), today.getMonth(), 1)
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), 16)
      }
      if (lastClosing && new Date(lastClosing.endDate) > start) {
        start = new Date(lastClosing.endDate)
        start.setDate(start.getDate() + 1)
      }
    } else { // mensal
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      if (lastClosing && new Date(lastClosing.endDate) > start) {
        start = new Date(lastClosing.endDate)
        start.setDate(start.getDate() + 1)
      }
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  // Atualizar datas quando o tipo de período mudar
  useEffect(() => {
    const dates = calculatePeriodDates(periodType)
    setStartDate(dates.start)
    setEndDate(dates.end)
  }, [periodType, lastClosing])

  // Calcular valores do período
  const periodData = useMemo(() => {
    if (!startDate || !endDate) return null

    const start = new Date(startDate)
    const end = new Date(endDate + 'T23:59:59')

    // Receita (serviços finalizados no período e totalmente pagos)
    const revenue = quotes
      .filter((quote) => {
        if (quote.status !== 'completed') return false
        const completionDate = quote.serviceCompletedAt 
          ? new Date(quote.serviceCompletedAt) 
          : new Date(quote.createdAt)
        if (completionDate < start || completionDate > end) return false
        
        // Verificar se o orçamento foi totalmente pago
        const totalPaid = getTotalPaidByQuoteId(quote.id)
        return totalPaid >= quote.total
      })
      .reduce((sum, quote) => sum + quote.total, 0)

    // Despesas no período (excluindo vales dos sócios)
    const expensesInPeriod = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= start && expenseDate <= end
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

    // Lucro líquido (receita - outras despesas, sem incluir vales)
    const profit = revenue - otherExpenses

    // Porcentagem do caixa da empresa (padrão 10%)
    const companyCashPercentage = settings.companyCashPercentage ?? 10
    const companyCashPercentageValue = Math.max(0, Math.min(50, companyCashPercentage)) // Limitar entre 0 e 50%

    // Calcular caixa da empresa
    const companyCash = profit * (companyCashPercentageValue / 100)

    // Lucro restante após desconto do caixa da empresa
    const remainingProfit = profit - companyCash

    // Dividir o lucro restante entre os sócios (50% cada)
    const baseGustavoProfit = remainingProfit / 2
    const baseGiovanniProfit = remainingProfit / 2

    // Descontar vales do lucro de cada sócio
    const gustavoProfit = baseGustavoProfit - gustavoVales
    const giovanniProfit = baseGiovanniProfit - giovanniVales

    return {
      revenue,
      totalExpenses,
      profit,
      companyCash,
      companyCashPercentage: companyCashPercentageValue,
      gustavoProfit,
      giovanniProfit,
    }
  }, [quotes, expenses, startDate, endDate, settings.companyCashPercentage, getTotalPaidByQuoteId])

  const handleClose = async () => {
    if (!periodData || !startDate || !endDate) {
      alert('Preencha todas as informações antes de fechar')
      return
    }

    if (!confirm(`Tem certeza que deseja fechar o caixa ${periodType}?\n\nPeríodo: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}\nLucro Total: ${periodData.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)) {
      return
    }

    setIsProcessing(true)
    try {
      await addClosing({
        periodType,
        startDate,
        endDate,
        totalProfit: periodData.profit,
        companyCash: periodData.companyCash,
        gustavoProfit: periodData.gustavoProfit,
        giovanniProfit: periodData.giovanniProfit,
        totalRevenue: periodData.revenue,
        totalExpenses: periodData.totalExpenses,
        observations: observations.trim() || null,
      })

      setIsDialogOpen(false)
      setObservations('')
      alert('Fechamento de caixa realizado com sucesso!')
    } catch (error: any) {
      alert(error.message || 'Erro ao realizar fechamento')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Fechamento de Caixa
          </h1>
          <p className="text-muted-foreground">
            Realize o fechamento de caixa semanal, quinzenal ou mensal
          </p>
        </div>
      </div>

      {/* Último Fechamento */}
      {lastClosing && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Último Fechamento</p>
                <p className="text-lg font-semibold text-foreground">
                  {lastClosing.periodType.charAt(0).toUpperCase() + lastClosing.periodType.slice(1)} - {new Date(lastClosing.endDate).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Período: {new Date(lastClosing.startDate).toLocaleDateString('pt-BR')} a {new Date(lastClosing.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Lucro Total</p>
                <p className="text-lg font-bold text-green-500">
                  {lastClosing.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuração do Fechamento */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Fechamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodType">Tipo de Período</Label>
              <Select
                value={periodType}
                onValueChange={(value) => setPeriodType(value as PeriodType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observations">Observações (opcional)</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações sobre este fechamento..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumo do Período */}
      {periodData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold text-green-500">
                    {periodData.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Despesas Total</p>
                  <p className="text-2xl font-bold text-red-500">
                    {periodData.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-border",
            periodData.profit >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Líquido Total</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    periodData.profit >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {periodData.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <DollarSign className={cn(
                  "w-8 h-8",
                  periodData.profit >= 0 ? "text-green-500" : "text-red-500"
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Caixa da Empresa</p>
                  <p className="text-2xl font-bold text-purple-500">
                    {periodData.companyCash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {periodData.companyCashPercentage}% do lucro
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Gustavo</p>
                    <p className={cn(
                      "text-xl font-bold",
                      periodData.gustavoProfit >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {periodData.gustavoProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Lucro Giovanni</p>
                      <p className={cn(
                        "text-xl font-bold",
                        periodData.giovanniProfit >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {periodData.giovanniProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botão de Fechar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <Button
              onClick={handleClose}
              disabled={!periodData || isProcessing}
              size="lg"
              className="min-w-[200px]"
            >
              {isProcessing ? 'Processando...' : 'Fechar Caixa'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
