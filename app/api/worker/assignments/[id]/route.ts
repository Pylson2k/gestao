import { NextResponse } from 'next/server'
import { getWorkerAuth } from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getWorkerAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
  }

  const { prisma } = await import('@/lib/prisma')
  const assignment = await prisma.workAssignment.findFirst({
    where: {
      id,
      employeeId: auth.employee.id,
      status: 'ACTIVE',
    },
    include: {
      steps: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!assignment) {
    return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
  }

  return NextResponse.json(assignment)
}
