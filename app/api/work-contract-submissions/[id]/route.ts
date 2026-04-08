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
    const rejectReason = typeof body.rejectReason === 'string' ? body.rejectReason.trim() || null : null

    if (!action) {
      return NextResponse.json({ error: 'action: approve ou reject' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const sub = await prisma.workerContractSubmission.findFirst({
      where: { id, assignment: { ownerUserId: dbUserId } },
      include: { assignment: true, step: true },
    })

    if (!sub) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }
    if (sub.status !== 'PENDING') {
      return NextResponse.json({ error: 'Pedido ja foi analisado' }, { status: 400 })
    }

    if (action === 'reject') {
      if (!rejectReason) {
        return NextResponse.json({ error: 'Informe o motivo da recusa' }, { status: 400 })
      }
      const updated = await prisma.workerContractSubmission.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectReason,
          reviewedAt: new Date(),
        },
      })
      const meta = getRequestMetadata(request)
      await createAuditLog({
        userId,
        action: 'reject_work_contract_submission',
        entityType: 'worker_contract_submission',
        entityId: id,
        description: `Recusou pedido de empreita — ${sub.assignment.title}`,
        ...meta,
      })
      return NextResponse.json(updated)
    }

    // approve
    if (sub.kind === 'PERCENT') {
      const p = sub.proposedPercent
      if (p == null) {
        return NextResponse.json({ error: 'Pedido invalido' }, { status: 400 })
      }
      await prisma.$transaction([
        prisma.workAssignment.update({
          where: { id: sub.assignmentId },
          data: { approvedPercent: p },
        }),
        prisma.workerContractSubmission.update({
          where: { id },
          data: {
            status: 'APPROVED',
            rejectReason: null,
            reviewedAt: new Date(),
          },
        }),
      ])
    } else if (sub.kind === 'STEP_DONE') {
      if (!sub.stepId) {
        return NextResponse.json({ error: 'Pedido invalido' }, { status: 400 })
      }
      await prisma.$transaction([
        prisma.contractStep.update({
          where: { id: sub.stepId },
          data: { approvedDone: true },
        }),
        prisma.workerContractSubmission.update({
          where: { id },
          data: {
            status: 'APPROVED',
            rejectReason: null,
            reviewedAt: new Date(),
          },
        }),
      ])
    } else {
      return NextResponse.json({ error: 'Tipo desconhecido' }, { status: 400 })
    }

    const final = await prisma.workerContractSubmission.findUnique({ where: { id } })
    const meta = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'approve_work_contract_submission',
      entityType: 'worker_contract_submission',
      entityId: id,
      description: `Aprovou empreita (${sub.kind}) — ${sub.assignment.title}`,
      ...meta,
    })
    return NextResponse.json(final)
  } catch (e) {
    console.error('work-contract-submission PATCH:', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
