import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import 'dotenv/config'
import { consolidateDataToSingleOwner } from '../lib/single-owner-migration'

const prisma = new PrismaClient()

async function main() {
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

  console.log('Usuario unico: gustavo (demais contas removidas e dados consolidados).')
  console.log('')
  console.log('=== CREDENCIAIS ===')
  console.log('Usuario: gustavo | Senha: gustavo123')
  console.log('===================')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
