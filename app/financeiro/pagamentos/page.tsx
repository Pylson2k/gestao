'use client'

import { Suspense } from 'react'
import PagamentosClientPage from './pagamentos.client'

export default function PagamentosPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Carregando…</div>}>
      <PagamentosClientPage />
    </Suspense>
  )
}

