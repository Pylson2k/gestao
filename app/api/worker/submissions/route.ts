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

  const url = new URL(request.url)
  const assignmentId = url.searchParams.get('assignmentId')

  const { prisma } = await import('@/lib/prisma')

  const where: Record<string, unknown> = {
    assignment: { employeeId: auth.employee.id },
  }
  if (assignmentId) {
    where.assignmentId = assignmentId
  }

  const list = await prisma.workerContractSubmission.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      assignment: { select: { id: true, title: true, mode: true } },
      step: { select: { id: true, title: true, sortOrder: true } },
    },
  })

  return NextResponse.json(list)
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
    const kind = body.kind === 'PERCENT' || body.kind === 'STEP_DONE' ? body.kind : ''
    const workerNote = typeof body.workerNote === 'string' ? body.workerNote.trim() || null : null

    if (!assignmentId || !kind) {
      return NextResponse.json({ error: 'assignmentId e kind (PERCENT ou STEP_DONE) sao obrigatorios' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')

    const assignment = await prisma.workAssignment.findFirst({
      where: {
        id: assignmentId,
        employeeId: auth.employee.id,
        status: 'ACTIVE',
      },
      include: { steps: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Atribuicao nao encontrada ou inativa' }, { status: 404 })
    }

    if (kind === 'PERCENT') {
      if (assignment.mode !== 'CONTRACT_PERCENT') {
        return NextResponse.json({ error: 'Esta obra nao usa empreita por porcentagem' }, { status: 400 })
      }
      const proposedPercent = Number(body.proposedPercent)
      if (Number.isNaN(proposedPercent) || proposedPercent < 0 || proposedPercent > 100) {
        return NextResponse.json({ error: 'proposedPercent deve ser entre 0 e 100' }, { status: 400 })
      }
      if (proposedPercent <= assignment.approvedPercent) {
        return NextResponse.json(
          { error: `A porcentagem deve ser maior que a aprovada atual (${assignment.approvedPercent}%)` },
          { status: 400 }
        )
      }

      const pending = await prisma.workerContractSubmission.findFirst({
        where: { assignmentId, kind: 'PERCENT', status: 'PENDING' },
      })
      if (pending) {
        return NextResponse.json({ error: 'Ja existe um avanco de % pendente de aprovacao' }, { status: 409 })
      }

      const sub = await prisma.workerContractSubmission.create({
        data: {
          assignmentId,
          kind: 'PERCENT',
          proposedPercent,
          workerNote,
          status: 'PENDING',
        },
      })
      return NextResponse.json(sub)
    }

    if (kind === 'STEP_DONE') {
      if (assignment.mode !== 'CONTRACT_STEPS') {
        return NextResponse.json({ error: 'Esta obra nao usa empreita por etapas' }, { status: 400 })
      }
      const stepId = typeof body.stepId === 'string' ? body.stepId : ''
      if (!stepId) {
        return NextResponse.json({ error: 'stepId e obrigatorio' }, { status: 400 })
      }

      const step = await prisma.contractStep.findFirst({
        where: { id: stepId, assignmentId },
      })
      if (!step) {
        return NextResponse.json({ error: 'Etapa nao encontrada' }, { status: 404 })
      }
      if (step.approvedDone) {
        return NextResponse.json({ error: 'Esta etapa ja foi concluida e aprovada' }, { status: 400 })
      }

      const pendingSame = await prisma.workerContractSubmission.findFirst({
        where: {
          assignmentId,
          stepId,
          status: 'PENDING',
        },
      })
      if (pendingSame) {
        return NextResponse.json({ error: 'Ja existe pedido pendente para esta etapa' }, { status: 409 })
      }

      const sub = await prisma.workerContractSubmission.create({
        data: {
          assignmentId,
          kind: 'STEP_DONE',
          stepId,
          workerNote,
          status: 'PENDING',
        },
      })
      return NextResponse.json(sub)
    }

    return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })
  } catch (e) {
    console.error('worker submissions POST:', e)
    return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 })
  }
}
