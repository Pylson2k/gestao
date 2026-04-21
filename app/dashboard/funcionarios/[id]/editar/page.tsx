'use client'

import { useParams } from 'next/navigation'
import { EmployeeFormPage } from '@/modules/funcionarios/pages/employee-form-page'

export default function DashboardEditarFuncionarioPage() {
  const params = useParams()
  const id = params.id as string
  return <EmployeeFormPage routePrefix="/dashboard/funcionarios" mode="edit" employeeId={id} />
}
