/**
 * Script para configurar o banco de dados pela primeira vez
 * Execute: npx tsx scripts/setup-database.ts
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { consolidateDataToSingleOwner } from '../lib/single-owner-migration'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando setup do banco de dados...\n')

  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados!\n')

    console.log('📝 Configurando usuario unico (gustavo)...')

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

    console.log('✅ Usuario: gustavo (gustavo@servipro.com)')
    console.log('\n📋 Credenciais:')
    console.log('   Usuario: gustavo | Senha: gustavo123\n')

    console.log('🎉 Setup concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro no setup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
