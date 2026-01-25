'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import type { Client } from '@/lib/types'

interface ClientsContextType {
  clients: Client[]
  isLoading: boolean
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateClient: (id: string, client: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  refreshClients: () => Promise<void>
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/clients', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Parse dates
        const parsedData = data.map((client: any) => ({
          ...client,
          createdAt: new Date(client.createdAt),
          updatedAt: new Date(client.updatedAt),
        }))
        setClients(parsedData)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const addClient = useCallback(async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(clientData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar cliente')
    }

    const newClient = await response.json()
    setClients((prev) => [
      ...prev,
      {
        ...newClient,
        createdAt: new Date(newClient.createdAt),
        updatedAt: new Date(newClient.updatedAt),
      },
    ])
  }, [user?.id])

  const updateClient = useCallback(async (id: string, clientData: Partial<Client>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(clientData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao atualizar cliente')
    }

    const updatedClient = await response.json()
    setClients((prev) =>
      prev.map((client) =>
        client.id === id
          ? {
              ...updatedClient,
              createdAt: new Date(updatedClient.createdAt),
              updatedAt: new Date(updatedClient.updatedAt),
            }
          : client
      )
    )
  }, [user?.id])

  const deleteClient = useCallback(async (id: string) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': user.id,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao excluir cliente')
    }

    setClients((prev) => prev.filter((client) => client.id !== id))
  }, [user?.id])

  return (
    <ClientsContext.Provider
      value={{
        clients,
        isLoading,
        addClient,
        updateClient,
        deleteClient,
        refreshClients: fetchClients,
      }}
    >
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const context = useContext(ClientsContext)
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientsProvider')
  }
  return context
}
