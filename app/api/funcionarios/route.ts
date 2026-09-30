import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'
import { parseNonNegativeMoney } from '@/modules/getao/lib/money'

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function GET(request: Request) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  try {
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
        valor_diaria: f.valorDiaria === null ? null : Number(f.valorDiaria),
        funcao: f.funcao ?? null,
        status: f.status,
      }))
    )
  } catch (error) {
    console.error('funcionarios GET:', error)
    return NextResponse.json({ error: 'Erro ao listar funcionarios' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body || !isNonEmptyString(body.nome)) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const status = body.status === 'inativo' ? 'inativo' : 'ativo'

    const valorDiariaRaw = body.valor_diaria
    const valorDiaria =
      valorDiariaRaw === null || typeof valorDiariaRaw === 'undefined'
        ? null
        : parseNonNegativeMoney(valorDiariaRaw)

    const diariaVazia = typeof valorDiariaRaw === 'string' && valorDiariaRaw.trim() === ''
    if (valorDiariaRaw !== null && typeof valorDiariaRaw !== 'undefined' && valorDiaria === null && !diariaVazia) {
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
        valor_diaria: created.valorDiaria === null ? null : Number(created.valorDiaria),
        funcao: created.funcao ?? null,
        status: created.status,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('funcionarios POST:', error)
    return NextResponse.json({ error: 'Erro ao criar funcionario' }, { status: 500 })
  }
}
