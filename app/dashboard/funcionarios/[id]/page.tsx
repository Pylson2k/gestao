'use client'

import { useParams } from 'next/navigation'
import { useEmployees } from '@/contexts/employees-context'
import { useExpenses } from '@/contexts/expenses-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DollarSign, Calendar, FileText } from 'lucide-react'
import { Link } from '@/components/app-link'
import { useMemo } from 'react'

export default function FuncionarioDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { employees } = useEmployees()
  const { expenses } = useExpenses()

  const employee = employees.find(emp => emp.id === id)

  const employeeExpenses = useMemo(() => {
    return expenses.filter(exp => exp.employeeId === id)
  }, [expenses, id])

  const totalExpenses = useMemo(() => {
    return employeeExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  }, [employeeExpenses])

  const monthlyExpenses = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    return employeeExpenses
      .filter(exp => {
        const expDate = new Date(exp.date)
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
      })
      .reduce((sum, exp) => sum + exp.amount, 0)
  }, [employeeExpenses])

  if (!employee) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/funcionarios">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">Funcionário não encontrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/funcionarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
          {employee.position && (
            <p className="text-muted-foreground">{employee.position}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Despesas</p>
                <p className="text-2xl font-bold">{employeeExpenses.length}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gasto</p>
                <p className="text-2xl font-bold text-red-500">
                  {totalExpenses.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gasto do Mês</p>
                <p className="text-2xl font-bold text-orange-500">
                  {monthlyExpenses.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          {employeeExpenses.length > 0 ? (
            <div className="space-y-3">
              {employeeExpenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{expense.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {expense.category === 'vale_funcionario' && 'Vale'}
                          {expense.category === 'pagamento_funcionario' && 'Pagamento'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {expense.amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma despesa registrada para este funcionário</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
