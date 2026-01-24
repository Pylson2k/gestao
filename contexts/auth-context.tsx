'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, AuthState } from '@/lib/types'

// Pre-defined users with temporary passwords
interface StoredUser {
  id: string
  username: string
  name: string
  password: string
  mustChangePassword: boolean
}

const STORAGE_KEY = 'servipro_users'

// Initial users with temporary passwords
const initialUsers: StoredUser[] = [
  {
    id: '1',
    username: 'gustavo',
    name: 'Gustavo',
    password: 'gustavo123',
    mustChangePassword: true,
  },
  {
    id: '2',
    username: 'giovanni',
    name: 'Giovanni',
    password: 'giovanni123',
    mustChangePassword: true,
  },
]

function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return initialUsers
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUsers))
    return initialUsers
  }
  return JSON.parse(stored)
}

function saveUsers(users: StoredUser[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

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
    const sessionData = sessionStorage.getItem('servipro_session')
    if (sessionData) {
      const session = JSON.parse(sessionData)
      setUser(session.user)
      setMustChangePassword(session.mustChangePassword)
    }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; mustChangePassword?: boolean }> => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    const users = getStoredUsers()
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    )
    
    if (foundUser) {
      const loggedUser: User = {
        id: foundUser.id,
        name: foundUser.name,
        email: `${foundUser.username}@servipro.com`,
      }
      setUser(loggedUser)
      setMustChangePassword(foundUser.mustChangePassword)
      
      // Save session
      sessionStorage.setItem('servipro_session', JSON.stringify({
        user: loggedUser,
        mustChangePassword: foundUser.mustChangePassword,
      }))
      
      setIsLoading(false)
      return { success: true, mustChangePassword: foundUser.mustChangePassword }
    }
    
    setIsLoading(false)
    return { success: false }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuario nao autenticado' }
    
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    const users = getStoredUsers()
    const userIndex = users.findIndex((u) => u.id === user.id)
    
    if (userIndex === -1) {
      setIsLoading(false)
      return { success: false, error: 'Usuario nao encontrado' }
    }
    
    // Verify current password
    if (users[userIndex].password !== currentPassword) {
      setIsLoading(false)
      return { success: false, error: 'Senha atual incorreta' }
    }
    
    // Validate new password
    if (newPassword.length < 6) {
      setIsLoading(false)
      return { success: false, error: 'A nova senha deve ter pelo menos 6 caracteres' }
    }
    
    if (newPassword === currentPassword) {
      setIsLoading(false)
      return { success: false, error: 'A nova senha deve ser diferente da atual' }
    }
    
    // Update password
    users[userIndex].password = newPassword
    users[userIndex].mustChangePassword = false
    saveUsers(users)
    
    setMustChangePassword(false)
    
    // Update session
    sessionStorage.setItem('servipro_session', JSON.stringify({
      user,
      mustChangePassword: false,
    }))
    
    setIsLoading(false)
    return { success: true }
  }, [user])

  const logout = useCallback(() => {
    setUser(null)
    setMustChangePassword(false)
    sessionStorage.removeItem('servipro_session')
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
