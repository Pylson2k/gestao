import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - Get single expense
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
        { error: 'Despesa nao encontrada' },
        { status: 404 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        userId: dbUserId,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Despesa nao encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Get expense error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar despesa' },
      { status: 500 }
    )
  }
}

// PUT - Update expense
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
    const dbUserId = await getDbUserId(userId)

    // Verify ownership
    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId: dbUserId },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Despesa nao encontrada' },
        { status: 404 }
      )
    }

    // Update expense
    const updateData: any = {}
    if (body.category !== undefined) updateData.category = body.category
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) {
      if (body.amount <= 0) {
        return NextResponse.json(
          { error: 'O valor deve ser maior que zero' },
          { status: 400 }
        )
      }
      updateData.amount = parseFloat(body.amount)
    }
    if (body.date !== undefined) updateData.date = new Date(body.date)
    if (body.observations !== undefined) updateData.observations = body.observations || null

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    })

    // Log de auditoria - detectar mudanças importantes
    const metadata = getRequestMetadata(request)
    const changes: string[] = []
    
    if (body.amount !== undefined && existingExpense.amount !== expense.amount) {
      changes.push(`Valor: R$ ${existingExpense.amount.toFixed(2)} → R$ ${expense.amount.toFixed(2)}`)
    }
    if (body.category !== undefined && existingExpense.category !== expense.category) {
      changes.push(`Categoria: ${existingExpense.category} → ${expense.category}`)
    }
    if (body.description !== undefined && existingExpense.description !== expense.description) {
      changes.push(`Descrição alterada`)
    }
    if (body.date !== undefined && new Date(existingExpense.date).getTime() !== new Date(expense.date).getTime()) {
      changes.push(`Data alterada`)
    }

    if (changes.length > 0) {
      await createAuditLog({
        userId,
        action: 'update_expense',
        entityType: 'expense',
        entityId: id,
        description: `Despesa atualizada - ${changes.join(', ')}`,
        oldValue: {
          category: existingExpense.category,
          description: existingExpense.description,
          amount: existingExpense.amount,
          date: existingExpense.date,
        },
        newValue: {
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
        },
        ...metadata,
      })
    }

    return NextResponse.json(expense)
  } catch (error: any) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar despesa', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete expense
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
    const dbUserId = await getDbUserId(userId)

    // Verify ownership
    const expense = await prisma.expense.findFirst({
      where: { id, userId: dbUserId },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Despesa nao encontrada' },
        { status: 404 }
      )
    }

    // Validação adicional: alertar sobre exclusão de despesas grandes
    const isLargeExpense = expense.amount > 1000
    const description = isLargeExpense
      ? `⚠️ EXCLUSÃO DE DESPESA DE VALOR ALTO - ${expense.category}: ${expense.description} - Valor: R$ ${expense.amount.toFixed(2)}`
      : `Despesa EXCLUÍDA - ${expense.category}: ${expense.description} - Valor: R$ ${expense.amount.toFixed(2)}`

    // Log de auditoria antes de excluir
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'delete_expense',
      entityType: 'expense',
      entityId: id,
      description,
      oldValue: {
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
      },
      ...metadata,
    })

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir despesa' },
      { status: 500 }
    )
  }
}
