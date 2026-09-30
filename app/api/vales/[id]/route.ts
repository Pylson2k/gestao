import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  const params = await ctx.params
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = (await request.json().catch(() => null)) as any
  if (!body || (body.status !== 'pendente' && body.status !== 'pago')) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  let updated
  try {
    updated = await prisma.vale.update({
      where: { id },
      data: { status: body.status },
      include: { funcionario: { select: { nome: true } } },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Vale não encontrado' }, { status: 404 })
    }
    console.error('vales PATCH:', error)
    return NextResponse.json({ error: 'Erro ao atualizar vale' }, { status: 500 })
  }

  return NextResponse.json({
    id: updated.id,
    funcionario_id: updated.funcionarioId,
    funcionario_nome: updated.funcionario.nome,
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
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    await prisma.vale.delete({ where: { id } })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Vale não encontrado' }, { status: 404 })
    }
    console.error('vales DELETE:', error)
    return NextResponse.json({ error: 'Erro ao excluir vale' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

