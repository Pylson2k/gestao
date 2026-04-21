'use client'

import { EmployeeFormPage } from '@/modules/funcionarios/pages/employee-form-page'

export default function DashboardNovoFuncionarioPage() {
  return <EmployeeFormPage routePrefix="/dashboard/funcionarios" mode="create" />
}
