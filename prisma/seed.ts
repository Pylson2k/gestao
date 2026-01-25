import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  // Create/Reset default users with passwords
  const hashedPassword1 = await hash('gustavo123', 10)
  const hashedPassword2 = await hash('giovanni123', 10)

  // Reset passwords - update existing users or create new ones
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

  console.log('Users reset/created:', { user1: user1.username, user2: user2.username })
  console.log('')
  console.log('=== CREDENCIAIS ===')
  console.log('Usuario: gustavo | Senha: gustavo123')
  console.log('Usuario: giovanni | Senha: giovanni123')
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
