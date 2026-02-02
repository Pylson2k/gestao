'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'

const STALE_MS = 10 * 60 * 1000
import type { CompanySettings } from '@/lib/types'
import { useAuth } from './auth-context'

const defaultSettings: CompanySettings = {
  name: 'ServiPro',
  phone: '',
  email: '',
  address: '',
}

interface CompanyContextType {
  settings: CompanySettings
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>
  updateLogo: (logoBase64: string) => Promise<void>
  removeLogo: () => Promise<void>
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const lastFetchedAt = useRef<number>(0)

  const fetchSettings = useCallback(async () => {
    if (!user?.id || isFetching) {
      setIsLoading(false)
      return
    }

    setIsFetching(true)
    try {
      const response = await fetch('/api/bootstrap', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        lastFetchedAt.current = Date.now()
        const data = await response.json()
        setSettings({
          name: data.name || defaultSettings.name,
          logo: data.logo || undefined,
          phone: data.phone || defaultSettings.phone,
          email: data.email || defaultSettings.email,
          address: data.address || defaultSettings.address,
          cnpj: data.cnpj || undefined,
          website: data.website || undefined,
          additionalInfo: data.additionalInfo || undefined,
          companyCashPercentage: data.companyCashPercentage !== undefined ? data.companyCashPercentage : 10,
        })
      }
    } catch (error) {
      console.error('Fetch company settings error:', error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [user?.id, isFetching])

  useEffect(() => {
    if (user?.id) {
      fetchSettings()
    }
  }, [fetchSettings, user?.id])

  // Refetch no focus só se passou 10 min
  useEffect(() => {
    if (!user?.id) return

    const handleFocus = () => {
      if (isFetching || isLoading) return
      if (Date.now() - lastFetchedAt.current < STALE_MS) return
      fetchSettings()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchSettings, user?.id, isFetching, isLoading])

  const updateSettings = useCallback(async (newSettings: Partial<CompanySettings>) => {
    if (!user?.id) {
      throw new Error('Usuario nao autenticado')
    }

    try {
      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          ...settings,
          ...newSettings,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar configuracoes')
      }

      const data = await response.json()
      setSettings({
        name: data.name || defaultSettings.name,
        logo: data.logo || undefined,
        phone: data.phone || defaultSettings.phone,
        email: data.email || defaultSettings.email,
        address: data.address || defaultSettings.address,
        cnpj: data.cnpj || undefined,
        website: data.website || undefined,
        additionalInfo: data.additionalInfo || undefined,
        companyCashPercentage: data.companyCashPercentage !== undefined ? data.companyCashPercentage : 10,
      })
    } catch (error) {
      console.error('Update settings error:', error)
      throw error
    }
  }, [user?.id, settings])

  const updateLogo = useCallback(async (logoBase64: string) => {
    await updateSettings({ logo: logoBase64 })
  }, [updateSettings])

  const removeLogo = useCallback(async () => {
    await updateSettings({ logo: undefined })
  }, [updateSettings])

  return (
    <CompanyContext.Provider
      value={{
        settings,
        updateSettings,
        updateLogo,
        removeLogo,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}
