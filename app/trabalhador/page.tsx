'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/components/app-link'
import { useWorkerAuth } from '@/contexts/worker-auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction, LogOut } from 'lucide-react'
import { useState, useCallback } from 'react'

type Assignment = {
  id: string
  title: string
  mode: string
  status: string
}

export default function TrabalhadorHomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, logout, authHeaders, employeeName } = useWorkerAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadError, setLoadError] = useState('')
  const [notImplemented, setNotImplemented] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/assignments', { headers: authHeaders() })
      if (res.status === 401) {
        logout()
        router.replace('/trabalhador/login')
        return
      }
      if (res.status === 501) {
        setNotImplemented(true)
        setLoadError('')
        return
      }
      if (!res.ok) {
        setLoadError('Não foi possível carregar as obras')
        return
      }
      setAssignments(await res.json())
      setLoadError('')
      setNotImplemented(false)
    } catch {
      setLoadError('Erro de rede')
    }
  }, [authHeaders, logout, router])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/trabalhador/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated, load])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Carregando…</div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Olá</p>
          <h1 className="text-xl font-semibold">{employeeName || 'Trabalhador'}</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            logout()
            router.replace('/trabalhador/login')
          }}
        >
          <LogOut className="mr-1 h-4 w-4" />
          Sair
        </Button>
      </div>

      {notImplemented ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Construction className="h-5 w-5" />
              Em desenvolvimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>O portal do trabalhador ainda não está disponível no servidor.</p>
            <p>As APIs `/api/worker/*` retornam 501 até a implementação completa.</p>
            <Button asChild variant="secondary" className="mt-2">
              <Link href="/login">Voltar ao sistema principal</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {!notImplemented &&
        assignments.map((a) => (
          <Card key={a.id}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                <Link href={`/trabalhador/obras/${a.id}`} className="hover:underline">
                  {a.title}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {a.mode} · {a.status}
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
