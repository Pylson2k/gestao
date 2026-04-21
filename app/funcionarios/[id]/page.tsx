'use client'

import { useParams } from 'next/navigation'
import { EmployeeDetailPage } from '@/modules/funcionarios/pages/employee-detail-page'

export default function FuncionarioDetailRoutePage() {
  const params = useParams()
  const id = params.id as string
  return <EmployeeDetailPage routePrefix="/funcionarios" employeeId={id} />
}
