'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface User {
  id: string
  username: string
  name: string
  email: string
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

// Usuários hardcoded
const USERS = [
  {
    id: '1',
    username: 'gustavo',
    password: 'gustavo123',
    name: 'Gustavo',
    email: 'gustavo@servipro.com',
  },
  {
    id: '2',
    username: 'giovanni',
    password: 'giovanni123',
    name: 'Giovanni',
    email: 'giovanni@servipro.com',
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar sessão ao carregar
  useEffect(() => {
    const checkSession = () => {
      const storedUser = sessionStorage.getItem('servipro_user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          sessionStorage.removeItem('servipro_user')
        }
      }
      setIsLoading(false)
    }
    checkSession()
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Verificar se existe usuário com esse username
    const foundUser = USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    )

    if (!foundUser) {
      setIsLoading(false)
      // Log de tentativa de login falhada
      try {
        await fetch('/api/audit/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'unknown',
            username,
            success: false,
            error: 'Usuario nao encontrado',
          }),
        })
      } catch {}
      return { success: false, error: 'Usuario ou senha invalidos' }
    }

    // Verificar senha (pode ser a original ou uma alterada)
    const storedPasswords = JSON.parse(localStorage.getItem('servipro_passwords') || '{}')
    const userPassword = storedPasswords[foundUser.id] || foundUser.password

    if (userPassword !== password) {
      setIsLoading(false)
      // Log de tentativa de login falhada
      try {
        await fetch('/api/audit/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: foundUser.id,
            username,
            success: false,
            error: 'Senha incorreta',
          }),
        })
      } catch {}
      return { success: false, error: 'Usuario ou senha invalidos' }
    }

    // Verificar se há email atualizado no sessionStorage
    const storedUser = sessionStorage.getItem('servipro_user')
    let storedEmail = foundUser.email
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed.id === foundUser.id && parsed.email) {
          storedEmail = parsed.email
        }
      } catch {}
    }

    const userData: User = {
      id: foundUser.id,
      username: foundUser.username,
      name: foundUser.name,
      email: storedEmail,
    }

    setUser(userData)
    sessionStorage.setItem('servipro_user', JSON.stringify(userData))
    setIsLoading(false)
    
    // Log de login bem-sucedido
    try {
      await fetch('/api/audit/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: foundUser.id,
          username,
          success: true,
        }),
      })
    } catch {}
    
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    // Log de logout antes de limpar
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
    sessionStorage.removeItem('servipro_user')
  }, [user])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuario nao autenticado' }
    }

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verificar senha atual (pode ser a original ou uma alterada)
    const storedPasswords = JSON.parse(localStorage.getItem('servipro_passwords') || '{}')
    const currentStoredPassword = storedPasswords[user.id] || USERS.find(u => u.id === user.id)?.password
    
    if (currentStoredPassword !== currentPassword) {
      return { success: false, error: 'Senha atual incorreta' }
    }

    // Salvar nova senha no localStorage
    const updatedPasswords = {
      ...storedPasswords,
      [user.id]: newPassword,
    }
    localStorage.setItem('servipro_passwords', JSON.stringify(updatedPasswords))
    
    // Log de auditoria
    try {
      await fetch('/api/audit/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          action: 'change_password',
          username: user.username,
        }),
      })
    } catch {}
    
    return { success: true }
  }, [user])

  const updateEmail = useCallback(async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuario nao autenticado' }
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return { success: false, error: 'Email invalido' }
    }

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    // Atualizar email do usuário
    const oldEmail = user.email
    const updatedUser: User = {
      ...user,
      email: newEmail,
    }

    setUser(updatedUser)
    sessionStorage.setItem('servipro_user', JSON.stringify(updatedUser))
    
    // Log de auditoria
    try {
      await fetch('/api/audit/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          action: 'change_email',
          username: user.username,
          oldValue: oldEmail,
          newValue: newEmail,
        }),
      })
    } catch {}
    
    return { success: true }
  }, [user])

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
