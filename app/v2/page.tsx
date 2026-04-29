'use client'

import { useEffect, useState } from 'react'
import { V2Shell } from '@/components/v2/shell'
import { apiV2Json } from '@/lib/api-v2'

type V2StatusResponse = {
  version: string
  message: string
}

export default function V2HomePage() {
  const [status, setStatus] = useState<V2StatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiV2Json<V2StatusResponse>('/status', { cache: 'no-store' })
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar status da v2'))
  }, [])

  return (
    <V2Shell>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Coexistencia Frontend + Rust</h2>
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {status?.message} ({status?.version})
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Esta rota valida a camada de gateway `/api/v2` e prepara a migração gradual por feature flag.
        </p>
      </section>
    </V2Shell>
  )
}
