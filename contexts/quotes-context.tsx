'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Quote, Client, ServiceItem, MaterialItem } from '@/lib/types'
import { useAuth } from './auth-context'

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
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchQuotes = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/quotes', {
        headers: {
          'x-user-id': user.id,
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
          status: q.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
          serviceStartedAt: q.serviceStartedAt ? new Date(q.serviceStartedAt) : undefined,
          serviceCompletedAt: q.serviceCompletedAt ? new Date(q.serviceCompletedAt) : undefined,
          userId: q.userId,
        }))
        setQuotes(transformedQuotes)
      }
    } catch (error) {
      console.error('Fetch quotes error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchQuotes()
    }
  }, [fetchQuotes, user?.id])

  const addQuote = useCallback(async (quoteData: Omit<Quote, 'id' | 'number' | 'createdAt' | 'userId'>): Promise<Quote> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
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
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.details?.message || 'Erro ao criar orcamento'
        console.error('API Error:', errorData)
        throw new Error(errorMessage)
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
        status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
        userId: data.userId,
        serviceStartedAt: data.serviceStartedAt ? new Date(data.serviceStartedAt) : undefined,
        serviceCompletedAt: data.serviceCompletedAt ? new Date(data.serviceCompletedAt) : undefined,
      }

      setQuotes((prev) => [newQuote, ...prev])
      return newQuote
    } catch (error) {
      console.error('Add quote error:', error)
      throw error
    }
  }, [user?.id])

  const updateQuote = useCallback(async (id: string, quoteData: Partial<Quote>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      // Converter Dates para ISO strings para serialização JSON
      const serializedData: any = { ...quoteData }
      if (quoteData.serviceStartedAt instanceof Date) {
        serializedData.serviceStartedAt = quoteData.serviceStartedAt.toISOString()
      } else if (quoteData.serviceStartedAt !== undefined) {
        serializedData.serviceStartedAt = quoteData.serviceStartedAt
      }
      if (quoteData.serviceCompletedAt instanceof Date) {
        serializedData.serviceCompletedAt = quoteData.serviceCompletedAt.toISOString()
      } else if (quoteData.serviceCompletedAt !== undefined) {
        serializedData.serviceCompletedAt = quoteData.serviceCompletedAt
      }

      console.log('Updating quote:', {
        quoteId: id,
        userId: user.id,
        data: serializedData,
      })

      const response = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(serializedData),
      })

      if (!response.ok) {
        let errorMessage = 'Erro ao atualizar orcamento'
        let errorDetails: any = null
        
        // Clonar a resposta para poder ler o corpo múltiplas vezes se necessário
        const responseClone = response.clone()
        
        // Tentar ler o corpo da resposta como texto primeiro
        let responseText = ''
        try {
          responseText = await response.text()
        } catch (e) {
          console.error('Error reading response text:', e)
          try {
            // Tentar ler do clone se a primeira tentativa falhou
            responseText = await responseClone.text()
          } catch (e2) {
            console.error('Error reading response clone text:', e2)
          }
        }
        
        console.error('API Error - Raw response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
          bodyLength: responseText.length,
          headers: Object.fromEntries(response.headers.entries()),
        })
        
        try {
          if (responseText && responseText.trim()) {
            const error = JSON.parse(responseText)
            errorMessage = error.error || error.details?.message || error.details || errorMessage
            errorDetails = error.details || error
            console.error('API Error - Parsed JSON:', error)
          } else {
            console.error('API Error - Empty or whitespace-only response body')
            errorMessage = `Erro ${response.status}: ${response.statusText || 'Erro desconhecido'}`
          }
        } catch (e) {
          console.error('Error parsing error response as JSON:', e, 'Response text:', responseText)
          // Se não for JSON válido, usar o texto como mensagem de erro
          if (responseText && responseText.trim()) {
            errorMessage = responseText
          } else {
            errorMessage = `Erro ${response.status}: ${response.statusText || 'Erro desconhecido'}`
          }
        }
        
        // Se for erro 404, adicionar mais contexto
        if (response.status === 404) {
          console.error('Quote not found. Details:', {
            quoteId: id,
            userId: user.id,
            errorDetails,
            responseText,
          })
          errorMessage = 'Orcamento nao encontrado. Verifique se o orcamento existe e pertence ao usuario.'
        }
        
        throw new Error(errorMessage)
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
        status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
        userId: data.userId,
        serviceStartedAt: data.serviceStartedAt ? new Date(data.serviceStartedAt) : undefined,
        serviceCompletedAt: data.serviceCompletedAt ? new Date(data.serviceCompletedAt) : undefined,
      }

      setQuotes((prev) =>
        prev.map((quote) => (quote.id === id ? updatedQuote : quote))
      )
    } catch (error) {
      console.error('Update quote error:', error)
      throw error
    }
  }, [user?.id])

  const deleteQuote = useCallback(async (id: string) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
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
  }, [user?.id])

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
