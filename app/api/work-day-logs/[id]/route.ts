import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

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
    const body = await request.json()
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : ''
    const dayUnits = body.dayUnits != null ? Number(body.dayUnits) : null
    const rejectReason = typeof body.rejectReason === 'string' ? body.rejectReason.trim() || null : null

    if (!action) {
      return NextResponse.json({ error: 'action: approve ou reject' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const log = await prisma.workDayLog.findFirst({
      where: { id, assignment: { ownerUserId: dbUserId } },
      include: { assignment: true },
    })

    if (!log) {
      return NextResponse.json({ error: 'Registro nao encontrado' }, { status: 404 })
    }
    if (log.status !== 'PENDING') {
      return NextResponse.json({ error: 'Registro ja foi analisado' }, { status: 400 })
    }

    if (action === 'approve') {
      if (dayUnits !== 0.5 && dayUnits !== 1) {
        return NextResponse.json({ error: 'dayUnits deve ser 0.5 (meia diaria) ou 1 (diaria inteira)' }, { status: 400 })
      }
      const updated = await prisma.workDayLog.update({
        where: { id },
        data: {
          status: 'APPROVED',
          dayUnits,
          rejectReason: null,
          reviewedAt: new Date(),
        },
      })
      const meta = getRequestMetadata(request)
      await createAuditLog({
        userId,
        action: 'approve_work_day_log',
        entityType: 'work_day_log',
        entityId: id,
        description: `Aprovou ponto (${dayUnits} u.d.) — ${log.assignment.title}`,
        newValue: { dayUnits },
        ...meta,
      })
      return NextResponse.json(updated)
    }

    if (!rejectReason) {
      return NextResponse.json({ error: 'Informe o motivo da recusa' }, { status: 400 })
    }

    const updated = await prisma.workDayLog.update({
      where: { id },
      data: {
        status: 'REJECTED',
        dayUnits: null,
        rejectReason,
        reviewedAt: new Date(),
      },
    })
    const meta = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'reject_work_day_log',
      entityType: 'work_day_log',
      entityId: id,
      description: `Recusou ponto — ${log.assignment.title}`,
      ...meta,
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('work-day-log PATCH:', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
