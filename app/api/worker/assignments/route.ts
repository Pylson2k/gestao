import { NextResponse } from 'next/server'
import { getWorkerAuth } from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await getWorkerAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json([])
  }

  const { prisma } = await import('@/lib/prisma')
  const list = await prisma.workAssignment.findMany({
    where: {
      employeeId: auth.employee.id,
      status: 'ACTIVE',
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      steps: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return NextResponse.json(list)
}
