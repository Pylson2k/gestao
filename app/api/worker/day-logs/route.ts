import { NextResponse } from 'next/server'
import { getWorkerAuth } from '@/lib/worker-auth'

export const dynamic = 'force-dynamic'

function parseWorkDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(Date.UTC(y, mo - 1, d))
}

export async function GET(request: Request) {
  const auth = await getWorkerAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json([])
  }

  const url = new URL(request.url)
  const assignmentId = url.searchParams.get('assignmentId')

  const { prisma } = await import('@/lib/prisma')

  const where: Record<string, unknown> = {
    assignment: { employeeId: auth.employee.id },
  }
  if (assignmentId) {
    where.assignmentId = assignmentId
  }

  const logs = await prisma.workDayLog.findMany({
    where,
    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      assignment: { select: { id: true, title: true, mode: true } },
    },
  })

  return NextResponse.json(logs)
}

export async function POST(request: Request) {
  const auth = await getWorkerAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : ''
    const workDateStr = typeof body.workDate === 'string' ? body.workDate : ''
    const clockInAt = body.clockInAt ? new Date(body.clockInAt) : null
    const clockOutAt = body.clockOutAt ? new Date(body.clockOutAt) : null
    const workerNote = typeof body.workerNote === 'string' ? body.workerNote.trim() || null : null

    if (!assignmentId || !workDateStr || !clockInAt || !clockOutAt || Number.isNaN(+clockInAt) || Number.isNaN(+clockOutAt)) {
      return NextResponse.json(
        { error: 'assignmentId, workDate (AAAA-MM-DD), clockInAt e clockOutAt sao obrigatorios' },
        { status: 400 }
      )
    }

    if (clockOutAt <= clockInAt) {
      return NextResponse.json({ error: 'Saida deve ser depois da entrada' }, { status: 400 })
    }

    const workDate = parseWorkDate(workDateStr)
    if (!workDate) {
      return NextResponse.json({ error: 'Data invalida' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')

    const assignment = await prisma.workAssignment.findFirst({
      where: {
        id: assignmentId,
        employeeId: auth.employee.id,
        status: 'ACTIVE',
        mode: 'DAILY',
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Atribuicao nao encontrada, inativa ou nao e diaria' },
        { status: 404 }
      )
    }

    const existingPending = await prisma.workDayLog.findFirst({
      where: {
        assignmentId,
        workDate,
        status: 'PENDING',
      },
    })
    if (existingPending) {
      return NextResponse.json(
        { error: 'Ja existe um registro de ponto pendente para esta data' },
        { status: 409 }
      )
    }

    const log = await prisma.workDayLog.create({
      data: {
        assignmentId,
        workDate,
        clockInAt,
        clockOutAt,
        workerNote,
        status: 'PENDING',
      },
    })

    return NextResponse.json(log)
  } catch (e) {
    console.error('worker day-logs POST:', e)
    return NextResponse.json({ error: 'Erro ao registrar ponto' }, { status: 500 })
  }
}
