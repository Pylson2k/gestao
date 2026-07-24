import { NextRequest, NextResponse } from 'next/server'
import { getOwnerDbUserIds } from '@/lib/user-mapping'
import { requireOwnerOr401 } from '@/lib/require-auth'

// GET - List audit logs (apenas do proprietário)
export async function GET(request: NextRequest) {
  const denied = requireOwnerOr401(request)
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const rawLimit = parseInt(searchParams.get('limit') || '200', 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 200

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()
    if (ownerIds.length === 0) {
      return NextResponse.json([])
    }

    const where: Record<string, unknown> = {
      userId: { in: ownerIds },
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {}
      if (startDate) createdAt.gte = new Date(startDate)
      if (endDate) createdAt.lte = new Date(endDate + 'T23:59:59')
      where.createdAt = createdAt
    }

    if (action && action !== 'all') {
      where.action = action
    }

    if (entityType && entityType !== 'all') {
      where.entityType = entityType
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json({ error: 'Erro ao buscar logs de auditoria' }, { status: 500 })
  }
}
