import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - List all clients
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
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

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        quotes: {
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Últimos 5 orçamentos
        },
        _count: {
          select: {
            quotes: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    )
  }
}

// POST - Create new client
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
    const { name, phone, address, email } = body

    const { prisma } = await import('@/lib/prisma')

    // Permite cadastrar outro cliente mesmo com mesmo nome/telefone (tudo opcional)
    const client = await prisma.client.create({
      data: {
        name: (name ?? '').toString().trim() || 'Cliente',
        phone: (phone ?? '').toString().trim() || '',
        address: (address ?? '').toString().trim() || '',
        email: (email ?? '').toString().trim() || null,
      },
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'create_client',
      entityType: 'client',
      entityId: client.id,
      description: `Cliente cadastrado - ${client.name} (${client.phone})`,
      newValue: {
        name: client.name,
        phone: client.phone,
        address: client.address,
        email: client.email,
      },
      ...metadata,
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar cliente', details: error.message },
      { status: 500 }
    )
  }
}
