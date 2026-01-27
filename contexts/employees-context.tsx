'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import type { Employee } from '@/lib/types'

interface EmployeesContextType {
  employees: Employee[]
  isLoading: boolean
  addEmployee: (employee: Omit<Employee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  refreshEmployees: () => Promise<void>
}

const EmployeesContext = createContext<EmployeesContextType | undefined>(undefined)

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const fetchEmployees = useCallback(async () => {
    if (!user?.id || isFetching) {
      setIsLoading(false)
      return
    }

    setIsFetching(true)
    try {
      const response = await fetch('/api/employees', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Parse dates
        const parsedData = data.map((emp: any) => ({
          ...emp,
          hireDate: emp.hireDate ? new Date(emp.hireDate) : null,
          createdAt: new Date(emp.createdAt),
          updatedAt: new Date(emp.updatedAt),
        }))
        setEmployees(parsedData)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [user?.id, isFetching])

  useEffect(() => {
    if (user?.id) {
      fetchEmployees()
    }
  }, [fetchEmployees, user?.id])

  // Atualizar dados apenas quando a janela ganha foco (evita polling constante)
  useEffect(() => {
    if (!user?.id) return

    const handleFocus = () => {
      if (!isFetching && !isLoading) {
        fetchEmployees()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchEmployees, user?.id, isFetching, isLoading])

  const addEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(employeeData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar funcionario')
    }

    const newEmployee = await response.json()
    setEmployees((prev) => [
      ...prev,
      {
        ...newEmployee,
        hireDate: newEmployee.hireDate ? new Date(newEmployee.hireDate) : null,
        createdAt: new Date(newEmployee.createdAt),
        updatedAt: new Date(newEmployee.updatedAt),
      },
    ])
  }, [user?.id])

  const updateEmployee = useCallback(async (id: string, employeeData: Partial<Employee>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(employeeData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao atualizar funcionario')
    }

    const updatedEmployee = await response.json()
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...updatedEmployee,
              hireDate: updatedEmployee.hireDate ? new Date(updatedEmployee.hireDate) : null,
              createdAt: new Date(updatedEmployee.createdAt),
              updatedAt: new Date(updatedEmployee.updatedAt),
            }
          : emp
      )
    )
  }, [user?.id])

  const deleteEmployee = useCallback(async (id: string) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': user.id,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao excluir funcionario')
    }

    setEmployees((prev) => prev.filter((emp) => emp.id !== id))
  }, [user?.id])

  return (
    <EmployeesContext.Provider
      value={{
        employees,
        isLoading,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        refreshEmployees: fetchEmployees,
      }}
    >
      {children}
    </EmployeesContext.Provider>
  )
}

export function useEmployees() {
  const context = useContext(EmployeesContext)
  if (context === undefined) {
    throw new Error('useEmployees must be used within an EmployeesProvider')
  }
  return context
}
