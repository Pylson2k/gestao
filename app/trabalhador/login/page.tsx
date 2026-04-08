'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkerAuth } from '@/contexts/worker-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HardHat } from 'lucide-react'

export default function TrabalhadorLoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useWorkerAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/trabalhador')
    }
  }, [isAuthenticated, isLoading, router])

  if (!isLoading && isAuthenticated) {
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/worker/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginUsername: username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Nao foi possivel entrar')
        return
      }
      login(data.token, data.employeeName)
      router.replace('/trabalhador')
    } catch {
      setError('Erro de rede')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <HardHat className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Campo · obra</p>
      </div>
      <Card className="w-full max-w-md border border-border/80 shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-semibold">Área do trabalhador</CardTitle>
          <CardDescription>Use o login e a senha definidos pelo gestor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wu">Login</Label>
              <Input
                id="wu"
                autoComplete="username"
                className="bg-background"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu.login"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wp">Senha</Label>
              <Input
                id="wp"
                type="password"
                autoComplete="current-password"
                className="bg-background"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 w-full" disabled={submitting || isLoading}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
