import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

const MODES = ['DAILY', 'CONTRACT_PERCENT', 'CONTRACT_STEPS'] as const

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const dbUserId = await getDbUserId(userId)
    const { prisma } = await import('@/lib/prisma')

    const list = await prisma.workAssignment.findMany({
      where: { ownerUserId: dbUserId },
      orderBy: { updatedAt: 'desc' },
      include: {
        employee: { select: { id: true, name: true } },
        steps: { orderBy: { sortOrder: 'asc' } },
        dayLogs: true,
        submissions: { where: { status: 'PENDING' } },
      },
    })

    return NextResponse.json(list)
  } catch (e) {
    console.error('work-assignments GET:', e)
    return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const dbUserId = await getDbUserId(userId)
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const employeeId = typeof body.employeeId === 'string' ? body.employeeId : ''
    const mode = MODES.includes(body.mode) ? body.mode : ''
    const dailyRate = body.dailyRate != null ? Number(body.dailyRate) : null
    const contractTotal = body.contractTotal != null ? Number(body.contractTotal) : null
    const stepsIn = Array.isArray(body.steps) ? body.steps : []

    if (!title || !employeeId || !mode) {
      return NextResponse.json({ error: 'title, employeeId e mode sao obrigatorios' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const { getOwnerDbUserIds } = await import('@/lib/user-mapping')
    const ownerIds = await getOwnerDbUserIds()
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, userId: { in: ownerIds } },
    })
    if (!emp) {
      return NextResponse.json({ error: 'Funcionario nao encontrado' }, { status: 404 })
    }

    if (mode === 'CONTRACT_STEPS') {
      if (stepsIn.length === 0) {
        return NextResponse.json({ error: 'Informe ao menos uma etapa' }, { status: 400 })
      }
    }

    const created = await prisma.workAssignment.create({
      data: {
        ownerUserId: dbUserId,
        employeeId,
        title,
        mode,
        status: 'DRAFT',
        dailyRate: mode === 'DAILY' ? dailyRate : null,
        contractTotal: mode === 'CONTRACT_PERCENT' ? contractTotal : null,
        approvedPercent: 0,
        steps:
          mode === 'CONTRACT_STEPS'
            ? {
                create: stepsIn.map((s: { title?: string; amount?: number; sortOrder?: number }, i: number) => ({
                  sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : i,
                  title: String(s.title || `Etapa ${i + 1}`).trim() || `Etapa ${i + 1}`,
                  amount: Number(s.amount) || 0,
                })),
              }
            : undefined,
      },
      include: {
        employee: { select: { id: true, name: true } },
        steps: { orderBy: { sortOrder: 'asc' } },
      },
    })

    const meta = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'create_work_assignment',
      entityType: 'work_assignment',
      entityId: created.id,
      description: `Criou atribuicao "${created.title}" (${created.mode}) para ${created.employee.name}`,
      newValue: { id: created.id, mode: created.mode, employeeId },
      ...meta,
    })

    return NextResponse.json(created)
  } catch (e) {
    console.error('work-assignments POST:', e)
    return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 })
  }
}
