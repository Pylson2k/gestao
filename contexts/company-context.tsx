'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { CompanySettings } from '@/lib/types'

// Usar o primeiro usuário do banco como padrão
const DEFAULT_USER_ID = 'aee2fe1b-6157-4f33-ba45-cc45a210ec2e' // ID do usuário gustavo

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
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/company', {
        headers: {
          'x-user-id': DEFAULT_USER_ID,
        },
      })

      if (response.ok) {
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
        })
      }
    } catch (error) {
      console.error('Fetch company settings error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (newSettings: Partial<CompanySettings>) => {
    try {
      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': DEFAULT_USER_ID,
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
      })
    } catch (error) {
      console.error('Update settings error:', error)
      throw error
    }
  }, [settings])

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
