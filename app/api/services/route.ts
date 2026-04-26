import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getOwnerDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'
import { apiError, apiOk } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET - List all services for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    if (!userId) {
      return apiError('Usuario nao autenticado', 401)
    }

    if (!process.env.DATABASE_URL) {
      return apiOk([])
    }

    const { prisma } = await import('@/lib/prisma')
    
    // IDs do proprietario no banco
    const ownerIds = await getOwnerDbUserIds()

    const where: any = { 
      userId: { in: ownerIds }
    }
    
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

    return apiOk(services)
  } catch (error) {
    logger.error({
      scope: 'api.services.get',
      message: 'Get services error',
      error: error instanceof Error ? error.message : String(error),
    })
    return apiError('Erro ao buscar servicos', 500)
  }
}

// POST - Create new service
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return apiError('Usuario nao autenticado', 401)
    }

    if (!process.env.DATABASE_URL) {
      return apiError('Banco de dados nao configurado', 500)
    }

    const body = await request.json()
    const { name, description, unitPrice, unit, isActive } = body

    // Validações
    if (!name || name.trim() === '') {
      return apiError('Nome e obrigatorio', 400)
    }

    if (unitPrice === undefined || unitPrice < 0) {
      return apiError('Preco unitario deve ser maior ou igual a zero', 400)
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

    return apiOk(service, 201)
  } catch (error: any) {
    logger.error({
      scope: 'api.services.post',
      message: 'Create service error',
      error: error instanceof Error ? error.message : String(error),
    })
    return apiError('Erro ao criar servico', 500, error.message)
  }
}
