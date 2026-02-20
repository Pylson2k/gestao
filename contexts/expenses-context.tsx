'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'

const STALE_MS = 10 * 60 * 1000
import { useAuth } from './auth-context'
import type { Expense, ExpenseCategory } from '@/lib/types'

interface ExpensesContextType {
  expenses: Expense[]
  isLoading: boolean
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Expense>
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<Expense>
  deleteExpense: (id: string) => Promise<void>
  refreshExpenses: () => Promise<void>
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined)

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const lastFetchedAt = useRef<number>(0)
  const fetchingRef = useRef(false)

  const fetchExpenses = useCallback(async () => {
    if (!user?.id || fetchingRef.current) {
      if (!user?.id) {
        setExpenses([])
      }
      setIsLoading(false)
      return
    }
    fetchingRef.current = true
    setIsFetching(true)
    try {
      const response = await fetch('/api/expenses', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        lastFetchedAt.current = Date.now()
        const data = await response.json()
        setExpenses(data.map((exp: any) => ({
          ...exp,
          date: new Date(exp.date),
          createdAt: new Date(exp.createdAt),
          updatedAt: new Date(exp.updatedAt),
        })))
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
      fetchingRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchExpenses()
    }
  }, [fetchExpenses, user?.id])

  // Refetch no focus só se passou 10 min
  useEffect(() => {
    if (!user?.id) return

    const handleFocus = () => {
      if (isFetching || isLoading) return
      if (Date.now() - lastFetchedAt.current < STALE_MS) return
      fetchExpenses()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchExpenses, user?.id, isFetching, isLoading])

  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(expenseData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar despesa')
    }

    const newExpense = await response.json()
    const expense: Expense = {
      ...newExpense,
      date: new Date(newExpense.date),
      createdAt: new Date(newExpense.createdAt),
      updatedAt: new Date(newExpense.updatedAt),
    }

    setExpenses((prev) => [expense, ...prev])
    return expense
  }, [user?.id])

  const updateExpense = useCallback(async (id: string, expenseData: Partial<Expense>): Promise<Expense> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const serializedData: any = { ...expenseData }
    if (expenseData.date instanceof Date) {
      serializedData.date = expenseData.date.toISOString()
    }

    const response = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(serializedData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao atualizar despesa')
    }

    const updatedExpense = await response.json()
    const expense: Expense = {
      ...updatedExpense,
      date: new Date(updatedExpense.date),
      createdAt: new Date(updatedExpense.createdAt),
      updatedAt: new Date(updatedExpense.updatedAt),
    }

    setExpenses((prev) => prev.map((e) => (e.id === id ? expense : e)))
    return expense
  }, [user?.id])

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': user.id,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao excluir despesa')
    }

    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }, [user?.id])

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        isLoading,
        addExpense,
        updateExpense,
        deleteExpense,
        refreshExpenses: fetchExpenses,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  )
}

export function useExpenses() {
  const context = useContext(ExpensesContext)
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpensesProvider')
  }
  return context
}
