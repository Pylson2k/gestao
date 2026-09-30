import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'
import { parseNonNegativeMoney } from '@/modules/getao/lib/money'

function parseId(params: { id?: string }) {
  const raw = params.id
  const id = raw ? Number(raw) : NaN
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function PATCH(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireOwnerOr401(_request)
  if (denied) return denied

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
    const v = raw === null ? null : parseNonNegativeMoney(raw)
    const diariaVazia = typeof raw === 'string' && raw.trim() === ''
    if (raw !== null && v === null && !diariaVazia) {
      return NextResponse.json({ error: 'valor_diaria inválido' }, { status: 400 })
    }
    data.valorDiaria = v
  }

  let updated
  try {
    updated = await prisma.funcionario.update({ where: { id }, data })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    console.error('funcionarios PATCH:', error)
    return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 })
  }

  return NextResponse.json({
    id: updated.id,
    nome: updated.nome,
    valor_diaria: updated.valorDiaria === null ? null : Number(updated.valorDiaria),
    funcao: updated.funcao ?? null,
    status: updated.status,
  })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireOwnerOr401(_request)
  if (denied) return denied

  const params = await ctx.params
  const id = parseId(params)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  let deleteResult: 'deleted' | 'not-found' | 'has-history'
  try {
    deleteResult = await prisma.$transaction(async (tx) => {
      const employee = await tx.funcionario.findUnique({ where: { id }, select: { id: true } })
      if (!employee) return 'not-found'

      const [presencas, vales] = await Promise.all([
        tx.presenca.count({ where: { funcionarioId: id } }),
        tx.vale.count({ where: { funcionarioId: id } }),
      ])
      if (presencas > 0 || vales > 0) return 'has-history'

      await tx.funcionario.delete({ where: { id } })
      return 'deleted'
    }, { isolationLevel: 'Serializable' })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json(
        { error: 'O histórico do funcionário mudou durante a exclusão. Atualize a tela e tente novamente.' },
        { status: 409 }
      )
    }
    console.error('funcionarios DELETE:', error)
    return NextResponse.json({ error: 'Erro ao excluir funcionário' }, { status: 500 })
  }

  if (deleteResult === 'not-found') {
    return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
  }
  if (deleteResult === 'has-history') {
    return NextResponse.json(
      { error: 'Este funcionário possui histórico de presença ou vales. Inative o cadastro para preservar o histórico.' },
      { status: 409 }
    )
  }
  return NextResponse.json({ ok: true })
}

