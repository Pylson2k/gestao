/**
 * Testa se o Prisma Client consegue conectar no contexto do Next.js
 */

// Simular o que o Next.js faz
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function test() {
  console.log('🔍 Testando Prisma Client...\n')
  
  console.log('DATABASE_URL disponível:', !!process.env.DATABASE_URL)
  if (process.env.DATABASE_URL) {
    console.log('Host:', process.env.DATABASE_URL.match(/@([^:]+)/)?.[1] || 'N/A')
  }
  console.log('')

  const prisma = new PrismaClient()

  try {
    await prisma.$connect()
    console.log('✅ Prisma Client conectado!\n')

    const user = await prisma.user.findUnique({
      where: { username: 'gustavo' }
    })

    if (user) {
      console.log('✅ Usuário encontrado:')
      console.log(`   Username: ${user.username}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Email: ${user.email}`)
    } else {
      console.log('❌ Usuário não encontrado')
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    if (error.message.includes('PrismaClient')) {
      console.error('\n💡 O Prisma Client não conseguiu inicializar.')
      console.error('   Verifique se a DATABASE_URL está correta no .env')
    }
  } finally {
    await prisma.$disconnect()
  }
}

test()
