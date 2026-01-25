import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Quote } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateMonthlyRevenue(quotes: Quote[]): number {
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

      return (
        completionDate.getMonth() === currentMonth &&
        completionDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, quote) => sum + quote.total, 0)
}
