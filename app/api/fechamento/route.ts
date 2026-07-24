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
  const inicio = String(searchParams.get('inicio') || '')
  const fim = String(searchParams.get('fim') || '')
  const apenasAtivos = String(searchParams.get('apenas_ativos') || 'false') === 'true'

  if (!isIsoDate(inicio) || !isIsoDate(fim)) {
    return NextResponse.json({ error: 'inicio/fim inválidos (use YYYY-MM-DD)' }, { status: 400 })
  }

  // SQL (Postgres): agrega presenças e vales pendentes no período.
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT
      f.id AS funcionario_id,
      f.nome AS nome,
      f.funcao AS funcao,
      COALESCE(f.valor_diaria, 0) AS diaria,
      COALESCE(p.presentes, 0) AS presentes,
      COALESCE(p.meio_periodo, 0) AS meio_periodo,
      COALESCE(p.faltas, 0) AS faltas,
      COALESCE(v.vales_pendentes, 0) AS vales_pendentes
    FROM funcionarios f
    LEFT JOIN (
      SELECT
        funcionario_id,
        SUM(CASE WHEN status = 'presente' THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN status = 'meio_periodo' THEN 1 ELSE 0 END) AS meio_periodo,
        SUM(CASE WHEN status = 'falta' THEN 1 ELSE 0 END) AS faltas
      FROM presenca
      WHERE data >= ${inicio} AND data <= ${fim}
      GROUP BY funcionario_id
    ) p ON p.funcionario_id = f.id
    LEFT JOIN (
      SELECT
        funcionario_id,
        SUM(valor) AS vales_pendentes
      FROM vales
      WHERE status = 'pendente' AND data >= ${inicio} AND data <= ${fim}
      GROUP BY funcionario_id
    ) v ON v.funcionario_id = f.id
    WHERE (${apenasAtivos} = false OR f.status = 'ativo')
    ORDER BY LOWER(f.nome) ASC, f.id ASC
  `

  const payload = rows.map((r) => {
    const diaria = Number(r.diaria)
    const presentes = Number(r.presentes)
    const meioPeriodo = Number(r.meio_periodo)
    const faltas = Number(r.faltas)
    const valesPendentes = Number(r.vales_pendentes)
    const totalDiarias = diaria * (presentes + 0.5 * meioPeriodo)
    const saldoEstimado = totalDiarias - valesPendentes
    return {
      funcionario_id: Number(r.funcionario_id),
      nome: String(r.nome),
      funcao: r.funcao ? String(r.funcao) : null,
      diaria,
      presentes,
      meio_periodo: meioPeriodo,
      faltas,
      total_diarias: totalDiarias,
      total_vales_pendentes: valesPendentes,
      saldo_estimado: saldoEstimado,
    }
  })

  return NextResponse.json(payload)
}

