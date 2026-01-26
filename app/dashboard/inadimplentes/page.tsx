'use client'

import { useState, useMemo } from 'react'
import { useClients } from '@/contexts/clients-context'
import { useQuotes } from '@/contexts/quotes-context'
import { usePayments } from '@/contexts/payments-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, DollarSign, UserCircle, Phone, Mail, FileText, Calendar, TrendingUp } from 'lucide-react'
import type { Client, Quote } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ClientDebtInfo {
  client: Client
  totalDebt: number
  quotesWithDebt: Array<{
    quote: Quote
    debt: number
    daysOverdue?: number
  }>
  totalQuotes: number
  oldestDebtDate?: Date
}

export default function InadimplentesPage() {
  const { clients, isLoading: clientsLoading } = useClients()
  const { quotes, isLoading: quotesLoading } = useQuotes()
  const { payments, getTotalPaidByQuoteId, isLoading: paymentsLoading } = usePayments()

  const [filterMinDebt, setFilterMinDebt] = useState('')
  const [filterDaysOverdue, setFilterDaysOverdue] = useState('')
  const [sortBy, setSortBy] = useState<'debt' | 'quotes' | 'oldest'>('debt')
  const [searchTerm, setSearchTerm] = useState('')

  const isLoading = clientsLoading || quotesLoading || paymentsLoading

  // Calcular inadimplência por cliente
  const clientsWithDebt = useMemo(() => {
    const debtMap = new Map<string, ClientDebtInfo>()

    clients.forEach((client) => {
      const clientQuotes = quotes.filter(
        (q) =>
          q.client.id === client.id &&
          (q.status === 'approved' ||
            q.status === 'in_progress' ||
            q.status === 'completed')
      )

      const quotesWithDebt: ClientDebtInfo['quotesWithDebt'] = []
      let totalDebt = 0
      let oldestDebtDate: Date | undefined

      clientQuotes.forEach((quote) => {
        const totalPaid = getTotalPaidByQuoteId(quote.id)
        const debt = quote.total - totalPaid

        if (debt > 0) {
          quotesWithDebt.push({
            quote,
            debt,
            daysOverdue: quote.serviceCompletedAt
              ? Math.floor(
                  (new Date().getTime() - new Date(quote.serviceCompletedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : undefined,
          })
          totalDebt += debt

          const debtDate = quote.serviceCompletedAt || quote.createdAt
          if (!oldestDebtDate || new Date(debtDate) < oldestDebtDate) {
            oldestDebtDate = new Date(debtDate)
          }
        }
      })

      if (totalDebt > 0) {
        debtMap.set(client.id, {
          client,
          totalDebt,
          quotesWithDebt,
          totalQuotes: clientQuotes.length,
          oldestDebtDate,
        })
      }
    })

    return Array.from(debtMap.values())
  }, [clients, quotes, payments, getTotalPaidByQuoteId])

  const filteredAndSorted = useMemo(() => {
    let filtered = clientsWithDebt

    if (filterMinDebt) {
      const minDebt = parseFloat(filterMinDebt)
      if (!isNaN(minDebt)) {
        filtered = filtered.filter((item) => item.totalDebt >= minDebt)
      }
    }

    if (filterDaysOverdue) {
      const days = parseInt(filterDaysOverdue)
      if (!isNaN(days)) {
        filtered = filtered.filter((item) => {
          const oldestQuote = item.quotesWithDebt.find((q) => q.daysOverdue !== undefined)
          return oldestQuote && (oldestQuote.daysOverdue || 0) >= days
        })
      }
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.client.name.toLowerCase().includes(searchLower) ||
          item.client.phone.toLowerCase().includes(searchLower) ||
          (item.client.email && item.client.email.toLowerCase().includes(searchLower))
      )
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'debt':
          return b.totalDebt - a.totalDebt
        case 'quotes':
          return b.quotesWithDebt.length - a.quotesWithDebt.length
        case 'oldest':
          if (!a.oldestDebtDate || !b.oldestDebtDate) return 0
          return a.oldestDebtDate.getTime() - b.oldestDebtDate.getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [clientsWithDebt, filterMinDebt, filterDaysOverdue, searchTerm, sortBy])

  const stats = useMemo(() => {
    const totalDebt = filteredAndSorted.reduce((sum, item) => sum + item.totalDebt, 0)
    const totalClients = filteredAndSorted.length
    const totalQuotes = filteredAndSorted.reduce(
      (sum, item) => sum + item.quotesWithDebt.length,
      0
    )
    const avgDebtPerClient = totalClients > 0 ? totalDebt / totalClients : 0

    return {
      totalDebt,
      totalClients,
      totalQuotes,
      avgDebtPerClient,
    }
  }, [filteredAndSorted])

  const getDebtSeverity = (debt: number, daysOverdue?: number) => {
    if (daysOverdue && daysOverdue > 90) return 'critical'
    if (daysOverdue && daysOverdue > 30) return 'high'
    if (debt > 5000) return 'high'
    if (debt > 1000) return 'medium'
    return 'low'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando inadimplentes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            Clientes Inadimplentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de clientes com saldo pendente
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-red-500/20 bg-gradient-to-br from-red-500/5 via-white to-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total em Atraso</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {stats.totalDebt.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes Inadimplentes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalClients}</p>
              </div>
              <UserCircle className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orçamentos Pendentes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalQuotes}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Média por Cliente</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.avgDebtPerClient.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar Cliente</Label>
              <Input
                id="search"
                placeholder="Nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minDebt">Valor Mínimo (R$)</Label>
              <Input
                id="minDebt"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={filterMinDebt}
                onChange={(e) => setFilterMinDebt(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="daysOverdue">Dias em Atraso</Label>
              <Input
                id="daysOverdue"
                type="number"
                min="0"
                placeholder="Ex: 30"
                value={filterDaysOverdue}
                onChange={(e) => setFilterDaysOverdue(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortBy">Ordenar por</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger id="sortBy" className="min-h-[48px] text-base sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debt">Maior Valor</SelectItem>
                  <SelectItem value="quotes">Mais Orçamentos</SelectItem>
                  <SelectItem value="oldest">Mais Antigo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes Inadimplentes */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Lista de Inadimplentes ({filteredAndSorted.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {clientsWithDebt.length === 0
                  ? 'Nenhum cliente inadimplente encontrado'
                  : 'Nenhum cliente encontrado com os filtros aplicados'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSorted.map((item) => {
                const oldestQuote = item.quotesWithDebt.find((q) => q.daysOverdue !== undefined)
                const severity = getDebtSeverity(
                  item.totalDebt,
                  oldestQuote?.daysOverdue
                )

                return (
                  <div
                    key={item.client.id}
                    className={cn(
                      'border rounded-lg p-4 hover:bg-muted/30 transition-colors',
                      getSeverityColor(severity)
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <UserCircle className="w-6 h-6 text-primary mt-1 shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{item.client.name}</h3>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                <span>{item.client.phone}</span>
                              </div>
                              {item.client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  <span>{item.client.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Total em Atraso</p>
                            <p className="text-xl font-bold text-red-600">
                              {item.totalDebt.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Orçamentos Pendentes
                            </p>
                            <p className="text-lg font-semibold">{item.quotesWithDebt.length}</p>
                          </div>
                          {oldestQuote?.daysOverdue !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Dias em Atraso</p>
                              <p className="text-lg font-semibold">{oldestQuote.daysOverdue} dias</p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Orçamentos com Saldo Pendente:
                          </p>
                          {item.quotesWithDebt.map(({ quote, debt, daysOverdue }) => (
                            <Link
                              key={quote.id}
                              href={`/dashboard/orcamento/${quote.id}`}
                              className="block p-3 rounded border hover:bg-accent transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-primary" />
                                    <span className="font-medium text-sm">{quote.number}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {quote.status === 'approved' && 'Aprovado'}
                                      {quote.status === 'in_progress' && 'Em Andamento'}
                                      {quote.status === 'completed' && 'Finalizado'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      {quote.serviceCompletedAt
                                        ? new Date(quote.serviceCompletedAt).toLocaleDateString(
                                            'pt-BR'
                                          )
                                        : new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                    {daysOverdue !== undefined && daysOverdue > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="text-orange-600 font-medium">
                                          {daysOverdue} dias em atraso
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm text-red-600">
                                    {debt.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    de{' '}
                                    {quote.total.toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
