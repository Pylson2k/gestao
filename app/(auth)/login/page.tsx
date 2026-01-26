'use client'

import React from "react"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Loader2, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('ServiPro')

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  // Buscar logo e nome da empresa
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch('/api/company/logo')
        const data = await response.json()
        if (data.logo) {
          setCompanyLogo(data.logo)
        }
        if (data.name) {
          setCompanyName(data.name)
          // Atualizar título da página
          document.title = `${data.name} - Acesso ao Sistema`
        }
      } catch (error) {
        console.error('Error fetching company info:', error)
      }
    }
    fetchCompanyInfo()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Preencha todos os campos')
      return
    }

    const result = await login(username, password)
    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Usuario ou senha invalidos')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt={companyName}
              className="w-16 h-16 object-contain rounded-lg bg-white/10 p-2"
            />
          ) : (
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Zap className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <span className="text-3xl font-bold text-white tracking-tight">{companyName}</span>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Acesso ao Sistema</CardTitle>
            <CardDescription>Entre com suas credenciais para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Seu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Sistema de uso restrito. Acesso apenas para usuarios autorizados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
