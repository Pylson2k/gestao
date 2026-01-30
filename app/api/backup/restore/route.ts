/**
 * API de Restauração - Restaura dados a partir de um backup JSON
 * CUIDADO: Substitui os dados atuais dos sócios pelos do backup.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPartnersDbUserIds } from '@/lib/user-mapping'

export const dynamic = 'force-dynamic'

function toDate(val: string | Date): Date {
  if (val instanceof Date) return val
  return new Date(val)
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Banco de dados não configurado. Conecte o banco antes de restaurar.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const {
      clients = [],
      quotes = [],
      payments = [],
      expenses = [],
      employees = [],
      services = [],
      companySettings = [],
      cashClosings = [],
    } = body

    if (!Array.isArray(clients) || !Array.isArray(quotes)) {
      return NextResponse.json(
        { error: 'Formato de backup inválido. Esperado: { clients, quotes, ... }' },
        { status: 400 }
      )
    }

    // Impedir restauração de backup vazio (evita zerar os dados por engano)
    if (clients.length === 0 && quotes.length === 0) {
      return NextResponse.json(
        {
          error:
            'Backup vazio. Este arquivo não tem clientes nem orçamentos. Restaurar apagaria todos os seus dados. Use um arquivo de backup que contenha dados.',
        },
        { status: 400 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const partnersIds = await getPartnersDbUserIds()
    if (partnersIds.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum usuário encontrado no banco' },
        { status: 500 }
      )
    }

    // 1. Remover dados atuais (ordem: dependentes primeiro)
    await prisma.payment.deleteMany({
      where: { userId: { in: partnersIds } },
    })
    await prisma.serviceItem.deleteMany({
      where: { quote: { userId: { in: partnersIds } } },
    })
    await prisma.materialItem.deleteMany({
      where: { quote: { userId: { in: partnersIds } } },
    })
    await prisma.quote.deleteMany({
      where: { userId: { in: partnersIds } },
    })
    const clientIdsFromBackup = clients.map((c: any) => c.id)
    if (clientIdsFromBackup.length > 0) {
      await prisma.client.deleteMany({
        where: { id: { in: clientIdsFromBackup } },
      })
    }
    await prisma.expense.deleteMany({
      where: { userId: { in: partnersIds } },
    })
    await prisma.cashClosing.deleteMany({
      where: { userId: { in: partnersIds } },
    })
    await prisma.employee.deleteMany({
      where: { userId: { in: partnersIds } },
    })
    await prisma.service.deleteMany({
      where: { userId: { in: partnersIds } },
    })
    await prisma.companySettings.deleteMany({
      where: { userId: { in: partnersIds } },
    })

    // 2. Inserir clientes
    if (clients.length > 0) {
      await prisma.client.createMany({
        data: clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          email: c.email ?? null,
        })),
        skipDuplicates: true,
      })
    }

    // 3. Inserir orçamentos (sem services, materials, payments)
    for (const q of quotes) {
      await prisma.quote.create({
        data: {
          id: q.id,
          number: q.number,
          userId: q.userId,
          clientId: q.clientId,
          subtotal: Number(q.subtotal),
          discount: Number(q.discount ?? 0),
          total: Number(q.total),
          observations: q.observations ?? null,
          status: q.status ?? 'draft',
          serviceStartedAt: q.serviceStartedAt ? toDate(q.serviceStartedAt) : null,
          serviceCompletedAt: q.serviceCompletedAt ? toDate(q.serviceCompletedAt) : null,
        },
      })
    }

    // 4. Inserir itens de serviço e material
    const serviceItems = quotes.flatMap((q: any) =>
      (q.services || []).map((s: any) => ({
        id: s.id,
        quoteId: q.id,
        name: s.name,
        quantity: Number(s.quantity),
        unitPrice: Number(s.unitPrice),
      }))
    )
    const materialItems = quotes.flatMap((q: any) =>
      (q.materials || []).map((m: any) => ({
        id: m.id,
        quoteId: q.id,
        name: m.name,
        quantity: Number(m.quantity),
        unitPrice: Number(m.unitPrice),
      }))
    )
    if (serviceItems.length > 0) {
      await prisma.serviceItem.createMany({
        data: serviceItems,
        skipDuplicates: true,
      })
    }
    if (materialItems.length > 0) {
      await prisma.materialItem.createMany({
        data: materialItems,
        skipDuplicates: true,
      })
    }

    // 5. Inserir pagamentos
    if (payments.length > 0) {
      await prisma.payment.createMany({
        data: payments.map((p: any) => ({
          id: p.id,
          quoteId: p.quoteId,
          userId: p.userId,
          amount: Number(p.amount),
          paymentDate: toDate(p.paymentDate),
          paymentMethod: p.paymentMethod,
          observations: p.observations ?? null,
        })),
        skipDuplicates: true,
      })
    }

    // 6. Inserir funcionários, serviços, configurações, despesas, fechamentos
    if (employees.length > 0) {
      await prisma.employee.createMany({
        data: employees.map((e: any) => ({
          id: e.id,
          userId: e.userId,
          name: e.name,
          cpf: e.cpf ?? null,
          phone: e.phone ?? null,
          email: e.email ?? null,
          position: e.position ?? null,
          hireDate: e.hireDate ? toDate(e.hireDate) : null,
          isActive: e.isActive ?? true,
          observations: e.observations ?? null,
        })),
        skipDuplicates: true,
      })
    }
    if (services.length > 0) {
      await prisma.service.createMany({
        data: services.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          name: s.name,
          description: s.description ?? null,
          unitPrice: Number(s.unitPrice),
          unit: s.unit ?? 'unidade',
          isActive: s.isActive ?? true,
        })),
        skipDuplicates: true,
      })
    }
    if (companySettings.length > 0) {
      for (const c of companySettings) {
        await prisma.companySettings.upsert({
          where: { userId: c.userId },
          create: {
            id: c.id,
            userId: c.userId,
            name: c.name,
            logo: c.logo ?? null,
            phone: c.phone,
            email: c.email,
            address: c.address,
            cnpj: c.cnpj ?? null,
            website: c.website ?? null,
            additionalInfo: c.additionalInfo ?? null,
            companyCashPercentage: Number(c.companyCashPercentage ?? 10),
          },
          update: {
            name: c.name,
            logo: c.logo ?? null,
            phone: c.phone,
            email: c.email,
            address: c.address,
            cnpj: c.cnpj ?? null,
            website: c.website ?? null,
            additionalInfo: c.additionalInfo ?? null,
            companyCashPercentage: Number(c.companyCashPercentage ?? 10),
          },
        })
      }
    }
    if (expenses.length > 0) {
      await prisma.expense.createMany({
        data: expenses.map((e: any) => ({
          id: e.id,
          userId: e.userId,
          category: e.category,
          description: e.description,
          amount: Number(e.amount),
          date: toDate(e.date),
          observations: e.observations ?? null,
          employeeId: e.employeeId ?? null,
        })),
        skipDuplicates: true,
      })
    }
    if (cashClosings.length > 0) {
      await prisma.cashClosing.createMany({
        data: cashClosings.map((c: any) => ({
          id: c.id,
          userId: c.userId,
          periodType: c.periodType,
          startDate: toDate(c.startDate),
          endDate: toDate(c.endDate),
          totalProfit: Number(c.totalProfit),
          companyCash: Number(c.companyCash ?? 0),
          gustavoProfit: Number(c.gustavoProfit),
          giovanniProfit: Number(c.giovanniProfit),
          totalRevenue: Number(c.totalRevenue),
          totalExpenses: Number(c.totalExpenses),
          observations: c.observations ?? null,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Backup restaurado com sucesso.',
      restored: {
        clients: clients.length,
        quotes: quotes.length,
        payments: payments.length,
        expenses: expenses.length,
        employees: employees.length,
        services: services.length,
        companySettings: companySettings.length,
        cashClosings: cashClosings.length,
      },
    })
  } catch (error: any) {
    console.error('Backup restore error:', error)
    return NextResponse.json(
      { error: 'Erro ao restaurar backup', details: error?.message },
      { status: 500 }
    )
  }
}
