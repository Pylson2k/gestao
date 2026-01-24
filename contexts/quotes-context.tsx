'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Quote, Client, ServiceItem, MaterialItem } from '@/lib/types'
import { mockQuotes, generateQuoteNumber } from '@/lib/mock-data'

interface QuotesContextType {
  quotes: Quote[]
  addQuote: (quote: Omit<Quote, 'id' | 'number' | 'createdAt' | 'userId'>) => Quote
  updateQuote: (id: string, quote: Partial<Quote>) => void
  deleteQuote: (id: string) => void
  getQuoteById: (id: string) => Quote | undefined
}

const QuotesContext = createContext<QuotesContextType | undefined>(undefined)

export function QuotesProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>(mockQuotes)

  const addQuote = useCallback((quoteData: Omit<Quote, 'id' | 'number' | 'createdAt' | 'userId'>): Quote => {
    const newQuote: Quote = {
      ...quoteData,
      id: Date.now().toString(),
      number: generateQuoteNumber(),
      createdAt: new Date(),
      userId: '1',
    }
    setQuotes((prev) => [newQuote, ...prev])
    return newQuote
  }, [])

  const updateQuote = useCallback((id: string, quoteData: Partial<Quote>) => {
    setQuotes((prev) =>
      prev.map((quote) => (quote.id === id ? { ...quote, ...quoteData } : quote))
    )
  }, [])

  const deleteQuote = useCallback((id: string) => {
    setQuotes((prev) => prev.filter((quote) => quote.id !== id))
  }, [])

  const getQuoteById = useCallback(
    (id: string) => quotes.find((quote) => quote.id === id),
    [quotes]
  )

  return (
    <QuotesContext.Provider
      value={{
        quotes,
        addQuote,
        updateQuote,
        deleteQuote,
        getQuoteById,
      }}
    >
      {children}
    </QuotesContext.Provider>
  )
}

export function useQuotes() {
  const context = useContext(QuotesContext)
  if (context === undefined) {
    throw new Error('useQuotes must be used within a QuotesProvider')
  }
  return context
}

export function calculateQuoteTotals(services: ServiceItem[], materials: MaterialItem[], discount: number) {
  const servicesTotal = services.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const materialsTotal = materials.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const subtotal = servicesTotal + materialsTotal
  const total = subtotal - discount
  return { subtotal, total }
}
