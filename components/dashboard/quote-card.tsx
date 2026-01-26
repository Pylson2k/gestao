'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { FileText, ChevronRight, Play, X, CheckCircle2 } from 'lucide-react'
import { useQuotes } from '@/contexts/quotes-context'

interface QuoteCardProps {
  quote: Quote
}

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary' },
  approved: { label: 'Aprovado', className: 'bg-accent/10 text-accent' },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive' },
  in_progress: { label: 'Em Servico', className: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Finalizado', className: 'bg-green-500/10 text-green-500' },
  cancelled: { label: 'Cancelado', className: 'bg-orange-500/10 text-orange-500' },
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const { updateQuote } = useQuotes()
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
        alert('Por favor, informe o valor do desconto')
        setIsProcessing(false)
        return
      }

      const discountNum = parseFloat(discountValue)
      if (isNaN(discountNum) || discountNum <= 0) {
        alert('Por favor, informe um valor valido para o desconto')
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
    } catch (error) {
      console.error('Erro ao iniciar serviço:', error)
      alert('Erro ao iniciar servico. Tente novamente.')
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
    if (confirm('Tem certeza que deseja cancelar este servico? Esta acao nao pode ser desfeita.')) {
      updateQuote(quote.id, { status: 'cancelled' })
    }
  }

  const handleCompleteService = () => {
    if (confirm('Deseja finalizar este servico?')) {
      updateQuote(quote.id, { 
        status: 'completed',
        serviceCompletedAt: new Date()
      })
    }
  }

  return (
    <Card className="border-border/50 bg-white/60 backdrop-blur-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground truncate">{quote.number}</h3>
              <Badge variant="secondary" className={cn('text-xs font-medium px-2 py-0.5', status.className)}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground truncate mb-1">{quote.client.name}</p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-foreground">{formattedTotal}</p>
          </div>
          
          {/* Botões de ação para orçamentos aprovados */}
          {quote.status === 'approved' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartServiceClick}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Play className="w-3 h-3 mr-1" />
                Iniciar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelService}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <X className="w-3 h-3 mr-1" />
                Cancelar
              </Button>
            </div>
          )}

          {/* Dialog de desconto ao iniciar serviço */}
          <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Iniciar Servico</DialogTitle>
                <DialogDescription>
                  Houve algum desconto negociado para este servico?
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
              disabled={isProcessing || (hasDiscount && (!discountValue || isNaN(parseFloat(discountValue)) || parseFloat(discountValue) <= 0))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? 'Processando...' : 'Confirmar e Iniciar'}
            </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Botão para finalizar quando em serviço */}
          {quote.status === 'in_progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompleteService}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Finalizar
            </Button>
          )}

          <Link href={`/dashboard/orcamento/${quote.id}`}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
