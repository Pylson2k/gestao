import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'

// GET - List audit logs
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const limit = parseInt(searchParams.get('limit') || '200')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const where: any = {}
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59')
      }
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
    return NextResponse.json(
      { error: 'Erro ao buscar logs de auditoria' },
      { status: 500 }
    )
  }
}
