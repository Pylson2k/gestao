'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_DISPLAY_NAME } from '@/lib/app-constants'
import { RefreshCw, Shield, KeyRound } from 'lucide-react'
import { Link } from '@/components/app-link'

export default function ResetPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [adminSecret, setAdminSecret] = useState('')
  const [useDefaultPassword, setUseDefaultPassword] = useState(true)

  const handleResetPasswords = async () => {
    if (!adminSecret.trim()) {
      setStatus('error')
      setMessage('Cole a chave ADMIN_OPERATIONS_SECRET (a mesma da Vercel).')
      return
    }

    setStatus('loading')
    setMessage('')
    setTempPassword(null)

    try {
      const response = await fetch('/api/admin/reset-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret.trim(),
        },
        body: JSON.stringify({
          secret: adminSecret.trim(),
          useDefaultPassword,
        }),
      })

      let data: {
        success?: boolean
        error?: string
        message?: string
        temporaryPassword?: string
        username?: string
      } = {}
      try {
        data = await response.json()
      } catch {
        setStatus('error')
        setMessage(`Erro HTTP ${response.status}. Tente de novo apos o deploy ficar Ready.`)
        return
      }

      if (response.ok && data.success) {
        setStatus('success')
        setTempPassword(
          typeof data.temporaryPassword === 'string' ? data.temporaryPassword : null
        )
        setMessage(data.message || 'Senha redefinida com sucesso.')
        return
      }

      setStatus('error')
      setMessage(data.error || `Falha ao resetar (HTTP ${response.status}).`)
    } catch (error) {
      setStatus('error')
      setMessage('Erro de conexao: ' + String(error))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="mb-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-7 w-7" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {APP_DISPLAY_NAME}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Recuperar acesso — reset de senha</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-5 w-5" />
              Resetar senha do usuario gustavo
            </CardTitle>
            <CardDescription>
              Cole o valor de <code className="rounded bg-muted px-1 text-xs">ADMIN_OPERATIONS_SECRET</code> da
              Vercel (Settings → Environment Variables).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-secret">Chave administrativa</Label>
              <Input
                id="admin-secret"
                type="password"
                autoComplete="off"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Cole aqui o ADMIN_OPERATIONS_SECRET"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={useDefaultPassword}
                onChange={(e) => setUseDefaultPassword(e.target.checked)}
              />
              <span>
                Usar senha conhecida <strong>gustavo123</strong> (mais facil). Se desmarcar, gera uma senha
                aleatoria.
              </span>
            </label>

            <Button
              onClick={handleResetPasswords}
              disabled={status === 'loading'}
              className="h-11 w-full"
            >
              {status === 'loading' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetando...
                </>
              ) : (
                'Resetar senha agora'
              )}
            </Button>

            {status === 'success' && (
              <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                <p className="font-medium">{message}</p>
                {tempPassword && (
                  <div className="space-y-1">
                    <p>Usuario: <strong>gustavo</strong></p>
                    <p>
                      Senha:{' '}
                      <code className="rounded border bg-white px-2 py-1 font-mono text-base">
                        {tempPassword}
                      </code>
                    </p>
                  </div>
                )}
                <Button asChild className="mt-2 w-full" variant="default">
                  <Link href="/login">Ir para o login</Link>
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm whitespace-pre-wrap text-red-800">
                {message}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Se der erro de DATABASE_URL, corrija a connection string do Neon na Vercel e faca Redeploy.
        </p>
      </div>
    </div>
  )
}
