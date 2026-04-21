'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEmployees } from '@/contexts/employees-context'
import { PageHeader } from '@/modules/shared/components/page-header'
import { employeeRoutes, type EmployeesRoutePrefix } from '@/modules/funcionarios/routes'
import { Link } from '@/components/app-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ArrowLeft } from 'lucide-react'

const employeeFormSchema = z.object({
  name: z.string().min(2, 'Informe o nome completo'),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'E-mail inválido'),
  position: z.string().optional(),
  hireDate: z.string().optional(),
  observations: z.string().optional(),
  isActive: z.boolean(),
})

type EmployeeFormValues = z.infer<typeof employeeFormSchema>

function emptyValues(): EmployeeFormValues {
  return {
    name: '',
    cpf: '',
    phone: '',
    email: '',
    position: '',
    hireDate: '',
    observations: '',
    isActive: true,
  }
}

function toApiPayload(values: EmployeeFormValues) {
  return {
    name: values.name.trim(),
    cpf: values.cpf?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    position: values.position?.trim() || null,
    hireDate: values.hireDate?.trim() || null,
    observations: values.observations?.trim() || null,
    isActive: values.isActive,
  }
}

export function EmployeeFormPage({
  routePrefix,
  mode,
  employeeId,
}: {
  routePrefix: EmployeesRoutePrefix
  mode: 'create' | 'edit'
  employeeId?: string
}) {
  const routes = employeeRoutes(routePrefix)
  const router = useRouter()
  const { employees, addEmployee, updateEmployee, isLoading } = useEmployees()

  const employee = useMemo(
    () => (mode === 'edit' && employeeId ? employees.find((e) => e.id === employeeId) : undefined),
    [employees, employeeId, mode]
  )

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (mode !== 'edit' || !employee) return
    form.reset({
      name: employee.name,
      cpf: employee.cpf || '',
      phone: employee.phone || '',
      email: employee.email || '',
      position: employee.position || '',
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      observations: employee.observations || '',
      isActive: employee.isActive,
    })
  }, [employee, form, mode])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = toApiPayload(values)
    try {
      if (mode === 'create') {
        await addEmployee(payload)
        router.push(routes.list)
        return
      }
      if (!employeeId) return
      await updateEmployee(employeeId, payload)
      router.push(routes.detail(employeeId))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar'
      alert(msg)
    }
  })

  const notFound = mode === 'edit' && !isLoading && employeeId && !employee

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 shrink-0" asChild>
          <Link href={routes.list}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <PageHeader
        title={mode === 'create' ? 'Novo funcionário' : 'Editar funcionário'}
        description={
          mode === 'create'
            ? 'Cadastro em etapas: identificação, contato e situação contratual.'
            : employee
              ? employee.name
              : 'Carregando dados…'
        }
      />

      {notFound ? (
        <Card>
          <CardHeader>
            <CardTitle>Funcionário não encontrado</CardTitle>
            <CardDescription>O registro pode ter sido removido ou o link está incorreto.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" asChild>
              <Link href={routes.list}>Ir para a lista</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Identificação</CardTitle>
                <CardDescription>Dados principais do colaborador.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" placeholder="Ex.: Maria Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input autoComplete="organization-title" placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Contato</CardTitle>
                <CardDescription>Telefone e e-mail para comunicação.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input autoComplete="tel" placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input autoComplete="email" type="email" placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Contrato e observações</CardTitle>
                <CardDescription>Situação atual e notas internas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de admissão</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/80 p-4 sm:mt-0">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativo na empresa</FormLabel>
                          <p className="text-xs text-muted-foreground">Inativos permanecem no histórico.</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Notas internas (opcional)" className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => router.push(routes.list)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || (mode === 'edit' && isLoading)}>
                {mode === 'create' ? 'Cadastrar' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}
