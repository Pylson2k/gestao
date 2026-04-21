'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/components/app-link'
import { useEmployees } from '@/contexts/employees-context'
import { PageHeader } from '@/modules/shared/components/page-header'
import { employeeRoutes, type EmployeesRoutePrefix } from '@/modules/funcionarios/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Download, MoreHorizontal, Pencil, FileText, Trash2 } from 'lucide-react'
import type { Employee } from '@/lib/types'
import { exportEmployeesToCSV } from '@/lib/export-utils'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'active' | 'inactive'

function formatDateShort(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function EmployeesListPage({ routePrefix }: { routePrefix: EmployeesRoutePrefix }) {
  const routes = employeeRoutes(routePrefix)
  const { employees, deleteEmployee, isLoading } = useEmployees()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter((e) => {
      const okStatus =
        status === 'all' ||
        (status === 'active' && e.isActive) ||
        (status === 'inactive' && !e.isActive)
      if (!okStatus) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        (e.position?.toLowerCase().includes(q) ?? false) ||
        (e.cpf?.toLowerCase().includes(q) ?? false) ||
        (e.phone?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [employees, search, status])

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.isActive).length
    return { total: employees.length, active, inactive: employees.length - active }
  }, [employees])

  const handleDelete = async (employee: Employee) => {
    if (
      !confirm(
        `Excluir o cadastro de ${employee.name}? Esta ação não pode ser desfeita pelo aplicativo.`
      )
    ) {
      return
    }
    try {
      await deleteEmployee(employee.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir funcionário'
      alert(msg)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funcionários"
        description={`${stats.total} cadastrados · ${stats.active} ativos · ${stats.inactive} inativos`}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="touch-manipulation"
              disabled={employees.length === 0}
              onClick={() => exportEmployeesToCSV(employees)}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button type="button" size="sm" className="touch-manipulation" asChild>
              <Link href={routes.new}>
                <Plus className="mr-2 h-4 w-4" />
                Novo funcionário
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Buscar por nome, cargo, CPF ou telefone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md min-h-11"
          autoComplete="off"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Status</span>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-[160px] min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum resultado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {employees.length === 0
                ? 'Cadastre o primeiro funcionário para começar.'
                : 'Ajuste a busca ou o filtro de status.'}
            </p>
            {employees.length === 0 ? (
              <Button type="button" className="mt-4 touch-manipulation" asChild>
                <Link href={routes.new}>Cadastrar funcionário</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Cargo</TableHead>
                  <TableHead className="hidden lg:table-cell">Contato</TableHead>
                  <TableHead className="hidden sm:table-cell">Admissão</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[52px] text-right pr-3"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className={cn('group', !employee.isActive && 'opacity-70')}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={routes.detail(employee.id)}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        {employee.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
                        {employee.position || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {employee.position || '—'}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      <div className="text-sm">{employee.phone || '—'}</div>
                      <div className="text-xs text-muted-foreground/90">{employee.email || ''}</div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatDateShort(employee.hireDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.isActive ? 'default' : 'secondary'} className="font-normal">
                        {employee.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground"
                            aria-label={`Ações para ${employee.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={routes.edit(employee.id)} className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" />
                              Editar cadastro
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={routes.detail(employee.id)} className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Resumo e despesas
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setTimeout(() => void handleDelete(employee), 0)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
