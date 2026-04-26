'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/components/app-link'
import { useMaterialLists } from '@/contexts/material-lists-context'
import { useCompany } from '@/contexts/company-context'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateStandaloneMaterialListPDF, downloadPDF, forceDownloadPDF, openViewWindow } from '@/lib/pdf-generator'
import { formatQuantityWithUnitPdf, resolveMaterialUnit } from '@/lib/material-units'
import type { MaterialList } from '@/lib/types'
import {
  ArrowLeft,
  Package,
  Download,
  Eye,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Mail,
} from 'lucide-react'

export default function ListaMateriaisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { settings: companySettings } = useCompany()
  const { materialLists, isLoading, deleteMaterialList, refreshMaterialLists } = useMaterialLists()
  const [fetched, setFetched] = useState<MaterialList | null>(null)
  const refreshOnceRef = useRef(false)

  const fromCtx = materialLists.find((l) => l.id === id)
  const list = fromCtx ?? fetched

  useEffect(() => {
    if (!user?.id || fromCtx || isLoading) return
    let cancelled = false
    ;(async () => {
      const r = await fetch(`/api/material-lists/${id}`, {
        headers: { 'x-user-id': user.id },
      })
      if (!r.ok || cancelled) return
      const data = await r.json()
      setFetched({
        id: data.id,
        number: data.number,
        userId: data.userId,
        client: {
          id: data.client.id,
          name: data.client.name,
          phone: data.client.phone,
          address: data.client.address,
          email: data.client.email,
        },
        title: data.title,
        observations: data.observations,
        includePrices: Boolean(data.includePrices),
        items: (data.items || []).map((it: any) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          unit: resolveMaterialUnit(it.unit),
          unitPrice: it.unitPrice,
        })),
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, id, fromCtx, isLoading])

  useEffect(() => {
    refreshOnceRef.current = false
  }, [id])

  useEffect(() => {
    if (!isLoading && !fromCtx && user?.id && !refreshOnceRef.current) {
      refreshOnceRef.current = true
      refreshMaterialLists()
    }
  }, [isLoading, fromCtx, user?.id, refreshMaterialLists])

  if (!list && isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">Carregando...</div>
    )
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Lista não encontrada</h2>
        <Button asChild>
          <Link href="/operacao/listas-materiais">Voltar</Link>
        </Button>
      </div>
    )
  }

  const handleDownloadPdf = async () => {
    try {
      const html = generateStandaloneMaterialListPDF(list, companySettings)
      const filename = `${list.number.replace(/\s+/g, '-')}.pdf`
      await downloadPDF(html, filename)
      try {
        if (user?.id) {
          await fetch('/api/audit/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
            body: JSON.stringify({
              action: 'download_material_list_pdf',
              entityType: 'material_list',
              entityId: list.id,
              description: `PDF da lista ${list.number} baixado`,
            }),
          })
        }
      } catch {}
    } catch (e) {
      console.error(e)
      const html = generateStandaloneMaterialListPDF(list, companySettings)
      const filename = `${list.number.replace(/\s+/g, '-')}.pdf`
      const shouldForce = window.confirm(
        'Falha ao gerar o PDF da lista. Deseja tentar o Plano B (forcar download)?'
      )
      if (shouldForce) {
        await forceDownloadPDF(html, filename)
      }
    }
  }

  const handleView = () => {
    openViewWindow(generateStandaloneMaterialListPDF(list, companySettings))
  }

  const handleDelete = async () => {
    if (!confirm(`Excluir a lista ${list.number}? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteMaterialList(list.id)
      router.push('/operacao/listas-materiais')
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir.')
    }
  }

  const formattedDate = new Date(list.createdAt).toLocaleDateString('pt-BR')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl min-w-[48px] min-h-[48px] shrink-0" asChild>
            <Link href="/operacao/listas-materiais" aria-label="Voltar às listas">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{list.number}</h1>
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
                Lista de materiais
              </span>
            </div>
            <p className="text-muted-foreground text-sm">Emitida em {formattedDate}</p>
            {list.title && <p className="text-foreground font-medium mt-2">{list.title}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={handleView}>
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
          <Button variant="outline" className="rounded-xl min-h-[44px]" asChild>
            <Link href={`/operacao/listas-materiais/${list.id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Button variant="outline" className="rounded-xl min-h-[44px] text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-bold text-lg">{list.client.name}</p>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Phone className="w-4 h-4 shrink-0" />
              {list.client.phone}
            </div>
            <div className="flex items-start gap-2 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              {list.client.address}
            </div>
            {list.client.email && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 shrink-0" />
                {list.client.email}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Itens:</span>{' '}
              <span className="font-medium">{list.items.length}</span>
            </p>
            <p>
              <span className="text-muted-foreground">PDF:</span>{' '}
              <span className="font-medium">
                {list.includePrices ? 'Com valores estimados' : 'Somente descrição e quantidade'}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/60">
            {list.items.map((it) => (
              <li key={it.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="font-medium">{it.name}</span>
                <span className="text-sm text-muted-foreground">
                  Qtd:{' '}
                  <strong className="text-foreground">
                    {formatQuantityWithUnitPdf(Number(it.quantity), it.unit)}
                  </strong>
                  {list.includePrices && (
                    <>
                      {' · '}
                      {it.unitPrice > 0
                        ? `${(it.quantity * it.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                        : '—'}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {list.observations && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{list.observations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
