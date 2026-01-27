'use client'

import { useState, useMemo } from 'react'
import { useExpenses } from '@/contexts/expenses-context'
import { useEmployees } from '@/contexts/employees-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Trash2, Edit, DollarSign, Calendar, FileText, Download } from 'lucide-react'
import type { Expense, ExpenseCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import { exportExpensesToCSV } from '@/lib/export-utils'

const categoryLabels: Record<ExpenseCategory, string> = {
  material: 'Material',
  combustivel: 'Combustível',
  almoco: 'Almoço',
  almoco_funcionario: 'Almoço para Funcionário',
  vale_funcionario: 'Vale para Funcionários',
  pagamento_funcionario: 'Pagamento de Funcionários',
  vale_gustavo: 'Vale Gustavo',
  vale_giovanni: 'Vale Giovanni',
}

const categoryColors: Record<ExpenseCategory, string> = {
  material: 'bg-blue-500/10 text-blue-500',
  combustivel: 'bg-orange-500/10 text-orange-500',
  almoco: 'bg-pink-500/10 text-pink-500',
  almoco_funcionario: 'bg-rose-500/10 text-rose-500',
  vale_funcionario: 'bg-purple-500/10 text-purple-500',
  pagamento_funcionario: 'bg-red-500/10 text-red-500',
  vale_gustavo: 'bg-green-500/10 text-green-500',
  vale_giovanni: 'bg-yellow-500/10 text-yellow-500',
}

export default function DespesasPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, isLoading } = useExpenses()
  const { employees } = useEmployees()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({
    category: '' as ExpenseCategory | '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    observations: '',
    employeeId: '',
  })

  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
      
      const expenseDate = new Date(expense.date)
      const matchesStartDate = !filterStartDate || expenseDate >= new Date(filterStartDate)
      const matchesEndDate = !filterEndDate || expenseDate <= new Date(filterEndDate + 'T23:59:59')

      return matchesCategory && matchesStartDate && matchesEndDate
    })
  }, [expenses, filterCategory, filterStartDate, filterEndDate])

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  }, [filteredExpenses])

  const handleOpenDialogForNew = () => {
    setEditingExpense(null)
    setFormData({
      category: '' as ExpenseCategory | '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      observations: '',
      employeeId: '',
    })
    setIsDialogOpen(true)
  }

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        date: new Date(expense.date).toISOString().split('T')[0],
        observations: expense.observations || '',
        employeeId: expense.employeeId || '',
      })
    } else {
      setEditingExpense(null)
      setFormData({
        category: '' as ExpenseCategory | '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        observations: '',
        employeeId: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingExpense(null)
    setFormData({
      category: '' as ExpenseCategory | '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      observations: '',
      employeeId: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category || !formData.amount || !formData.date) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('O valor deve ser maior que zero')
      return
    }

    try {
      const expenseData = {
        category: formData.category as ExpenseCategory,
        description: formData.description,
        amount,
        date: new Date(formData.date),
        observations: formData.observations || undefined,
        employeeId: (formData.category === 'vale_funcionario' || formData.category === 'pagamento_funcionario' || formData.category === 'almoco_funcionario') && formData.employeeId
          ? formData.employeeId
          : undefined,
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData)
      } else {
        await addExpense(expenseData)
      }
      handleCloseDialog()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar despesa')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        await deleteExpense(id)
      } catch (error: any) {
        alert(error.message || 'Erro ao excluir despesa')
      }
    }
  }

  const clearFilters = () => {
    setFilterCategory('all')
    setFilterStartDate('')
    setFilterEndDate('')
  }

  const hasActiveFilters = filterCategory !== 'all' || filterStartDate || filterEndDate

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">Despesas</h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium">Gerencie todas as despesas da empresa</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => exportExpensesToCSV(filteredExpenses)}
            disabled={filteredExpenses.length === 0}
            className="min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto"
          >
            <Download className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={handleOpenDialogForNew} className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto">
            <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            Nova Despesa
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              handleCloseDialog()
            }
          }}>
            <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                  {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  {editingExpense ? 'Atualize os dados da despesa' : 'Adicione uma nova despesa ao sistema'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="font-medium text-sm sm:text-base">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
                  >
                    <SelectTrigger className="bg-background min-h-[48px] text-base sm:text-sm">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-medium text-sm sm:text-base">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Compra de material para obra X (opcional)"
                    className="bg-background min-h-[48px] text-base sm:text-sm"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="font-medium text-sm sm:text-base">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="bg-background min-h-[48px] text-base sm:text-sm"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="font-medium text-sm sm:text-base">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="bg-background min-h-[48px] text-base sm:text-sm"
                  />
                </div>

                {(formData.category === 'vale_funcionario' || formData.category === 'pagamento_funcionario' || formData.category === 'almoco_funcionario') && (
                  <div className="space-y-2">
                    <Label htmlFor="employeeId" className="font-medium">Funcionário</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione o funcionário (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum (geral)</SelectItem>
                        {employees.filter(emp => emp.isActive).map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} {employee.position ? `(${employee.position})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="observations" className="font-medium text-sm sm:text-base">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Observações adicionais (opcional)"
                    rows={3}
                    className="bg-background resize-none text-base sm:text-sm min-h-[100px]"
                    autoComplete="off"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseDialog}
                    className="rounded-xl min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 min-h-[48px] text-base sm:text-sm touch-manipulation w-full sm:w-auto"
                  >
                    {editingExpense ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Total Card */}
      <Card className="border-2 border-red-200/50 bg-gradient-to-br from-red-50/80 via-white to-red-50/40 shadow-lg">
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium text-muted-foreground mb-2">Total de Despesas</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">
                {totalExpenses.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shrink-0 ml-3">
              <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="min-h-[48px] text-base sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Data Inicial</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Data Final</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="min-h-[48px] text-base sm:text-sm"
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="w-full min-h-[48px] text-base sm:text-sm touch-manipulation">
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Carregando...</div>
          </CardContent>
        </Card>
      ) : filteredExpenses.length > 0 ? (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <Card key={expense.id} className="border-border/50 bg-white/60 backdrop-blur-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] touch-manipulation">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                      <Badge className={cn('text-xs font-semibold px-2.5 py-1 shrink-0', categoryColors[expense.category])}>
                        {categoryLabels[expense.category]}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4 sm:w-3 sm:h-3" />
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5 text-base sm:text-lg">
                      {expense.description || expense.category}
                    </h3>
                    {expense.observations && (
                      <p className="text-sm sm:text-base text-muted-foreground italic">{expense.observations}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-foreground text-xl sm:text-2xl">
                        {expense.amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(expense)}
                        className="rounded-lg hover:bg-accent/50 min-w-[48px] min-h-[48px] sm:min-w-[40px] sm:min-h-[40px] touch-manipulation"
                      >
                        <Edit className="w-5 h-5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        className="rounded-lg hover:bg-destructive/10 min-w-[48px] min-h-[48px] sm:min-w-[40px] sm:min-h-[40px] touch-manipulation"
                      >
                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma despesa encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Tente ajustar os filtros para encontrar mais resultados.'
                  : 'Comece adicionando sua primeira despesa.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
