import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { consolidateDataToSingleOwner } from '@/lib/single-owner-migration'

export async function POST(request: Request) {
  try {
    // Verificar chave secreta para segurança
    const { searchParams } = new URL(request.url)
    const secretKey = searchParams.get('key')
    
    const expected = process.env.ADMIN_OPERATIONS_SECRET
    if (!expected || secretKey !== expected) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })
    }

    // Verificar se DATABASE_URL existe
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: 'DATABASE_URL não configurada',
        hasDbUrl: false 
      }, { status: 500 })
    }

    // Usar o PrismaClient do helper lib/prisma.ts
    const { prisma } = await import('@/lib/prisma')
    
    // Contar registros antes de deletar (para relatório)
    const countsBefore = {
      auditLogs: await prisma.auditLog.count(),
      cashClosings: await prisma.cashClosing.count(),
      expenses: await prisma.expense.count(),
      services: await prisma.service.count(),
      employees: await prisma.employee.count(),
      quotes: await prisma.quote.count(),
      materialLists: await prisma.materialList.count(),
      clients: await prisma.client.count(),
      companySettings: await prisma.companySettings.count(),
      users: await prisma.user.count(),
    }

    // Deletar em ordem (respeitando foreign keys)
    // 1. AuditLogs (referencia User)
    await prisma.auditLog.deleteMany({})
    
    // 2. CashClosings (referencia User)
    await prisma.cashClosing.deleteMany({})
    
    // 3. Expenses (referencia User e Employee)
    await prisma.expense.deleteMany({})
    
    // 4. Services (referencia User)
    await prisma.service.deleteMany({})
    
    // 5. Employees (referencia User)
    await prisma.employee.deleteMany({})
    
    // 6. ServiceItems e MaterialItems (referencia Quote)
    await prisma.serviceItem.deleteMany({})
    await prisma.materialItem.deleteMany({})
    
    // 7. Quotes (referencia User e Client)
    await prisma.quote.deleteMany({})

    // 7b. Listas de materiais (referencia User e Client)
    await prisma.materialList.deleteMany({})
    
    // 8. Clients
    await prisma.client.deleteMany({})
    
    // 9. CompanySettings (pode ser limpo também, será recriado quando necessário)
    await prisma.companySettings.deleteMany({})
    
    const hashedPassword = await hash('gustavo123', 10)
    await prisma.user.upsert({
      where: { username: 'gustavo' },
      update: {
        password: hashedPassword,
        mustChangePassword: true,
      },
      create: {
        username: 'gustavo',
        name: 'Gustavo',
        email: 'gustavo@servipro.com',
        password: hashedPassword,
        mustChangePassword: true,
      },
    })
    await consolidateDataToSingleOwner(prisma)

    const userCount = await prisma.user.count()

    return NextResponse.json({
      success: true,
      message: 'Banco de dados limpo. Restou apenas o usuario gustavo.',
      deleted: {
        auditLogs: countsBefore.auditLogs,
        cashClosings: countsBefore.cashClosings,
        expenses: countsBefore.expenses,
        services: countsBefore.services,
        employees: countsBefore.employees,
        quotes: countsBefore.quotes,
        materialLists: countsBefore.materialLists,
        clients: countsBefore.clients,
        companySettings: countsBefore.companySettings,
      },
      kept: {
        users: userCount,
      },
    })
  } catch (error: any) {
    console.error('Reset database error:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao limpar banco de dados', 
        details: error?.message || String(error),
        code: error?.code,
      },
      { status: 500 }
    )
  }
}
