'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/components/app-link'
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
import { Switch } from '@/components/ui/switch'
import {
  generateQuotePDF,
  generateServiceOrderPDF,
  generateMaterialsListPDF,
  generatePaymentReceiptPDF,
  generatePaymentReceiptWhatsAppMessage,
  downloadPDF,
  forceDownloadPDF,
  openViewWindow,
  preloadHtml2Pdf,
  openWhatsApp,
  generateWhatsAppMessage,
  generateServiceOrderWhatsAppMessage,
} from '@/lib/pdf-generator'
import { readSessionUserId } from '@/lib/app-constants'
import { cn } from '@/lib/utils'
import { formatQuantityWithUnitPdf } from '@/lib/material-units'
import type { Payment } from '@/lib/types'
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
  AlertTriangle,
  Package,
  Receipt,
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
  const { getPaymentsByQuoteId, getTotalPaidByQuoteId } = usePayments()

  // TODOS os hooks devem ser chamados ANTES de qualquer early return
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [hasDiscount, setHasDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [delinquencySaving, setDelinquencySaving] = useState(false)

  useEffect(() => {
    preloadHtml2Pdf()
  }, [id])

  const quote = getQuoteById(id)

  if (!quote) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Orcamento nao encontrado</h2>
        <p className="text-muted-foreground mb-4">O orcamento solicitado nao existe.</p>
        <Button asChild>
          <Link href="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    )
  }

  const quotePayments = getPaymentsByQuoteId(quote.id)

  const status = statusConfig[quote.status as keyof typeof statusConfig] || statusConfig.draft
  const StatusIcon = status.icon
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')

  const askForceDownload = async (html: string, filename: string, docLabel: string) => {
    const shouldForce = window.confirm(
      `Falha no download de ${docLabel}. Deseja tentar o Plano B (forcar download)?`
    )
    if (!shouldForce) return
    await forceDownloadPDF(html, filename)
  }

  const handleDownloadPDF = async () => {
    try {
      const html = generateQuotePDF(quote, companySettings)
      const filename = `orcamento-${quote.number.replace(/\s+/g, '-')}.pdf`
      await downloadPDF(html, filename)
      
      // Log de auditoria
      try {
        const userId = readSessionUserId()
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
      const html = generateQuotePDF(quote, companySettings)
      const filename = `orcamento-${quote.number.replace(/\s+/g, '-')}.pdf`
      await askForceDownload(html, filename, 'o PDF do orçamento')
    }
  }

  const handleDownloadMaterialsListPDF = async () => {
    if (!quote.materials.length) {
      alert('Este orçamento não possui materiais cadastrados.')
      return
    }
    try {
      const html = generateMaterialsListPDF(quote, companySettings)
      const filename = `lista-materiais-${quote.number.replace(/\s+/g, '-')}.pdf`
      await downloadPDF(html, filename)

      try {
        const userId = readSessionUserId()
        if (userId) {
          await fetch('/api/audit/action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              action: 'download_materials_list_pdf',
              entityType: 'quote',
              entityId: quote.id,
              description: `PDF lista de materiais do orçamento ${quote.number} baixado`,
            }),
          })
        }
      } catch {}
    } catch (error) {
      console.error('Erro ao baixar lista de materiais:', error)
      const html = generateMaterialsListPDF(quote, companySettings)
      const filename = `lista-materiais-${quote.number.replace(/\s+/g, '-')}.pdf`
      await askForceDownload(html, filename, 'a lista de materiais')
    }
  }

  const handleWhatsApp = () => {
    try {
      const digits = quote.client.phone.replace(/\D/g, '')
      if (!digits || digits.length < 10) {
        alert(
          'Cadastre um telefone válido com DDD no cliente para abrir o WhatsApp (ex.: 11999998888).'
        )
        return
      }

      // Abre o WhatsApp já na conversa com o cliente (mesmo clique — não bloqueia no PDF)
      openWhatsApp(quote.client.phone, generateWhatsAppMessage(quote))

      if (quote.status === 'draft') {
        void updateQuote(quote.id, { status: 'sent' })
      }

      // Gera o PDF em segundo plano para o usuário anexar na conversa (não atrasa o WhatsApp)
      const html = generateQuotePDF(quote, companySettings)
      const filename = `orcamento-${quote.number.replace(/\s+/g, '-')}.pdf`
      void downloadPDF(html, filename).catch((err) => {
        console.error('PDF em segundo plano após WhatsApp:', err)
      })

      void (async () => {
        try {
          const userId = readSessionUserId()
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
                description: `Orçamento ${quote.number} — WhatsApp aberto para ${quote.client.name}`,
              }),
            })
          }
        } catch {
          /* ignore */
        }
      })()
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error)
      alert('Não foi possível abrir o WhatsApp. Verifique o telefone do cliente e tente de novo.')
    }
  }

  const handleViewQuote = async () => {
    const html = generateQuotePDF(quote, companySettings)
    openViewWindow(html)
    
    // Log de auditoria
    try {
      const userId = readSessionUserId()
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

  const handleDownloadServiceOrderPDF = async () => {
    try {
      const html = generateServiceOrderPDF(quote, companySettings, quotePayments)
      const filename = `ordem-servico-${quote.number.replace(/\s+/g, '-')}.pdf`
      await downloadPDF(html, filename)

      try {
        const userId = readSessionUserId()
        if (userId) {
          await fetch('/api/audit/action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              action: 'download_service_order_pdf',
              entityType: 'quote',
              entityId: quote.id,
              description: `PDF ordem de serviço ${quote.number} baixado`,
            }),
          })
        }
      } catch {}
    } catch (error) {
      console.error('Erro ao baixar ordem de serviço:', error)
      const html = generateServiceOrderPDF(quote, companySettings, quotePayments)
      const filename = `ordem-servico-${quote.number.replace(/\s+/g, '-')}.pdf`
      await askForceDownload(html, filename, 'a ordem de serviço')
    }
  }

  const handleDownloadPaymentReceipt = async (payment: Payment) => {
    try {
      const html = generatePaymentReceiptPDF(payment, quote, companySettings, {
        totalPaidOnQuote: getTotalPaidByQuoteId(quote.id),
      })
      const filename = `recibo-pagamento-${quote.number.replace(/\s+/g, '-')}-${payment.id.slice(0, 8)}.pdf`
      await downloadPDF(html, filename)

      try {
        const userId = readSessionUserId()
        if (userId) {
          await fetch('/api/audit/action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              action: 'download_payment_receipt_pdf',
              entityType: 'payment',
              entityId: payment.id,
              description: `PDF recibo de pagamento — ${quote.number} — R$ ${payment.amount.toFixed(2)}`,
            }),
          })
        }
      } catch {
        /* ignore */
      }
    } catch (error) {
      console.error('Erro ao baixar recibo:', error)
      const html = generatePaymentReceiptPDF(payment, quote, companySettings, {
        totalPaidOnQuote: getTotalPaidByQuoteId(quote.id),
      })
      const filename = `recibo-pagamento-${quote.number.replace(/\s+/g, '-')}-${payment.id.slice(0, 8)}.pdf`
      await askForceDownload(html, filename, 'o recibo de pagamento')
    }
  }

  const handleWhatsAppPaymentReceipt = (payment: Payment) => {
    try {
      const digits = quote.client.phone.replace(/\D/g, '')
      if (!digits || digits.length < 10) {
        alert(
          'Cadastre um telefone válido com DDD no cliente para abrir o WhatsApp (ex.: 11999998888).'
        )
        return
      }

      openWhatsApp(quote.client.phone, generatePaymentReceiptWhatsAppMessage(quote, payment))

      const html = generatePaymentReceiptPDF(payment, quote, companySettings, {
        totalPaidOnQuote: getTotalPaidByQuoteId(quote.id),
      })
      const filename = `recibo-pagamento-${quote.number.replace(/\s+/g, '-')}-${payment.id.slice(0, 8)}.pdf`
      void downloadPDF(html, filename).catch((err) => {
        console.error('PDF recibo em segundo plano após WhatsApp:', err)
      })

      void (async () => {
        try {
          const userId = readSessionUserId()
          if (userId) {
            await fetch('/api/audit/action', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
              },
              body: JSON.stringify({
                action: 'send_payment_receipt_whatsapp',
                entityType: 'payment',
                entityId: payment.id,
                description: `Recibo ${quote.number} — WhatsApp para ${quote.client.name} — R$ ${payment.amount.toFixed(2)}`,
              }),
            })
          }
        } catch {
          /* ignore */
        }
      })()
    } catch (error) {
      console.error('Erro ao abrir WhatsApp (recibo):', error)
      alert('Não foi possível abrir o WhatsApp. Verifique o telefone do cliente.')
    }
  }

  const handleWhatsAppServiceOrder = () => {
    try {
      const digits = quote.client.phone.replace(/\D/g, '')
      if (!digits || digits.length < 10) {
        alert(
          'Cadastre um telefone válido com DDD no cliente para abrir o WhatsApp (ex.: 11999998888).'
        )
        return
      }

      const totalPaid = getTotalPaidByQuoteId(quote.id)
      openWhatsApp(quote.client.phone, generateServiceOrderWhatsAppMessage(quote, totalPaid))

      const html = generateServiceOrderPDF(quote, companySettings, quotePayments)
      const filename = `ordem-servico-${quote.number.replace(/\s+/g, '-')}.pdf`
      void downloadPDF(html, filename).catch((err) => {
        console.error('PDF ordem de serviço em segundo plano:', err)
      })

      void (async () => {
        try {
          const userId = readSessionUserId()
          if (userId) {
            await fetch('/api/audit/action', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
              },
              body: JSON.stringify({
                action: 'send_service_order_whatsapp',
                entityType: 'quote',
                entityId: quote.id,
                description: `Ordem de serviço ${quote.number} — WhatsApp para ${quote.client.name}`,
              }),
            })
          }
        } catch {
          /* ignore */
        }
      })()
    } catch (error) {
      console.error('Erro ao abrir WhatsApp (OS):', error)
      alert('Não foi possível abrir o WhatsApp. Verifique o telefone do cliente e tente de novo.')
    }
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
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent/50 min-w-[48px] min-h-[48px] touch-manipulation" asChild>
            <Link href="/dashboard" aria-label="Voltar ao dashboard">
              <ArrowLeft className="w-6 h-6 sm:w-5 sm:h-5" />
            </Link>
          </Button>
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
            variant="outline"
            onClick={handleDownloadMaterialsListPDF}
            disabled={quote.materials.length === 0}
            title={
              quote.materials.length === 0
                ? 'Adicione materiais ao orçamento para gerar a lista'
                : 'PDF apenas com cliente e materiais'
            }
            className="rounded-xl border-2 hover:bg-accent/50 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation disabled:opacity-50"
          >
            <Package className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Lista de materiais
          </Button>
          {quote.status === 'completed' && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadServiceOrderPDF}
                title="PDF com itens, totais e pagamentos registrados para o cliente"
                className="rounded-xl border-2 border-green-600/40 hover:bg-green-500/10 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation"
              >
                <Receipt className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Ordem de serviço
              </Button>
              <Button
                onClick={handleWhatsAppServiceOrder}
                title="Abre o WhatsApp; o PDF da ordem de serviço é baixado em seguida para anexar."
                className="h-11 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                OS no WhatsApp
              </Button>
            </>
          )}
          <Button 
            onClick={handleWhatsApp} 
            title="Abre o WhatsApp com o número do cliente. O PDF do orçamento é baixado em seguida para você anexar."
            className="h-11 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Client & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
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

        <Card className="border-y border-r border-border/80 border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.total > 0 ? (
              <>
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
                <div className="mt-2 flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 p-4 pt-4">
                  <span className="font-bold text-foreground text-xl sm:text-lg">Total</span>
                  <span className="text-3xl sm:text-2xl font-bold text-primary">
                    {quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-muted-foreground text-base sm:text-sm mb-2">
                  Orçamento sem valores financeiros
                </div>
                <div className="text-xs text-muted-foreground">
                  Os valores poderão ser adicionados posteriormente
                </div>
              </div>
            )}
            {(() => {
              const totalPaid = getTotalPaidByQuoteId(quote.id)
              const remaining = quote.total - totalPaid
              const paymentPercentage = quote.total > 0 ? (totalPaid / quote.total) * 100 : 0
              const canManageDelinquency =
                (quote.status === 'approved' ||
                  quote.status === 'in_progress' ||
                  quote.status === 'completed') &&
                quote.total > 0

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
                  {canManageDelinquency && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <Label
                            htmlFor="delinquency-list-switch"
                            className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden />
                            Lista de inadimplentes
                          </Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Só entra na tela Inadimplentes quando há saldo pendente e esta opção está ativa.
                            Você decide quando colocar em cobrança.
                          </p>
                        </div>
                        <Switch
                          id="delinquency-list-switch"
                          checked={!!quote.inDelinquencyList}
                          disabled={
                            delinquencySaving || (remaining <= 0 && !quote.inDelinquencyList)
                          }
                          onCheckedChange={async (on) => {
                            if (remaining <= 0 && on) return
                            setDelinquencySaving(true)
                            try {
                              await updateQuote(quote.id, { inDelinquencyList: on })
                            } finally {
                              setDelinquencySaving(false)
                            }
                          }}
                        />
                      </div>
                      {remaining <= 0 && (
                        <p className="text-xs text-muted-foreground">
                          Orçamento quitado — não é possível incluir na lista até haver saldo pendente.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {(quote.paymentTerms || quote.conditions || quote.deadlines) && (
        <Card className="border-y border-r border-border/80 border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Proposta Comercial</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {quote.paymentTerms && (
              <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Pagamentos
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {quote.paymentTerms}
                </p>
              </div>
            )}
            {quote.conditions && (
              <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  Condições
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {quote.conditions}
                </p>
              </div>
            )}
            {quote.deadlines && (
              <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Prazos
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {quote.deadlines}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {quote.services.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-base sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-4 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Descrição</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Qtd</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Valor Unit.</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.services.map((item, index) => (
                    <tr key={item.id} className={cn(
                      "border-b border-border/30 transition-colors hover:bg-muted/40",
                      index % 2 === 0 ? "bg-card" : "bg-muted/25"
                    )}>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-foreground font-medium text-base sm:text-sm">{item.name}</td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-center text-foreground font-semibold text-base sm:text-sm">{item.quantity}</td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right text-muted-foreground text-base sm:text-sm">
                        {item.unitPrice > 0 ? item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right font-bold text-foreground text-base sm:text-sm">
                        {(item.quantity * item.unitPrice) > 0 ? (item.quantity * item.unitPrice).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }) : '-'}
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
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Materiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-base sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-4 py-4 text-left text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Descrição</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Qtd / un.</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Valor Unit.</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold uppercase tracking-wider text-foreground sm:px-3 sm:py-3 sm:text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.materials.map((item, index) => (
                    <tr key={item.id} className={cn(
                      "border-b border-border/30 transition-colors hover:bg-muted/40",
                      index % 2 === 0 ? "bg-card" : "bg-muted/25"
                    )}>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-foreground font-medium text-base sm:text-sm">{item.name}</td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-center text-foreground font-semibold text-base sm:text-sm">
                        {formatQuantityWithUnitPdf(Number(item.quantity), item.unit)}
                      </td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right text-muted-foreground text-base sm:text-sm">
                        {item.unitPrice > 0 ? item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </td>
                      <td className="py-4 sm:py-3 px-4 sm:px-3 text-right font-bold text-foreground text-base sm:text-sm">
                        {(item.quantity * item.unitPrice) > 0 ? (item.quantity * item.unitPrice).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }) : '-'}
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
        <Card className="border-y border-r border-border/80 border-l-4 border-l-amber-500/50 bg-muted/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-foreground">Observações</span>
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
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight flex items-center justify-between">
                <span>Histórico de Pagamentos</span>
                <Button variant="outline" size="sm" className="min-h-[40px]" asChild>
                  <Link href={`/dashboard/pagamentos?quoteId=${quote.id}&openDialog=1`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Pagamento
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotePayments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhum pagamento registrado ainda</p>
                  <Button variant="outline" className="min-h-[48px]" asChild>
                    <Link href={`/dashboard/pagamentos?quoteId=${quote.id}&openDialog=1`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Registrar Primeiro Pagamento
                    </Link>
                  </Button>
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
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
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
                              <DollarSign className="h-4 w-4 shrink-0 text-primary" />
                              <span className="text-lg font-bold text-foreground">
                                {payment.amount.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            </div>
                            {payment.observations && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {payment.observations}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5"
                              onClick={() => handleDownloadPaymentReceipt(payment)}
                              title="Baixar PDF do recibo"
                            >
                              <Receipt className="h-4 w-4" />
                              Recibo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => handleWhatsAppPaymentReceipt(payment)}
                              title="WhatsApp: mensagem + PDF do recibo em segundo plano"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
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
            <Button className="bg-primary hover:bg-primary/90 min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Voltar ao Dashboard
              </Link>
            </Button>
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
              <Button variant="outline" className="min-h-[48px] text-base sm:text-sm px-6 py-3 sm:py-2 touch-manipulation" asChild>
                <Link href={`/dashboard/editar-orcamento/${quote.id}`}>
                  <Edit className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Editar
                </Link>
              </Button>
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
