import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getOwnerDbUserIds } from '@/lib/user-mapping'
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log'

// GET - List all payments for a user (optionally filtered by quoteId)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const quoteId = searchParams.get('quoteId')

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
    
    // IDs do proprietario no banco
    const ownerIds = await getOwnerDbUserIds()

    const where: any = { 
      userId: { in: ownerIds }
    }
    if (quoteId) {
      where.quoteId = quoteId
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        quote: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pagamentos' },
      { status: 500 }
    )
  }
}

// POST - Create new payment
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
    const { quoteId, amount, paymentDate, paymentMethod, observations } = body

    // Validações
    if (!quoteId || !quoteId.trim()) {
      return NextResponse.json(
        { error: 'ID do orcamento e obrigatorio' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valor do pagamento deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: 'Data do pagamento e obrigatoria' },
        { status: 400 }
      )
    }

    const validPaymentMethods = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto']
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Metodo de pagamento invalido' },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const dbUserId = await getDbUserId(userId)
    const amountNumber = parseFloat(amount)

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: 'Valor do pagamento deve ser maior que zero' },
        { status: 400 }
      )
    }

    const payment = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: quoteId,
          userId: dbUserId,
        },
        include: {
          payments: true,
        },
      })

      if (!quote) {
        throw Object.assign(new Error('Orcamento nao encontrado'), { status: 404 })
      }

      const totalPaid = quote.payments.reduce((sum, p) => sum + p.amount, 0)
      const newTotalPaid = totalPaid + amountNumber

      if (newTotalPaid > quote.total) {
        throw Object.assign(
          new Error(
            `Valor excede o total do orcamento. Total: R$ ${quote.total.toFixed(2)}, Ja pago: R$ ${totalPaid.toFixed(2)}, Restante: R$ ${(quote.total - totalPaid).toFixed(2)}`
          ),
          { status: 400, totalPaid, remaining: quote.total - totalPaid }
        )
      }

      return tx.payment.create({
        data: {
          quoteId,
          userId: dbUserId,
          amount: amountNumber,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          observations: observations?.trim() || null,
        },
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
      action: 'create_payment',
      entityType: 'payment',
      entityId: payment.id,
      description: `Pagamento registrado - Orçamento ${payment.quote.number} - Valor: R$ ${payment.amount.toFixed(2)} - Método: ${paymentMethod}`,
      newValue: {
        quoteId: payment.quoteId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
      },
      ...metadata,
    })

    const { clearDelinquencyIfFullyPaid } = await import('@/lib/quote-delinquency')
    await clearDelinquencyIfFullyPaid(prisma, quoteId)

    return NextResponse.json(payment, { status: 201 })
  } catch (error: any) {
    console.error('Create payment error:', error)
    if (error?.status === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error?.status === 400) {
      return NextResponse.json(
        {
          error: error.message,
          totalPaid: error.totalPaid,
          remaining: error.remaining,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar pagamento' },
      { status: 500 }
    )
  }
}
