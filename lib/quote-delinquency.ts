import type { PrismaClient } from '@prisma/client'

/** Remove o orçamento da lista de inadimplentes quando o total pago cobre o valor do orçamento. */
export async function clearDelinquencyIfFullyPaid(
  prisma: PrismaClient,
  quoteId: string
): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { payments: true },
  })
  if (!quote || !quote.inDelinquencyList) return
  const totalPaid = quote.payments.reduce((s, p) => s + p.amount, 0)
  if (totalPaid >= quote.total) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: { inDelinquencyList: false },
    })
  }
}
