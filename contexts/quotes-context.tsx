'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Quote, Client, ServiceItem, MaterialItem } from '@/lib/types'

// Usar o primeiro usuário do banco como padrão
const DEFAULT_USER_ID = 'aee2fe1b-6157-4f33-ba45-cc45a210ec2e' // ID do usuário gustavo

interface QuotesContextType {
  quotes: Quote[]
  isLoading: boolean
  addQuote: (quote: Omit<Quote, 'id' | 'number' | 'createdAt' | 'userId'>) => Promise<Quote>
  updateQuote: (id: string, quote: Partial<Quote>) => Promise<void>
  deleteQuote: (id: string) => Promise<void>
  getQuoteById: (id: string) => Quote | undefined
  refreshQuotes: () => Promise<void>
}

const QuotesContext = createContext<QuotesContextType | undefined>(undefined)

export function QuotesProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/quotes', {
        headers: {
          'x-user-id': DEFAULT_USER_ID,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Transform Prisma data to Quote format
        const transformedQuotes: Quote[] = data.map((q: any) => ({
          id: q.id,
          number: q.number,
          client: {
            id: q.client.id,
            name: q.client.name,
            phone: q.client.phone,
            address: q.client.address,
            email: q.client.email,
          },
          services: q.services.map((s: any) => ({
            id: s.id,
            name: s.name,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
          })),
          materials: q.materials.map((m: any) => ({
            id: m.id,
            name: m.name,
            quantity: m.quantity,
            unitPrice: m.unitPrice,
          })),
          subtotal: q.subtotal,
          discount: q.discount,
          total: q.total,
          observations: q.observations,
          createdAt: new Date(q.createdAt),
          status: q.status as 'draft' | 'sent' | 'approved' | 'rejected',
          userId: q.userId,
        }))
        setQuotes(transformedQuotes)
      }
    } catch (error) {
      console.error('Fetch quotes error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const addQuote = useCallback(async (quoteData: Omit<Quote, 'id' | 'number' | 'createdAt' | 'userId'>): Promise<Quote> => {
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': DEFAULT_USER_ID,
        },
        body: JSON.stringify({
          client: quoteData.client,
          services: quoteData.services,
          materials: quoteData.materials,
          subtotal: quoteData.subtotal,
          discount: quoteData.discount,
          total: quoteData.total,
          observations: quoteData.observations,
          status: quoteData.status,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar orcamento')
      }

      const data = await response.json()
      
      // Transform to Quote format
      const newQuote: Quote = {
        id: data.id,
        number: data.number,
        client: {
          id: data.client.id,
          name: data.client.name,
          phone: data.client.phone,
          address: data.client.address,
          email: data.client.email,
        },
        services: data.services.map((s: any) => ({
          id: s.id,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
        })),
        materials: data.materials.map((m: any) => ({
          id: m.id,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        observations: data.observations,
        createdAt: new Date(data.createdAt),
        status: data.status,
        userId: data.userId,
      }

      setQuotes((prev) => [newQuote, ...prev])
      return newQuote
    } catch (error) {
      console.error('Add quote error:', error)
      throw error
    }
  }, [])

  const updateQuote = useCallback(async (id: string, quoteData: Partial<Quote>) => {
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': DEFAULT_USER_ID,
        },
        body: JSON.stringify(quoteData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar orcamento')
      }

      const data = await response.json()
      
      // Transform to Quote format
      const updatedQuote: Quote = {
        id: data.id,
        number: data.number,
        client: {
          id: data.client.id,
          name: data.client.name,
          phone: data.client.phone,
          address: data.client.address,
          email: data.client.email,
        },
        services: data.services.map((s: any) => ({
          id: s.id,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
        })),
        materials: data.materials.map((m: any) => ({
          id: m.id,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        observations: data.observations,
        createdAt: new Date(data.createdAt),
        status: data.status,
        userId: data.userId,
      }

      setQuotes((prev) =>
        prev.map((quote) => (quote.id === id ? updatedQuote : quote))
      )
    } catch (error) {
      console.error('Update quote error:', error)
      throw error
    }
  }, [])

  const deleteQuote = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': DEFAULT_USER_ID,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir orcamento')
      }

      setQuotes((prev) => prev.filter((quote) => quote.id !== id))
    } catch (error) {
      console.error('Delete quote error:', error)
      throw error
    }
  }, [])

  const getQuoteById = useCallback(
    (id: string) => quotes.find((quote) => quote.id === id),
    [quotes]
  )

  return (
    <QuotesContext.Provider
      value={{
        quotes,
        isLoading,
        addQuote,
        updateQuote,
        deleteQuote,
        getQuoteById,
        refreshQuotes: fetchQuotes,
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
