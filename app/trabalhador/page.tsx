'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/components/app-link'
import { useWorkerAuth } from '@/contexts/worker-auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, ChevronRight } from 'lucide-react'
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

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/assignments', { headers: authHeaders() })
      if (res.status === 401) {
        logout()
        router.replace('/trabalhador/login')
        return
      }
      if (!res.ok) {
        setLoadError('Não foi possível carregar as obras')
        return
      }
      setAssignments(await res.json())
      setLoadError('')
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
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{employeeName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Obras ativas para registrar ponto ou empreita.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            logout()
            router.replace('/trabalhador/login')
          }}
        >
          <LogOut className="w-4 h-4 mr-1" />
          Sair
        </Button>
      </header>

      {loadError ? <p className="text-sm text-amber-700 dark:text-amber-500">{loadError}</p> : null}

      <div className="space-y-3">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma obra ativa no momento. O gestor precisa criar e ativar sua atribuicao.
            </CardContent>
          </Card>
        ) : (
          assignments.map((a) => (
            <Link key={a.id} href={`/trabalhador/obras/${a.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                  <CardTitle className="pr-2 text-base font-medium text-foreground">{a.title}</CardTitle>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {a.mode === 'DAILY' && 'Diaria'}
                    {a.mode === 'CONTRACT_PERCENT' && 'Empreita %'}
                    {a.mode === 'CONTRACT_STEPS' && 'Empreita etapas'}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
