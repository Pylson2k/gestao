import { NextRequest, NextResponse } from 'next/server'
import { getMemoryQuoteById, updateMemoryQuote, deleteMemoryQuote } from '@/lib/emergency-store'

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

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        client: true,
        services: true,
        materials: true,
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

    // Verify ownership
    const existingQuote = await prisma.quote.findFirst({
      where: { id, userId },
    })

    if (!existingQuote) {
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

    // Update client if provided
    if (body.client) {
      await prisma.client.update({
        where: { id: existingQuote.clientId },
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

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        services: true,
        materials: true,
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Update quote error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar orcamento' },
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

    // Verify ownership
    const quote = await prisma.quote.findFirst({
      where: { id, userId },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Orcamento nao encontrado' },
        { status: 404 }
      )
    }

    await prisma.quote.delete({
      where: { id },
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
