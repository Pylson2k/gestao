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
  logout: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-user-id': OWNER_SESSION_USER_ID,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = () => {
      let storedUser = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
      if (!storedUser) {
        const legacy = sessionStorage.getItem(LEGACY_AUTH_SESSION_KEY)
        if (legacy) {
          sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, legacy)
          sessionStorage.removeItem(LEGACY_AUTH_SESSION_KEY)
          storedUser = legacy
        }
      }
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as User
          if (parsed.id === OWNER_SESSION_USER_ID) {
            setUser(parsed)
          } else {
            sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
          }
        } catch {
          sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
        }
      }
      setIsLoading(false)
    }
    checkSession()
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        try {
          await fetch('/api/audit/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'unknown',
              username,
              success: false,
              error: data.error || 'Falha na API',
            }),
          })
        } catch {}
        setIsLoading(false)
        return { success: false, error: data.error || 'Usuario ou senha invalidos' }
      }

      const userData: User = {
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        email: data.user.email,
        mustChangePassword: data.user.mustChangePassword,
      }

      setUser(userData)
      sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(userData))

      try {
        await fetch('/api/audit/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData.id,
            username,
            success: true,
          }),
        })
      } catch {}

      setIsLoading(false)
      return { success: true }
    } catch {
      setIsLoading(false)
      return { success: false, error: 'Erro de conexao. Tente novamente.' }
    }
  }, [])

  const logout = useCallback(() => {
    if (user) {
      fetch('/api/audit/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
        }),
      }).catch(() => {})
    }
    setUser(null)
    sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  }, [user])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Usuario nao autenticado' }
      }

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ currentPassword, newPassword }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { success: false, error: data.error || 'Erro ao alterar senha' }
        }

        const updated = { ...user, mustChangePassword: false }
        setUser(updated)
        sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(updated))

        try {
          await fetch('/api/audit/profile', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              action: 'change_password',
              username: user.username,
            }),
          })
        } catch {}

        return { success: true }
      } catch {
        return { success: false, error: 'Erro de conexao' }
      }
    },
    [user]
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
          headers: authHeaders(),
          body: JSON.stringify({ email: newEmail }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { success: false, error: data.error || 'Erro ao atualizar email' }
        }

        const updated = { ...user, email: data.email }
        setUser(updated)
        sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(updated))

        try {
          await fetch('/api/audit/profile', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              action: 'change_email',
              username: user.username,
              oldValue: user.email,
              newValue: data.email,
            }),
          })
        } catch {}

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
