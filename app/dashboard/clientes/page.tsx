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
import { AppLink as Link } from '@/components/app-link'
import { useQuotes } from '@/contexts/quotes-context'
import { usePayments } from '@/contexts/payments-context'
import { exportClientsToCSV } from '@/lib/export-utils'

export default function ClientesPage() {
  const { clients, addClient, updateClient, deleteClient, isLoading } = useClients()
  const { quotes } = useQuotes()
  const { getTotalPaidByQuoteId } = usePayments()
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <UserCircle className="w-6 h-6 sm:w-5 sm:h-5" />
            Clientes
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Gerencie o cadastro de clientes e seus orçamentos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => exportClientsToCSV(clients)}
            disabled={clients.length === 0}
            className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto"
          >
            <Download className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
                <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingClient
                  ? 'Atualize as informações do cliente'
                  : 'Preencha os dados do novo cliente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Nome completo ou razão social"
                    className="min-h-[48px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="(00) 00000-0000"
                    className="min-h-[48px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-sm sm:text-base">Endereço *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    placeholder="Endereço completo"
                    className="min-h-[48px] text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="min-h-[48px] text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
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
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl sm:text-3xl font-bold">{clients.length}</p>
            </div>
            <UserCircle className="w-8 h-8 sm:w-7 sm:h-7 text-muted-foreground shrink-0 ml-3" />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Buscar Cliente</Label>
            <Input
              placeholder="Nome, telefone, endereço ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-h-[48px] text-base sm:text-sm"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="border-border hover:shadow-lg transition-all duration-300 active:scale-[0.98] touch-manipulation">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">{client.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="break-words">{client.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
                    <span className="flex-1 break-words">{client.address}</span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="break-words">{client.email}</span>
                    </div>
                  )}
                  {(() => {
                    const clientQuotes = quotes.filter(q => q.client.id === client.id)
                    const totalValue = clientQuotes.reduce((sum, q) => sum + q.total, 0)
                    const completedQuotes = clientQuotes.filter(q => q.status === 'completed')
                    let totalDebt = 0
                    clientQuotes.forEach((q) => {
                      if (q.status !== 'approved' && q.status !== 'in_progress' && q.status !== 'completed') return
                      const paid = getTotalPaidByQuoteId(q.id)
                      const debt = q.total - paid
                      if (debt > 0) totalDebt += debt
                    })
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
                            <span className="text-muted-foreground">Total orçado:</span>
                            <span className="font-medium">
                              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        )}
                        {totalDebt > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Saldo devedor:</span>
                            <span className="font-semibold text-amber-600">
                              {totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[48px] text-base sm:text-sm touch-manipulation"
                    onClick={() => handleOpenDialog(client)}
                  >
                    <Edit className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[48px] text-base sm:text-sm touch-manipulation"
                    onClick={() => setSelectedClientId(selectedClientId === client.id ? null : client.id)}
                  >
                    <FileText className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                    Histórico
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[48px] text-base sm:text-sm touch-manipulation text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(client.id)}
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
                {selectedClientId === client.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm sm:text-base mb-2">Histórico de Orçamentos</h4>
                    {(() => {
                      const clientQuotes = quotes
                        .filter(q => q.client.id === client.id)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      
                      if (clientQuotes.length === 0) {
                        return <p className="text-xs sm:text-sm text-muted-foreground">Nenhum orçamento encontrado</p>
                      }
                      
                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {clientQuotes.map((quote) => (
                            <Link
                              key={quote.id}
                              href={`/dashboard/orcamento/${quote.id}`}
                              className="block p-3 sm:p-2 rounded border hover:bg-accent transition-colors active:scale-[0.98] touch-manipulation"
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm sm:text-xs font-medium">{quote.number}</p>
                                  <p className="text-xs sm:text-xs text-muted-foreground">
                                    {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="text-left sm:text-right w-full sm:w-auto">
                                  <p className="text-sm sm:text-xs font-semibold">
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
                <Button onClick={() => handleOpenDialog()} className="min-h-[48px] text-base sm:text-sm touch-manipulation">
                  <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
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
