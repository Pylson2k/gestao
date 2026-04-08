import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ dayLogs: [], submissions: [] })
    }

    const dbUserId = await getDbUserId(userId)
    const { prisma } = await import('@/lib/prisma')

    const [dayLogs, submissions] = await Promise.all([
      prisma.workDayLog.findMany({
        where: {
          status: 'PENDING',
          assignment: { ownerUserId: dbUserId },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          assignment: {
            include: { employee: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.workerContractSubmission.findMany({
        where: {
          status: 'PENDING',
          assignment: { ownerUserId: dbUserId },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          assignment: {
            include: { employee: { select: { id: true, name: true } } },
          },
          step: true,
        },
      }),
    ])

    return NextResponse.json({ dayLogs, submissions })
  } catch (e) {
    console.error('work-approvals pending:', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
