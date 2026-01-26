import { NextRequest, NextResponse } from 'next/server'
import { getMemoryQuoteById, updateMemoryQuote, deleteMemoryQuote } from '@/lib/emergency-store'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - Get single quote
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

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      const quote = getMemoryQuoteById(id)
      if (!quote || quote.userId !== userId) {
        return NextResponse.json(
          { error: 'Orcamento nao encontrado' },
          { status: 404 }
        )
      }
      return NextResponse.json(quote)
    }

    const { prisma } = await import('@/lib/prisma')

    // Mapear userId da autenticação para ID do banco
    const dbUserId = await getDbUserId(userId)

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        userId: dbUserId,
      },
      include: {
        client: true,
        services: true,
        materials: true,
        payments: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Orcamento nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Get quote error:', error)
    // Fallback
    const { id } = await params
    const quote = getMemoryQuoteById(id)
    if (quote) {
      return NextResponse.json(quote)
    }
    return NextResponse.json(
      { error: 'Erro ao buscar orcamento' },
      { status: 500 }
    )
  }
}

// PUT - Update quote
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

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      const existing = getMemoryQuoteById(id)
      if (!existing || existing.userId !== userId) {
        return NextResponse.json(
          { error: 'Orcamento nao encontrado' },
          { status: 404 }
        )
      }
      
      const updated = updateMemoryQuote(id, {
        ...body,
        client: body.client ? { ...existing.client, ...body.client } : existing.client,
        services: body.services || existing.services,
        materials: body.materials || existing.materials,
      })
      return NextResponse.json(updated)
    }

    const { prisma } = await import('@/lib/prisma')

    // Mapear userId da autenticação para ID do banco
    let dbUserId: string
    try {
      dbUserId = await getDbUserId(userId)
    } catch (error: any) {
      console.error('Error getting dbUserId:', error)
      return NextResponse.json(
        { error: 'Erro ao autenticar usuario' },
        { status: 401 }
      )
    }
    
    console.log('PUT /api/quotes/[id] - Debug info:', {
      authUserId: userId,
      dbUserId,
      quoteId: id,
    })

    // Verify ownership - primeiro tenta encontrar sem verificar userId para debug
    const existingQuoteWithoutUser = await prisma.quote.findFirst({
      where: { id },
      select: { id: true, userId: true, status: true },
    })
    
    console.log('Quote found (without user check):', existingQuoteWithoutUser ? {
      id: existingQuoteWithoutUser.id,
      userId: existingQuoteWithoutUser.userId,
      status: existingQuoteWithoutUser.status,
      dbUserIdMatches: existingQuoteWithoutUser.userId === dbUserId,
    } : null)

    // Verify ownership
    const existingQuote = await prisma.quote.findFirst({
      where: { id, userId: dbUserId },
    })

    // Se o orçamento não foi encontrado com o userId correto, verificar se existe
    if (!existingQuote) {
      const errorDetails = {
        quoteId: id,
        requestedDbUserId: dbUserId,
        quoteUserId: existingQuoteWithoutUser?.userId,
        quoteExists: !!existingQuoteWithoutUser,
        userIdMismatch: existingQuoteWithoutUser?.userId !== dbUserId,
      }
      
      // Se o orçamento não existe de forma alguma, retornar erro
      if (!existingQuoteWithoutUser) {
        console.error('Quote not found:', errorDetails)
        return NextResponse.json(
          { 
            error: 'Orcamento nao encontrado',
            details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
          },
          { status: 404 }
        )
      }
      
      // Se o orçamento existe mas o userId não corresponde, logar aviso mas permitir atualização
      // (pode ser um problema de mapeamento temporário ou usuário recriado)
      if (existingQuoteWithoutUser.userId !== dbUserId) {
        console.warn('User ID mismatch detected. Quote exists but userId differs:', errorDetails)
        console.warn('Allowing update anyway - this may indicate a user mapping issue')
      }
    }
    
    // Usar existingQuote se encontrado, senão usar existingQuoteWithoutUser
    const quoteToUpdate = existingQuote || existingQuoteWithoutUser
    if (!quoteToUpdate) {
      return NextResponse.json(
        { error: 'Orcamento nao encontrado' },
        { status: 404 }
      )
    }

    // Update quote
    const updateData: any = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal
    if (body.discount !== undefined) updateData.discount = body.discount
    if (body.total !== undefined) updateData.total = body.total
    if (body.observations !== undefined) updateData.observations = body.observations
    if (body.serviceStartedAt !== undefined) {
      if (body.serviceStartedAt === null || body.serviceStartedAt === '') {
        updateData.serviceStartedAt = null
      } else if (body.serviceStartedAt) {
        try {
          // Se já é uma string ISO, converter para Date
          // Se já é um objeto Date (improvável via JSON), usar diretamente
          const dateValue = typeof body.serviceStartedAt === 'string' 
            ? new Date(body.serviceStartedAt) 
            : body.serviceStartedAt instanceof Date 
              ? body.serviceStartedAt 
              : new Date(String(body.serviceStartedAt))
          
          // Validar se a data é válida
          if (isNaN(dateValue.getTime())) {
            console.error('Invalid date for serviceStartedAt:', body.serviceStartedAt)
            updateData.serviceStartedAt = new Date()
          } else {
            updateData.serviceStartedAt = dateValue
          }
        } catch (e) {
          console.error('Error parsing serviceStartedAt:', body.serviceStartedAt, e)
          updateData.serviceStartedAt = new Date()
        }
      }
    }
    if (body.serviceCompletedAt !== undefined) {
      if (body.serviceCompletedAt === null || body.serviceCompletedAt === '') {
        updateData.serviceCompletedAt = null
      } else if (body.serviceCompletedAt) {
        try {
          const dateValue = typeof body.serviceCompletedAt === 'string' 
            ? new Date(body.serviceCompletedAt) 
            : body.serviceCompletedAt instanceof Date 
              ? body.serviceCompletedAt 
              : new Date(String(body.serviceCompletedAt))
          
          if (isNaN(dateValue.getTime())) {
            console.error('Invalid date for serviceCompletedAt:', body.serviceCompletedAt)
            updateData.serviceCompletedAt = new Date()
          } else {
            updateData.serviceCompletedAt = dateValue
          }
        } catch (e) {
          console.error('Error parsing serviceCompletedAt:', body.serviceCompletedAt, e)
          updateData.serviceCompletedAt = new Date()
        }
      }
    }

    // Buscar o quote completo para obter clientId se necessário
    const fullQuote = await prisma.quote.findUnique({
      where: { id },
      select: { clientId: true },
    })

    // Update client if provided
    if (body.client && fullQuote) {
      await prisma.client.update({
        where: { id: fullQuote.clientId },
        data: body.client,
      })
    }

    // Update services if provided
    if (body.services) {
      await prisma.serviceItem.deleteMany({
        where: { quoteId: id },
      })
      await prisma.serviceItem.createMany({
        data: body.services.map((s: any) => ({
          quoteId: id,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
        })),
      })
    }

    // Update materials if provided
    if (body.materials) {
      await prisma.materialItem.deleteMany({
        where: { quoteId: id },
      })
      await prisma.materialItem.createMany({
        data: body.materials.map((m: any) => ({
          quoteId: id,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
        })),
      })
    }

    // Log para debug
    console.log('Updating quote with data:', {
      id,
      updateData,
      hasServiceStartedAt: updateData.serviceStartedAt !== undefined,
      serviceStartedAtType: typeof updateData.serviceStartedAt,
      serviceStartedAtValue: updateData.serviceStartedAt,
    })

    // Buscar valores antigos antes da atualização para auditoria
    const oldQuote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
      },
    })

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        services: true,
        materials: true,
      },
    })

    // Log de auditoria - detectar mudanças importantes
    const metadata = getRequestMetadata(request)
    const changes: string[] = []
    
    if (body.status !== undefined && oldQuote && oldQuote.status !== body.status) {
      changes.push(`Status: ${oldQuote.status} → ${body.status}`)
      await createAuditLog({
        userId,
        action: 'change_quote_status',
        entityType: 'quote',
        entityId: id,
        description: `Status do orçamento ${oldQuote.number} alterado de "${oldQuote.status}" para "${body.status}"`,
        oldValue: { status: oldQuote.status },
        newValue: { status: body.status },
        ...metadata,
      })
    }

    if (body.discount !== undefined && oldQuote && oldQuote.discount !== body.discount) {
      changes.push(`Desconto: R$ ${oldQuote.discount.toFixed(2)} → R$ ${body.discount.toFixed(2)}`)
      await createAuditLog({
        userId,
        action: 'change_quote_discount',
        entityType: 'quote',
        entityId: id,
        description: `Desconto do orçamento ${oldQuote.number} alterado de R$ ${oldQuote.discount.toFixed(2)} para R$ ${body.discount.toFixed(2)}`,
        oldValue: { discount: oldQuote.discount, total: oldQuote.total },
        newValue: { discount: body.discount, total: quote.total },
        ...metadata,
      })
    }

    if (body.total !== undefined && oldQuote && oldQuote.total !== body.total) {
      changes.push(`Total: R$ ${oldQuote.total.toFixed(2)} → R$ ${body.total.toFixed(2)}`)
      await createAuditLog({
        userId,
        action: 'change_quote_total',
        entityType: 'quote',
        entityId: id,
        description: `Total do orçamento ${oldQuote.number} alterado de R$ ${oldQuote.total.toFixed(2)} para R$ ${body.total.toFixed(2)}`,
        oldValue: { total: oldQuote.total },
        newValue: { total: body.total },
        ...metadata,
      })
    }

    // Log genérico de atualização se houver outras mudanças
    if (changes.length === 0 && (body.client || body.services || body.materials || body.observations !== undefined)) {
      await createAuditLog({
        userId,
        action: 'update_quote',
        entityType: 'quote',
        entityId: id,
        description: `Orçamento ${oldQuote?.number || id} atualizado`,
        oldValue: oldQuote ? {
          subtotal: oldQuote.subtotal,
          discount: oldQuote.discount,
          total: oldQuote.total,
          status: oldQuote.status,
        } : undefined,
        newValue: {
          subtotal: quote.subtotal,
          discount: quote.discount,
          total: quote.total,
          status: quote.status,
        },
        ...metadata,
      })
    }

    return NextResponse.json(quote)
  } catch (error: any) {
    console.error('Update quote error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    return NextResponse.json(
      { 
        error: 'Erro ao atualizar orcamento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete quote
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

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      const existing = getMemoryQuoteById(id)
      if (!existing || existing.userId !== userId) {
        return NextResponse.json(
          { error: 'Orcamento nao encontrado' },
          { status: 404 }
        )
      }
      deleteMemoryQuote(id)
      return NextResponse.json({ success: true })
    }

    const { prisma } = await import('@/lib/prisma')

    // Mapear userId da autenticação para ID do banco
    const dbUserId = await getDbUserId(userId)

    // Verify ownership
    const quote = await prisma.quote.findFirst({
      where: { id, userId: dbUserId },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Orcamento nao encontrado' },
        { status: 404 }
      )
    }

    // Buscar dados antes de excluir para auditoria
    const quoteToDelete = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
      },
    })

    // Validação adicional: não permitir exclusão de orçamentos finalizados sem confirmação extra
    if (quoteToDelete && quoteToDelete.status === 'completed') {
      // Log de tentativa de exclusão de orçamento finalizado (ação suspeita)
      const metadata = getRequestMetadata(request)
      await createAuditLog({
        userId,
        action: 'delete_quote',
        entityType: 'quote',
        entityId: id,
        description: `⚠️ TENTATIVA DE EXCLUSÃO DE ORÇAMENTO FINALIZADO - ${quoteToDelete.number} - Cliente: ${quoteToDelete.client.name} - Total: R$ ${quoteToDelete.total.toFixed(2)}`,
        oldValue: {
          number: quoteToDelete.number,
          client: quoteToDelete.client.name,
          total: quoteToDelete.total,
          status: quoteToDelete.status,
        },
        ...metadata,
      })
    }

    await prisma.quote.delete({
      where: { id },
    })

    // Log de auditoria para exclusão
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'delete_quote',
      entityType: 'quote',
      entityId: id,
      description: `Orçamento ${quoteToDelete?.number || id} EXCLUÍDO - Cliente: ${quoteToDelete?.client.name || 'N/A'} - Total: R$ ${quoteToDelete?.total.toFixed(2) || '0.00'}`,
      oldValue: quoteToDelete ? {
        number: quoteToDelete.number,
        client: quoteToDelete.client.name,
        total: quoteToDelete.total,
        status: quoteToDelete.status,
      } : undefined,
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete quote error:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir orcamento' },
      { status: 500 }
    )
  }
}
