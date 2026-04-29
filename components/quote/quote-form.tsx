'use client'

import React from "react"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuotes, calculateQuoteTotals } from '@/contexts/quotes-context'
import { useClients } from '@/contexts/clients-context'
import { useServices } from '@/contexts/services-context'
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
import { ServiceItemRow } from './service-item-row'
import { MaterialItemRow } from './material-item-row'
import type { Client, ServiceItem, MaterialItem, Quote } from '@/lib/types'
import {
  DEFAULT_MATERIAL_UNIT,
  normalizeStoredQuantity,
  QUANTITY_HELP_TEXT,
  resolveMaterialUnit,
} from '@/lib/material-units'
import { Plus, Save, ArrowLeft, UserCircle, Loader2, CreditCard, ClipboardCheck, Clock } from 'lucide-react'
import { Link } from '@/components/app-link'

interface QuoteFormProps {
  initialData?: Quote
}

export function QuoteForm({ initialData }: QuoteFormProps) {
  const router = useRouter()
  const { addQuote, updateQuote } = useQuotes()
  const { clients } = useClients()
  const { services: catalogServices } = useServices()
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialData?.client?.id || ''
  )

  const [client, setClient] = useState<Client>(
    initialData?.client || {
      id: '',
      name: '',
      document: '',
      phone: '',
      address: '',
    }
  )

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new') {
      setSelectedClientId('')
      setClient({ id: '', name: '', document: '', phone: '', address: '' })
      return
    }

    const selectedClient = clients.find(c => c.id === clientId)
    if (selectedClient) {
      setSelectedClientId(clientId)
      setClient({
        id: selectedClient.id,
        name: selectedClient.name,
        document: selectedClient.document,
        phone: selectedClient.phone,
        address: selectedClient.address,
        email: selectedClient.email,
      })
    }
  }

  const [services, setServices] = useState<ServiceItem[]>(
    initialData?.services || [{ id: '1', name: '', quantity: 1, unitPrice: 0 }]
  )

  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    if (initialData?.materials?.length) {
      return initialData.materials.map((m) => ({
        ...m,
        unit: resolveMaterialUnit(m.unit),
        quantity: normalizeStoredQuantity(Number(m.quantity), 1),
      }))
    }
    return [{ id: '1', name: '', quantity: 1, unit: DEFAULT_MATERIAL_UNIT, unitPrice: 0 }]
  })

  const [discount, setDiscount] = useState(initialData?.discount || 0)
  const [observations, setObservations] = useState(initialData?.observations || '')
  const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms || '')
  const [conditions, setConditions] = useState(initialData?.conditions || '')
  const [deadlines, setDeadlines] = useState(initialData?.deadlines || '')
  const [totalOverride, setTotalOverride] = useState<number | null>(null)

  const { subtotal, total: calculatedTotal } = useMemo(
    () => calculateQuoteTotals(services, materials, discount),
    [services, materials, discount]
  )
  const total = totalOverride !== null ? totalOverride : calculatedTotal

  const addService = () => {
    setServices([
      ...services,
      { id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0 },
    ])
  }

  const updateService = (index: number, item: ServiceItem) => {
    const newServices = [...services]
    newServices[index] = item
    setServices(newServices)
  }

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const addMaterial = () => {
    setMaterials([
      ...materials,
      {
        id: Date.now().toString(),
        name: '',
        quantity: 1,
        unit: DEFAULT_MATERIAL_UNIT,
        unitPrice: 0,
      },
    ])
  }

  const updateMaterial = (index: number, item: MaterialItem) => {
    const newMaterials = [...materials]
    newMaterials[index] = item
    setMaterials(newMaterials)
  }

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index))
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const quoteData = {
        // id vazio = novo cliente no servidor; id preenchido = reutiliza cadastro ao criar orçamento
        client,
        services,
        materials,
        subtotal,
        discount,
        total,
        observations,
        paymentTerms,
        conditions,
        deadlines,
        status: 'draft' as const,
      }

      if (initialData) {
        await updateQuote(initialData.id, quoteData)
        setIsSubmitting(false)
        router.replace(`/dashboard/orcamento/${initialData.id}`)
      } else {
        const newQuote = await addQuote(quoteData)
        setIsSubmitting(false)
        router.replace(`/dashboard/orcamento/${newQuote.id}`)
      }
    } catch (err: any) {
      console.error('Error creating quote:', err)
      setError(err.message || 'Erro ao criar orçamento. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-border/50">
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent/50" asChild>
          <Link href="/dashboard" aria-label="Voltar ao dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
            {initialData ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Preencha como quiser — nada é obrigatório</p>
        </div>
      </div>

      {/* Client Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!initialData && clients.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="clientSelect">Selecionar Cliente Existente</Label>
              <Select value={selectedClientId || 'new'} onValueChange={handleClientSelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione um cliente ou crie um novo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Novo Cliente
                    </div>
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} - {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ou <Link href="/dashboard/clientes" className="text-primary hover:underline">cadastre um novo cliente</Link> antes de criar o orçamento
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome</Label>
              <Input
                id="clientName"
                placeholder="Nome do cliente (opcional)"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                className="bg-background"
                disabled={!!selectedClientId && selectedClientId !== 'new'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Telefone</Label>
              <Input
                id="clientPhone"
                placeholder="(11) 99999-9999 (opcional)"
                value={client.phone}
                onChange={(e) => setClient({ ...client, phone: e.target.value })}
                className="bg-background"
                disabled={!!selectedClientId && selectedClientId !== 'new'}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientDocument">CPF/CNPJ</Label>
            <Input
              id="clientDocument"
              placeholder="CPF ou CNPJ do cliente (opcional)"
              value={client.document || ''}
              onChange={(e) => setClient({ ...client, document: e.target.value })}
              inputMode="numeric"
              className="bg-background"
              disabled={!!selectedClientId && selectedClientId !== 'new'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientAddress">Endereço</Label>
            <Input
              id="clientAddress"
              placeholder="Endereço (opcional)"
              value={client.address}
              onChange={(e) => setClient({ ...client, address: e.target.value })}
              className="bg-background"
              disabled={!!selectedClientId && selectedClientId !== 'new'}
            />
          </div>
          {client.email !== undefined && (
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email (opcional)</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="email@exemplo.com"
                value={client.email || ''}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                className="bg-background"
                disabled={!!selectedClientId && selectedClientId !== 'new'}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Serviços</CardTitle>
          <div className="flex gap-2">
            {catalogServices.length > 0 && (
              <Select
                onValueChange={(serviceId) => {
                  const selectedService = catalogServices.find(s => s.id === serviceId)
                  if (selectedService) {
                    const newService: ServiceItem = {
                      id: Date.now().toString(),
                      name: selectedService.name,
                      quantity: 1,
                      unitPrice: selectedService.unitPrice,
                    }
                    setServices([...services, newService])
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Adicionar do catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {catalogServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{service.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addService}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Manual
            </Button>
            {catalogServices.length === 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/operacao/servicos">Cadastrar serviços</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground -mt-1">
            Enter: descrição → quantidade → valor; na última linha, Enter no valor adiciona outro serviço.
          </p>
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-5">Descricao</div>
            <div className="col-span-2">Quantidade</div>
            <div className="col-span-2">Valor Unit.</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1" />
          </div>
          {services.map((item, index) => (
            <ServiceItemRow
              key={item.id}
              item={item}
              isLastRow={index === services.length - 1}
              onAddLine={addService}
              onChange={(updated) => updateService(index, updated)}
              onRemove={() => removeService(index)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Materiais</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground -mt-1">{QUANTITY_HELP_TEXT}</p>
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-3">Descricao</div>
            <div className="col-span-3">Quantidade</div>
            <div className="col-span-2">Unidade</div>
            <div className="col-span-2">Valor Unit.</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1" />
          </div>
          {materials.map((item, index) => (
            <MaterialItemRow
              key={item.id}
              item={item}
              showPrices
              isLastRow={index === materials.length - 1}
              onAddLine={addMaterial}
              onChange={(updated) => updateMaterial(index, updated)}
              onRemove={() => removeMaterial(index)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Commercial Terms */}
      <Card className="border-y border-r border-border/80 border-l-4 border-l-primary">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Proposta Comercial</CardTitle>
          <p className="text-sm text-muted-foreground">
            Formalize pagamentos, condições e prazos para entregar uma proposta clara e profissional ao cliente.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Pagamentos
            </Label>
            <Textarea
              id="paymentTerms"
              placeholder="Ex.: 50% de entrada para mobilização e 50% na entrega. Aceitamos PIX, transferência ou cartão."
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              rows={7}
              className="min-h-36 bg-background rounded-xl border-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditions" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Condições
            </Label>
            <Textarea
              id="conditions"
              placeholder="Ex.: Valores sujeitos à validação técnica no local. Alterações de escopo serão orçadas separadamente."
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={7}
              className="min-h-36 bg-background rounded-xl border-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadlines" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Prazos
            </Label>
            <Textarea
              id="deadlines"
              placeholder="Ex.: Início em até 5 dias úteis após aprovação e confirmação da entrada. Execução estimada em 10 dias úteis."
              value={deadlines}
              onChange={(e) => setDeadlines(e.target.value)}
              rows={7}
              className="min-h-36 bg-background rounded-xl border-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary & Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-y border-r border-border/80 border-l-4 border-l-amber-500/50 bg-muted/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Informações adicionais, condições, garantia..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={5}
              className="bg-background resize-none rounded-xl border-2"
            />
          </CardContent>
        </Card>

        <Card className="border-y border-r border-border/80 border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground font-medium">Subtotal</span>
              <span className="font-bold text-foreground text-lg">
                {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-2 border-t border-border/50 pt-4">
              <Label htmlFor="discount" className="text-sm font-medium text-muted-foreground">
                Desconto (R$)
              </Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step={0.01}
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-36 bg-background text-right rounded-xl border-2"
              />
            </div>
            <div className="mt-2 flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/30 p-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Label htmlFor="total" className="font-bold text-foreground text-lg">
                Total do orçamento
              </Label>
              <Input
                id="total"
                type="number"
                min={0}
                step={0.01}
                placeholder="Digite o valor total"
                value={totalOverride !== null ? totalOverride : (calculatedTotal || '')}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '' || v === undefined) {
                    setTotalOverride(null)
                    return
                  }
                  const n = Number(v)
                  if (!Number.isNaN(n) && n >= 0) setTotalOverride(n)
                }}
                className="w-full sm:w-48 text-right text-xl font-bold text-primary h-12 rounded-xl border-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
        {isSubmitting ? (
          <Button type="button" variant="outline" disabled className="rounded-xl border-2 hover:bg-accent/50">
            Cancelar
          </Button>
        ) : (
          <Button variant="outline" className="rounded-xl border-2 hover:bg-accent/50" asChild>
            <Link href="/dashboard">Cancelar</Link>
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="h-11 rounded-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
            {initialData ? 'Salvar alterações' : 'Criar orçamento'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
