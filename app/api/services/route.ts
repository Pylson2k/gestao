import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - List all services for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

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

    const where: any = { userId: dbUserId }
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Get services error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar servicos' },
      { status: 500 }
    )
  }
}

// POST - Create new service
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Banco de dados nao configurado' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { name, description, unitPrice, unit, isActive } = body

    // Validações
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome e obrigatorio' },
        { status: 400 }
      )
    }

    if (unitPrice === undefined || unitPrice < 0) {
      return NextResponse.json(
        { error: 'Preco unitario deve ser maior ou igual a zero' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const service = await prisma.service.create({
      data: {
        userId: dbUserId,
        name: name.trim(),
        description: description?.trim() || null,
        unitPrice: parseFloat(unitPrice),
        unit: unit?.trim() || 'unidade',
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'create_service',
      entityType: 'service',
      entityId: service.id,
      description: `Serviço cadastrado - ${service.name} - Preço: R$ ${service.unitPrice.toFixed(2)}/${service.unit}`,
      newValue: {
        name: service.name,
        unitPrice: service.unitPrice,
        unit: service.unit,
        isActive: service.isActive,
      },
      ...metadata,
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error: any) {
    console.error('Create service error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar servico', details: error.message },
      { status: 500 }
    )
  }
}
