'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/components/app-link'
import { useMaterialLists } from '@/contexts/material-lists-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Plus, Search, Package, ChevronRight, Calendar } from 'lucide-react'

export default function ListasMateriaisPage() {
  const { materialLists, isLoading } = useMaterialLists()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return materialLists
    return materialLists.filter(
      (l) =>
        l.number.toLowerCase().includes(q) ||
        l.client.name.toLowerCase().includes(q) ||
        (l.title && l.title.toLowerCase().includes(q))
    )
  }, [materialLists, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl min-w-[48px] min-h-[48px]" asChild>
            <Link href="/dashboard" aria-label="Voltar ao dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Listas de materiais</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Documentos independentes dos orçamentos — o que o cliente precisa comprar.
            </p>
          </div>
        </div>
        <Button
          className="h-11 w-full sm:w-auto"
          asChild
        >
          <Link href="/operacao/listas-materiais/nova">
            <Plus className="w-5 h-5 mr-2" />
            Nova lista
          </Link>
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 sm:p-6">
          <Label htmlFor="search-ml" className="sr-only">
            Buscar
          </Label>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-ml"
              placeholder="Número, cliente ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 min-h-[48px]"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium mb-4">
              {materialLists.length === 0
                ? 'Nenhuma lista criada ainda.'
                : 'Nenhum resultado para a busca.'}
            </p>
            {materialLists.length === 0 && (
              <Button asChild>
                <Link href="/operacao/listas-materiais/nova">Criar primeira lista</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((list) => (
            <li key={list.id}>
              <Link href={`/operacao/listas-materiais/${list.id}`}>
                <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all">
                  <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{list.number}</p>
                      <p className="text-sm text-muted-foreground truncate">{list.client.name}</p>
                      {list.title && <p className="text-xs text-muted-foreground mt-0.5 truncate">{list.title}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(list.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span>{list.items.length} item(ns)</span>
                        {list.includePrices && (
                          <span className="text-primary font-medium">Com valores no PDF</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
