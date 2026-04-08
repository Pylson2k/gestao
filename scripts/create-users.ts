/**
 * Script para garantir usuario inicial (gustavo) e consolidar dados de contas antigas
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { consolidateDataToSingleOwner } from '../lib/single-owner-migration'

async function createUsers() {
  console.log('👥 Configurando usuario unico...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ Erro: DATABASE_URL não está configurada!')
    process.exit(1)
  }

  const prisma = new PrismaClient()

  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados!\n')

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
        email: 'gustavo@sinaiengenharia.com',
        password: hashedPassword,
        mustChangePassword: true,
      },
    })

    await consolidateDataToSingleOwner(prisma)

    console.log('✅ Usuario: gustavo (gustavo@sinaiengenharia.com)')
    console.log('\n' + '═'.repeat(50))
    console.log('📋 CREDENCIAIS:')
    console.log('═'.repeat(50))
    console.log('   Usuario: gustavo | Senha: gustavo123')
    console.log('═'.repeat(50))
    console.log('\n✅ Concluido!')
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message, '\n')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createUsers()
