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
      const quoteDate = new Date(quote.createdAt)
      return (
        quote.status === 'approved' &&
        quoteDate.getMonth() === currentMonth &&
        quoteDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, quote) => sum + quote.total, 0)
}
