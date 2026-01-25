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
import { Plus, Save, ArrowLeft, UserCircle } from 'lucide-react'
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
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index))
    }
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
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index))
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validações básicas
      if (!client.name || !client.phone || !client.address) {
        setError('Preencha todos os dados do cliente')
        setIsSubmitting(false)
        return
      }

      const validServices = services.filter((s) => s && s.name && s.name.trim() && s.quantity > 0 && s.unitPrice > 0)
      const validMaterials = materials.filter((m) => m && m.name && m.name.trim() && m.quantity > 0 && m.unitPrice > 0)

      if (validServices.length === 0 && validMaterials.length === 0) {
        setError('Adicione pelo menos um servico ou material com nome, quantidade e preco validos')
        setIsSubmitting(false)
        return
      }

      const quoteData = {
        client: { ...client, id: client.id || Date.now().toString() },
        services: validServices,
        materials: validMaterials,
        subtotal,
        discount,
        total,
        observations,
        status: 'draft' as const,
      }

      if (initialData) {
        await updateQuote(initialData.id, quoteData)
        router.push(`/dashboard/orcamento/${initialData.id}`)
      } else {
        const newQuote = await addQuote(quoteData)
        router.push(`/dashboard/orcamento/${newQuote.id}`)
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
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button type="button" variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {initialData ? 'Editar Orcamento' : 'Novo Orcamento'}
          </h1>
          <p className="text-muted-foreground">Preencha os dados do orcamento</p>
        </div>
      </div>

      {/* Client Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Dados do Cliente</CardTitle>
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
                placeholder="Nome do cliente"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                required
                className="bg-background"
                disabled={!!selectedClientId && selectedClientId !== 'new'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Telefone</Label>
              <Input
                id="clientPhone"
                placeholder="(11) 99999-9999"
                value={client.phone}
                onChange={(e) => setClient({ ...client, phone: e.target.value })}
                required
                className="bg-background"
                disabled={!!selectedClientId && selectedClientId !== 'new'}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientAddress">Endereco</Label>
            <Input
              id="clientAddress"
              placeholder="Endereco completo"
              value={client.address}
              onChange={(e) => setClient({ ...client, address: e.target.value })}
              required
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
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Servicos</CardTitle>
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
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Materiais</CardTitle>
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
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Informacoes adicionais, condicoes, garantia..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={5}
              className="bg-background resize-none"
            />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">
                {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="discount" className="text-sm text-muted-foreground">
                Desconto
              </Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step={0.01}
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-32 bg-background text-right"
              />
            </div>
            <div className="border-t border-border pt-4 flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">
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
      <div className="flex justify-end gap-3">
        <Link href="/dashboard">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alteracoes' : 'Criar Orcamento'}
        </Button>
      </div>
    </form>
  )
}
