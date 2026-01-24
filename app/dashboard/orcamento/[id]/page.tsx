'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuotes } from '@/contexts/quotes-context'
import { useAuth } from '@/contexts/auth-context'
import { useCompany } from '@/contexts/company-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  generateQuotePDF,
  downloadPDF,
  generateWhatsAppMessage,
  openWhatsApp,
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
} from 'lucide-react'

const statusConfig = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground', icon: Clock },
  sent: { label: 'Enviado', className: 'bg-primary/10 text-primary', icon: Clock },
  approved: { label: 'Aprovado', className: 'bg-accent/10 text-accent', icon: CheckCircle },
  rejected: { label: 'Rejeitado', className: 'bg-destructive/10 text-destructive', icon: XCircle },
}

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { getQuoteById, updateQuote, deleteQuote } = useQuotes()
  const { user } = useAuth()
  const { settings: companySettings } = useCompany()

  const quote = getQuoteById(id)

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

  const status = statusConfig[quote.status]
  const StatusIcon = status.icon
  const formattedDate = new Date(quote.createdAt).toLocaleDateString('pt-BR')

  const handleDownloadPDF = async () => {
    const html = generateQuotePDF(quote, companySettings)
    const filename = `orcamento-${quote.number.replace(/\s+/g, '-')}.pdf`
    await downloadPDF(html, filename)
  }

  const handleWhatsApp = () => {
    const message = generateWhatsAppMessage(quote)
    openWhatsApp(quote.client.phone, message)
    if (quote.status === 'draft') {
      updateQuote(quote.id, { status: 'sent' })
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{quote.number}</h1>
              <Badge variant="secondary" className={cn('text-xs', status.className)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">Criado em {formattedDate}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          <Button onClick={handleWhatsApp} className="bg-accent hover:bg-accent/90">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar WhatsApp
          </Button>
        </div>
      </div>

      {/* Client & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-lg">{quote.client.name}</h3>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{quote.client.phone}</span>
            </div>
            <div className="flex items-start gap-3 text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5" />
              <span>{quote.client.address}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">
                {quote.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-destructive">
                  - {quote.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">
                {quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      {quote.services.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Servicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Descricao</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Qtd</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Valor Unit.</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.services.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2 text-foreground">{item.name}</td>
                      <td className="py-3 px-2 text-center text-foreground">{item.quantity}</td>
                      <td className="py-3 px-2 text-right text-foreground">
                        {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-foreground">
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
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Materiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Descricao</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Qtd</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Valor Unit.</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.materials.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2 text-foreground">{item.name}</td>
                      <td className="py-3 px-2 text-center text-foreground">{item.quantity}</td>
                      <td className="py-3 px-2 text-right text-foreground">
                        {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-foreground">
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
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{quote.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Acoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quote.status !== 'approved' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('approved')}
                className="text-accent border-accent hover:bg-accent/10"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Aprovado
              </Button>
            )}
            {quote.status !== 'rejected' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('rejected')}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Marcar como Rejeitado
              </Button>
            )}
            <Link href={`/dashboard/editar-orcamento/${quote.id}`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 bg-transparent">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
