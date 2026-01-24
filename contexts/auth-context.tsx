'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, AuthState } from '@/lib/types'

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; mustChangePassword?: boolean }>
  logout: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  mustChangePassword: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const userId = sessionStorage.getItem('servipro_user_id')
      if (userId) {
        try {
          const response = await fetch('/api/auth/session', {
            headers: {
              'x-user-id': userId,
            },
          })
          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
            setMustChangePassword(data.mustChangePassword)
          } else {
            sessionStorage.removeItem('servipro_user_id')
          }
        } catch (error) {
          console.error('Session check error:', error)
          sessionStorage.removeItem('servipro_user_id')
        }
      }
    }
    checkSession()
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; mustChangePassword?: boolean }> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(data.user)
        setMustChangePassword(data.mustChangePassword)
        sessionStorage.setItem('servipro_user_id', data.user.id)
        setIsLoading(false)
        return { success: true, mustChangePassword: data.mustChangePassword }
      } else {
        setIsLoading(false)
        return { success: false }
      }
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
      return { success: false }
    }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuario nao autenticado' }
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMustChangePassword(false)
        setIsLoading(false)
        return { success: true }
      } else {
        setIsLoading(false)
        return { success: false, error: data.error || 'Erro ao alterar senha' }
      }
    } catch (error) {
      console.error('Change password error:', error)
      setIsLoading(false)
      return { success: false, error: 'Erro ao alterar senha' }
    }
  }, [user])

  const logout = useCallback(() => {
    setUser(null)
    setMustChangePassword(false)
    sessionStorage.removeItem('servipro_user_id')
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        changePassword,
        mustChangePassword,
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
