import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwnerOr401 } from '@/lib/require-auth'

function todayIso(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function GET(request: Request) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  const hoje = todayIso()

  const [funcionariosAtivos, presencasHoje, valesPendentes] = await Promise.all([
    prisma.funcionario.count({ where: { status: 'ativo' } }),
    prisma.presenca.count({
      where: {
        data: hoje,
        status: { in: ['presente', 'meio_periodo'] },
      },
    }),
    prisma.vale.aggregate({
      where: { status: 'pendente' },
      _count: { _all: true },
      _sum: { valor: true },
    }),
  ])

  return NextResponse.json({
    funcionarios_ativos: funcionariosAtivos,
    presencas_hoje: presencasHoje,
    vales_pendentes_qtd: valesPendentes._count._all,
    vales_pendentes_valor: valesPendentes._sum.valor ? Number(valesPendentes._sum.valor) : 0,
  })
}

