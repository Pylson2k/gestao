'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Loader2, ShieldAlert } from 'lucide-react'
import { Link } from '@/components/app-link'

type HealthChecks = {
  ok?: boolean
  hint?: string
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
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 10% -10%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 0%, color-mix(in oklch, var(--primary) 6%, transparent), transparent 50%), linear-gradient(165deg, oklch(0.995 0.004 250) 0%, oklch(0.975 0.01 250) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="login-enter w-full max-w-[420px]">
          <div className="mb-10 flex flex-col items-center text-center">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="mb-5 h-14 w-14 rounded-xl border border-border/80 bg-card object-contain p-2 shadow-[var(--shadow-soft)]"
              />
            ) : (
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
                <Building2 className="h-7 w-7" aria-hidden />
              </div>
            )}
            <p className="font-display text-[1.65rem] font-semibold tracking-tight text-foreground sm:text-3xl">
              {companyName}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Gestão operacional com clareza — orçamentos, financeiro e equipe em um só lugar.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card/95 p-6 shadow-[var(--shadow-panel)] backdrop-blur-sm sm:p-8">
            <div className="mb-6">
              <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">Entrar</h1>
              <p className="mt-1 text-sm text-muted-foreground">Acesse com suas credenciais.</p>
            </div>

            {healthBad && (
              <div className="mb-5 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950">
                <p className="font-medium">Configuração incompleta no servidor</p>
                <p className="mt-1 opacity-90">
                  Banco:{' '}
                  {health?.checks?.databaseReachable === true
                    ? 'ok'
                    : 'não conecta'}
                  {health?.hint ? ` — ${health.hint}` : ''}
                </p>
                <p className="mt-1.5">
                  Ajuste a DATABASE_URL na Vercel e use{' '}
                  <Link href="/reset" className="font-medium underline underline-offset-2">
                    /reset
                  </Link>
                  .
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="gustavo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-background"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-words leading-snug">{error}</span>
                </div>
              )}

              <Button type="submit" className="h-11 w-full font-medium" disabled={isLoading}>
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

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Esqueceu a senha?{' '}
              <Link href="/reset" className="font-medium text-foreground underline-offset-2 hover:underline">
                Recuperar acesso
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
