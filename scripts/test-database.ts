/**
 * Script para testar a conexão com o banco de dados
 * Execute: npx tsx scripts/test-database.ts
 */

// Carregar variáveis de ambiente PRIMEIRO
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function testConnection() {
  console.log('🔍 Testando conexão com o banco de dados...\n')

  let prisma: PrismaClient | null = null

  try {
    // Verificar se DATABASE_URL está configurada
    if (!process.env.DATABASE_URL) {
      console.error('❌ Erro: DATABASE_URL não está configurada!')
      console.log('\n📝 Para configurar:')
      console.log('   1. Crie um arquivo .env na raiz do projeto')
      console.log('   2. Adicione: DATABASE_URL="sua_connection_string_aqui"')
      console.log('   3. Execute este script novamente\n')
      process.exit(1)
    }

    // Verificar se é uma connection string de exemplo
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl.includes('johndoe') || dbUrl.includes('randompassword') || dbUrl.includes('localhost:5432/mydb')) {
      console.error('❌ Erro: DATABASE_URL parece ser um exemplo!')
      console.log('\n📝 Você precisa atualizar o arquivo .env com sua connection string real do Neon:')
      console.log('   1. Acesse https://neon.tech')
      console.log('   2. Copie a connection string do seu projeto')
      console.log('   3. Cole no arquivo .env substituindo o valor atual\n')
      process.exit(1)
    }

    // Criar PrismaClient APÓS verificar DATABASE_URL
    prisma = new PrismaClient()

    console.log('✅ DATABASE_URL encontrada')
    const host = dbUrl.match(/@([^:]+)/)?.[1] || 'N/A'
    console.log(`   Host: ${host}`)
    if (host.includes('neon.tech')) {
      console.log('   ✅ Parece ser uma connection string do Neon!\n')
    } else {
      console.log('   ⚠️  Verifique se é a connection string correta\n')
    }

    // Testar conexão
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados com sucesso!\n')

    // Verificar tabelas
    console.log('📊 Verificando tabelas...\n')
    
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `

    if (tables.length === 0) {
      console.log('⚠️  Nenhuma tabela encontrada!')
      console.log('   Execute: npm run db:push para criar as tabelas\n')
    } else {
      console.log(`✅ ${tables.length} tabela(s) encontrada(s):`)
      tables.forEach(table => {
        console.log(`   - ${table.tablename}`)
      })
      console.log('')
    }

    // Verificar usuários
    const userCount = await prisma.user.count()
    console.log(`👥 Usuários cadastrados: ${userCount}`)
    
    if (userCount === 0) {
      console.log('   Execute: npm run db:seed para criar usuários iniciais\n')
    } else {
      const users = await prisma.user.findMany({
        select: { username: true, email: true, name: true }
      })
      console.log('   Usuários:')
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.name}) - ${user.email}`)
      })
      console.log('')
    }

    // Verificar clientes
    const clientCount = await prisma.client.count()
    console.log(`🏢 Clientes cadastrados: ${clientCount}`)

    // Verificar orçamentos
    const quoteCount = await prisma.quote.count()
    console.log(`📄 Orçamentos cadastrados: ${quoteCount}`)

    console.log('\n🎉 Banco de dados está funcionando corretamente!')
  } catch (error: any) {
    console.error('\n❌ Erro ao conectar com o banco de dados:')
    console.error(`   ${error.message}\n`)
    
    if (error.message.includes('P1001')) {
      console.log('💡 Dicas:')
      console.log('   - Verifique se a DATABASE_URL está correta')
      console.log('   - Verifique se o servidor de banco está rodando')
      console.log('   - Verifique se as credenciais estão corretas\n')
    } else if (error.message.includes('P1000')) {
      console.log('💡 Dica: Verifique se o banco de dados existe\n')
    } else if (error.message.includes('P1002')) {
      console.log('💡 Dica: Verifique se o servidor está acessível e a porta está correta\n')
    }
    
    process.exit(1)
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}

testConnection()
