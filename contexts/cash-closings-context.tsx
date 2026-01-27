'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import type { CashClosing } from '@/lib/types'

interface CashClosingsContextType {
  closings: CashClosing[]
  lastClosing: CashClosing | null
  isLoading: boolean
  addClosing: (closing: Omit<CashClosing, 'id' | 'userId' | 'createdAt'>) => Promise<void>
  refreshClosings: () => Promise<void>
}

const CashClosingsContext = createContext<CashClosingsContextType | undefined>(undefined)

export function CashClosingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [lastClosing, setLastClosing] = useState<CashClosing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const fetchClosings = useCallback(async () => {
    if (!user?.id || isFetching) {
      setIsLoading(false)
      return
    }

    setIsFetching(true)
    try {
      const response = await fetch('/api/cash-closings', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Parse dates
        const parsedData = data.map((closing: any) => ({
          ...closing,
          startDate: new Date(closing.startDate),
          endDate: new Date(closing.endDate),
          createdAt: new Date(closing.createdAt),
        }))
        setClosings(parsedData)
        // Último fechamento é o mais recente
        setLastClosing(parsedData.length > 0 ? parsedData[0] : null)
      }
    } catch (error) {
      console.error('Error fetching cash closings:', error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [user?.id, isFetching])

  useEffect(() => {
    if (user?.id) {
      fetchClosings()
    }
  }, [fetchClosings, user?.id])

  // Atualizar dados apenas quando a janela ganha foco (evita polling constante)
  useEffect(() => {
    if (!user?.id) return

    const handleFocus = () => {
      if (!isFetching && !isLoading) {
        fetchClosings()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchClosings, user?.id, isFetching, isLoading])

  const addClosing = useCallback(async (closingData: Omit<CashClosing, 'id' | 'userId' | 'createdAt'>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch('/api/cash-closings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(closingData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar fechamento')
    }

    const newClosing = await response.json()
    const parsedClosing = {
      ...newClosing,
      startDate: new Date(newClosing.startDate),
      endDate: new Date(newClosing.endDate),
      createdAt: new Date(newClosing.createdAt),
    }
    
    setClosings((prev) => [parsedClosing, ...prev])
    setLastClosing(parsedClosing)
  }, [user?.id])

  return (
    <CashClosingsContext.Provider
      value={{
        closings,
        lastClosing,
        isLoading,
        addClosing,
        refreshClosings: fetchClosings,
      }}
    >
      {children}
    </CashClosingsContext.Provider>
  )
}

export function useCashClosings() {
  const context = useContext(CashClosingsContext)
  if (context === undefined) {
    throw new Error('useCashClosings must be used within a CashClosingsProvider')
  }
  return context
}
