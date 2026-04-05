'use client'

import { use, useEffect, useRef, useState } from 'react'
import { Link } from '@/components/app-link'
import { useAuth } from '@/contexts/auth-context'
import { useMaterialLists } from '@/contexts/material-lists-context'
import { MaterialListForm } from '@/components/material-list/material-list-form'
import { Button } from '@/components/ui/button'
import type { MaterialList } from '@/lib/types'
import { Package } from 'lucide-react'

export default function EditListaMateriaisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()
  const { materialLists, isLoading, refreshMaterialLists } = useMaterialLists()
  const [list, setList] = useState<MaterialList | null>(null)
  const refreshOnceRef = useRef(false)

  const fromCtx = materialLists.find((l) => l.id === id)

  useEffect(() => {
    if (fromCtx) setList(fromCtx)
  }, [fromCtx])

  useEffect(() => {
    if (!user?.id || fromCtx || isLoading) return
    let cancelled = false
    ;(async () => {
      const r = await fetch(`/api/material-lists/${id}`, {
        headers: { 'x-user-id': user.id },
      })
      if (!r.ok || cancelled) return
      const data = await r.json()
      setList({
        id: data.id,
        number: data.number,
        userId: data.userId,
        client: {
          id: data.client.id,
          name: data.client.name,
          phone: data.client.phone,
          address: data.client.address,
          email: data.client.email,
        },
        title: data.title,
        observations: data.observations,
        includePrices: Boolean(data.includePrices),
        items: (data.items || []).map((it: any) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, id, fromCtx, isLoading])

  useEffect(() => {
    refreshOnceRef.current = false
  }, [id])

  useEffect(() => {
    if (!isLoading && !fromCtx && user?.id && !refreshOnceRef.current) {
      refreshOnceRef.current = true
      refreshMaterialLists()
    }
  }, [isLoading, fromCtx, user?.id, refreshMaterialLists])

  if (!list && isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Lista não encontrada</h2>
        <Link href="/dashboard/listas-materiais">
          <Button>Voltar</Button>
        </Link>
      </div>
    )
  }

  return <MaterialListForm initialData={list} />
}
