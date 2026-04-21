export type EmployeesRoutePrefix = '/funcionarios' | '/dashboard/funcionarios'

export function employeeRoutes(prefix: EmployeesRoutePrefix) {
  return {
    list: prefix,
    new: `${prefix}/novo`,
    detail: (id: string) => `${prefix}/${id}`,
    edit: (id: string) => `${prefix}/${id}/editar`,
  } as const
}
