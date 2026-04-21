'use client'

import { EmployeeFormPage } from '@/modules/funcionarios/pages/employee-form-page'

export default function NovoFuncionarioPage() {
  return <EmployeeFormPage routePrefix="/funcionarios" mode="create" />
}
