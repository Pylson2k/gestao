import { NextRequest, NextResponse } from 'next/server'
import { getOwnerDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Lista nao encontrada' }, { status: 404 })
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()

    const list = await prisma.materialList.findFirst({
      where: { id, userId: { in: ownerIds } },
      include: { client: true, items: { orderBy: { id: 'asc' } } },
    })

    if (!list) {
      return NextResponse.json({ error: 'Lista nao encontrada' }, { status: 404 })
    }

    return NextResponse.json(list)
  } catch (error) {
    console.error('Get material list error:', error)
    return NextResponse.json({ error: 'Erro ao buscar lista' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const body = await request.json()
    const { title, observations, includePrices, clientId, items } = body

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()

    const existing = await prisma.materialList.findFirst({
      where: { id, userId: { in: ownerIds } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lista nao encontrada' }, { status: 404 })
    }

    if (clientId !== undefined && clientId !== null) {
      const c = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })
      if (!c) {
        return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 400 })
      }
    }

    const hasScalarUpdate =
      title !== undefined ||
      observations !== undefined ||
      includePrices !== undefined ||
      (clientId !== undefined && clientId !== null)

    let validItems: { name: string; quantity: number; unitPrice: number }[] | null = null
    if (items !== undefined) {
      const rawItems = Array.isArray(items) ? items : []
      validItems = rawItems
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
    }

    if (validItems === null && !hasScalarUpdate) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validItems) {
        await tx.materialListItem.deleteMany({ where: { materialListId: id } })
      }

      const data: any = {}
      if (title !== undefined) data.title = String(title).trim() || null
      if (observations !== undefined) data.observations = String(observations).trim() || null
      if (includePrices !== undefined) data.includePrices = Boolean(includePrices)
      if (clientId !== undefined && clientId !== null) data.clientId = clientId

      if (validItems) {
        data.items = {
          create: validItems.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        }
      }

      return tx.materialList.update({
        where: { id },
        data,
        include: { client: true, items: { orderBy: { id: 'asc' } } },
      })
    })

    const metadata = getRequestMetadata(request)
    createAuditLog({
      userId,
      action: 'update_material_list',
      entityType: 'material_list',
      entityId: id,
      description: `Lista de materiais ${updated.number} atualizada`,
      ...metadata,
    }).catch((e) => console.error('Audit log error:', e))

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Update material list error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar lista' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const { id } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Banco nao configurado' }, { status: 503 })
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()

    const existing = await prisma.materialList.findFirst({
      where: { id, userId: { in: ownerIds } },
      include: { client: { select: { name: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lista nao encontrada' }, { status: 404 })
    }

    await prisma.materialList.delete({ where: { id } })

    const metadata = getRequestMetadata(request)
    createAuditLog({
      userId,
      action: 'delete_material_list',
      entityType: 'material_list',
      entityId: id,
      description: `Lista de materiais ${existing.number} excluída — ${existing.client.name}`,
      ...metadata,
    }).catch((e) => console.error('Audit log error:', e))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material list error:', error)
    return NextResponse.json({ error: 'Erro ao excluir lista' }, { status: 500 })
  }
}
