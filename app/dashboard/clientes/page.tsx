'use client'

import { useState, useMemo } from 'react'
import { useClients } from '@/contexts/clients-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, Edit, UserCircle, Phone, MapPin, Mail, FileText, DollarSign, Calendar, Download } from 'lucide-react'
import type { Client } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useQuotes } from '@/contexts/quotes-context'
import { exportClientsToCSV } from '@/lib/export-utils'

export default function ClientesPage() {
  const { clients, addClient, updateClient, deleteClient, isLoading } = useClients()
  const { quotes } = useQuotes()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients
    
    const searchLower = searchTerm.toLowerCase()
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchLower) ||
      client.phone.toLowerCase().includes(searchLower) ||
      client.address.toLowerCase().includes(searchLower) ||
      (client.email && client.email.toLowerCase().includes(searchLower))
    )
  }, [clients, searchTerm])

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        name: client.name,
        phone: client.phone,
        address: client.address,
        email: client.email || '',
      })
    } else {
      setEditingClient(null)
      setFormData({
        name: '',
        phone: '',
        address: '',
        email: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingClient(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const clientData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        email: formData.email.trim() || undefined,
      }

      if (editingClient) {
        await updateClient(editingClient.id, clientData)
      } else {
        await addClient(clientData)
      }

      handleCloseDialog()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar cliente')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
      return
    }

    try {
      await deleteClient(id)
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir cliente')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCircle className="w-6 h-6" />
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de clientes e seus orçamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportClientsToCSV(clients)}
            disabled={clients.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient
                  ? 'Atualize as informações do cliente'
                  : 'Preencha os dados do novo cliente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Nome completo ou razão social"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingClient ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
            <UserCircle className="w-8 h-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Buscar Cliente</Label>
            <Input
              placeholder="Nome, telefone, endereço ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Carregando clientes...</div>
          </CardContent>
        </Card>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <span className="flex-1">{client.address}</span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {(() => {
                    const clientQuotes = quotes.filter(q => q.client.id === client.id)
                    const totalValue = clientQuotes.reduce((sum, q) => sum + q.total, 0)
                    const completedQuotes = clientQuotes.filter(q => q.status === 'completed')
                    const completedValue = completedQuotes.reduce((sum, q) => sum + q.total, 0)
                    
                    return (
                      <div className="pt-2 border-t space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Orçamentos:</span>
                          <span className="font-medium">{clientQuotes.length}</span>
                        </div>
                        {completedQuotes.length > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Finalizados:</span>
                            <span className="font-medium text-green-500">{completedQuotes.length}</span>
                          </div>
                        )}
                        {totalValue > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-medium">
                              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(client)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedClientId(selectedClientId === client.id ? null : client.id)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Histórico
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(client.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
                {selectedClientId === client.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">Histórico de Orçamentos</h4>
                    {(() => {
                      const clientQuotes = quotes
                        .filter(q => q.client.id === client.id)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      
                      if (clientQuotes.length === 0) {
                        return <p className="text-xs text-muted-foreground">Nenhum orçamento encontrado</p>
                      }
                      
                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {clientQuotes.map((quote) => (
                            <Link
                              key={quote.id}
                              href={`/dashboard/orcamento/${quote.id}`}
                              className="block p-2 rounded border hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-xs font-medium">{quote.number}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold">
                                    {quote.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {quote.status === 'draft' && 'Rascunho'}
                                    {quote.status === 'sent' && 'Enviado'}
                                    {quote.status === 'approved' && 'Aprovado'}
                                    {quote.status === 'rejected' && 'Rejeitado'}
                                    {quote.status === 'in_progress' && 'Em Andamento'}
                                    {quote.status === 'completed' && 'Finalizado'}
                                    {quote.status === 'cancelled' && 'Cancelado'}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <UserCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {clients.length === 0
                  ? 'Nenhum cliente cadastrado'
                  : 'Nenhum cliente encontrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {clients.length === 0
                  ? 'Comece cadastrando seu primeiro cliente'
                  : 'Tente ajustar os termos de busca'}
              </p>
              {clients.length === 0 && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Cliente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
