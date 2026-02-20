'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/components/app-link'
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
import { exportQuotesToCSV } from '@/lib/export-utils'
import {
  ArrowLeft,
  Search,
  Filter,
  FileText,
  ChevronRight,
  Calendar,
  Plus,
  Download,
} from 'lucide-react'

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary' },
  approved: { label: 'Aprovado', className: 'bg-accent/10 text-accent' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive' },
  in_progress: { label: 'Em Servico', className: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Finalizado', className: 'bg-green-500/10 text-green-500' },
  cancelled: { label: 'Cancelado', className: 'bg-orange-500/10 text-orange-500' },
}

const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled']

export default function HistoryPage() {
  const searchParams = useSearchParams()
  const { quotes } = useQuotes()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Suporte a link direto: /dashboard/historico?status=sent ou ?status=approved
  useEffect(() => {
    const status = searchParams.get('status')
    if (status && validStatuses.includes(status)) {
      setStatusFilter(status)
    }
  }, [searchParams])

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent/50 min-w-[48px] min-h-[48px] touch-manipulation">
              <ArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-1">Histórico de Orçamentos</h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium">{filteredQuotes.length} orçamento(s) encontrado(s)</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => exportQuotesToCSV(filteredQuotes)}
            disabled={filteredQuotes.length === 0}
            className="rounded-xl border-2 hover:bg-accent/50 min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto"
          >
            <Download className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Exportar CSV
          </Button>
          <Link href="/dashboard/novo-orcamento" className="w-full sm:w-auto">
            <Button className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <Filter className="w-5 h-5 sm:w-4 sm:h-4 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm sm:text-base">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cliente ou numero..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 sm:pl-9 bg-background min-h-[48px] text-base sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm sm:text-base">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" className="bg-background min-h-[48px] text-base sm:text-sm">
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
              <Label htmlFor="startDate" className="text-sm sm:text-base">Data Inicial</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 sm:pl-9 bg-background min-h-[48px] text-base sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm sm:text-base">Data Final</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10 sm:pl-9 bg-background min-h-[48px] text-base sm:text-sm"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" onClick={clearFilters} className="min-h-[48px] text-base sm:text-sm touch-manipulation">
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
      <Card className="border-border/50 bg-white/60 backdrop-blur-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 group active:scale-[0.98] touch-manipulation">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center justify-center w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                <FileText className="w-7 h-7 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="font-bold text-foreground text-base sm:text-lg group-hover:text-primary transition-colors">{quote.number}</h3>
                  <Badge variant="secondary" className={cn('text-xs font-semibold px-2.5 py-1 shrink-0', status.className)}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm sm:text-base font-semibold text-foreground truncate mb-1">{quote.client.name}</p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 sm:w-3 sm:h-3" />
                    {formattedDate}
                  </span>
                  <span>{quote.services.length} serviço(s)</span>
                  <span>{quote.materials.length} material(is)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <p className="text-xl sm:text-2xl font-bold text-primary mb-1">{formattedTotal}</p>
                {quote.discount > 0 && (
                  <p className="text-xs sm:text-sm text-destructive font-medium">
                    Desc: {quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                )}
              </div>
              <ChevronRight className="w-6 h-6 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
