'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/components/app-link'
import { useClients } from '@/contexts/clients-context'
import { useMaterialLists } from '@/contexts/material-lists-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MaterialItemRow } from '@/components/quote/material-item-row'
import type { MaterialList, MaterialItem } from '@/lib/types'
import {
  DEFAULT_MATERIAL_UNIT,
  normalizeStoredQuantity,
  QUANTITY_HELP_TEXT,
  resolveMaterialUnit,
} from '@/lib/material-units'
import { Plus, Save, ArrowLeft, Loader2, Package } from 'lucide-react'

interface MaterialListFormProps {
  initialData?: MaterialList
}

export function MaterialListForm({ initialData }: MaterialListFormProps) {
  const router = useRouter()
  const { clients } = useClients()
  const { addMaterialList, updateMaterialList } = useMaterialLists()
  const isEdit = Boolean(initialData)

  const [selectedClientId, setSelectedClientId] = useState(initialData?.client.id || '')
  const [title, setTitle] = useState(initialData?.title || '')
  const [observations, setObservations] = useState(initialData?.observations || '')
  const [includePrices, setIncludePrices] = useState(initialData?.includePrices ?? false)
  const [items, setItems] = useState<MaterialItem[]>(
    initialData?.items?.length
      ? initialData.items.map((it) => ({
          id: it.id,
          name: it.name,
          quantity: normalizeStoredQuantity(Number(it.quantity), 1),
          unit: resolveMaterialUnit(it.unit),
          unitPrice: it.unitPrice,
        }))
      : [{ id: '1', name: '', quantity: 1, unit: DEFAULT_MATERIAL_UNIT, unitPrice: 0 }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addRow = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: '', quantity: 1, unit: DEFAULT_MATERIAL_UNIT, unitPrice: 0 },
    ])
  }

  const updateRow = (index: number, item: MaterialItem) => {
    const next = [...items]
    next[index] = item
    setItems(next)
  }

  const removeRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!selectedClientId) {
      setError('Selecione um cliente.')
      return
    }
    const payloadItems = items
      .filter((it) => it.name.trim() !== '')
      .map((it) => ({
        name: it.name.trim(),
        quantity: normalizeStoredQuantity(Number(it.quantity), 1),
        unit: resolveMaterialUnit(it.unit),
        unitPrice: includePrices ? Math.max(0, Number(it.unitPrice) || 0) : 0,
      }))
    if (payloadItems.length === 0) {
      setError('Informe ao menos um material com descrição.')
      return
    }

    setSaving(true)
    try {
      if (isEdit && initialData) {
        await updateMaterialList(initialData.id, {
          clientId: selectedClientId,
          title: title.trim() || undefined,
          observations: observations.trim() || undefined,
          includePrices,
          items: payloadItems,
        })
        router.push(`/dashboard/listas-materiais/${initialData.id}`)
      } else {
        const created = await addMaterialList({
          clientId: selectedClientId,
          title: title.trim() || undefined,
          observations: observations.trim() || undefined,
          includePrices,
          items: payloadItems,
        })
        router.push(`/dashboard/listas-materiais/${created.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl min-w-[48px] min-h-[48px]" asChild>
            <Link
              href={isEdit ? `/dashboard/listas-materiais/${initialData!.id}` : '/dashboard/listas-materiais'}
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isEdit ? `Editar ${initialData?.number}` : 'Nova lista de materiais'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Documento independente do orçamento — envie ao cliente o que ele precisa adquirir.
            </p>
          </div>
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="h-11 w-full sm:w-auto"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          Salvar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente cadastrado</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <Link href="/dashboard/clientes" className="text-primary hover:underline">
                  Cadastrar novo cliente
                </Link>{' '}
                se necessário.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ml-title">Título ou referência (opcional)</Label>
              <Input
                id="ml-title"
                placeholder="Ex.: Reforma banheiro — materiais"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
              <div>
                <p className="font-medium text-sm">Incluir valores no PDF</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se desligado, o PDF mostra só descrição e quantidade (lista de compras).
                </p>
              </div>
              <Switch checked={includePrices} onCheckedChange={setIncludePrices} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Instruções extras para o cliente (aparecem no PDF)..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={6}
              className="resize-none min-h-[140px]"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Itens
          </CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addRow} className="rounded-lg">
            <Plus className="w-4 h-4 mr-1" />
            Linha
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground -mt-1 mb-2">{QUANTITY_HELP_TEXT}</p>
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
            <span className={includePrices ? 'col-span-3' : 'col-span-5'}>Descrição</span>
            <span className={includePrices ? 'col-span-3' : 'col-span-3'}>Quantidade</span>
            <span className={includePrices ? 'col-span-2' : 'col-span-3'}>Unidade</span>
            {includePrices && (
              <>
                <span className="col-span-2">Valor unit.</span>
                <span className="col-span-1 text-right">Total</span>
              </>
            )}
            <span className="col-span-1" />
          </div>
          {items.map((item, index) => (
            <MaterialItemRow
              key={item.id}
              item={item}
              showPrices={includePrices}
              isLastRow={index === items.length - 1}
              onAddLine={addRow}
              onChange={(it) => updateRow(index, it)}
              onRemove={() => removeRow(index)}
            />
          ))}
        </CardContent>
      </Card>
    </form>
  )
}
