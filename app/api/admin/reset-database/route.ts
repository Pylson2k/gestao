import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Verificar chave secreta para segurança
    const { searchParams } = new URL(request.url)
    const secretKey = searchParams.get('key')
    
    if (secretKey !== 'sinai2026reset') {
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
    
    // 8. Clients
    await prisma.client.deleteMany({})
    
    // 9. CompanySettings (pode ser limpo também, será recriado quando necessário)
    await prisma.companySettings.deleteMany({})
    
    // Usuários são mantidos (não deletamos)
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      message: 'Banco de dados limpo com sucesso! Apenas os usuários foram mantidos.',
      deleted: {
        auditLogs: countsBefore.auditLogs,
        cashClosings: countsBefore.cashClosings,
        expenses: countsBefore.expenses,
        services: countsBefore.services,
        employees: countsBefore.employees,
        quotes: countsBefore.quotes,
        clients: countsBefore.clients,
        companySettings: countsBefore.companySettings,
      },
      kept: {
        users: countsBefore.users,
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
