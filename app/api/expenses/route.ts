import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getPartnersDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - List all expenses for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

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
    
    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    const where: any = { 
      userId: { in: partnersIds } // Compartilhar dados entre sócios
    }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate + 'T23:59:59')
      }
    }
    
    if (category) {
      where.category = category
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Get expenses error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar despesas' },
      { status: 500 }
    )
  }
}

// POST - Create new expense
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
    const { category, description, amount, date, observations } = body

    // Validações
    if (!category || amount === undefined || !date) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: category, amount, date' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'O valor deve ser maior que zero' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const expense = await prisma.expense.create({
      data: {
        userId: dbUserId,
        category,
        description: description?.trim() || category, // Usa a categoria como descrição padrão se não fornecida
        amount: parseFloat(amount),
        date: new Date(date),
        observations: observations || null,
        employeeId: body.employeeId || null,
      },
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    const isVale = category.includes('vale')
    const finalDescription = description?.trim() || category
    const descriptionText = isVale
      ? `💰 VALE CRIADO - ${category}: ${finalDescription} - Valor: R$ ${expense.amount.toFixed(2)}`
      : `Despesa criada - ${category}: ${finalDescription} - Valor: R$ ${expense.amount.toFixed(2)}`
    
    await createAuditLog({
      userId,
      action: 'create_expense',
      entityType: 'expense',
      entityId: expense.id,
      description: descriptionText,
      newValue: {
        category,
        description,
        amount: expense.amount,
        date: expense.date,
      },
      ...metadata,
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error: any) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar despesa', details: error.message },
      { status: 500 }
    )
  }
}
