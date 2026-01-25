/**
 * Script para configurar o banco de dados pela primeira vez
 * Execute: npx tsx scripts/setup-database.ts
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando setup do banco de dados...\n')

  try {
    // Verificar conexão
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados!\n')

    // Criar usuários iniciais
    console.log('📝 Criando usuários iniciais...')
    
    const hashedPassword1 = await hash('gustavo123', 10)
    const hashedPassword2 = await hash('giovanni123', 10)

    const user1 = await prisma.user.upsert({
      where: { username: 'gustavo' },
      update: {
        password: hashedPassword1,
        mustChangePassword: true,
      },
      create: {
        username: 'gustavo',
        name: 'Gustavo',
        email: 'gustavo@servipro.com',
        password: hashedPassword1,
        mustChangePassword: true,
      },
    })

    const user2 = await prisma.user.upsert({
      where: { username: 'giovanni' },
      update: {
        password: hashedPassword2,
        mustChangePassword: true,
      },
      create: {
        username: 'giovanni',
        name: 'Giovanni',
        email: 'giovanni@servipro.com',
        password: hashedPassword2,
        mustChangePassword: true,
      },
    })

    console.log('✅ Usuários criados:')
    console.log(`   - ${user1.username} (${user1.email})`)
    console.log(`   - ${user2.username} (${user2.email})`)
    console.log('\n📋 Credenciais:')
    console.log('   Usuário: gustavo | Senha: gustavo123')
    console.log('   Usuário: giovanni | Senha: giovanni123\n')

    console.log('🎉 Setup concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro no setup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
