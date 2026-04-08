import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getOwnerDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

const MODES = ['DAILY', 'CONTRACT_PERCENT', 'CONTRACT_STEPS'] as const

async function loadOwned(id: string, dbUserId: string) {
  const { prisma } = await import('@/lib/prisma')
  return prisma.workAssignment.findFirst({
    where: { id, ownerUserId: dbUserId },
    include: {
      employee: { select: { id: true, name: true } },
      steps: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

function canActivate(a: {
  mode: string
  dailyRate: number | null
  contractTotal: number | null
  steps: { id: string }[]
}): string | null {
  if (a.mode === 'DAILY') {
    if (a.dailyRate == null || a.dailyRate <= 0) return 'Defina o valor da diaria maior que zero'
  }
  if (a.mode === 'CONTRACT_PERCENT') {
    if (a.contractTotal == null || a.contractTotal <= 0) return 'Defina o valor total do contrato'
  }
  if (a.mode === 'CONTRACT_STEPS') {
    if (a.steps.length === 0) return 'Cadastre ao menos uma etapa'
  }
  return null
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    const { id } = await ctx.params
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }
    const dbUserId = await getDbUserId(userId)
    const row = await loadOwned(id, dbUserId)
    if (!row) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    }
    const { prisma } = await import('@/lib/prisma')
    const full = await prisma.workAssignment.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true } },
        steps: { orderBy: { sortOrder: 'asc' } },
        dayLogs: { orderBy: { workDate: 'desc' } },
        submissions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })
    return NextResponse.json(full)
  } catch (e) {
    console.error('work-assignment GET:', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    const { id } = await ctx.params
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const dbUserId = await getDbUserId(userId)
    const current = await loadOwned(id, dbUserId)
    if (!current) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { prisma } = await import('@/lib/prisma')
    const { getOwnerDbUserIds } = await import('@/lib/user-mapping')
    const ownerIds = await getOwnerDbUserIds()

    let nextEmployeeId = current.employeeId
    if (typeof body.employeeId === 'string' && body.employeeId !== current.employeeId) {
      if (current.status !== 'DRAFT') {
        return NextResponse.json({ error: 'So e possivel trocar funcionario em rascunho' }, { status: 400 })
      }
      const emp = await prisma.employee.findFirst({
        where: { id: body.employeeId, userId: { in: ownerIds } },
      })
      if (!emp) {
        return NextResponse.json({ error: 'Funcionario invalido' }, { status: 400 })
      }
      nextEmployeeId = body.employeeId
    }

    let nextTitle = current.title
    if (typeof body.title === 'string' && body.title.trim()) {
      nextTitle = body.title.trim()
    }

    let nextMode = current.mode
    if (MODES.includes(body.mode) && current.status === 'DRAFT') {
      nextMode = body.mode
    }

    let nextDaily =
      body.dailyRate != null && current.status === 'DRAFT' ? Number(body.dailyRate) : current.dailyRate
    let nextTotal =
      body.contractTotal != null && current.status === 'DRAFT'
        ? Number(body.contractTotal)
        : current.contractTotal

    if (nextMode !== 'DAILY') nextDaily = null
    if (nextMode !== 'CONTRACT_PERCENT') nextTotal = null

    if (current.status === 'DRAFT' && nextMode !== 'CONTRACT_STEPS') {
      await prisma.contractStep.deleteMany({ where: { assignmentId: id } })
    }

    if (Array.isArray(body.steps) && current.status === 'DRAFT' && nextMode === 'CONTRACT_STEPS') {
      await prisma.$transaction([
        prisma.contractStep.deleteMany({ where: { assignmentId: id } }),
        prisma.contractStep.createMany({
          data: body.steps.map((s: { title?: string; amount?: number; sortOrder?: number }, i: number) => ({
            assignmentId: id,
            sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : i,
            title: String(s.title || `Etapa ${i + 1}`).trim() || `Etapa ${i + 1}`,
            amount: Number(s.amount) || 0,
          })),
        }),
      ])
    }

    const fresh = await loadOwned(id, dbUserId)
    if (!fresh) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    }

    let nextStatus = current.status
    if (body.status === 'ACTIVE' || body.status === 'CLOSED' || body.status === 'DRAFT') {
      if (body.status === 'DRAFT' && current.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Nao e possivel voltar para rascunho' }, { status: 400 })
      }
      if (body.status === 'ACTIVE') {
        const check = canActivate({
          mode: nextMode,
          dailyRate: nextDaily,
          contractTotal: nextTotal,
          steps: fresh.steps,
        })
        if (check) {
          return NextResponse.json({ error: check }, { status: 400 })
        }
        if (nextMode === 'CONTRACT_STEPS' && fresh.steps.length === 0) {
          return NextResponse.json({ error: 'Cadastre etapas antes de ativar' }, { status: 400 })
        }
        nextStatus = 'ACTIVE'
      } else if (body.status === 'CLOSED') {
        nextStatus = 'CLOSED'
      } else if (body.status === 'DRAFT') {
        nextStatus = 'DRAFT'
      }
    }

    const updated = await prisma.workAssignment.update({
      where: { id },
      data: {
        title: nextTitle,
        mode: nextMode,
        status: nextStatus,
        employeeId: nextEmployeeId,
        dailyRate: nextDaily,
        contractTotal: nextTotal,
      },
      include: {
        employee: { select: { id: true, name: true } },
        steps: { orderBy: { sortOrder: 'asc' } },
      },
    })

    const meta = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'update_work_assignment',
      entityType: 'work_assignment',
      entityId: id,
      description: `Atualizou atribuicao "${updated.title}" (status ${updated.status})`,
      oldValue: { status: current.status },
      newValue: { status: updated.status, mode: updated.mode },
      ...meta,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('work-assignment PATCH:', e)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }
    const { id } = await ctx.params
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const dbUserId = await getDbUserId(userId)
    const current = await loadOwned(id, dbUserId)
    if (!current) {
      return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
    }
    if (current.status !== 'DRAFT') {
      return NextResponse.json({ error: 'So pode excluir rascunhos' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    await prisma.workAssignment.delete({ where: { id } })

    const meta = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'delete_work_assignment',
      entityType: 'work_assignment',
      entityId: id,
      description: `Excluiu atribuicao "${current.title}"`,
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('work-assignment DELETE:', e)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
