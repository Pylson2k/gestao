import { NextRequest, NextResponse } from 'next/server'
import { getMemoryQuotes, addMemoryQuote } from '@/lib/emergency-store'

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

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      let quotes = getMemoryQuotes().filter(q => q.userId === userId)
      if (status) {
        quotes = quotes.filter(q => q.status === status)
      }
      return NextResponse.json(quotes)
    }

    const { prisma } = await import('@/lib/prisma')

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
    // Fallback para modo de emergência
    const userId = request.headers.get('x-user-id')
    if (userId) {
      const quotes = getMemoryQuotes().filter(q => q.userId === userId)
      return NextResponse.json(quotes)
    }
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

    // Se não tem DATABASE_URL, usa modo de emergência
    if (!process.env.DATABASE_URL) {
      const year = new Date().getFullYear()
      const count = getMemoryQuotes().length
      const number = `ORC-${year}-${String(count + 1).padStart(3, '0')}`
      const id = `mem-${Date.now()}`
      
      const quote = {
        id,
        number,
        userId,
        client: {
          id: `client-${Date.now()}`,
          name: client.name,
          phone: client.phone,
          address: client.address,
          email: client.email,
        },
        services: services.map((s: any, i: number) => ({
          id: `svc-${Date.now()}-${i}`,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
        })),
        materials: materials.map((m: any, i: number) => ({
          id: `mat-${Date.now()}-${i}`,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
        })),
        subtotal,
        discount: discount || 0,
        total,
        observations,
        status,
        createdAt: new Date().toISOString(),
      }
      
      addMemoryQuote(quote)
      return NextResponse.json(quote, { status: 201 })
    }

    const { prisma } = await import('@/lib/prisma')

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
