'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useServices } from '@/contexts/services-context'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Edit, Wrench, CheckCircle, XCircle, DollarSign, Download, Sparkles, Loader2 } from 'lucide-react'
import type { Service } from '@/lib/types'
import { cn } from '@/lib/utils'
import { exportServicesToCSV } from '@/lib/export-utils'

const unitOptions = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'ponto', label: 'Ponto' },
  { value: 'hora', label: 'Hora' },
  { value: 'm²', label: 'm²' },
  { value: 'm³', label: 'm³' },
  { value: 'metro', label: 'Metro' },
  { value: 'kg', label: 'Kg' },
  { value: 'tonelada', label: 'Tonelada' },
  { value: 'dia', label: 'Dia' },
  { value: 'mes', label: 'Mês' },
  { value: 'servico', label: 'Serviço' },
]

export default function ServicosPage() {
  const { services, addService, updateService, deleteService, isLoading, refreshServices } = useServices()
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitPrice: '',
    unit: 'unidade',
    isActive: true,
  })

  const [filterActive, setFilterActive] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSeeding, setIsSeeding] = useState(false)

  // Buscar todos os serviços (incluindo inativos) para a página
  const [allServices, setAllServices] = useState<Service[]>([])
  const [isFetchingServices, setIsFetchingServices] = useState(false)
  
  const fetchAllServices = useCallback(async () => {
    if (!user?.id || isFetchingServices) return
    
    setIsFetchingServices(true)
    try {
      const response = await fetch('/api/services', {
        headers: {
          'x-user-id': user.id,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setAllServices(data.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })))
      }
    } catch (error) {
      console.error('Error fetching all services:', error)
    } finally {
      setIsFetchingServices(false)
    }
  }, [user?.id, isFetchingServices])

  useEffect(() => {
    fetchAllServices()
  }, [fetchAllServices])

  // Atualizar dados em tempo real (polling a cada 5 segundos, apenas se página visível)
  useEffect(() => {
    if (!user?.id) return

    let interval: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval)
        interval = null
      } else {
        if (!interval) {
          interval = setInterval(() => {
            if (!isFetchingServices) {
              fetchAllServices()
            }
          }, 5000)
        }
      }
    }

    if (!document.hidden) {
      interval = setInterval(() => {
        if (!isFetchingServices) {
          fetchAllServices()
        }
      }, 5000)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchAllServices, user?.id, isFetchingServices])

  const filteredServices = useMemo(() => {
    let filtered = allServices.length > 0 ? allServices : services
    
    // Filtrar por status
    if (filterActive !== 'all') {
      filtered = filtered.filter((service) =>
        filterActive === 'active' ? service.isActive : !service.isActive
      )
    }
    
    // Filtrar por busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((service) =>
        service.name.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower) ||
        service.unit.toLowerCase().includes(searchLower)
      )
    }
    
    return filtered
  }, [allServices, services, filterActive, searchTerm])

  const activeServices = useMemo(() => {
    const all = allServices.length > 0 ? allServices : services
    return all.filter(s => s.isActive).length
  }, [allServices, services])

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        description: service.description || '',
        unitPrice: service.unitPrice.toString(),
        unit: service.unit,
        isActive: service.isActive,
      })
    } else {
      setEditingService(null)
      setFormData({
        name: '',
        description: '',
        unitPrice: '',
        unit: 'unidade',
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingService(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        unitPrice: parseFloat(formData.unitPrice),
        unit: formData.unit.trim(),
        isActive: formData.isActive,
      }

      if (editingService) {
        await updateService(editingService.id, serviceData)
      } else {
        await addService(serviceData)
      }

      // Atualizar lista completa
      if (user?.id) {
        const response = await fetch('/api/services', {
          headers: {
            'x-user-id': user.id,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setAllServices(data.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          })))
        }
      }

      handleCloseDialog()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar servico')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) {
      return
    }

    try {
      await deleteService(id)
      // Atualizar lista completa
      if (user?.id) {
        const response = await fetch('/api/services', {
          headers: {
            'x-user-id': user.id,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setAllServices(data.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          })))
        }
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir servico')
    }
  }

  const handleExport = () => {
    const servicesToExport = allServices.length > 0 ? allServices : services
    exportServicesToCSV(servicesToExport)
  }

  const handleSeedServices = async () => {
    if (!user?.id) {
      alert('Usuário não autenticado')
      return
    }

    if (allServices.length > 0) {
      const confirmMessage = `Você já possui ${allServices.length} serviço(s) cadastrado(s).\n\nPara popular os serviços pré-definidos, você precisa excluir os serviços existentes primeiro.\n\nDeseja continuar?`
      if (!confirm(confirmMessage)) {
        return
      }
    } else {
      if (!confirm('Deseja popular os serviços pré-definidos de elétrica?\n\nIsso criará 20 serviços com valores médios do mercado.')) {
        return
      }
    }

    setIsSeeding(true)
    try {
      const response = await fetch('/api/services/seed', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400 && data.existingCount) {
          alert(`Erro: ${data.message}\n\nVocê possui ${data.existingCount} serviço(s) cadastrado(s). Exclua-os primeiro ou adicione manualmente.`)
        } else {
          alert(`Erro: ${data.error || 'Erro ao popular serviços'}`)
        }
        return
      }

      alert(`Sucesso! ${data.count} serviços pré-definidos foram criados.\n\nVocê pode editá-los conforme necessário.`)

      // Atualizar lista de serviços
      if (user?.id) {
        const refreshResponse = await fetch('/api/services', {
          headers: {
            'x-user-id': user.id,
          },
        })
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setAllServices(refreshData.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          })))
        }
      }
      await refreshServices()
    } catch (error: any) {
      console.error('Error seeding services:', error)
      alert(`Erro ao popular serviços: ${error.message}`)
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6 sm:w-5 sm:h-5" />
            Serviços
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Cadastre serviços para agilizar a criação de orçamentos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleSeedServices}
            disabled={isSeeding || isLoading}
            className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto border-purple-200 hover:border-purple-400 hover:bg-purple-50"
          >
            {isSeeding ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2 animate-spin" />
                Populando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Popular Serviços Pré-definidos
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={(allServices.length > 0 ? allServices : services).length === 0}
            className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto"
          >
            <Download className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
                <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  {editingService
                    ? 'Atualize as informações do serviço'
                    : 'Preencha os dados do novo serviço'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name" className="text-sm sm:text-base">Nome do Serviço *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ex: Instalação elétrica, Pintura, etc"
                      className="min-h-[48px] text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice" className="text-sm sm:text-base">Preço Unitário (R$) *</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      required
                      placeholder="0.00"
                      className="min-h-[48px] text-base sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit" className="text-sm sm:text-base">Unidade de Medida *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger className="min-h-[48px] text-base sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description" className="text-sm sm:text-base">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição detalhada do serviço (opcional)"
                      rows={3}
                      className="text-base sm:text-sm min-h-[100px]"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 w-5 h-5 sm:w-4 sm:h-4"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer text-sm sm:text-base">
                    Serviço ativo
                  </Label>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button type="submit" className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
                    {editingService ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-muted-foreground">Total de Serviços</p>
                <p className="text-2xl sm:text-3xl font-bold">{(allServices.length > 0 ? allServices : services).length}</p>
              </div>
              <Wrench className="w-8 h-8 sm:w-7 sm:h-7 text-muted-foreground shrink-0 ml-3" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-muted-foreground">Serviços Ativos</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-500">{activeServices}</p>
              </div>
              <CheckCircle className="w-8 h-8 sm:w-7 sm:h-7 text-green-500 shrink-0 ml-3" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-muted-foreground">Serviços Inativos</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-500">
                  {(allServices.length > 0 ? allServices : services).length - activeServices}
                </p>
              </div>
              <XCircle className="w-8 h-8 sm:w-7 sm:h-7 text-red-500 shrink-0 ml-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Buscar</Label>
              <Input
                placeholder="Nome, descrição ou unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Status</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm min-h-[48px]"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Carregando serviços...</div>
          </CardContent>
        </Card>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <Card key={service.id} className={cn(
              "border-border",
              !service.isActive && "opacity-60"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                  </div>
                  <Badge variant={service.isActive ? "default" : "secondary"}>
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Preço:</span>
                    <span className="font-semibold text-lg text-foreground">
                      {service.unitPrice.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unidade:</span>
                    <span className="font-medium">{service.unit}</span>
                  </div>
                  {service.description && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[48px] text-base sm:text-sm touch-manipulation"
                    onClick={() => handleOpenDialog(service)}
                  >
                    <Edit className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[48px] text-base sm:text-sm touch-manipulation text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Wrench className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum serviço encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                {(allServices.length > 0 ? allServices : services).length === 0
                  ? 'Comece cadastrando seu primeiro serviço'
                  : 'Nenhum serviço corresponde aos filtros selecionados'}
              </p>
              {(allServices.length > 0 ? allServices : services).length === 0 && (
                <Button onClick={() => handleOpenDialog()} className="min-h-[48px] text-base sm:text-sm touch-manipulation">
                  <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Cadastrar Serviço
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
