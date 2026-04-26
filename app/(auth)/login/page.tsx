'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2, ShieldAlert } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState(APP_DISPLAY_NAME)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

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
          document.title = `${data.name} — Acesso`
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
    <div className="relative flex min-h-dvh flex-col bg-muted/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.42_0.13_264/0.12),transparent)]" />
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex w-full max-w-md flex-col items-center gap-4 text-center sm:mb-10">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt=""
              className="h-14 w-14 rounded-lg border border-border bg-card object-contain p-2 shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{companyName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acesso ao sistema de gestão</p>
          </div>
        </div>

        <Card className="w-full max-w-md border border-border/80 shadow-lg shadow-foreground/5">
          <CardHeader className="space-y-1 pb-2 text-center sm:text-left">
            <CardTitle className="text-lg font-semibold">Entrar</CardTitle>
            <CardDescription>Use suas credenciais corporativas.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Identificador"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando…
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </form>

            <p className="mt-6 border-t border-border pt-4 text-center text-xs leading-relaxed text-muted-foreground">
              Uso restrito a pessoas autorizadas. O acesso é monitorado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
