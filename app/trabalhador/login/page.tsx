'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkerAuth } from '@/contexts/worker-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-white">Area do trabalhador</CardTitle>
          <CardDescription className="text-slate-400">
            Use o login e a senha fornecidos pelo gestor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wu" className="text-slate-200">
                Login
              </Label>
              <Input
                id="wu"
                autoComplete="username"
                className="bg-slate-950 border-slate-700 text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu.login"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wp" className="text-slate-200">
                Senha
              </Label>
              <Input
                id="wp"
                type="password"
                autoComplete="current-password"
                className="bg-slate-950 border-slate-700 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full min-h-11" disabled={submitting || isLoading}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
