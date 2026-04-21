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
  vale_gustavo: 'Vale (proprietário)',
}

const categoryColors: Record<ExpenseCategory, string> = {
  material: 'bg-blue-500/10 text-blue-500',
  combustivel: 'bg-orange-500/10 text-orange-500',
  almoco: 'bg-pink-500/10 text-pink-500',
  almoco_funcionario: 'bg-rose-500/10 text-rose-500',
  vale_funcionario: 'bg-purple-500/10 text-purple-500',
  pagamento_funcionario: 'bg-red-500/10 text-red-500',
  vale_gustavo: 'bg-green-500/10 text-green-500',
}

function getCategoryLabel(category: string): string {
  return categoryLabels[category as ExpenseCategory] ?? category
}

function getCategoryColorClass(category: string): string {
  return categoryColors[category as ExpenseCategory] ?? 'bg-muted text-muted-foreground'
}

export function FinanceiroDespesasPage() {
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
        category: expense.category as ExpenseCategory,
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
        employeeId:
          (formData.category === 'vale_funcionario' ||
            formData.category === 'pagamento_funcionario' ||
            formData.category === 'almoco_funcionario') &&
          formData.employeeId
            ? formData.employeeId
            : undefined,
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData)
      } else {
        await addExpense(expenseData)
      }
      handleCloseDialog()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar despesa'
      alert(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        await deleteExpense(id)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erro ao excluir despesa'
        alert(msg)
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
      <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Despesas</h1>
          <p className="text-sm font-medium text-muted-foreground sm:text-base">
            Gerencie todas as despesas da empresa
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={() => exportExpensesToCSV(filteredExpenses)}
            disabled={filteredExpenses.length === 0}
            className="min-h-[48px] w-full touch-manipulation text-base sm:w-auto sm:text-sm"
          >
            <Download className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
            Exportar CSV
          </Button>
          <Button
            onClick={handleOpenDialogForNew}
            className="h-11 w-full touch-manipulation gap-2 text-base sm:w-auto sm:text-sm"
          >
            <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
            Nova Despesa
          </Button>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseDialog()
              }
            }}
          >
            <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                  {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  {editingExpense ? 'Atualize os dados da despesa' : 'Adicione uma nova despesa ao sistema'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium sm:text-base">
                    Categoria *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
                  >
                    <SelectTrigger className="min-h-[48px] bg-background text-base sm:text-sm">
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
                  <Label htmlFor="description" className="text-sm font-medium sm:text-base">
                    Descrição
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Compra de material para obra X (opcional)"
                    className="min-h-[48px] bg-background text-base sm:text-sm"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium sm:text-base">
                    Valor (R$) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="min-h-[48px] bg-background text-base sm:text-sm"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium sm:text-base">
                    Data *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="min-h-[48px] bg-background text-base sm:text-sm"
                  />
                </div>

                {(formData.category === 'vale_funcionario' ||
                  formData.category === 'pagamento_funcionario' ||
                  formData.category === 'almoco_funcionario') && (
                  <div className="space-y-2">
                    <Label htmlFor="employeeId" className="font-medium">
                      Funcionário
                    </Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione o funcionário (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum (geral)</SelectItem>
                        {employees
                          .filter((emp) => emp.isActive)
                          .map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name} {employee.position ? `(${employee.position})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="observations" className="text-sm font-medium sm:text-base">
                    Observações
                  </Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Observações adicionais (opcional)"
                    rows={3}
                    className="min-h-[100px] resize-none bg-background text-base sm:text-sm"
                    autoComplete="off"
                  />
                </div>

                <div className="flex flex-col justify-end gap-2 pt-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    className="min-h-[48px] w-full touch-manipulation rounded-xl text-base sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-11 w-full touch-manipulation text-base sm:w-auto sm:text-sm">
                    {editingExpense ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-y border-r border-border/80 border-l-4 border-l-destructive/50 bg-muted/20">
        <CardContent className="p-4 pt-4 sm:p-6 sm:pt-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-medium text-muted-foreground sm:text-base">Total de Despesas</p>
              <p className="text-2xl font-bold tracking-tight text-red-600 sm:text-3xl">
                {totalExpenses.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
            <div className="ml-3 shrink-0 rounded-xl bg-destructive/15 p-3 sm:p-4">
              <DollarSign className="h-7 w-7 text-destructive sm:h-8 sm:w-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-6 sm:pb-4">
          <CardTitle className="text-lg font-bold tracking-tight sm:text-xl">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="min-h-[48px] w-full touch-manipulation text-base sm:text-sm"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Carregando...</div>
          </CardContent>
        </Card>
      ) : filteredExpenses.length > 0 ? (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <Card
              key={expense.id}
              className="touch-manipulation border-border/80 transition-shadow hover:border-primary/25 hover:shadow-md"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="w-full min-w-0 flex-1 sm:w-auto">
                    <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3">
                      <Badge
                        className={cn(
                          'shrink-0 px-2.5 py-1 text-xs font-semibold',
                          getCategoryColorClass(expense.category)
                        )}
                      >
                        {getCategoryLabel(expense.category)}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4 sm:h-3 sm:w-3" />
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="mb-1.5 text-base font-semibold text-foreground sm:text-lg">
                      {expense.description || expense.category}
                    </h3>
                    {expense.observations && (
                      <p className="text-sm italic text-muted-foreground sm:text-base">{expense.observations}</p>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-bold text-foreground sm:text-2xl">
                        {expense.amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(expense)}
                        className="min-h-[48px] min-w-[48px] touch-manipulation rounded-lg hover:bg-accent/50 sm:min-h-[40px] sm:min-w-[40px]"
                      >
                        <Edit className="h-5 w-5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        className="min-h-[48px] min-w-[48px] touch-manipulation rounded-lg hover:bg-destructive/10 sm:min-h-[40px] sm:min-w-[40px]"
                      >
                        <Trash2 className="h-5 w-5 text-destructive sm:h-4 sm:w-4" />
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
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">Nenhuma despesa encontrada</h3>
              <p className="mb-4 text-muted-foreground">
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
