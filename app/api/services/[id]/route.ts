import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - Get single service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Servico nao encontrado' },
        { status: 404 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const service = await prisma.service.findFirst({
      where: {
        id,
        userId: dbUserId,
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Servico nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error('Get service error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar servico' },
      { status: 500 }
    )
  }
}

// PUT - Update service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params
    const body = await request.json()

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

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    // Verify ownership
    const existingService = await prisma.service.findFirst({
      where: { id, userId: dbUserId },
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Servico nao encontrado' },
        { status: 404 }
      )
    }

    // Update service
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.unitPrice !== undefined) {
      if (body.unitPrice < 0) {
        return NextResponse.json(
          { error: 'Preco unitario deve ser maior ou igual a zero' },
          { status: 400 }
        )
      }
      updateData.unitPrice = parseFloat(body.unitPrice)
    }
    if (body.unit !== undefined) updateData.unit = body.unit.trim()
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    const changes: string[] = []
    
    if (body.name !== undefined && existingService.name !== service.name) {
      changes.push(`Nome: "${existingService.name}" → "${service.name}"`)
    }
    if (body.unitPrice !== undefined && existingService.unitPrice !== service.unitPrice) {
      changes.push(`Preço: R$ ${existingService.unitPrice.toFixed(2)} → R$ ${service.unitPrice.toFixed(2)}`)
    }
    if (body.isActive !== undefined && existingService.isActive !== service.isActive) {
      changes.push(`Status: ${service.isActive ? 'Ativado' : 'Desativado'}`)
    }

    if (changes.length > 0) {
      await createAuditLog({
        userId,
        action: 'update_service',
        entityType: 'service',
        entityId: id,
        description: `Serviço atualizado - ${changes.join(', ')}`,
        oldValue: {
          name: existingService.name,
          unitPrice: existingService.unitPrice,
          unit: existingService.unit,
          isActive: existingService.isActive,
        },
        newValue: {
          name: service.name,
          unitPrice: service.unitPrice,
          unit: service.unit,
          isActive: service.isActive,
        },
        ...metadata,
      })
    }

    return NextResponse.json(service)
  } catch (error: any) {
    console.error('Update service error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar servico', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params

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

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    // Verify ownership
    const service = await prisma.service.findFirst({
      where: { id, userId: dbUserId },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Servico nao encontrado' },
        { status: 404 }
      )
    }

    // Log de auditoria antes de excluir
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'delete_service',
      entityType: 'service',
      entityId: id,
      description: `⚠️ Serviço EXCLUÍDO - ${service.name} - Preço: R$ ${service.unitPrice.toFixed(2)}/${service.unit}`,
      oldValue: {
        name: service.name,
        unitPrice: service.unitPrice,
        unit: service.unit,
        isActive: service.isActive,
      },
      ...metadata,
    })

    await prisma.service.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete service error:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir servico' },
      { status: 500 }
    )
  }
}
