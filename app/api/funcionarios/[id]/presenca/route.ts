import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function monthRange(year: number, month1to12: number) {
  const start = `${year}-${pad2(month1to12)}-01`
  const endDate = new Date(year, month1to12, 0) // last day of month
  const end = `${endDate.getFullYear()}-${pad2(endDate.getMonth() + 1)}-${pad2(endDate.getDate())}`
  return { start, end }
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month')) // 1-12

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'year inválido' }, { status: 400 })
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'month inválido' }, { status: 400 })
  }

  const params = await ctx.params
  const funcionarioId = Number(params.id)
  if (!Number.isFinite(funcionarioId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const { start, end } = monthRange(year, month)
  const rows = await prisma.presenca.findMany({
    where: {
      funcionarioId,
      data: { gte: start, lte: end },
    },
    select: { data: true, status: true },
  })

  const map: Record<string, string> = {}
  for (const r of rows) {
    map[r.data] = r.status
  }

  return NextResponse.json(map)
}

