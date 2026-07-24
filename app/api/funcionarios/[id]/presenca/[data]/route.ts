import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'

function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string; data: string }> }) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  const params = await ctx.params
  const funcionarioId = Number(params.id)
  const data = params.data

  if (!Number.isFinite(funcionarioId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }
  if (!isIsoDate(data)) {
    return NextResponse.json({ error: 'Data inválida (use YYYY-MM-DD)' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as any
  const status = body?.status
  if (status !== 'presente' && status !== 'falta' && status !== 'meio_periodo') {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  const row = await prisma.presenca.upsert({
    where: { funcionarioId_data: { funcionarioId, data } },
    create: { funcionarioId, data, status },
    update: { status },
    select: { id: true, funcionarioId: true, data: true, status: true },
  })

  return NextResponse.json(row)
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; data: string }> }) {
  const denied = requireOwnerOr401(_request)
  if (denied) return denied

  const params = await ctx.params
  const funcionarioId = Number(params.id)
  const data = params.data

  if (!Number.isFinite(funcionarioId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }
  if (!isIsoDate(data)) {
    return NextResponse.json({ error: 'Data inválida (use YYYY-MM-DD)' }, { status: 400 })
  }

  await prisma.presenca
    .delete({
      where: { funcionarioId_data: { funcionarioId, data } },
    })
    .catch(() => null)

  return NextResponse.json({ ok: true })
}

