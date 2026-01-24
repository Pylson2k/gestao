import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all quotes for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const where: any = { userId }
    if (status) {
      where.status = status
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        client: true,
        services: true,
        materials: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Get quotes error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar orcamentos' },
      { status: 500 }
    )
  }
}

// POST - Create new quote
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      client,
      services,
      materials,
      subtotal,
      discount,
      total,
      observations,
      status = 'draft',
    } = body

    // Generate quote number
    const year = new Date().getFullYear()
    const count = await prisma.quote.count({
      where: {
        number: {
          startsWith: `ORC-${year}-`,
        },
      },
    })
    const number = `ORC-${year}-${String(count + 1).padStart(3, '0')}`

    // Create or find client
    let clientRecord = await prisma.client.findFirst({
      where: {
        name: client.name,
        phone: client.phone,
      },
    })

    if (!clientRecord) {
      clientRecord = await prisma.client.create({
        data: {
          name: client.name,
          phone: client.phone,
          address: client.address,
          email: client.email,
        },
      })
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        number,
        userId,
        clientId: clientRecord.id,
        subtotal,
        discount: discount || 0,
        total,
        observations,
        status,
        services: {
          create: services.map((s: any) => ({
            name: s.name,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
          })),
        },
        materials: {
          create: materials.map((m: any) => ({
            name: m.name,
            quantity: m.quantity,
            unitPrice: m.unitPrice,
          })),
        },
      },
      include: {
        client: true,
        services: true,
        materials: true,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Create quote error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar orcamento' },
      { status: 500 }
    )
  }
}
