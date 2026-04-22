'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { MaterialList, MaterialListItem } from '@/lib/types'
import { resolveMaterialUnit } from '@/lib/material-units'
import { useAuth } from './auth-context'

const STALE_MS = 10 * 60 * 1000

function mapListFromApi(data: any): MaterialList {
  return {
    id: data.id,
    number: data.number,
    userId: data.userId,
    client: {
      id: data.client.id,
      name: data.client.name,
      phone: data.client.phone,
      address: data.client.address,
      email: data.client.email,
    },
    title: data.title,
    observations: data.observations,
    includePrices: Boolean(data.includePrices),
    items: (data.items || []).map((it: any) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
      unit: resolveMaterialUnit(it.unit),
      unitPrice: it.unitPrice,
    })),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  }
}

interface MaterialListsContextType {
  materialLists: MaterialList[]
  isLoading: boolean
  addMaterialList: (payload: {
    clientId: string
    title?: string
    observations?: string
    includePrices: boolean
    items: Omit<MaterialListItem, 'id'>[]
  }) => Promise<MaterialList>
  updateMaterialList: (
    id: string,
    payload: {
      clientId?: string
      title?: string
      observations?: string
      includePrices?: boolean
      items?: Omit<MaterialListItem, 'id'>[]
    }
  ) => Promise<void>
  deleteMaterialList: (id: string) => Promise<void>
  getMaterialListById: (id: string) => MaterialList | undefined
  refreshMaterialLists: () => Promise<void>
}

const MaterialListsContext = createContext<MaterialListsContextType | undefined>(undefined)

export function MaterialListsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [materialLists, setMaterialLists] = useState<MaterialList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const lastFetchedAt = useRef(0)
  const fetchingRef = useRef(false)

  const fetchLists = useCallback(async () => {
    if (!user?.id || fetchingRef.current) {
      setIsLoading(false)
      return
    }
    fetchingRef.current = true
    setIsFetching(true)
    try {
      const response = await fetch('/api/material-lists', {
        headers: { 'x-user-id': user.id },
      })
      if (response.ok) {
        lastFetchedAt.current = Date.now()
        const data = await response.json()
        setMaterialLists(data.map(mapListFromApi))
      }
    } catch (e) {
      console.error('Fetch material lists error:', e)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
      fetchingRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) fetchLists()
  }, [fetchLists, user?.id])

  // Refetch automático ao focar janela desativado para reduzir picos de rede.

  const addMaterialList = useCallback(
    async (payload: {
      clientId: string
      title?: string
      observations?: string
      includePrices: boolean
      items: Omit<MaterialListItem, 'id'>[]
    }) => {
      if (!user?.id) throw new Error('Usuario nao autenticado')
      const response = await fetch('/api/material-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao criar lista')
      }
      const data = await response.json()
      const list = mapListFromApi(data)
      setMaterialLists((prev) => [list, ...prev])
      return list
    },
    [user?.id]
  )

  const updateMaterialList = useCallback(
    async (
      id: string,
      payload: {
        clientId?: string
        title?: string
        observations?: string
        includePrices?: boolean
        items?: Omit<MaterialListItem, 'id'>[]
      }
    ) => {
      if (!user?.id) throw new Error('Usuario nao autenticado')
      const response = await fetch(`/api/material-lists/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao atualizar lista')
      }
      const data = await response.json()
      const list = mapListFromApi(data)
      setMaterialLists((prev) => prev.map((l) => (l.id === id ? list : l)))
    },
    [user?.id]
  )

  const deleteMaterialList = useCallback(
    async (id: string) => {
      if (!user?.id) throw new Error('Usuario nao autenticado')
      const response = await fetch(`/api/material-lists/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao excluir lista')
      }
      setMaterialLists((prev) => prev.filter((l) => l.id !== id))
    },
    [user?.id]
  )

  const getMaterialListById = useCallback(
    (id: string) => materialLists.find((l) => l.id === id),
    [materialLists]
  )

  return (
    <MaterialListsContext.Provider
      value={{
        materialLists,
        isLoading,
        addMaterialList,
        updateMaterialList,
        deleteMaterialList,
        getMaterialListById,
        refreshMaterialLists: fetchLists,
      }}
    >
      {children}
    </MaterialListsContext.Provider>
  )
}

export function useMaterialLists() {
  const ctx = useContext(MaterialListsContext)
  if (!ctx) throw new Error('useMaterialLists must be used within MaterialListsProvider')
  return ctx
}
