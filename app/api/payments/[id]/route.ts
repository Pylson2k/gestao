import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getOwnerDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - Get single payment
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
        { error: 'Banco de dados nao configurado' },
        { status: 500 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    
    // IDs do proprietario no banco
    const ownerIds = await getOwnerDbUserIds()

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: { in: ownerIds },
      },
      include: {
        quote: {
          include: {
            client: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Pagamento nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pagamento' },
      { status: 500 }
    )
  }
}

// PUT - Update payment
export async function PUT(
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

    const body = await request.json()
    const { amount, paymentDate, paymentMethod, observations } = body

    const { prisma } = await import('@/lib/prisma')
    
    // IDs do proprietario no banco
    const ownerIds = await getOwnerDbUserIds()

    // Buscar pagamento existente
    const existingPayment = await prisma.payment.findFirst({
      where: {
        id,
        userId: { in: ownerIds },
      },
      include: {
        quote: {
          include: {
            payments: true,
          },
        },
      },
    })

    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Pagamento nao encontrado' },
        { status: 404 }
      )
    }

    // Validações
    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { error: 'Valor do pagamento deve ser maior que zero' },
        { status: 400 }
      )
    }

    const validPaymentMethods = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto']
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Metodo de pagamento invalido' },
        { status: 400 }
      )
    }

    // Se o valor foi alterado, validar se não excede o total
    if (amount !== undefined && amount !== existingPayment.amount) {
      const amountNumber = parseFloat(amount)
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        return NextResponse.json(
          { error: 'Valor do pagamento deve ser maior que zero' },
          { status: 400 }
        )
      }
    }

    const oldValue = {
      amount: existingPayment.amount,
      paymentDate: existingPayment.paymentDate,
      paymentMethod: existingPayment.paymentMethod,
      observations: existingPayment.observations,
    }

    const payment = await prisma.$transaction(async (tx) => {
      if (amount !== undefined && amount !== existingPayment.amount) {
        const amountNumber = parseFloat(amount)
        const lockedQuote = await tx.quote.findFirst({
          where: { id: existingPayment.quoteId, userId: { in: ownerIds } },
          include: { payments: true },
        })
        if (!lockedQuote) {
          throw Object.assign(new Error('Orcamento nao encontrado'), { status: 404 })
        }
        const totalPaid = lockedQuote.payments
          .filter((p) => p.id !== id)
          .reduce((sum, p) => sum + p.amount, 0)
        if (totalPaid + amountNumber > lockedQuote.total) {
          throw Object.assign(
            new Error(
              `Valor excede o total do orcamento. Total: R$ ${lockedQuote.total.toFixed(2)}, Ja pago (outros): R$ ${totalPaid.toFixed(2)}, Restante: R$ ${(lockedQuote.total - totalPaid).toFixed(2)}`
            ),
            { status: 400 }
          )
        }
      }

      const updateData: Record<string, unknown> = {}
      if (amount !== undefined) updateData.amount = parseFloat(amount)
      if (paymentDate !== undefined) updateData.paymentDate = new Date(paymentDate)
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod
      if (observations !== undefined) updateData.observations = observations?.trim() || null

      return tx.payment.update({
        where: { id },
        data: updateData,
        include: {
          quote: {
            include: {
              client: true,
            },
          },
        },
      })
    })

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'update_payment',
      entityType: 'payment',
      entityId: payment.id,
      description: `Pagamento atualizado - Orçamento ${payment.quote.number} - Valor: R$ ${payment.amount.toFixed(2)}`,
      oldValue,
      newValue: {
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        observations: payment.observations,
      },
      ...metadata,
    })

    const { clearDelinquencyIfFullyPaid } = await import('@/lib/quote-delinquency')
    await clearDelinquencyIfFullyPaid(prisma, payment.quoteId)

    return NextResponse.json(payment)
  } catch (error: any) {
    console.error('Update payment error:', error)
    if (error?.status === 404 || error?.status === 400) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar pagamento' },
      { status: 500 }
    )
  }
}

// DELETE - Delete payment
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

    // IDs do proprietario no banco
    const ownerIds = await getOwnerDbUserIds()

    // Buscar pagamento antes de deletar
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: { in: ownerIds },
      },
      include: {
        quote: true,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Pagamento nao encontrado' },
        { status: 404 }
      )
    }

    const quoteIdForSync = payment.quoteId

    // Deletar pagamento
    await prisma.payment.delete({
      where: { id },
    })

    const { clearDelinquencyIfFullyPaid } = await import('@/lib/quote-delinquency')
    await clearDelinquencyIfFullyPaid(prisma, quoteIdForSync)

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'delete_payment',
      entityType: 'payment',
      entityId: id,
      description: `Pagamento excluído - Orçamento ${payment.quote.number} - Valor: R$ ${payment.amount.toFixed(2)}`,
      oldValue: {
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
      },
      ...metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete payment error:', error)
    return NextResponse.json({ error: 'Erro ao excluir pagamento' }, { status: 500 })
  }
}
