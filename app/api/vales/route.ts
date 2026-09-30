import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'
import { isValidIsoDate } from '@/modules/getao/lib/date'
import { parseNonNegativeMoney } from '@/modules/getao/lib/money'

export async function GET(request: Request) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const funcionarioIdRaw = searchParams.get('funcionario_id')
  const funcionarioId = funcionarioIdRaw === null ? null : Number(funcionarioIdRaw)

  if (funcionarioIdRaw !== null && (funcionarioId === null || !Number.isInteger(funcionarioId) || funcionarioId <= 0)) {
    return NextResponse.json({ error: 'funcionario_id inválido' }, { status: 400 })
  }

  const list = await prisma.vale.findMany({
    where:
      funcionarioId !== null
        ? { funcionarioId }
        : undefined,
    include: { funcionario: true },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
  })

  return NextResponse.json(
    list.map((v) => ({
      id: v.id,
      funcionario_id: v.funcionarioId,
      funcionario_nome: v.funcionario.nome,
      valor: Number(v.valor),
      data: v.data,
      descricao: v.descricao ?? null,
      status: v.status,
    }))
  )
}

export async function POST(request: Request) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as any
  const funcionarioId = Number(body?.funcionario_id)
  const valorRaw = body?.valor
  const valor = parseNonNegativeMoney(valorRaw)
  if (valor === null) {
    return NextResponse.json({ error: 'valor inválido' }, { status: 400 })
  }
  const data = String(body?.data || '')
  const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() || null : null

  if (!Number.isInteger(funcionarioId) || funcionarioId <= 0) {
    return NextResponse.json({ error: 'funcionario_id inválido' }, { status: 400 })
  }
  if (!isValidIsoDate(data)) {
    return NextResponse.json({ error: 'data inválida (use YYYY-MM-DD)' }, { status: 400 })
  }

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    select: { id: true, status: true },
  })
  if (!funcionario) {
    return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
  }
  if (funcionario.status !== 'ativo') {
    return NextResponse.json({ error: 'Não é possível lançar vale para funcionário inativo' }, { status: 409 })
  }

  const created = await prisma.vale.create({
    data: {
      funcionarioId,
      valor,
      data,
      descricao,
      status: 'pendente',
    },
    include: { funcionario: true },
  })

  return NextResponse.json(
    {
      id: created.id,
      funcionario_id: created.funcionarioId,
      funcionario_nome: created.funcionario.nome,
      valor: Number(created.valor),
      data: created.data,
      descricao: created.descricao ?? null,
      status: created.status,
    },
    { status: 201 }
  )
}

