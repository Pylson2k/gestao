import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getOwnerDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()

    const lists = await prisma.materialList.findMany({
      where: { userId: { in: ownerIds } },
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
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(lists)
  } catch (error) {
    console.error('Get material lists error:', error)
    return NextResponse.json({ error: 'Erro ao buscar listas de materiais' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Banco de dados nao configurado' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { clientId, title, observations, includePrices = false, items } = body

    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json({ error: 'Cliente e obrigatorio' }, { status: 400 })
    }

    const rawItems = Array.isArray(items) ? items : []
    const validItems = rawItems
      .filter((it: any) => it && String(it.name ?? '').trim() !== '')
      .map((it: any) => ({
        name: String(it.name).trim(),
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      }))

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'Informe ao menos um material com descricao' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 400 })
    }

    const year = new Date().getFullYear()
    const prefix = `LM-${year}-`
    const existing = await prisma.materialList.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
    })
    let maxNum = 0
    for (const row of existing) {
      const m = row.number.match(/LM-\d+-(\d+)/)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > maxNum) maxNum = n
      }
    }
    let number = `${prefix}${String(maxNum + 1).padStart(3, '0')}`

    const createWithNumber = async (num: string) =>
      prisma.materialList.create({
        data: {
          number: num,
          userId: dbUserId,
          clientId,
          title: (title ?? '').toString().trim() || null,
          observations: (observations ?? '').toString().trim() || null,
          includePrices: Boolean(includePrices),
          items: {
            create: validItems.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            })),
          },
        },
        include: {
          client: true,
          items: true,
        },
      })

    const list = await createWithNumber(number).catch(async (err: any) => {
      if (err?.code === 'P2002') {
        const fallback = `LM-${year}-${Date.now()}`
        return createWithNumber(fallback)
      }
      throw err
    })

    const metadata = getRequestMetadata(request)
    createAuditLog({
      userId,
      action: 'create_material_list',
      entityType: 'material_list',
      entityId: list.id,
      description: `Lista de materiais ${list.number} criada — ${list.client.name}`,
      newValue: { number: list.number, clientId: list.clientId, items: validItems.length },
      ...metadata,
    }).catch((e) => console.error('Audit log error:', e))

    return NextResponse.json(list, { status: 201 })
  } catch (error: any) {
    console.error('Create material list error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar lista de materiais' },
      { status: 500 }
    )
  }
}
