import { NextRequest, NextResponse } from 'next/server'
import { getMemoryQuotes, addMemoryQuote } from '@/lib/emergency-store'
import { getDbUserId, getPartnersDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

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
      // No modo de emergência, compartilhar dados entre todos os usuários
      let quotes = getMemoryQuotes()
      if (status) {
        quotes = quotes.filter(q => q.status === status)
      }
      return NextResponse.json(quotes)
    }

    const { prisma } = await import('@/lib/prisma')

    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    const where: any = { 
      userId: { in: partnersIds } // Compartilhar dados entre sócios
    }
    if (status) {
      where.status = status
    }

    // Otimizar query - carregar apenas dados necessários
    const quotes = await prisma.quote.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            email: true,
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
          },
        },
        materials: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limitar a 100 orçamentos por vez
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
      const prefix = `ORC-${year}-`
      const existing = getMemoryQuotes()
      let maxNum = 0
      for (const q of existing) {
        const match = (q.number || '').match(/ORC-\d+-(\d+)/)
        if (match) {
          const n = parseInt(match[1], 10)
          if (n > maxNum) maxNum = n
        }
      }
      const number = `ORC-${year}-${String(maxNum + 1).padStart(3, '0')}`
      const id = `mem-${Date.now()}`
      const safeServices = Array.isArray(services) ? services.filter((s: any) => s != null) : []
      const safeMaterials = Array.isArray(materials) ? materials.filter((m: any) => m != null) : []

      const quote = {
        id,
        number,
        userId,
        client: {
          id: `client-${Date.now()}`,
          name: (client?.name ?? '').trim() || 'Cliente',
          phone: (client?.phone ?? '').trim() || '',
          address: (client?.address ?? '').trim() || '',
          email: (client?.email ?? '').trim() || undefined,
        },
        services: safeServices.map((s: any, i: number) => ({
          id: `svc-${Date.now()}-${i}`,
          name: (s.name ?? '').toString().trim() || 'Serviço',
          quantity: Number(s.quantity) || 1,
          unitPrice: Number(s.unitPrice) || 0,
        })),
        materials: safeMaterials.map((m: any, i: number) => ({
          id: `mat-${Date.now()}-${i}`,
          name: (m.name ?? '').toString().trim() || 'Material',
          quantity: Number(m.quantity) || 1,
          unitPrice: Number(m.unitPrice) || 0,
        })),
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        total: Number(total) || 0,
        observations: (observations ?? '').trim() || '',
        status,
        createdAt: new Date().toISOString(),
      }

      addMemoryQuote(quote)
      return NextResponse.json(quote, { status: 201 })
    }

    const { prisma } = await import('@/lib/prisma')

    // Mapear userId da autenticação para ID do banco
    const dbUserId = await getDbUserId(userId)
    console.log('Creating quote with userId:', userId, 'mapped to dbUserId:', dbUserId)

    // Sem obrigatoriedade: aceita listas vazias e dados de cliente opcionais
    const validServices = Array.isArray(services) ? services.filter((s: any) => s != null) : []
    const validMaterials = Array.isArray(materials) ? materials.filter((m: any) => m != null) : []

    const year = new Date().getFullYear()
    const prefix = `ORC-${year}-`
    const quotesFromYear = await prisma.quote.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
    })
    let maxNum = 0
    for (const q of quotesFromYear) {
      const match = q.number.match(/ORC-\d+-(\d+)/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n > maxNum) maxNum = n
      }
    }
    let number = `ORC-${year}-${String(maxNum + 1).padStart(3, '0')}`

    // Sempre cria novo cliente (permite mesmo telefone para clientes diferentes)
    const clientName = (client?.name ?? '').trim() || 'Cliente'
    const clientPhone = (client?.phone ?? '').trim() || ''
    const clientAddress = (client?.address ?? '').trim() || ''
    const clientRecord = await prisma.client.create({
      data: {
        name: clientName,
        phone: clientPhone,
        address: clientAddress,
        email: (client?.email ?? '').trim() || null,
      },
      select: { id: true },
    })

    const createQuoteWithNumber = async (quoteNumber: string) => {
      const data: any = {
        number: quoteNumber,
        userId: dbUserId,
        clientId: clientRecord.id,
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        total: Number(total) || 0,
        observations: (observations ?? '').trim() || null,
        status,
      }
      if (validServices.length > 0) {
        data.services = {
          create: validServices.map((s: any) => ({
            name: (s.name ?? '').toString().trim() || 'Serviço',
            quantity: Math.max(0, Number(s.quantity) || 0) || 1,
            unitPrice: Number(s.unitPrice) || 0,
          })),
        }
      }
      if (validMaterials.length > 0) {
        data.materials = {
          create: validMaterials.map((m: any) => ({
            name: (m.name ?? '').toString().trim() || 'Material',
            quantity: Math.max(0, Number(m.quantity) || 0) || 1,
            unitPrice: Number(m.unitPrice) || 0,
          })),
        }
      }
      return prisma.quote.create({
        data,
        include: {
          client: true,
          services: true,
          materials: true,
        },
      })
    }

    const quote = await createQuoteWithNumber(number).catch(async (err: any) => {
      if (err?.code === 'P2002') {
        const fallbackNumber = `ORC-${year}-${Date.now()}`
        return createQuoteWithNumber(fallbackNumber)
      }
      throw err
    })

    // Log de auditoria (assíncrono - não bloqueia a resposta)
    const metadata = getRequestMetadata(request)
    createAuditLog({
      userId,
      action: 'create_quote',
      entityType: 'quote',
      entityId: quote.id,
      description: `Orçamento ${quote.number} criado - Cliente: ${quote.client?.name || 'Cliente'} - Total: R$ ${quote.total.toFixed(2)}`,
      newValue: {
        number: quote.number,
        client: quote.client?.name ?? '',
        total: quote.total,
        subtotal: quote.subtotal,
        discount: quote.discount,
        status: quote.status,
      },
      ...metadata,
    }).catch(err => console.error('Audit log error (non-blocking):', err))

    return NextResponse.json(quote, { status: 201 })
  } catch (error: any) {
    const requestUserId = request.headers.get('x-user-id')
    console.error('Create quote error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      userId: requestUserId,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    })
    
    // Retornar mensagem de erro mais específica
    let errorMessage = 'Erro ao criar orcamento'
    if (error.code === 'P2002') {
      errorMessage = 'Orcamento com este numero ja existe'
    } else if (error.code === 'P2003') {
      errorMessage = 'Cliente ou usuario invalido'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          meta: error.meta,
        } : undefined
      },
      { status: 500 }
    )
  }
}
