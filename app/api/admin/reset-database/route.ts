import { NextResponse } from 'next/server'
import { timingSafeStringEqual } from '@/lib/session'
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit'
import { OWNER_USERNAME } from '@/lib/owner-user'

function readAdminSecret(request: Request): string | null {
  const header = request.headers.get('x-admin-secret')
  if (header) return header
  try {
    const { searchParams } = new URL(request.url)
    return searchParams.get('key')
  } catch {
    return null
  }
}

/**
 * Limpa dados de negócio, mantendo o usuário dono.
 */
export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request)
    const limited = rateLimit(`admin-db-reset:${ip}`, { limit: 3, windowMs: 60 * 60 * 1000 })
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Muitas tentativas. Aguarde ${limited.retryAfterSec}s.` },
        { status: 429 }
      )
    }

    const expected = process.env.ADMIN_OPERATIONS_SECRET
    const provided = readAdminSecret(request)
    if (!expected || !provided || !timingSafeStringEqual(provided, expected)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL não configurada.' }, { status: 500 })
    }

    const { prisma } = await import('@/lib/prisma')

    const deleted = await prisma.$transaction(async (tx) => {
      const auditLogs = await tx.auditLog.deleteMany({})
      const vales = await tx.vale.deleteMany({})
      const presencas = await tx.presenca.deleteMany({})
      const funcionarios = await tx.funcionario.deleteMany({})
      const payments = await tx.payment.deleteMany({})
      const cashClosings = await tx.cashClosing.deleteMany({})
      const expenses = await tx.expense.deleteMany({})
      const materialListItems = await tx.materialListItem.deleteMany({})
      const materialLists = await tx.materialList.deleteMany({})
      const serviceItems = await tx.serviceItem.deleteMany({})
      const materialItems = await tx.materialItem.deleteMany({})
      const quotes = await tx.quote.deleteMany({})
      const clients = await tx.client.deleteMany({})
      const services = await tx.service.deleteMany({})
      const companySettings = await tx.companySettings.deleteMany({})

      return {
        auditLogs: auditLogs.count,
        vales: vales.count,
        presencas: presencas.count,
        employees: funcionarios.count,
        payments: payments.count,
        cashClosings: cashClosings.count,
        expenses: expenses.count,
        materialLists: materialLists.count + materialListItems.count,
        quotes: quotes.count + serviceItems.count + materialItems.count,
        clients: clients.count,
        services: services.count,
        companySettings: companySettings.count,
      }
    })

    const users = await prisma.user.count({ where: { username: OWNER_USERNAME } })

    return NextResponse.json({
      success: true,
      deleted,
      kept: { users },
    })
  } catch (error: unknown) {
    console.error('Reset database error:', error)
    return NextResponse.json({ error: 'Erro ao limpar banco de dados' }, { status: 500 })
  }
}
