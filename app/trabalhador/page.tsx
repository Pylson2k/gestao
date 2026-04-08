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
        setLoadError('Nao foi possivel carregar obras')
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
      <div className="flex min-h-dvh items-center justify-center text-slate-400">Carregando...</div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Ola,</p>
          <h1 className="text-xl font-semibold text-white">{employeeName}</h1>
          <p className="text-sm text-slate-400 mt-1">Obras ativas para registrar ponto ou empreita.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-200 shrink-0"
          onClick={() => {
            logout()
            router.replace('/trabalhador/login')
          }}
        >
          <LogOut className="w-4 h-4 mr-1" />
          Sair
        </Button>
      </header>

      {loadError ? <p className="text-sm text-amber-400">{loadError}</p> : null}

      <div className="space-y-3">
        {assignments.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/60">
            <CardContent className="py-8 text-center text-slate-400 text-sm">
              Nenhuma obra ativa no momento. O gestor precisa criar e ativar sua atribuicao.
            </CardContent>
          </Card>
        ) : (
          assignments.map((a) => (
            <Link key={a.id} href={`/trabalhador/obras/${a.id}`}>
              <Card className="border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-colors">
                <CardHeader className="py-4 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-medium text-white pr-2">{a.title}</CardTitle>
                  <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
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
