'use client'

import { useState } from 'react'
import { Link } from '@/components/app-link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { Quote } from '@/lib/types'
import { FileText, ChevronRight, Play, X, CheckCircle2, CreditCard } from 'lucide-react'
import { useQuotes } from '@/contexts/quotes-context'
import { usePayments } from '@/contexts/payments-context'
import { toast } from 'sonner'

interface QuoteCardProps {
  quote: Quote
}

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary' },
  approved: { label: 'Aprovado', className: 'bg-chart-2/12 text-chart-2' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive' },
  in_progress: { label: 'Em serviço', className: 'bg-primary/10 text-primary' },
  completed: { label: 'Finalizado', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const { updateQuote } = useQuotes()
  const { getTotalPaidByQuoteId } = usePayments()
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [hasDiscount, setHasDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const status = statusConfig[quote.status as keyof typeof statusConfig] || statusConfig.draft
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')
  const formattedTotal = quote.total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const totalPaid = getTotalPaidByQuoteId(quote.id)
  const paymentStatus =
    quote.total === 0
      ? { label: 'Sem valor', className: 'bg-muted text-muted-foreground' }
      : totalPaid >= quote.total
        ? { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
        : { label: 'Pendente', className: 'bg-amber-500/10 text-amber-800 dark:text-amber-500' }

  const handleStartServiceClick = () => {
    setShowDiscountDialog(true)
    setHasDiscount(false)
    setDiscountType('percentage')
    setDiscountValue('')
  }

  const handleConfirmStartService = async () => {
    setIsProcessing(true)
    try {
      // Se não houve desconto, mantém os valores originais
      if (!hasDiscount) {
        await updateQuote(quote.id, {
          status: 'in_progress',
          serviceStartedAt: new Date(),
        } as any)
        setShowDiscountDialog(false)
        return
      }

      // Se houve desconto, valida e calcula
      if (!discountValue || parseFloat(discountValue) <= 0) {
        toast.error('Por favor, informe o valor do desconto')
        setIsProcessing(false)
        return
      }

      const discountNum = parseFloat(discountValue)
      if (isNaN(discountNum) || discountNum <= 0) {
        toast.error('Por favor, informe um valor válido para o desconto')
        setIsProcessing(false)
        return
      }

      let newDiscount = quote.discount || 0
      let newTotal = quote.total

      if (discountType === 'percentage') {
        // Desconto em porcentagem sobre o subtotal
        const discountAmount = (quote.subtotal * discountNum) / 100
        newDiscount = discountAmount
        newTotal = quote.subtotal - discountAmount
      } else {
        // Desconto em valor fixo
        newDiscount = discountNum
        newTotal = quote.subtotal - discountNum
      }

      // Garantir que não fique negativo
      newTotal = Math.max(0, newTotal)

      await updateQuote(quote.id, {
        status: 'in_progress',
        serviceStartedAt: new Date(),
        discount: newDiscount,
        total: newTotal,
      } as any)

      setShowDiscountDialog(false)
      toast.success('Serviço iniciado com sucesso.')
    } catch (error) {
      console.error('Erro ao iniciar serviço:', error)
      toast.error('Erro ao iniciar serviço. Tente novamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  const calculatePreviewTotal = () => {
    if (!hasDiscount || !discountValue) {
      return quote.total
    }

    const discountNum = parseFloat(discountValue)
    if (isNaN(discountNum) || discountNum <= 0) {
      return quote.total
    }

    if (discountType === 'percentage') {
      const discountAmount = (quote.subtotal * discountNum) / 100
      return Math.max(0, quote.subtotal - discountAmount)
    } else {
      return Math.max(0, quote.subtotal - discountNum)
    }
  }

  const previewTotal = calculatePreviewTotal()

  const handleCancelService = () => {
    if (confirm('Tem certeza de que deseja cancelar este serviço? Esta ação não pode ser desfeita.')) {
      void updateQuote(quote.id, { status: 'cancelled' }).then(() => {
        toast.success('Serviço cancelado.')
      }).catch(() => {
        toast.error('Não foi possível cancelar o serviço.')
      })
    }
  }

  const handleCompleteService = () => {
    if (confirm('Deseja finalizar este serviço?')) {
      void updateQuote(quote.id, {
        status: 'completed',
        serviceCompletedAt: new Date()
      }).then(() => {
        toast.success('Serviço finalizado com sucesso.')
      }).catch(() => {
        toast.error('Não foi possível finalizar o serviço.')
      })
    }
  }

  return (
    <Card className="border-border/80 transition-shadow hover:border-primary/25">
      <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
                <FileText className="w-6 h-6 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                  <h3 className="font-semibold text-base sm:text-sm text-foreground truncate">{quote.number}</h3>
                  <Badge variant="secondary" className={cn('text-xs font-medium px-2 py-0.5 shrink-0', status.className)}>
                    {status.label}
                  </Badge>
                  <Badge variant="secondary" className={cn('text-xs font-medium px-2 py-0.5 shrink-0', paymentStatus.className)}>
                    {paymentStatus.label}
                  </Badge>
                </div>
                <p className="text-sm sm:text-base font-medium text-foreground truncate mb-1">{quote.client.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <p className="font-semibold text-lg sm:text-xl tracking-tight text-foreground">{formattedTotal}</p>
              </div>
              
              {/* Ação rápida: Registrar pagamento (aprovado, em serviço ou finalizado) */}
              {(quote.status === 'approved' || quote.status === 'in_progress' || quote.status === 'completed') && quote.total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="shrink-0 text-green-600 border-green-600 hover:bg-green-50 min-h-[40px] sm:min-h-[36px] text-sm touch-manipulation"
                >
                  <Link
                    href={`/dashboard/pagamentos?quoteId=${quote.id}&openDialog=1`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CreditCard className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                    <span className="hidden sm:inline">Pagamento</span>
                  </Link>
                </Button>
              )}
              {/* Botões de ação para orçamentos aprovados */}
              {quote.status === 'approved' && (
                <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleStartServiceClick()
                    }}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50 min-h-[40px] sm:min-h-[36px] text-sm touch-manipulation"
                  >
                    <Play className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                    <span className="hidden sm:inline">Iniciar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCancelService()
                    }}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50 min-h-[40px] sm:min-h-[36px] text-sm touch-manipulation"
                  >
                    <X className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </Button>
                </div>
              )}

              {/* Botão para finalizar quando em serviço */}
              {quote.status === 'in_progress' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCompleteService()
                  }}
                  className="text-green-600 border-green-600 hover:bg-green-50 min-h-[40px] sm:min-h-[36px] text-sm touch-manipulation"
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                  <span className="hidden sm:inline">Finalizar</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-muted-foreground hover:text-foreground min-w-[48px] min-h-[48px] sm:min-w-[40px] sm:min-h-[40px] touch-manipulation shrink-0"
              >
                <Link href={`/dashboard/orcamento/${quote.id}`} aria-label="Abrir detalhes do orçamento">
                  <ChevronRight className="w-6 h-6 sm:w-5 sm:h-5" />
                </Link>
              </Button>
            </div>
          </div>

          <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Iniciar serviço</DialogTitle>
                <DialogDescription>
                  Houve algum desconto negociado para este serviço?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasDiscount"
                    checked={hasDiscount}
                    onChange={(e) => setHasDiscount(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="hasDiscount" className="cursor-pointer">
                    Sim, houve desconto
                  </Label>
                </div>

                {hasDiscount && (
                  <div className="space-y-4 pl-6 border-l-2 border-border">
                    <div>
                      <Label>Tipo de Desconto</Label>
                      <RadioGroup
                        value={discountType}
                        onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage" className="cursor-pointer">
                            Porcentagem (%)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed" className="cursor-pointer">
                            Valor Fixo (R$)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="discountValue">
                        {discountType === 'percentage' ? 'Porcentagem (%)' : 'Valor do Desconto (R$)'}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        min="0"
                        step={discountType === 'percentage' ? '0.01' : '0.01'}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'percentage' ? 'Ex: 10' : 'Ex: 100.00'}
                        className="mt-1"
                      />
                    </div>

                    {discountValue && !isNaN(parseFloat(discountValue)) && parseFloat(discountValue) > 0 && (
                      <div className="p-3 bg-muted rounded-md">
                        <div className="text-sm text-muted-foreground mb-1">Resumo:</div>
                        <div className="text-sm">
                          <div>Subtotal: {quote.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                          <div className="text-destructive">
                            Desconto: -{' '}
                            {discountType === 'percentage'
                              ? `${discountValue}% (${((quote.subtotal * parseFloat(discountValue)) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
                              : parseFloat(discountValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          <div className="font-semibold text-lg mt-1">
                            Total: {previewTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDiscountDialog(false)}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmStartService}
                  disabled={
                    isProcessing ||
                    (hasDiscount &&
                      (!discountValue ||
                        isNaN(parseFloat(discountValue)) ||
                        parseFloat(discountValue) <= 0))
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? 'Processando...' : 'Confirmar e Iniciar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </CardContent>
    </Card>
  )
}
