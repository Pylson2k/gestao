import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - List all cash closings for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

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
    const dbUserId = await getDbUserId(userId)

    const closings = await prisma.cashClosing.findMany({
      where: { userId: dbUserId },
      orderBy: {
        endDate: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(closings)
  } catch (error) {
    console.error('Get cash closings error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar fechamentos' },
      { status: 500 }
    )
  }
}

// POST - Create new cash closing
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
    const { periodType, startDate, endDate, totalProfit, companyCash, gustavoProfit, giovanniProfit, totalRevenue, totalExpenses, observations } = body

    // Validações
    if (!periodType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: periodType, startDate, endDate' },
        { status: 400 }
      )
    }

    if (totalProfit === undefined || totalRevenue === undefined || totalExpenses === undefined) {
      return NextResponse.json(
        { error: 'Valores financeiros sao obrigatorios' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const closing = await prisma.cashClosing.create({
      data: {
        userId: dbUserId,
        periodType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalProfit: parseFloat(totalProfit),
        companyCash: companyCash !== undefined ? parseFloat(companyCash) : 0,
        gustavoProfit: parseFloat(gustavoProfit),
        giovanniProfit: parseFloat(giovanniProfit),
        totalRevenue: parseFloat(totalRevenue),
        totalExpenses: parseFloat(totalExpenses),
        observations: observations?.trim() || null,
      },
    })

    // Log de auditoria - CRÍTICO: Fechamento de caixa
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'create_cash_closing',
      entityType: 'cash_closing',
      entityId: closing.id,
      description: `💰 FECHAMENTO DE CAIXA ${periodType.toUpperCase()} - Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')} - Lucro Total: R$ ${closing.totalProfit.toFixed(2)} - Caixa Empresa: R$ ${closing.companyCash.toFixed(2)} - Gustavo: R$ ${closing.gustavoProfit.toFixed(2)} - Giovanni: R$ ${closing.giovanniProfit.toFixed(2)}`,
      newValue: {
        periodType: closing.periodType,
        startDate: closing.startDate,
        endDate: closing.endDate,
        totalProfit: closing.totalProfit,
        companyCash: closing.companyCash,
        gustavoProfit: closing.gustavoProfit,
        giovanniProfit: closing.giovanniProfit,
        totalRevenue: closing.totalRevenue,
        totalExpenses: closing.totalExpenses,
      },
      ...metadata,
    })

    return NextResponse.json(closing, { status: 201 })
  } catch (error: any) {
    console.error('Create cash closing error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar fechamento', details: error.message },
      { status: 500 }
    )
  }
}
