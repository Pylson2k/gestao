import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parseId(params: { id?: string }) {
  const raw = params.id
  const id = raw ? Number(raw) : NaN
  return Number.isFinite(id) ? id : null
}

export async function PATCH(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = (await _request.json().catch(() => null)) as any
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const data: any = {}
  if (typeof body.nome === 'string') {
    const nome = body.nome.trim()
    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    data.nome = nome
  }
  if (typeof body.funcao === 'string') {
    data.funcao = body.funcao.trim() || null
  }
  if (body.status === 'ativo' || body.status === 'inativo') {
    data.status = body.status
  }

  if (typeof body.valor_diaria !== 'undefined') {
    const raw = body.valor_diaria
    const v =
      raw === null
        ? null
        : typeof raw === 'number'
          ? raw
          : Number(String(raw).replace(',', '.'))
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      return NextResponse.json({ error: 'valor_diaria inválido' }, { status: 400 })
    }
    data.valorDiaria = v
  }

  const updated = await prisma.funcionario.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    id: updated.id,
    nome: updated.nome,
    valor_diaria: updated.valorDiaria ? Number(updated.valorDiaria) : null,
    funcao: updated.funcao ?? null,
    status: updated.status,
  })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await prisma.funcionario.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

