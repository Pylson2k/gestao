import { NextRequest, NextResponse } from 'next/server'
import { getDbUserId, getPartnersDbUserIds } from '@/lib/user-mapping'
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
    
    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: { in: partnersIds },
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
    
    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    // Buscar pagamento existente (qualquer um dos sócios pode editar)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        id,
        userId: { in: partnersIds },
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
      const totalPaid = existingPayment.quote.payments
        .filter(p => p.id !== id)
        .reduce((sum, p) => sum + p.amount, 0)
      const newTotalPaid = totalPaid + parseFloat(amount)

      if (newTotalPaid > existingPayment.quote.total) {
        return NextResponse.json(
          { 
            error: `Valor excede o total do orcamento. Total: R$ ${existingPayment.quote.total.toFixed(2)}, Ja pago (outros): R$ ${totalPaid.toFixed(2)}, Restante: R$ ${(existingPayment.quote.total - totalPaid).toFixed(2)}`,
          },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: any = {}
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (paymentDate !== undefined) updateData.paymentDate = new Date(paymentDate)
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod
    if (observations !== undefined) updateData.observations = observations?.trim() || null

    const oldValue = {
      amount: existingPayment.amount,
      paymentDate: existingPayment.paymentDate,
      paymentMethod: existingPayment.paymentMethod,
      observations: existingPayment.observations,
    }

    // Atualizar pagamento
    const payment = await prisma.payment.update({
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

    return NextResponse.json(payment)
  } catch (error: any) {
    console.error('Update payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar pagamento' },
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

    // Buscar IDs de ambos os sócios para compartilhar dados
    const partnersIds = await getPartnersDbUserIds()

    // Buscar pagamento antes de deletar (qualquer um dos sócios pode deletar)
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: { in: partnersIds },
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

    // Deletar pagamento
    await prisma.payment.delete({
      where: { id },
    })

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
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir pagamento' },
      { status: 500 }
    )
  }
}
