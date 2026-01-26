'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Payment } from '@/lib/types'
import { useAuth } from './auth-context'

interface PaymentsContextType {
  payments: Payment[]
  isLoading: boolean
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<Payment>
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  getPaymentById: (id: string) => Payment | undefined
  getPaymentsByQuoteId: (quoteId: string) => Payment[]
  refreshPayments: (quoteId?: string) => Promise<void>
  getTotalPaidByQuoteId: (quoteId: string) => number
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined)

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPayments = useCallback(async (quoteId?: string) => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      const url = quoteId ? `/api/payments?quoteId=${quoteId}` : '/api/payments'
      const response = await fetch(url, {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Transform Prisma data to Payment format
        const transformedPayments: Payment[] = data.map((p: any) => ({
          id: p.id,
          quoteId: p.quoteId,
          userId: p.userId,
          amount: p.amount,
          paymentDate: new Date(p.paymentDate),
          paymentMethod: p.paymentMethod,
          observations: p.observations,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          quote: p.quote ? {
            id: p.quote.id,
            number: p.quote.number,
            client: p.quote.client,
            services: p.quote.services || [],
            materials: p.quote.materials || [],
            subtotal: p.quote.subtotal,
            discount: p.quote.discount,
            total: p.quote.total,
            observations: p.quote.observations,
            createdAt: new Date(p.quote.createdAt),
            status: p.quote.status,
            serviceStartedAt: p.quote.serviceStartedAt ? new Date(p.quote.serviceStartedAt) : undefined,
            serviceCompletedAt: p.quote.serviceCompletedAt ? new Date(p.quote.serviceCompletedAt) : undefined,
            userId: p.quote.userId,
          } : undefined,
        }))
        setPayments(transformedPayments)
      }
    } catch (error) {
      console.error('Fetch payments error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchPayments()
    }
  }, [fetchPayments, user?.id])

  const addPayment = useCallback(async (paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Payment> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          quoteId: paymentData.quoteId,
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate instanceof Date 
            ? paymentData.paymentDate.toISOString() 
            : paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
          observations: paymentData.observations,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar pagamento')
      }

      const newPayment = await response.json()
      const transformedPayment: Payment = {
        id: newPayment.id,
        quoteId: newPayment.quoteId,
        userId: newPayment.userId,
        amount: newPayment.amount,
        paymentDate: new Date(newPayment.paymentDate),
        paymentMethod: newPayment.paymentMethod,
        observations: newPayment.observations,
        createdAt: new Date(newPayment.createdAt),
        updatedAt: new Date(newPayment.updatedAt),
        quote: newPayment.quote ? {
          id: newPayment.quote.id,
          number: newPayment.quote.number,
          client: newPayment.quote.client,
          services: newPayment.quote.services || [],
          materials: newPayment.quote.materials || [],
          subtotal: newPayment.quote.subtotal,
          discount: newPayment.quote.discount,
          total: newPayment.quote.total,
          observations: newPayment.quote.observations,
          createdAt: new Date(newPayment.quote.createdAt),
          status: newPayment.quote.status,
          serviceStartedAt: newPayment.quote.serviceStartedAt ? new Date(newPayment.quote.serviceStartedAt) : undefined,
          serviceCompletedAt: newPayment.quote.serviceCompletedAt ? new Date(newPayment.quote.serviceCompletedAt) : undefined,
          userId: newPayment.quote.userId,
        } : undefined,
      }

      setPayments(prev => [transformedPayment, ...prev])
      return transformedPayment
    } catch (error: any) {
      console.error('Add payment error:', error)
      throw error
    }
  }, [user?.id])

  const updatePayment = useCallback(async (id: string, paymentData: Partial<Payment>): Promise<void> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      const updatePayload: any = {}
      if (paymentData.amount !== undefined) updatePayload.amount = paymentData.amount
      if (paymentData.paymentDate !== undefined) {
        updatePayload.paymentDate = paymentData.paymentDate instanceof Date 
          ? paymentData.paymentDate.toISOString() 
          : paymentData.paymentDate
      }
      if (paymentData.paymentMethod !== undefined) updatePayload.paymentMethod = paymentData.paymentMethod
      if (paymentData.observations !== undefined) updatePayload.observations = paymentData.observations

      const response = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar pagamento')
      }

      const updatedPayment = await response.json()
      const transformedPayment: Payment = {
        id: updatedPayment.id,
        quoteId: updatedPayment.quoteId,
        userId: updatedPayment.userId,
        amount: updatedPayment.amount,
        paymentDate: new Date(updatedPayment.paymentDate),
        paymentMethod: updatedPayment.paymentMethod,
        observations: updatedPayment.observations,
        createdAt: new Date(updatedPayment.createdAt),
        updatedAt: new Date(updatedPayment.updatedAt),
        quote: updatedPayment.quote ? {
          id: updatedPayment.quote.id,
          number: updatedPayment.quote.number,
          client: updatedPayment.quote.client,
          services: updatedPayment.quote.services || [],
          materials: updatedPayment.quote.materials || [],
          subtotal: updatedPayment.quote.subtotal,
          discount: updatedPayment.quote.discount,
          total: updatedPayment.quote.total,
          observations: updatedPayment.quote.observations,
          createdAt: new Date(updatedPayment.quote.createdAt),
          status: updatedPayment.quote.status,
          serviceStartedAt: updatedPayment.quote.serviceStartedAt ? new Date(updatedPayment.quote.serviceStartedAt) : undefined,
          serviceCompletedAt: updatedPayment.quote.serviceCompletedAt ? new Date(updatedPayment.quote.serviceCompletedAt) : undefined,
          userId: updatedPayment.quote.userId,
        } : undefined,
      }

      setPayments(prev => prev.map(p => p.id === id ? transformedPayment : p))
    } catch (error: any) {
      console.error('Update payment error:', error)
      throw error
    }
  }, [user?.id])

  const deletePayment = useCallback(async (id: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir pagamento')
      }

      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (error: any) {
      console.error('Delete payment error:', error)
      throw error
    }
  }, [user?.id])

  const getPaymentById = useCallback((id: string): Payment | undefined => {
    return payments.find(p => p.id === id)
  }, [payments])

  const getPaymentsByQuoteId = useCallback((quoteId: string): Payment[] => {
    return payments.filter(p => p.quoteId === quoteId)
  }, [payments])

  const getTotalPaidByQuoteId = useCallback((quoteId: string): number => {
    return payments
      .filter(p => p.quoteId === quoteId)
      .reduce((sum, p) => sum + p.amount, 0)
  }, [payments])

  const refreshPayments = useCallback(async (quoteId?: string) => {
    await fetchPayments(quoteId)
  }, [fetchPayments])

  return (
    <PaymentsContext.Provider
      value={{
        payments,
        isLoading,
        addPayment,
        updatePayment,
        deletePayment,
        getPaymentById,
        getPaymentsByQuoteId,
        refreshPayments,
        getTotalPaidByQuoteId,
      }}
    >
      {children}
    </PaymentsContext.Provider>
  )
}

export function usePayments() {
  const context = useContext(PaymentsContext)
  if (context === undefined) {
    throw new Error('usePayments must be used within a PaymentsProvider')
  }
  return context
}
