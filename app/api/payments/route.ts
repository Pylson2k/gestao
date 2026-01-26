import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId } from '@/lib/user-mapping'
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
    const dbUserId = await getDbUserId(userId)

    const where: any = { userId: dbUserId }
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

    // Verificar se o orçamento existe e pertence ao usuário
    const quote = await prisma.quote.findFirst({
      where: {
        id: quoteId,
        userId: dbUserId,
      },
      include: {
        payments: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Orcamento nao encontrado' },
        { status: 404 }
      )
    }

    // Calcular total já pago
    const totalPaid = quote.payments.reduce((sum, p) => sum + p.amount, 0)
    const newTotalPaid = totalPaid + parseFloat(amount)

    // Validar se o pagamento não excede o total do orçamento
    if (newTotalPaid > quote.total) {
      return NextResponse.json(
        { 
          error: `Valor excede o total do orcamento. Total: R$ ${quote.total.toFixed(2)}, Ja pago: R$ ${totalPaid.toFixed(2)}, Restante: R$ ${(quote.total - totalPaid).toFixed(2)}`,
          totalPaid,
          remaining: quote.total - totalPaid,
        },
        { status: 400 }
      )
    }

    // Criar pagamento
    const payment = await prisma.payment.create({
      data: {
        quoteId,
        userId: dbUserId,
        amount: parseFloat(amount),
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

    // Log de auditoria
    const metadata = getRequestMetadata(request)
    await createAuditLog({
      userId,
      action: 'create_payment',
      entityType: 'payment',
      entityId: payment.id,
      description: `Pagamento registrado - Orçamento ${quote.number} - Valor: R$ ${payment.amount.toFixed(2)} - Método: ${paymentMethod}`,
      newValue: {
        quoteId: payment.quoteId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
      },
      ...metadata,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error: any) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar pagamento' },
      { status: 500 }
    )
  }
}
