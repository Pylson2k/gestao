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
import { Plus, Save, ArrowLeft, UserCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

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
      phone: '',
      address: '',
    }
  )

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new') {
      setSelectedClientId('')
      setClient({ id: '', name: '', phone: '', address: '' })
      return
    }

    const selectedClient = clients.find(c => c.id === clientId)
    if (selectedClient) {
      setSelectedClientId(clientId)
      setClient({
        id: selectedClient.id,
        name: selectedClient.name,
        phone: selectedClient.phone,
        address: selectedClient.address,
        email: selectedClient.email,
      })
    }
  }

  const [services, setServices] = useState<ServiceItem[]>(
    initialData?.services || [{ id: '1', name: '', quantity: 1, unitPrice: 0 }]
  )

  const [materials, setMaterials] = useState<MaterialItem[]>(
    initialData?.materials || [{ id: '1', name: '', quantity: 1, unitPrice: 0 }]
  )

  const [discount, setDiscount] = useState(initialData?.discount || 0)
  const [observations, setObservations] = useState(initialData?.observations || '')

  const { subtotal, total } = useMemo(
    () => calculateQuoteTotals(services, materials, discount),
    [services, materials, discount]
  )

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
      { id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0 },
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
        client: { ...client, id: client.id || Date.now().toString() },
        services,
        materials,
        subtotal,
        discount,
        total,
        observations,
        status: 'draft' as const,
      }

      if (initialData) {
        await updateQuote(initialData.id, quoteData)
        setIsSubmitting(false)
        // Usar replace para evitar problemas de navegação
        router.replace(`/dashboard/orcamento/${initialData.id}`)
      } else {
        const newQuote = await addQuote(quoteData)
        setIsSubmitting(false)
        // Usar replace e garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 50))
        router.replace(`/dashboard/orcamento/${newQuote.id}`)
      }
    } catch (err: any) {
      console.error('Error creating quote:', err)
      setError(err.message || 'Erro ao criar orcamento. Tente novamente.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-border/50">
        <Link href="/dashboard">
          <Button type="button" variant="ghost" size="icon" className="rounded-xl hover:bg-accent/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
            {initialData ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Preencha como quiser — nada é obrigatório</p>
        </div>
      </div>

      {/* Client Info */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
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
            <Label htmlFor="clientAddress">Endereco</Label>
            <Input
              id="clientAddress"
              placeholder="Endereco (opcional)"
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
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
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
              <Link href="/dashboard/servicos">
                <Button type="button" variant="outline" size="sm">
                  Cadastrar Serviços
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
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
              onChange={(updated) => updateService(index, updated)}
              onRemove={() => removeService(index)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Materiais</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="col-span-5">Descricao</div>
            <div className="col-span-2">Quantidade</div>
            <div className="col-span-2">Valor Unit.</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1" />
          </div>
          {materials.map((item, index) => (
            <MaterialItemRow
              key={item.id}
              item={item}
              onChange={(updated) => updateMaterial(index, updated)}
              onRemove={() => removeMaterial(index)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Summary & Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-amber-700">Observações</CardTitle>
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

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 shadow-lg">
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
            <div className="border-t-2 border-primary/30 pt-5 mt-2 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-xl">
              <span className="font-bold text-foreground text-lg">Total</span>
              <span className="text-3xl font-bold text-primary tracking-tight">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
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
        <Link href="/dashboard">
          <Button type="button" variant="outline" disabled={isSubmitting} className="rounded-xl border-2 hover:bg-accent/50">
            Cancelar
          </Button>
        </Link>
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {initialData ? 'Salvar Alterações' : 'Criar Orçamento'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
