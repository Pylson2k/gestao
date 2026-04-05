import type { PrismaClient } from '@prisma/client'
import { OWNER_USERNAME } from './owner-user'

/**
 * Reatribui dados de outros usuários para o proprietário e remove contas extras.
 * Usado no seed e em rotas admin para manter um único login.
 */
export async function consolidateDataToSingleOwner(prisma: PrismaClient): Promise<void> {
  const owner = await prisma.user.findUnique({
    where: { username: OWNER_USERNAME },
    select: { id: true },
  })
  if (!owner) return

  const others = await prisma.user.findMany({
    where: { NOT: { id: owner.id } },
    select: { id: true },
  })

  for (const { id } of others) {
    await prisma.quote.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.materialList.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.expense.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.employee.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.service.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.cashClosing.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.payment.updateMany({ where: { userId: id }, data: { userId: owner.id } })
    await prisma.companySettings.deleteMany({ where: { userId: id } })
    await prisma.user.delete({ where: { id } })
  }
}
