/**
 * Script para inspecionar o conteúdo do banco de dados
 * Execute: npx tsx scripts/inspect-database.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function inspectDatabase() {
  console.log('🔍 Inspecionando banco de dados...\n')

  try {
    // Verificar se DATABASE_URL está configurada
    if (!process.env.DATABASE_URL) {
      console.error('❌ Erro: DATABASE_URL não está configurada!')
      process.exit(1)
    }

    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados!\n')

    // Listar todas as tabelas
    console.log('📊 TABELAS NO BANCO:\n')
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `

    if (tables.length === 0) {
      console.log('   ⚠️  Nenhuma tabela encontrada\n')
    } else {
      tables.forEach(table => {
        console.log(`   - ${table.tablename}`)
      })
      console.log('')
    }

    // Verificar estrutura de cada tabela
    for (const table of tables) {
      const tableName = table.tablename
      console.log(`\n📋 TABELA: ${tableName}`)
      console.log('─'.repeat(50))

      // Contar registros
      let count = 0
      try {
        if (tableName === 'users') {
          count = await prisma.user.count()
        } else if (tableName === 'clients') {
          count = await prisma.client.count()
        } else if (tableName === 'quotes') {
          count = await prisma.quote.count()
        } else if (tableName === 'service_items') {
          count = await prisma.serviceItem.count()
        } else if (tableName === 'material_items') {
          count = await prisma.materialItem.count()
        } else if (tableName === 'company_settings') {
          count = await prisma.companySettings.count()
        }
      } catch (e) {
        // Tabela pode não existir no schema atual
      }

      console.log(`   Registros: ${count}`)

      // Mostrar dados se houver
      if (count > 0) {
        try {
          if (tableName === 'users') {
            const users = await prisma.user.findMany({
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                mustChangePassword: true,
                createdAt: true
              }
            })
            console.log('\n   Dados:')
            users.forEach((user, idx) => {
              console.log(`   ${idx + 1}. ${user.username} (${user.name})`)
              console.log(`      Email: ${user.email}`)
              console.log(`      Telefone: ${user.phone || 'N/A'}`)
              console.log(`      Empresa: ${user.company || 'N/A'}`)
              console.log(`      Deve alterar senha: ${user.mustChangePassword ? 'Sim' : 'Não'}`)
              console.log(`      Criado em: ${user.createdAt.toLocaleString('pt-BR')}`)
            })
          } else if (tableName === 'clients') {
            const clients = await prisma.client.findMany({
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                createdAt: true
              }
            })
            console.log('\n   Dados:')
            clients.forEach((client, idx) => {
              console.log(`   ${idx + 1}. ${client.name}`)
              console.log(`      Telefone: ${client.phone}`)
              console.log(`      Email: ${client.email || 'N/A'}`)
              console.log(`      Endereço: ${client.address}`)
              console.log(`      Criado em: ${client.createdAt.toLocaleString('pt-BR')}`)
            })
          } else if (tableName === 'quotes') {
            const quotes = await prisma.quote.findMany({
              select: {
                id: true,
                number: true,
                subtotal: true,
                discount: true,
                total: true,
                status: true,
                createdAt: true
              },
              take: 10 // Limitar a 10 para não sobrecarregar
            })
            console.log('\n   Dados (mostrando até 10):')
            quotes.forEach((quote, idx) => {
              console.log(`   ${idx + 1}. Orçamento #${quote.number}`)
              console.log(`      Status: ${quote.status}`)
              console.log(`      Total: R$ ${quote.total.toFixed(2)}`)
              console.log(`      Criado em: ${quote.createdAt.toLocaleString('pt-BR')}`)
            })
            if (count > 10) {
              console.log(`   ... e mais ${count - 10} orçamentos`)
            }
          } else if (tableName === 'company_settings') {
            const settings = await prisma.companySettings.findMany({
              select: {
                id: true,
                userId: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                cnpj: true,
                website: true,
                createdAt: true
              }
            })
            console.log('\n   Dados:')
            settings.forEach((setting, idx) => {
              console.log(`   ${idx + 1}. ${setting.name}`)
              console.log(`      User ID: ${setting.userId}`)
              console.log(`      Telefone: ${setting.phone}`)
              console.log(`      Email: ${setting.email}`)
              console.log(`      CNPJ: ${setting.cnpj || 'N/A'}`)
              console.log(`      Website: ${setting.website || 'N/A'}`)
            })
          }
        } catch (e: any) {
          console.log(`   ⚠️  Erro ao ler dados: ${e.message}`)
        }
      }
    }

    // Resumo final
    console.log('\n' + '═'.repeat(50))
    console.log('📊 RESUMO:')
    console.log('═'.repeat(50))
    
    try {
      const userCount = await prisma.user.count()
      const clientCount = await prisma.client.count()
      const quoteCount = await prisma.quote.count()
      const serviceItemCount = await prisma.serviceItem.count()
      const materialItemCount = await prisma.materialItem.count()
      const settingsCount = await prisma.companySettings.count()

      console.log(`   👥 Usuários: ${userCount}`)
      console.log(`   🏢 Clientes: ${clientCount}`)
      console.log(`   📄 Orçamentos: ${quoteCount}`)
      console.log(`   🔧 Itens de Serviço: ${serviceItemCount}`)
      console.log(`   📦 Itens de Material: ${materialItemCount}`)
      console.log(`   ⚙️  Configurações: ${settingsCount}`)
    } catch (e) {
      console.log('   ⚠️  Algumas tabelas podem não existir ainda')
    }

    console.log('\n✅ Inspeção concluída!')
  } catch (error: any) {
    console.error('\n❌ Erro ao inspecionar banco de dados:')
    console.error(`   ${error.message}\n`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

inspectDatabase()
