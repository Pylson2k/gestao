'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { AUTH_SESSION_STORAGE_KEY, LEGACY_AUTH_SESSION_KEY } from '@/lib/app-constants'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'

interface User {
  id: string
  username: string
  name: string
  email: string
  mustChangePassword?: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function clearClientSessionCache() {
  try {
    sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    sessionStorage.removeItem(LEGACY_AUTH_SESSION_KEY)
  } catch {
    // ignore
  }
}

function cacheUser(user: User) {
  try {
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) {
        setUser(null)
        clearClientSessionCache()
        return
      }
      const data = (await res.json()) as User
      const nextUser: User = {
        id: OWNER_SESSION_USER_ID,
        username: data.username,
        name: data.name,
        email: data.email,
        mustChangePassword: data.mustChangePassword,
      }
      setUser(nextUser)
      cacheUser(nextUser)
    } catch {
      setUser(null)
      clearClientSessionCache()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (cancelled) return
        if (!res.ok) {
          setUser(null)
          clearClientSessionCache()
        } else {
          const data = (await res.json()) as User
          const nextUser: User = {
            id: OWNER_SESSION_USER_ID,
            username: data.username,
            name: data.name,
            email: data.email,
            mustChangePassword: data.mustChangePassword,
          }
          setUser(nextUser)
          cacheUser(nextUser)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          clearClientSessionCache()
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setIsLoading(false)
        return { success: false, error: data.error || 'Usuario ou senha invalidos' }
      }

      const userData: User = {
        id: OWNER_SESSION_USER_ID,
        username: data.user.username,
        name: data.user.name,
        email: data.user.email,
        mustChangePassword: data.user.mustChangePassword,
      }

      setUser(userData)
      cacheUser(userData)
      setIsLoading(false)
      return { success: true }
    } catch {
      setIsLoading(false)
      return { success: false, error: 'Erro de conexao. Tente novamente.' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    setUser(null)
    clearClientSessionCache()
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Usuario nao autenticado' }
      }

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { success: false, error: data.error || 'Erro ao alterar senha' }
        }

        await refreshUser()
        return { success: true }
      } catch {
        return { success: false, error: 'Erro de conexao' }
      }
    },
    [user, refreshUser]
  )

  const updateEmail = useCallback(
    async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Usuario nao autenticado' }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newEmail)) {
        return { success: false, error: 'Email invalido' }
      }

      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: newEmail }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { success: false, error: data.error || 'Erro ao atualizar email' }
        }

        const updated = { ...user, email: data.email }
        setUser(updated)
        cacheUser(updated)
        return { success: true }
      } catch {
        return { success: false, error: 'Erro de conexao' }
      }
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        changePassword,
        updateEmail,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
