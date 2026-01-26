'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuotes } from '@/contexts/quotes-context'
import { useCompany } from '@/contexts/company-context'
import { usePayments } from '@/contexts/payments-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  generateQuotePDF,
  downloadPDF,
  generateWhatsAppMessage,
  openWhatsApp,
  openViewWindow,
} from '@/lib/pdf-generator'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  FileText,
  Download,
  MessageCircle,
  Edit,
  Trash2,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Play,
  CheckCircle2,
  Mail,
  Plus,
  DollarSign,
  CreditCard,
} from 'lucide-react'

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground', icon: Clock },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary', icon: Clock },
  approved: { label: 'Aprovado', className: 'bg-accent/10 text-accent', icon: CheckCircle },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive', icon: XCircle },
  in_progress: { label: 'Em Servico', className: 'bg-blue-500/10 text-blue-500', icon: Play },
  completed: { label: 'Finalizado', className: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', className: 'bg-orange-500/10 text-orange-500', icon: XCircle },
}

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { getQuoteById, updateQuote, deleteQuote } = useQuotes()
  const { settings: companySettings } = useCompany()
  const { getPaymentsByQuoteId, getTotalPaidByQuoteId, refreshPayments } = usePayments()

  const quote = getQuoteById(id)

  // Carregar pagamentos quando a página carregar
  useEffect(() => {
    if (quote?.id) {
      refreshPayments(quote.id)
    }
  }, [quote?.id, refreshPayments])

  if (!quote) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Orcamento nao encontrado</h2>
        <p className="text-muted-foreground mb-4">O orcamento solicitado nao existe.</p>
        <Link href="/dashboard">
          <Button>Voltar ao Dashboard</Button>
        </Link>
      </div>
    )
  }

  const status = statusConfig[quote.status as keyof typeof statusConfig] || statusConfig.draft
  const StatusIcon = status.icon
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')

  const handleDownloadPDF = async () => {
    try {
      const html = generateQuotePDF(quote, companySettings)
      const filename = `orcamento-${quote.number.replace(/\s+/g, '-')}.pdf`
      
      // Verificar se está em mobile/PWA
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      if (isMobile) {
        // No mobile, abrir em nova aba para visualizar e permitir download manual
        const viewWindow = window.open('', '_blank')
        if (viewWindow) {
          viewWindow.document.write(html)
          viewWindow.document.close()
          // Adicionar botão de impressão/salvar
          setTimeout(() => {
            if (viewWindow && !viewWindow.closed) {
              viewWindow.focus()
              // Tentar download automático também
              try {
                downloadPDF(html, filename).catch(() => {
                  // Se falhar, pelo menos a janela está aberta para o usuário salvar manualmente
                })
              } catch {}
            }
          }, 500)
        } else {
          alert('Por favor, permita pop-ups para baixar o PDF')
        }
      } else {
        // Desktop: download direto
        await downloadPDF(html, filename)
      }
      
      // Log de auditoria
      try {
        const userId = sessionStorage.getItem('servipro_user') ? JSON.parse(sessionStorage.getItem('servipro_user')!).id : null
        if (userId) {
          await fetch('/api/audit/action', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              action: 'download_quote_pdf',
              entityType: 'quote',
              entityId: quote.id,
              description: `PDF do orçamento ${quote.number} baixado`,
            }),
          })
        }
      } catch {}
    } catch (error) {
      console.error('Erro ao baixar PDF:', error)
      alert('Erro ao baixar PDF. Tente visualizar o orçamento e usar a opção de impressão do navegador.')
    }
  }

  const handleWhatsApp = async () => {
    try {
      const message = generateWhatsAppMessage(quote)
      const cleanPhone = quote.client.phone.replace(/\D/g, '')
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
      const whatsappUrl = `https://wa.me/${fullPhone}?text=${message}`
      
      // Tentar abrir WhatsApp
      const whatsappWindow = window.open(whatsappUrl, '_blank')
      
      // Se não abrir (bloqueio de pop-up), criar link temporário
      if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
        // Criar link temporário e clicar automaticamente
        const link = document.createElement('a')
        link.href = whatsappUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      if (quote.status === 'draft') {
        updateQuote(quote.id, { status: 'sent' })
      }
      
      // Log de auditoria
      try {
        const userId = sessionStorage.getItem('servipro_user') ? JSON.parse(sessionStorage.getItem('servipro_user')!).id : null
        if (userId) {
          await fetch('/api/audit/action', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              action: 'send_quote_whatsapp',
              entityType: 'quote',
              entityId: quote.id,
              description: `Orçamento ${quote.number} enviado via WhatsApp para ${quote.client.name}`,
            }),
          })
        }
      } catch {}
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error)
      alert('Erro ao abrir WhatsApp. Verifique se o número está correto.')
    }
  }

  const handleViewQuote = async () => {
    const html = generateQuotePDF(quote, companySettings)
    openViewWindow(html)
    
    // Log de auditoria
    try {
      const userId = sessionStorage.getItem('servipro_user') ? JSON.parse(sessionStorage.getItem('servipro_user')!).id : null
      if (userId) {
        await fetch('/api/audit/action', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({
            action: 'view_quote',
            entityType: 'quote',
            entityId: quote.id,
            description: `Orçamento ${quote.number} visualizado`,
          }),
        })
      }
    } catch {}
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este orcamento?')) {
      deleteQuote(quote.id)
      router.push('/dashboard')
    }
  }

  const handleStatusChange = (newStatus: 'approved' | 'rejected') => {
    updateQuote(quote.id, { status: newStatus })
  }

  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [hasDiscount, setHasDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent/50 min-w-[48px] min-h-[48px] touch-manipulation">
              <ArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{quote.number}</h1>
              <Badge variant="secondary" className={cn('text-sm sm:text-xs font-semibold px-3 sm:px-3 py-1.5 sm:py-1', status.className)}>
                <StatusIcon className="w-4 h-4 sm:w-3 sm:h-3 mr-1.5" />
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-base sm:text-sm">Criado em {formattedDate}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={handleViewQuote} 
            className="rounded-xl border-2 hover:bg-accent/50 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
          >
            <Eye className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Visualizar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF} 
            className="rounded-xl border-2 hover:bg-accent/50 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
          >
            <Download className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Baixar PDF
          </Button>
          <Button 
            onClick={handleWhatsApp} 
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl shadow-lg shadow-green-500/30 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
          >
            <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Client & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold text-foreground text-2xl sm:text-xl mb-2">{quote.client.name}</h3>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground p-4 sm:p-3 rounded-lg bg-muted/30">
              <Phone className="w-5 h-5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span className="font-medium text-base sm:text-sm">{quote.client.phone}</span>
            </div>
            <div className="flex items-start gap-3 text-muted-foreground p-4 sm:p-3 rounded-lg bg-muted/30">
              <MapPin className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 text-primary shrink-0" />
              <span className="font-medium text-base sm:text-sm">{quote.client.address}</span>
            </div>
            {quote.client.email && (
              <div className="flex items-center gap-3 text-muted-foreground p-4 sm:p-3 rounded-lg bg-muted/30">
                <Mail className="w-5 h-5 sm:w-4 sm:h-4 text-primary shrink-0" />
                <span className="font-medium text-base sm:text-sm">{quote.client.email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 sm:py-2">
              <span className="text-muted-foreground font-medium text-base sm:text-sm">Subtotal</span>
              <span className="text-foreground font-semibold text-lg sm:text-base">
                {quote.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between items-center py-3 sm:py-2 border-t border-border/50">
                <span className="text-muted-foreground font-medium text-base sm:text-sm">Desconto</span>
                <span className="text-destructive font-semibold text-lg sm:text-base">
                  - {quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}
            <div className="border-t-2 border-primary/30 pt-4 mt-2 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-lg">
              <span className="font-bold text-foreground text-xl sm:text-lg">Total</span>
              <span className="text-3xl sm:text-2xl font-bold text-primary">
                {quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {(() => {
              const totalPaid = getTotalPaidByQuoteId(quote.id)
              const remaining = quote.total - totalPaid
              const paymentPercentage = quote.total > 0 ? (totalPaid / quote.total) * 100 : 0
              
              return (
                <>
                  <div className="border-t border-border/50 pt-4 mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-base sm:text-sm">Total Pago</span>
                      <span className="text-green-600 font-semibold text-lg sm:text-base">
                        {totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium text-base sm:text-sm">Saldo Pendente</span>
                      <span className={cn(
                        "font-semibold text-lg sm:text-base",
                        remaining > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    {quote.total > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progresso de Pagamento</span>
                          <span>{paymentPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              remaining === 0 ? "bg-green-500" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      {quote.services.length > 0 && (
        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-base sm:text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <th className="text-left py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Descrição</th>
                    <th className="text-center py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Qtd</th>
                    <th className="text-right py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Valor Unit.</th>
                    <th className="text-right py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.services.map((item, index) => (
                    <tr key={item.id} className={cn(
                      "border-b border-border/30 transition-colors hover:bg-slate-50/50",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    )}>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-foreground font-medium text-base sm:text-sm">{item.name}</td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-center text-foreground font-semibold text-base sm:text-sm">{item.quantity}</td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right text-muted-foreground text-base sm:text-sm">
                        {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right font-bold text-foreground text-base sm:text-sm">
                        {(item.quantity * item.unitPrice).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials */}
      {quote.materials.length > 0 && (
        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Materiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-base sm:text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <th className="text-left py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Descrição</th>
                    <th className="text-center py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Qtd</th>
                    <th className="text-right py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Valor Unit.</th>
                    <th className="text-right py-4 sm:py-3 px-4 sm:px-3 font-bold text-slate-700 uppercase text-sm sm:text-xs tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.materials.map((item, index) => (
                    <tr key={item.id} className={cn(
                      "border-b border-border/30 transition-colors hover:bg-slate-50/50",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    )}>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-foreground font-medium text-base sm:text-sm">{item.name}</td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-center text-foreground font-semibold text-base sm:text-sm">{item.quantity}</td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right text-muted-foreground text-base sm:text-sm">
                        {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right font-bold text-foreground text-base sm:text-sm">
                        {(item.quantity * item.unitPrice).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {quote.observations && (
        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-amber-600">Observações</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap leading-relaxed font-medium text-base sm:text-sm">{quote.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {(() => {
        const quotePayments = getPaymentsByQuoteId(quote.id)
        const paymentMethodLabels: Record<string, string> = {
          dinheiro: 'Dinheiro',
          pix: 'PIX',
          cartao_credito: 'Cartão de Crédito',
          cartao_debito: 'Cartão de Débito',
          transferencia: 'Transferência Bancária',
          boleto: 'Boleto',
        }
        const paymentMethodColors: Record<string, string> = {
          dinheiro: 'bg-green-500/10 text-green-500',
          pix: 'bg-blue-500/10 text-blue-500',
          cartao_credito: 'bg-purple-500/10 text-purple-500',
          cartao_debito: 'bg-indigo-500/10 text-indigo-500',
          transferencia: 'bg-cyan-500/10 text-cyan-500',
          boleto: 'bg-orange-500/10 text-orange-500',
        }
        
        return (
          <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight flex items-center justify-between">
                <span>Histórico de Pagamentos</span>
                <Link href="/dashboard/pagamentos">
                  <Button variant="outline" size="sm" className="min-h-[40px]">
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Pagamento
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotePayments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhum pagamento registrado ainda</p>
                  <Link href="/dashboard/pagamentos">
                    <Button variant="outline" className="min-h-[48px]">
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Primeiro Pagamento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotePayments
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map((payment) => (
                      <div
                        key={payment.id}
                        className="border border-border/50 rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={cn('text-xs', paymentMethodColors[payment.paymentMethod] || 'bg-gray-500/10 text-gray-500')}>
                                {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(payment.paymentDate).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-primary" />
                              <span className="font-bold text-lg text-foreground">
                                {payment.amount.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            </div>
                            {payment.observations && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {payment.observations}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Actions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-xl sm:text-lg">Acoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation">
                <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </Link>
            {/* Botões de status básicos (apenas para rascunho/enviado) */}
            {quote.status !== 'approved' && quote.status !== 'rejected' && quote.status !== 'in_progress' && quote.status !== 'completed' && quote.status !== 'cancelled' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('approved')}
                  className="text-accent border-accent hover:bg-accent/10 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
                >
                  <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Marcar como Aprovado
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('rejected')}
                  className="text-destructive border-destructive hover:bg-destructive/10 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
                >
                  <XCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Marcar como Rejeitado
                </Button>
              </>
            )}

            {/* Botões para orçamentos aprovados */}
            {quote.status === 'approved' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleStartServiceClick}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
                >
                  <Play className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Iniciar Servico
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelService}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
                >
                  <XCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Cancelar Servico
                </Button>
              </>
            )}

            {/* Botão para finalizar quando em serviço */}
            {quote.status === 'in_progress' && (
              <Button
                variant="outline"
                onClick={handleCompleteService}
                className="text-green-600 border-green-600 hover:bg-green-50 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
              >
                <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Finalizar Servico
              </Button>
            )}

            {/* Botão de editar (não disponível para finalizados ou cancelados) */}
            {quote.status !== 'completed' && quote.status !== 'cancelled' && (
              <Link href={`/dashboard/editar-orcamento/${quote.id}`}>
                <Button variant="outline" className="min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation">
                  <Edit className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Editar
                </Button>
              </Link>
            )}

            {/* Botão de excluir (não disponível para finalizados ou cancelados) */}
            {quote.status !== 'completed' && quote.status !== 'cancelled' && (
              <Button variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 bg-transparent min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation">
                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}
