import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  const list = await prisma.funcionario.findMany({
    where: q
      ? {
          nome: {
            contains: q,
            mode: 'insensitive',
          },
        }
      : undefined,
    orderBy: [{ nome: 'asc' }, { id: 'asc' }],
  })

  return NextResponse.json(
    list.map((f) => ({
      id: f.id,
      nome: f.nome,
      valor_diaria: f.valorDiaria ? Number(f.valorDiaria) : null,
      funcao: f.funcao ?? null,
      status: f.status,
    }))
  )
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as any

  if (!body || !isNonEmptyString(body.nome)) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const status = body.status === 'inativo' ? 'inativo' : 'ativo'

  const valorDiariaRaw = body.valor_diaria
  const valorDiaria =
    valorDiariaRaw === null || typeof valorDiariaRaw === 'undefined'
      ? null
      : typeof valorDiariaRaw === 'number'
        ? valorDiariaRaw
        : Number(String(valorDiariaRaw).replace(',', '.'))

  if (valorDiaria !== null && (!Number.isFinite(valorDiaria) || valorDiaria < 0)) {
    return NextResponse.json({ error: 'valor_diaria inválido' }, { status: 400 })
  }

  const created = await prisma.funcionario.create({
    data: {
      nome: String(body.nome).trim(),
      valorDiaria: valorDiaria === null ? null : valorDiaria,
      funcao: isNonEmptyString(body.funcao) ? String(body.funcao).trim() : null,
      status,
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      nome: created.nome,
      valor_diaria: created.valorDiaria ? Number(created.valorDiaria) : null,
      funcao: created.funcao ?? null,
      status: created.status,
    },
    { status: 201 }
  )
}

