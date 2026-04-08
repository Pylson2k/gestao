'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { WORKER_SESSION_STORAGE_KEY } from '@/lib/app-constants'

interface WorkerAuthContextType {
  token: string | null
  employeeName: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, employeeName: string) => void
  logout: () => void
  authHeaders: () => HeadersInit
}

const WorkerAuthContext = createContext<WorkerAuthContextType | undefined>(undefined)

export function WorkerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const validateSession = useCallback(async (t: string) => {
    try {
      const res = await fetch('/api/worker/me', {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (!res.ok) {
        sessionStorage.removeItem(WORKER_SESSION_STORAGE_KEY)
        setToken(null)
        setEmployeeName(null)
        return
      }
      const data = await res.json()
      setEmployeeName(data.employeeName ?? null)
    } catch {
      sessionStorage.removeItem(WORKER_SESSION_STORAGE_KEY)
      setToken(null)
      setEmployeeName(null)
    }
  }, [])

  useEffect(() => {
    const t = sessionStorage.getItem(WORKER_SESSION_STORAGE_KEY)
    if (t) {
      setToken(t)
      validateSession(t).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [validateSession])

  const login = useCallback((newToken: string, name: string) => {
    sessionStorage.setItem(WORKER_SESSION_STORAGE_KEY, newToken)
    setToken(newToken)
    setEmployeeName(name)
  }, [])

  const logout = useCallback(() => {
    const t = sessionStorage.getItem(WORKER_SESSION_STORAGE_KEY)
    sessionStorage.removeItem(WORKER_SESSION_STORAGE_KEY)
    setToken(null)
    setEmployeeName(null)
    if (t) {
      fetch('/api/worker/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => {})
    }
  }, [])

  const authHeaders = useCallback((): HeadersInit => {
    const t =
      typeof window !== 'undefined' ? sessionStorage.getItem(WORKER_SESSION_STORAGE_KEY) : null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (t) headers.Authorization = `Bearer ${t}`
    return headers
  }, [])

  return (
    <WorkerAuthContext.Provider
      value={{
        token,
        employeeName,
        isLoading,
        isAuthenticated: Boolean(token && employeeName),
        login,
        logout,
        authHeaders,
      }}
    >
      {children}
    </WorkerAuthContext.Provider>
  )
}

export function useWorkerAuth() {
  const ctx = useContext(WorkerAuthContext)
  if (!ctx) {
    throw new Error('useWorkerAuth deve ser usado dentro de WorkerAuthProvider')
  }
  return ctx
}
