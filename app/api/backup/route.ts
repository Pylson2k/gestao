/**
 * API de Backup - Exporta todos os dados da empresa para um arquivo JSON
 * Use este backup regularmente para não perder dados se o banco desconectar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOwnerDbUserIds } from '@/lib/user-mapping'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
        { error: 'Banco de dados não configurado. Não há dados para exportar.' },
        { status: 503 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const ownerIds = await getOwnerDbUserIds()
    if (ownerIds.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum usuário encontrado no banco' },
        { status: 500 }
      )
    }

    // Exportar na ordem das dependências (para documentação) e com todos os campos
    const [clients, quotes, payments, expenses, employees, services, companySettings, cashClosings, materialLists] =
      await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [
            { quotes: { some: { userId: { in: ownerIds } } } },
            { materialLists: { some: { userId: { in: ownerIds } } } },
          ],
        },
      }),
      prisma.quote.findMany({
        where: { userId: { in: ownerIds } },
        include: {
          client: true,
          services: true,
          materials: true,
        },
      }),
      prisma.payment.findMany({
        where: { userId: { in: ownerIds } },
      }),
      prisma.expense.findMany({
        where: { userId: { in: ownerIds } },
      }),
      prisma.employee.findMany({
        where: { userId: { in: ownerIds } },
      }),
      prisma.service.findMany({
        where: { userId: { in: ownerIds } },
      }),
      prisma.companySettings.findMany({
        where: { userId: { in: ownerIds } },
      }),
      prisma.cashClosing.findMany({
        where: { userId: { in: ownerIds } },
      }),
      prisma.materialList.findMany({
        where: { userId: { in: ownerIds } },
        include: { items: true },
      }),
    ])

    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      clients,
      quotes,
      payments,
      expenses,
      employees,
      services,
      companySettings,
      cashClosings,
      materialLists,
    }

    return NextResponse.json(backup)
  } catch (error: any) {
    console.error('Backup export error:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar backup', details: error?.message },
      { status: 500 }
    )
  }
}
