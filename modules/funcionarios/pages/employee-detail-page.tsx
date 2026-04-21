'use client'

import { useMemo } from 'react'
import { useEmployees } from '@/contexts/employees-context'
import { useExpenses } from '@/contexts/expenses-context'
import { PageHeader } from '@/modules/shared/components/page-header'
import { employeeRoutes, type EmployeesRoutePrefix } from '@/modules/funcionarios/routes'
import { Link } from '@/components/app-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, DollarSign, FileText, Pencil } from 'lucide-react'
import type { ExpenseCategory } from '@/lib/types'

const expenseCategoryLabel: Partial<Record<ExpenseCategory | string, string>> = {
  material: 'Material',
  combustivel: 'Combustível',
  almoco: 'Almoço',
  almoco_funcionario: 'Almoço (funcionário)',
  vale_funcionario: 'Vale',
  pagamento_funcionario: 'Pagamento',
  vale_gustavo: 'Vale (proprietário)',
}

function categoryLabel(cat: string) {
  return expenseCategoryLabel[cat] ?? cat
}

export function EmployeeDetailPage({
  routePrefix,
  employeeId,
}: {
  routePrefix: EmployeesRoutePrefix
  employeeId: string
}) {
  const routes = employeeRoutes(routePrefix)
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { expenses } = useExpenses()

  const employee = useMemo(() => employees.find((e) => e.id === employeeId), [employees, employeeId])

  const employeeExpenses = useMemo(
    () => expenses.filter((exp) => exp.employeeId === employeeId),
    [expenses, employeeId]
  )

  const totalExpenses = useMemo(
    () => employeeExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    [employeeExpenses]
  )

  const monthlyExpenses = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return employeeExpenses
      .filter((exp) => {
        const expDate = new Date(exp.date)
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
      })
      .reduce((sum, exp) => sum + exp.amount, 0)
  }, [employeeExpenses])

  if (!employeesLoading && !employee) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="ghost" asChild>
          <Link href={routes.list}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Funcionário não encontrado.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Carregando…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href={routes.list} aria-label="Voltar à lista">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Lista
          </Link>
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={routes.edit(employee.id)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar cadastro
          </Link>
        </Button>
      </div>

      <PageHeader
        title={employee.name}
        description={employee.position || 'Sem cargo cadastrado'}
        actions={
          <Badge variant={employee.isActive ? 'default' : 'secondary'} className="font-normal">
            {employee.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Lançamentos</p>
                <p className="text-2xl font-semibold tabular-nums">{employeeExpenses.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total associado</p>
                <p className="text-2xl font-semibold tabular-nums text-destructive">
                  {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-destructive/80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Mês atual</p>
                <p className="text-2xl font-semibold tabular-nums text-orange-600">
                  {monthlyExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500/90" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Despesas vinculadas</CardTitle>
        </CardHeader>
        <CardContent>
          {employeeExpenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma despesa com este funcionário.
            </p>
          ) : (
            <ul className="divide-y divide-border/80 rounded-lg border border-border/80">
              {[...employeeExpenses]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => (
                  <li key={expense.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{expense.description || '—'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {categoryLabel(expense.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums sm:text-base">
                      {expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
