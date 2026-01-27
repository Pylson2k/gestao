import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Quote } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateMonthlyRevenue(quotes: Quote[], getTotalPaidByQuoteId?: (quoteId: string) => number): number {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return quotes
    .filter((quote) => {
      // Apenas serviços finalizados (completed)
      if (quote.status !== 'completed') {
        return false
      }

      // Usar serviceCompletedAt se disponível, senão usar createdAt
      const completionDate = quote.serviceCompletedAt 
        ? new Date(quote.serviceCompletedAt) 
        : new Date(quote.createdAt)

      const isInCurrentMonth = (
        completionDate.getMonth() === currentMonth &&
        completionDate.getFullYear() === currentYear
      )

      if (!isInCurrentMonth) return false

      // Se a função de verificação de pagamento foi fornecida, verificar se foi totalmente pago
      if (getTotalPaidByQuoteId) {
        const totalPaid = getTotalPaidByQuoteId(quote.id)
        return totalPaid >= quote.total
      }

      // Se não tiver a função, retornar true (comportamento antigo para compatibilidade)
      return true
    })
    .reduce((sum, quote) => sum + quote.total, 0)
}
