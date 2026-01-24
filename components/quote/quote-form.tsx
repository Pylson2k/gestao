'use client'

import React from "react"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuotes, calculateQuoteTotals } from '@/contexts/quotes-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceItemRow } from './service-item-row'
import { MaterialItemRow } from './material-item-row'
import type { Client, ServiceItem, MaterialItem, Quote } from '@/lib/types'
import { Plus, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface QuoteFormProps {
  initialData?: Quote
}

export function QuoteForm({ initialData }: QuoteFormProps) {
  const router = useRouter()
  const { addQuote, updateQuote } = useQuotes()

  const [client, setClient] = useState<Client>(
    initialData?.client || {
      id: '',
      name: '',
      phone: '',
      address: '',
    }
  )

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const quoteData = {
      client: { ...client, id: client.id || Date.now().toString() },
      services: services.filter((s) => s.name.trim()),
      materials: materials.filter((m) => m.name.trim()),
      subtotal,
      discount,
      total,
      observations,
      status: 'draft' as const,
    }

    if (initialData) {
      updateQuote(initialData.id, quoteData)
      router.push(`/dashboard/orcamento/${initialData.id}`)
    } else {
      const newQuote = addQuote(quoteData)
      router.push(`/dashboard/orcamento/${newQuote.id}`)
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Servicos</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addService}>
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

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href="/dashboard">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          {initialData ? 'Salvar Alteracoes' : 'Criar Orcamento'}
        </Button>
      </div>
    </form>
  )
}
