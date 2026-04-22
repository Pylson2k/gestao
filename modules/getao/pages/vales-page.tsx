'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/modules/shared/components/page-header'
import { GetaoNav } from '@/modules/getao/components/getao-nav'
import { getaoApi } from '@/modules/getao/api/client'
import type { Funcionario, Vale } from '@/modules/getao/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { parseBrDate, toBrDate, toIsoDate } from '@/modules/getao/lib/date'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'

function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function GetaoValesPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const ativos = useMemo(() => funcionarios.filter((f) => f.status === 'ativo'), [funcionarios])

  const [filterFuncionarioId, setFilterFuncionarioId] = useState<number | 'all'>('all')
  const [vales, setVales] = useState<Vale[]>([])
  const [loading, setLoading] = useState(true)

  const [novoFuncionarioId, setNovoFuncionarioId] = useState<number | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [novoData, setNovoData] = useState(() => toBrDate(toIsoDate(new Date())))
  const [novoDesc, setNovoDesc] = useState('')

  async function loadFuncionarios() {
    const list = await getaoApi.funcionarios.list()
    setFuncionarios(list)
    if (!novoFuncionarioId) {
      const first = list.find((f) => f.status === 'ativo')
      if (first) setNovoFuncionarioId(first.id)
    }
  }

  async function loadVales() {
    setLoading(true)
    try {
      const list = await getaoApi.vales.list(filterFuncionarioId === 'all' ? undefined : filterFuncionarioId)
      setVales(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFuncionarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadVales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFuncionarioId])

  async function createVale() {
    if (!novoFuncionarioId) return
    const v = Number(novoValor.replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) {
      alert('Valor inválido')
      return
    }
    const iso = parseBrDate(novoData)
    if (!iso) {
      alert('Data inválida (use DD/MM/AAAA)')
      return
    }
    try {
      await getaoApi.vales.create({
        funcionario_id: novoFuncionarioId,
        valor: v,
        data: iso,
        descricao: novoDesc.trim() || null,
      })
      setNovoValor('')
      setNovoDesc('')
      await loadVales()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao criar vale')
    }
  }

  async function marcarPago(vale: Vale) {
    try {
      await getaoApi.vales.patch(vale.id, { status: 'pago' })
      await loadVales()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao atualizar vale')
    }
  }

  async function excluir(vale: Vale) {
    if (!confirm('Excluir este vale?')) return
    try {
      await getaoApi.vales.delete(vale.id)
      await loadVales()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir vale')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GETAO — Vales"
        description="Lançamentos (pendente/pago). Ordenado por data desc. Somente ativos no cadastro."
      />
      <GetaoNav />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-4 sm:p-5">
          <div className="space-y-2 sm:col-span-2">
            <Label>Funcionário</Label>
            <Select
              value={novoFuncionarioId ? String(novoFuncionarioId) : ''}
              onValueChange={(v) => setNovoFuncionarioId(Number(v))}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ativos.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input value={novoValor} onChange={(e) => setNovoValor(e.target.value)} inputMode="decimal" />
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input value={novoData} onChange={(e) => setNovoData(e.target.value)} placeholder="DD/MM/AAAA" />
          </div>

          <div className="space-y-2 sm:col-span-3">
            <Label>Descrição</Label>
            <Input value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={() => void createVale()}>
              <Plus className="mr-2 h-4 w-4" />
              Lançar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar</span>
          <Select
            value={filterFuncionarioId === 'all' ? 'all' : String(filterFuncionarioId)}
            onValueChange={(v) => setFilterFuncionarioId(v === 'all' ? 'all' : Number(v))}
          >
            <SelectTrigger className="min-h-11 w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {funcionarios.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">{vales.length} lançamento(s)</div>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : vales.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum vale.</div>
        ) : (
          <ul className="divide-y">
            {vales.map((v) => (
              <li key={v.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {v.funcionario_nome ?? `Funcionário #${v.funcionario_id}`}
                    </p>
                    <Badge variant={v.status === 'pendente' ? 'default' : 'secondary'} className="font-normal">
                      {v.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{toBrDate(v.data)}</span>
                  </div>
                  {v.descricao ? <p className="text-sm text-muted-foreground">{v.descricao}</p> : null}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-sm font-semibold tabular-nums">{money(v.valor)}</div>
                  <div className="flex gap-2">
                    {v.status === 'pendente' ? (
                      <Button variant="outline" size="sm" onClick={() => void marcarPago(v)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Marcar pago
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" onClick={() => void excluir(v)} aria-label="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

