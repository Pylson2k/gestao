'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuotes } from '@/contexts/quotes-context'
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
import { cn } from '@/lib/utils'
import type { Quote } from '@/lib/types'
import {
  ArrowLeft,
  Search,
  Filter,
  FileText,
  ChevronRight,
  Calendar,
  Plus,
} from 'lucide-react'

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary' },
  approved: { label: 'Aprovado', className: 'bg-accent/10 text-accent' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive' },
}

export default function HistoryPage() {
  const { quotes } = useQuotes()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        quote.client.name.toLowerCase().includes(searchLower) ||
        quote.number.toLowerCase().includes(searchLower)

      // Status filter
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter

      // Date filter
      const quoteDate = new Date(quote.createdAt)
      const matchesStartDate = !startDate || quoteDate >= new Date(startDate)
      const matchesEndDate = !endDate || quoteDate <= new Date(endDate + 'T23:59:59')

      return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate
    })
  }, [quotes, searchTerm, statusFilter, startDate, endDate])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || startDate || endDate

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Historico de Orcamentos</h1>
            <p className="text-muted-foreground">{filteredQuotes.length} orcamento(s) encontrado(s)</p>
          </div>
        </div>
        <Link href="/dashboard/novo-orcamento">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Orcamento
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cliente ou numero..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm">Data Inicial</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm">Data Final</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotes List */}
      <div className="space-y-3">
        {filteredQuotes.length > 0 ? (
          filteredQuotes.map((quote) => <QuoteListItem key={quote.id} quote={quote} />)
        ) : (
          <Card className="border-border">
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum orcamento encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? 'Tente ajustar os filtros para encontrar mais resultados.'
                    : 'Comece criando seu primeiro orcamento.'}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  <Link href="/dashboard/novo-orcamento">
                    <Button>Criar Orcamento</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function QuoteListItem({ quote }: { quote: Quote }) {
  const status = statusConfig[quote.status]
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')
  const formattedTotal = quote.total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <Link href={`/dashboard/orcamento/${quote.id}`}>
      <Card className="border-border hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary">
              <FileText className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{quote.number}</h3>
                <Badge variant="secondary" className={cn('text-xs', status.className)}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-foreground truncate">{quote.client.name}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>{formattedDate}</span>
                <span>{quote.services.length} servico(s)</span>
                <span>{quote.materials.length} material(is)</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{formattedTotal}</p>
              <p className="text-xs text-muted-foreground">
                {quote.discount > 0 && `Desc: ${quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
