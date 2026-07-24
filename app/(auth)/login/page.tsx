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
import { Link } from '@/components/app-link'

type HealthChecks = {
  ok?: boolean
  checks?: {
    databaseUrl?: boolean
    sessionSecret?: boolean
    databaseReachable?: boolean | null
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isAuthenticated, user } = useAuth()
  const [username, setUsername] = useState('gustavo')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState(APP_DISPLAY_NAME)
  const [health, setHealth] = useState<HealthChecks | null>(null)

  const postLoginPath = (mustChange?: boolean) =>
    mustChange ? '/dashboard/perfil?force=1' : '/dashboard'

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(postLoginPath(user?.mustChangePassword))
    }
  }, [isAuthenticated, isLoading, router, user?.mustChangePassword])

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch('/api/company/logo')
        const data = await response.json()
        if (data.logo) setCompanyLogo(data.logo)
        if (data.name) {
          setCompanyName(data.name)
          document.title = `${data.name} — Acesso`
        }
      } catch {
        // ignore
      }
    }
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        const data = (await res.json()) as HealthChecks
        setHealth(data)
      } catch {
        setHealth({ ok: false })
      }
    }
    fetchCompanyInfo()
    fetchHealth()
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

  const healthBad = health && health.ok === false

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
            <CardDescription>Usuario: gustavo</CardDescription>
          </CardHeader>
          <CardContent>
            {healthBad && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                <p className="font-medium">Servidor com problema de configuracao</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>DATABASE_URL: {health?.checks?.databaseUrl ? 'ok' : 'ERRADA/AUSENTE'}</li>
                  <li>Sessao: {health?.checks?.sessionSecret ? 'ok' : 'falta'}</li>
                  <li>
                    Banco:{' '}
                    {health?.checks?.databaseReachable === true
                      ? 'ok'
                      : health?.checks?.databaseReachable === false
                        ? 'NAO CONECTA'
                        : 'nao testado'}
                  </li>
                </ul>
                <p className="mt-2">
                  Corrija na Vercel → Settings → Environment Variables → Redeploy. Depois use{' '}
                  <Link href="/reset" className="underline">
                    /reset
                  </Link>
                  .
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="gustavo"
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
                  <span className="break-words">{error}</span>
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

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Esqueceu a senha?{' '}
              <Link href="/reset" className="underline">
                Resetar acesso
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
