'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useEmployees } from '@/contexts/employees-context'
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
import { Plus, Trash2, Edit, Users, CheckCircle, XCircle, DollarSign, Download, FileText } from 'lucide-react'
import type { Employee } from '@/lib/types'
import { cn } from '@/lib/utils'
import { exportEmployeesToCSV } from '@/lib/export-utils'

export default function FuncionariosPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, isLoading } = useEmployees()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    position: '',
    hireDate: '',
    observations: '',
    isActive: true,
  })

  const [filterActive, setFilterActive] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesActive = filterActive === 'all' || 
        (filterActive === 'active' && employee.isActive) ||
        (filterActive === 'inactive' && !employee.isActive)
      
      const matchesSearch = !searchTerm || 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.cpf?.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesActive && matchesSearch
    })
  }, [employees, filterActive, searchTerm])

  const activeEmployees = useMemo(() => {
    return employees.filter(emp => emp.isActive).length
  }, [employees])

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee)
      setFormData({
        name: employee.name,
        cpf: employee.cpf || '',
        phone: employee.phone || '',
        email: employee.email || '',
        position: employee.position || '',
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
        observations: employee.observations || '',
        isActive: employee.isActive,
      })
    } else {
      setEditingEmployee(null)
      setFormData({
        name: '',
        cpf: '',
        phone: '',
        email: '',
        position: '',
        hireDate: '',
        observations: '',
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingEmployee(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const employeeData = {
        name: formData.name.trim(),
        cpf: formData.cpf.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        position: formData.position.trim() || null,
        hireDate: formData.hireDate || null,
        observations: formData.observations.trim() || null,
        isActive: formData.isActive,
      }

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeData)
      } else {
        await addEmployee(employeeData)
      }

      handleCloseDialog()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar funcionario')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionario?')) {
      return
    }

    try {
      await deleteEmployee(id)
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir funcionario')
    }
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" />
            Funcionários
          </h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de funcionários e seus gastos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportEmployeesToCSV(employees)}
            disabled={employees.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? 'Atualize as informações do funcionário'
                  : 'Preencha os dados do novo funcionário'}
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
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Ex: Eletricista, Pedreiro, etc"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Data de Admissão</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Informações adicionais sobre o funcionário"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Funcionário ativo
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'Atualizar' : 'Criar'}
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
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Funcionários</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
                <p className="text-2xl font-bold text-green-500">{activeEmployees}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Funcionários Inativos</p>
                <p className="text-2xl font-bold text-red-500">
                  {employees.length - activeEmployees}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Nome, cargo ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

      {/* Employees List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Carregando funcionários...</div>
          </CardContent>
        </Card>
      ) : filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className={cn(
              "border-border",
              !employee.isActive && "opacity-60"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    {employee.position && (
                      <p className="text-sm text-muted-foreground mt-1">{employee.position}</p>
                    )}
                  </div>
                  <Badge variant={employee.isActive ? "default" : "secondary"}>
                    {employee.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {employee.cpf && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">CPF:</span> {employee.cpf}
                    </p>
                  )}
                  {employee.phone && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Telefone:</span> {employee.phone}
                    </p>
                  )}
                  {employee.email && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Email:</span> {employee.email}
                    </p>
                  )}
                  {employee.hireDate && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Admissão:</span> {formatDate(employee.hireDate)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(employee)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Link href={`/dashboard/funcionarios/${employee.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Relatório
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(employee.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
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
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum funcionário encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                {employees.length === 0
                  ? 'Comece cadastrando seu primeiro funcionário'
                  : 'Nenhum funcionário corresponde aos filtros selecionados'}
              </p>
              {employees.length === 0 && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Funcionário
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
