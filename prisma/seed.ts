import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default users
  const hashedPassword1 = await hash('gustavo123', 10)
  const hashedPassword2 = await hash('giovanni123', 10)

  const user1 = await prisma.user.upsert({
    where: { username: 'gustavo' },
    update: {},
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
    update: {},
    create: {
      username: 'giovanni',
      name: 'Giovanni',
      email: 'giovanni@servipro.com',
      password: hashedPassword2,
      mustChangePassword: true,
    },
  })

  console.log('Users created:', { user1, user2 })
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
