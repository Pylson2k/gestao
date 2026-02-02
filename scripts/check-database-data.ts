/**
 * Verifica se há dados no banco (contagem por tabela).
 * Uso: npx tsx scripts/check-database-data.ts
 */

require('dotenv').config()

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { Pool } = await import('pg')

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('❌ DATABASE_URL não está definida no .env')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const [users, clients, quotes, payments, expenses, employees, services, companySettings, cashClosings] =
      await Promise.all([
        prisma.user.count(),
        prisma.client.count(),
        prisma.quote.count(),
        prisma.payment.count(),
        prisma.expense.count(),
        prisma.employee.count(),
        prisma.service.count(),
        prisma.companySettings.count(),
        prisma.cashClosing.count(),
      ])

    console.log('\n--- Dados no banco (Neon) ---\n')
    console.log('  Usuários:        ', users)
    console.log('  Clientes:        ', clients)
    console.log('  Orçamentos:      ', quotes)
    console.log('  Pagamentos:      ', payments)
    console.log('  Despesas:        ', expenses)
    console.log('  Funcionários:    ', employees)
    console.log('  Serviços:        ', services)
    console.log('  Config. empresa: ', companySettings)
    console.log('  Fechamentos:     ', cashClosings)
    console.log('\n-----------------------------\n')

    if (clients === 0 && quotes === 0) {
      console.log('⚠️  Banco está vazio (0 clientes, 0 orçamentos). Use Restore no Neon ou um arquivo de backup.')
    } else {
      console.log('✅ Há dados no banco.')
    }
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
