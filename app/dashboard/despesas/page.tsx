'use client'

import { useState, useMemo } from 'react'
import { useExpenses } from '@/contexts/expenses-context'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, Edit, DollarSign, Calendar, FileText } from 'lucide-react'
import type { Expense, ExpenseCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

const categoryLabels: Record<ExpenseCategory, string> = {
  material: 'Compra de Material',
  combustivel: 'Combustível',
  vale_funcionario: 'Vale para Funcionários',
  pagamento_funcionario: 'Pagamento de Funcionários',
  vale_gustavo: 'Vale Gustavo',
  vale_giovanni: 'Vale Giovanni',
}

const categoryColors: Record<ExpenseCategory, string> = {
  material: 'bg-blue-500/10 text-blue-500',
  combustivel: 'bg-orange-500/10 text-orange-500',
  vale_funcionario: 'bg-purple-500/10 text-purple-500',
  pagamento_funcionario: 'bg-red-500/10 text-red-500',
  vale_gustavo: 'bg-green-500/10 text-green-500',
  vale_giovanni: 'bg-yellow-500/10 text-yellow-500',
}

export default function DespesasPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, isLoading } = useExpenses()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({
    category: '' as ExpenseCategory | '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    observations: '',
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
      })
    } else {
      setEditingExpense(null)
      setFormData({
        category: '' as ExpenseCategory | '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        observations: '',
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
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category || !formData.description || !formData.amount || !formData.date) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('O valor deve ser maior que zero')
      return
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          category: formData.category as ExpenseCategory,
          description: formData.description,
          amount,
          date: new Date(formData.date),
          observations: formData.observations || undefined,
        })
      } else {
        await addExpense({
          category: formData.category as ExpenseCategory,
          description: formData.description,
          amount,
          date: new Date(formData.date),
          observations: formData.observations || undefined,
        })
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Gerencie todas as despesas da empresa</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialogForNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
              <DialogDescription>
                {editingExpense ? 'Atualize os dados da despesa' : 'Adicione uma nova despesa ao sistema'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
                >
                  <SelectTrigger>
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
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Compra de material para obra X"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observações adicionais (opcional)"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingExpense ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Card */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Despesas</p>
              <p className="text-3xl font-bold text-foreground">
                {totalExpenses.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
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
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="w-full">
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
            <Card key={expense.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn('text-xs', categoryColors[expense.category])}>
                        {categoryLabels[expense.category]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{expense.description}</h3>
                    {expense.observations && (
                      <p className="text-sm text-muted-foreground">{expense.observations}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground text-lg">
                        {expense.amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(expense)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
