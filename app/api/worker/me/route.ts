import { NextResponse } from 'next/server'
import { getWorkerAuth } from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await getWorkerAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  return NextResponse.json({
    employeeName: auth.employee.name,
    employeeId: auth.employee.id,
    loginUsername: auth.account.loginUsername,
  })
}
