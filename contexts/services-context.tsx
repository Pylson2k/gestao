'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import type { Service } from '@/lib/types'

interface ServicesContextType {
  services: Service[]
  isLoading: boolean
  addService: (service: Omit<Service, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateService: (id: string, service: Partial<Service>) => Promise<void>
  deleteService: (id: string) => Promise<void>
  refreshServices: () => Promise<void>
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined)

export function ServicesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const fetchServices = useCallback(async () => {
    if (!user?.id || isFetching) {
      setIsLoading(false)
      return
    }

    setIsFetching(true)
    try {
      const response = await fetch('/api/services?isActive=true', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Parse dates
        const parsedData = data.map((service: any) => ({
          ...service,
          createdAt: new Date(service.createdAt),
          updatedAt: new Date(service.updatedAt),
        }))
        setServices(parsedData)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [user?.id, isFetching])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // Atualizar dados em tempo real (polling a cada 5 segundos, apenas se página visível)
  useEffect(() => {
    if (!user?.id) return

    let interval: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval)
        interval = null
      } else {
        if (!interval) {
          interval = setInterval(() => {
            if (!isFetching && !isLoading) {
              fetchServices()
            }
          }, 5000)
        }
      }
    }

    if (!document.hidden) {
      interval = setInterval(() => {
        if (!isFetching && !isLoading) {
          fetchServices()
        }
      }, 5000)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchServices, user?.id, isFetching, isLoading])

  const addService = useCallback(async (serviceData: Omit<Service, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch('/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(serviceData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar servico')
    }

    const newService = await response.json()
    setServices((prev) => [
      ...prev,
      {
        ...newService,
        createdAt: new Date(newService.createdAt),
        updatedAt: new Date(newService.updatedAt),
      },
    ])
  }, [user?.id])

  const updateService = useCallback(async (id: string, serviceData: Partial<Service>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify(serviceData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao atualizar servico')
    }

    const updatedService = await response.json()
    setServices((prev) =>
      prev.map((service) =>
        service.id === id
          ? {
              ...updatedService,
              createdAt: new Date(updatedService.createdAt),
              updatedAt: new Date(updatedService.updatedAt),
            }
          : service
      )
    )
  }, [user?.id])

  const deleteService = useCallback(async (id: string) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    const response = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': user.id,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao excluir servico')
    }

    setServices((prev) => prev.filter((service) => service.id !== id))
  }, [user?.id])

  return (
    <ServicesContext.Provider
      value={{
        services,
        isLoading,
        addService,
        updateService,
        deleteService,
        refreshServices: fetchServices,
      }}
    >
      {children}
    </ServicesContext.Provider>
  )
}

export function useServices() {
  const context = useContext(ServicesContext)
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider')
  }
  return context
}
