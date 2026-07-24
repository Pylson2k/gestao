import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'

function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(request: Request) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const funcionarioIdRaw = searchParams.get('funcionario_id')
  const funcionarioId = funcionarioIdRaw ? Number(funcionarioIdRaw) : null

  const list = await prisma.vale.findMany({
    where:
      funcionarioIdRaw && Number.isFinite(funcionarioId)
        ? { funcionarioId: funcionarioId as number }
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
  const valor =
    typeof valorRaw === 'number' ? valorRaw : Number(String(valorRaw ?? '').replace(',', '.'))
  const data = String(body?.data || '')
  const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() || null : null

  if (!Number.isFinite(funcionarioId)) {
    return NextResponse.json({ error: 'funcionario_id inválido' }, { status: 400 })
  }
  if (!Number.isFinite(valor) || valor < 0) {
    return NextResponse.json({ error: 'valor inválido' }, { status: 400 })
  }
  if (!isIsoDate(data)) {
    return NextResponse.json({ error: 'data inválida (use YYYY-MM-DD)' }, { status: 400 })
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

