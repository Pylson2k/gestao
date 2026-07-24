import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  const params = await ctx.params
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = (await request.json().catch(() => null)) as any
  if (!body || (body.status !== 'pendente' && body.status !== 'pago')) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  const updated = await prisma.vale.update({
    where: { id },
    data: { status: body.status },
  })

  return NextResponse.json({
    id: updated.id,
    funcionario_id: updated.funcionarioId,
    valor: Number(updated.valor),
    data: updated.data,
    descricao: updated.descricao ?? null,
    status: updated.status,
  })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireOwnerOr401(_request)
  if (denied) return denied

  const params = await ctx.params
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await prisma.vale.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

