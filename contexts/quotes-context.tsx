'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Quote, Client, ServiceItem, MaterialItem, Payment } from '@/lib/types'
import { resolveMaterialUnit } from '@/lib/material-units'
import { useAuth } from './auth-context'
import { apiFetch, readApiError } from '@/modules/core/http'

const STALE_MS = 10 * 60 * 1000 // 10 min — refetch no focus só se passou mais que isso

function mapPaymentsFromApi(payments: any[] | undefined): Payment[] | undefined {
  if (!payments) return undefined
  return payments.map((p: any) => ({
    id: p.id,
    quoteId: p.quoteId,
    userId: p.userId,
    amount: p.amount,
    paymentDate: new Date(p.paymentDate),
    paymentMethod: p.paymentMethod,
    observations: p.observations,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  }))
}

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
  const [isFetching, setIsFetching] = useState(false)
  const lastFetchedAt = useRef<number>(0)
  const fetchingRef = useRef(false)

  const fetchQuotes = useCallback(async () => {
    if (!user?.id || fetchingRef.current) {
      setIsLoading(false)
      return
    }
    fetchingRef.current = true
    setIsFetching(true)
    try {
      const response = await apiFetch('/api/quotes')

      if (response.ok) {
        lastFetchedAt.current = Date.now()
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
            unit: resolveMaterialUnit(m.unit),
            unitPrice: m.unitPrice,
          })),
          subtotal: q.subtotal,
          discount: q.discount,
          total: q.total,
          observations: q.observations,
          paymentTerms: q.paymentTerms,
          conditions: q.conditions,
          deadlines: q.deadlines,
          createdAt: new Date(q.createdAt),
          status: q.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
          serviceStartedAt: q.serviceStartedAt ? new Date(q.serviceStartedAt) : undefined,
          serviceCompletedAt: q.serviceCompletedAt ? new Date(q.serviceCompletedAt) : undefined,
          userId: q.userId,
          inDelinquencyList: !!q.inDelinquencyList,
          payments: q.payments ? q.payments.map((p: any) => ({
            id: p.id,
            quoteId: p.quoteId,
            userId: p.userId,
            amount: p.amount,
            paymentDate: new Date(p.paymentDate),
            paymentMethod: p.paymentMethod,
            observations: p.observations,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          })) : [],
        }))
        setQuotes(transformedQuotes)
      }
    } catch (error) {
      console.error('Fetch quotes error:', error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
      fetchingRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchQuotes()
    }
  }, [fetchQuotes, user?.id])

  // Refetch automático ao focar janela desativado para evitar rajadas de rede
  // que degradavam a responsividade em dispositivos mais lentos.

  const addQuote = useCallback(async (quoteData: Omit<Quote, 'id' | 'number' | 'createdAt' | 'userId'>): Promise<Quote> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      const response = await apiFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          client: quoteData.client,
          services: quoteData.services,
          materials: quoteData.materials,
          subtotal: quoteData.subtotal,
          discount: quoteData.discount,
          total: quoteData.total,
          observations: quoteData.observations,
          paymentTerms: quoteData.paymentTerms,
          conditions: quoteData.conditions,
          deadlines: quoteData.deadlines,
          status: quoteData.status,
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
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
          unit: resolveMaterialUnit(m.unit),
          unitPrice: m.unitPrice,
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        observations: data.observations,
        paymentTerms: data.paymentTerms,
        conditions: data.conditions,
        deadlines: data.deadlines,
        createdAt: new Date(data.createdAt),
        status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
        userId: data.userId,
        serviceStartedAt: data.serviceStartedAt ? new Date(data.serviceStartedAt) : undefined,
        serviceCompletedAt: data.serviceCompletedAt ? new Date(data.serviceCompletedAt) : undefined,
        inDelinquencyList: !!data.inDelinquencyList,
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

      const response = await apiFetch(`/api/quotes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(serializedData),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const data = await response.json()
      
      // Transform to Quote format
      const mappedPayments = mapPaymentsFromApi(data.payments)

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
          unit: resolveMaterialUnit(m.unit),
          unitPrice: m.unitPrice,
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        observations: data.observations,
        paymentTerms: data.paymentTerms,
        conditions: data.conditions,
        deadlines: data.deadlines,
        createdAt: new Date(data.createdAt),
        status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
        userId: data.userId,
        serviceStartedAt: data.serviceStartedAt ? new Date(data.serviceStartedAt) : undefined,
        serviceCompletedAt: data.serviceCompletedAt ? new Date(data.serviceCompletedAt) : undefined,
        inDelinquencyList: !!data.inDelinquencyList,
      }

      setQuotes((prev) =>
        prev.map((quote) => {
          if (quote.id !== id) return quote
          const next: Quote = { ...updatedQuote, payments: mappedPayments ?? quote.payments }
          return next
        })
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
      const response = await apiFetch(`/api/quotes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
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
