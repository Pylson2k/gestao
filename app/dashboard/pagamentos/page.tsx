'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePayments } from '@/contexts/payments-context'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Trash2, Edit, DollarSign, Calendar, FileText, CreditCard } from 'lucide-react'
import type { Payment, PaymentMethod } from '@/lib/types'
import { cn } from '@/lib/utils'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência Bancária',
  boleto: 'Boleto',
}

const paymentMethodColors: Record<PaymentMethod, string> = {
  dinheiro: 'bg-green-500/10 text-green-500',
  pix: 'bg-blue-500/10 text-blue-500',
  cartao_credito: 'bg-purple-500/10 text-purple-500',
  cartao_debito: 'bg-indigo-500/10 text-indigo-500',
  transferencia: 'bg-cyan-500/10 text-cyan-500',
  boleto: 'bg-orange-500/10 text-orange-500',
}

export default function PagamentosPage() {
  const searchParams = useSearchParams()
  const { payments, addPayment, updatePayment, deletePayment, isLoading, refreshPayments, getTotalPaidByQuoteId } = usePayments()
  const { quotes } = useQuotes()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState({
    quoteId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '' as PaymentMethod | '',
    observations: '',
  })

  const [filterQuoteId, setFilterQuoteId] = useState<string>('all')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterMethod, setFilterMethod] = useState<string>('all')

  const hasOpenedFromUrl = useRef(false)
  // Suporte a link direto: /dashboard/pagamentos?quoteId=xxx ou ?quoteId=xxx&openDialog=1
  useEffect(() => {
    const quoteId = searchParams.get('quoteId')
    const openDialog = searchParams.get('openDialog') === '1'
    if (quoteId) {
      setFilterQuoteId(quoteId)
      if (openDialog && !hasOpenedFromUrl.current && quotes.length > 0) {
        const quote = quotes.find(q => q.id === quoteId)
        if (quote) {
          hasOpenedFromUrl.current = true
          const paid = getTotalPaidByQuoteId(quoteId)
          const remaining = Math.max(0, quote.total - paid)
          setFormData({
            quoteId,
            amount: remaining > 0 ? remaining.toFixed(2) : '',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: '' as PaymentMethod | '',
            observations: '',
          })
          setEditingPayment(null)
          setIsDialogOpen(true)
        }
      }
    }
  }, [searchParams, quotes, getTotalPaidByQuoteId])

  // Filtrar apenas orçamentos aprovados ou em progresso
  const availableQuotes = useMemo(() => {
    return quotes.filter(q => 
      q.status === 'approved' || 
      q.status === 'in_progress' || 
      q.status === 'completed'
    )
  }, [quotes])

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesQuote = filterQuoteId === 'all' || payment.quoteId === filterQuoteId
      
      const paymentDate = new Date(payment.paymentDate)
      const matchesStartDate = !filterStartDate || paymentDate >= new Date(filterStartDate)
      const matchesEndDate = !filterEndDate || paymentDate <= new Date(filterEndDate + 'T23:59:59')
      
      const matchesMethod = filterMethod === 'all' || payment.paymentMethod === filterMethod

      return matchesQuote && matchesStartDate && matchesEndDate && matchesMethod
    })
  }, [payments, filterQuoteId, filterStartDate, filterEndDate, filterMethod])

  const totalPayments = useMemo(() => {
    return filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  }, [filteredPayments])

  const handleOpenDialogForNew = () => {
    setEditingPayment(null)
    setFormData({
      quoteId: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '' as PaymentMethod | '',
      observations: '',
    })
    setIsDialogOpen(true)
  }

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment)
      setFormData({
        quoteId: payment.quoteId,
        amount: payment.amount.toString(),
        paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
        paymentMethod: payment.paymentMethod,
        observations: payment.observations || '',
      })
    } else {
      handleOpenDialogForNew()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingPayment(null)
    setFormData({
      quoteId: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '' as PaymentMethod | '',
      observations: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.quoteId || !formData.amount || !formData.paymentDate || !formData.paymentMethod) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('O valor deve ser maior que zero')
      return
    }

    // Verificar se o valor não excede o total do orçamento
    const quote = quotes.find(q => q.id === formData.quoteId)
    if (quote) {
      const totalPaid = payments
        .filter(p => p.quoteId === formData.quoteId && (!editingPayment || p.id !== editingPayment.id))
        .reduce((sum, p) => sum + p.amount, 0)
      const newTotalPaid = totalPaid + amount

      if (newTotalPaid > quote.total) {
        const remaining = quote.total - totalPaid
        alert(`Valor excede o total do orçamento. Total: R$ ${quote.total.toFixed(2)}\nJá pago: R$ ${totalPaid.toFixed(2)}\nRestante: R$ ${remaining.toFixed(2)}`)
        return
      }
    }

    try {
      if (editingPayment) {
        await updatePayment(editingPayment.id, {
          amount,
          paymentDate: new Date(formData.paymentDate),
          paymentMethod: formData.paymentMethod,
          observations: formData.observations || undefined,
        })
      } else {
        await addPayment({
          quoteId: formData.quoteId,
          amount,
          paymentDate: new Date(formData.paymentDate),
          paymentMethod: formData.paymentMethod,
          observations: formData.observations || undefined,
        })
        // Atualizar pagamentos para o orçamento específico
        await refreshPayments(formData.quoteId)
      }
      handleCloseDialog()
    } catch (error: any) {
      console.error('Error saving payment:', error)
      alert(error.message || 'Erro ao salvar pagamento')
    }
  }

  const handleDelete = async (payment: Payment) => {
    if (!confirm(`Tem certeza que deseja excluir este pagamento de R$ ${payment.amount.toFixed(2)}?`)) {
      return
    }

    try {
      await deletePayment(payment.id)
    } catch (error: any) {
      console.error('Error deleting payment:', error)
      alert(error.message || 'Erro ao excluir pagamento')
    }
  }

  const getQuoteByPayment = (payment: Payment) => {
    return quotes.find(q => q.id === payment.quoteId)
  }

  const getRemainingAmount = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (!quote) return 0
    const totalPaid = payments
      .filter(p => p.quoteId === quoteId)
      .reduce((sum, p) => sum + p.amount, 0)
    return quote.total - totalPaid
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando pagamentos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground mt-1">Gerencie entradas e pagamentos de clientes</p>
        </div>
        <Button
          onClick={handleOpenDialogForNew}
          className="bg-primary hover:bg-primary/90 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
          Novo Pagamento
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterQuote">Orçamento</Label>
              <Select value={filterQuoteId} onValueChange={setFilterQuoteId}>
                <SelectTrigger id="filterQuote" className="min-h-[48px] text-base sm:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableQuotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.number} - {quote.client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterMethod">Método</Label>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger id="filterMethod" className="min-h-[48px] text-base sm:text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterStartDate">Data Inicial</Label>
              <Input
                id="filterStartDate"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterEndDate">Data Final</Label>
              <Input
                id="filterEndDate"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {totalPayments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Pagamentos</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {filteredPayments.length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Média por Pagamento</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {filteredPayments.length > 0
                    ? (totalPayments / filteredPayments.length).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'R$ 0,00'}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pagamentos */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Lista de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => {
                const quote = getQuoteByPayment(payment)
                const remaining = quote ? getRemainingAmount(payment.quoteId) : 0
                return (
                  <div
                    key={payment.id}
                    className="border border-border/50 rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {quote ? `${quote.number} - ${quote.client.name}` : 'Orçamento não encontrado'}
                          </h3>
                          <Badge
                            className={cn(
                              'text-xs',
                              paymentMethodColors[payment.paymentMethod]
                            )}
                          >
                            {paymentMethodLabels[payment.paymentMethod]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold text-foreground">
                              {payment.amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(payment.paymentDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {quote && (
                            <div className="sm:col-span-2">
                              <span className="text-xs">
                                Total: {quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                                Restante: {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          )}
                        </div>
                        {payment.observations && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {payment.observations}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(payment)}
                          className="min-h-[40px]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(payment)}
                          className="text-destructive hover:bg-destructive/10 min-h-[40px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Formulário */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}
            </DialogTitle>
            <DialogDescription>
              {editingPayment
                ? 'Atualize as informações do pagamento'
                : 'Registre uma nova entrada de pagamento'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quoteId">Orçamento *</Label>
                <Select
                  value={formData.quoteId}
                  onValueChange={(value) => setFormData({ ...formData, quoteId: value })}
                  required
                  disabled={!!editingPayment}
                >
                  <SelectTrigger id="quoteId" className="min-h-[48px] text-base sm:text-sm">
                    <SelectValue placeholder="Selecione um orçamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuotes.map((quote) => {
                      const remaining = getRemainingAmount(quote.id)
                      return (
                        <SelectItem key={quote.id} value={quote.id}>
                          {quote.number} - {quote.client.name} (Restante: {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                  className="min-h-[48px] text-base sm:text-sm"
                />
                {formData.quoteId && (() => {
                  const quote = quotes.find(q => q.id === formData.quoteId)
                  if (quote) {
                    const totalPaid = payments
                      .filter(p => p.quoteId === formData.quoteId && (!editingPayment || p.id !== editingPayment.id))
                      .reduce((sum, p) => sum + p.amount, 0)
                    const remaining = quote.total - totalPaid
                    const amount = parseFloat(formData.amount) || 0
                    return (
                      <p className="text-xs text-muted-foreground">
                        Total do orçamento: {quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                        Já pago: {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                        Restante: {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {amount > remaining && (
                          <span className="text-destructive block mt-1">
                            ⚠️ Valor excede o restante!
                          </span>
                        )}
                      </p>
                    )
                  }
                  return null
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Data do Pagamento *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  required
                  className="min-h-[48px] text-base sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
                  required
                >
                  <SelectTrigger id="paymentMethod" className="min-h-[48px] text-base sm:text-sm">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Ex: link do comprovante PIX, referência do boleto (opcional)"
                  className="min-h-[100px] text-base sm:text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingPayment ? 'Atualizar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
