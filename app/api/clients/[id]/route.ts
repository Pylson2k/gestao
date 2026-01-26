import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - Get single client
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
        { error: 'Cliente nao encontrado' },
        { status: 404 }
      )
    }

    const { prisma } = await import('@/lib/prisma')

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// PUT - Update client
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

    // Buscar cliente existente para auditoria
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente nao encontrado' },
        { status: 404 }
      )
    }

    // Update client
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.phone !== undefined) updateData.phone = body.phone.trim()
    if (body.address !== undefined) updateData.address = body.address.trim()
    if (body.email !== undefined) updateData.email = body.email?.trim() || null

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    const changes: string[] = []
    
    if (body.name !== undefined && existingClient.name !== client.name) {
      changes.push(`Nome: "${existingClient.name}" → "${client.name}"`)
    }
    if (body.phone !== undefined && existingClient.phone !== client.phone) {
      changes.push(`Telefone alterado`)
    }
    if (body.address !== undefined && existingClient.address !== client.address) {
      changes.push(`Endereço alterado`)
    }
    if (body.email !== undefined && existingClient.email !== client.email) {
      changes.push(`Email alterado`)
    }

    if (changes.length > 0) {
      await createAuditLog({
        userId,
        action: 'update_client',
        entityType: 'client',
        entityId: id,
        description: `Cliente atualizado - ${changes.join(', ')}`,
        oldValue: {
          name: existingClient.name,
          phone: existingClient.phone,
          address: existingClient.address,
          email: existingClient.email,
        },
        newValue: {
          name: client.name,
          phone: client.phone,
          address: client.address,
          email: client.email,
        },
        ...metadata,
      })
    }

    return NextResponse.json(client)
  } catch (error: any) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete client
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

    // Buscar cliente antes de excluir para auditoria
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            quotes: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente nao encontrado' },
        { status: 404 }
      )
    }

    // Verificar se tem orçamentos associados
    if (client._count.quotes > 0) {
      return NextResponse.json(
        { error: 'Nao e possivel excluir cliente com orcamentos associados' },
        { status: 400 }
      )
    }

    // Log de auditoria antes de excluir
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'delete_client',
      entityType: 'client',
      entityId: id,
      description: `⚠️ Cliente EXCLUÍDO - ${client.name} (${client.phone})`,
      oldValue: {
        name: client.name,
        phone: client.phone,
        address: client.address,
        email: client.email,
      },
      ...metadata,
    })

    await prisma.client.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir cliente' },
      { status: 500 }
    )
  }
}
