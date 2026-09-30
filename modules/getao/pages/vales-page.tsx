'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { parseNonNegativeMoney } from '@/modules/getao/lib/money'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function GetaoValesPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [funcionariosLoading, setFuncionariosLoading] = useState(true)
  const [funcionariosError, setFuncionariosError] = useState<string | null>(null)
  const [valesError, setValesError] = useState<string | null>(null)
  const ativos = useMemo(() => funcionarios.filter((f) => f.status === 'ativo'), [funcionarios])

  const [filterFuncionarioId, setFilterFuncionarioId] = useState<number | 'all'>('all')
  const [vales, setVales] = useState<Vale[]>([])
  const [loading, setLoading] = useState(true)

  const [novoFuncionarioId, setNovoFuncionarioId] = useState<number | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [novoData, setNovoData] = useState(() => toBrDate(toIsoDate(new Date())))
  const [novoDesc, setNovoDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [savingValeId, setSavingValeId] = useState<number | null>(null)
  const [deletingValeId, setDeletingValeId] = useState<number | null>(null)
  const valesRequestId = useRef(0)

  async function loadFuncionarios() {
    setFuncionariosLoading(true)
    try {
      setFuncionariosError(null)
      const list = await getaoApi.funcionarios.list()
      setFuncionarios(list)
      const activeIds = new Set(list.filter((f) => f.status === 'ativo').map((f) => f.id))
      const firstActive = list.find((f) => f.status === 'ativo')
      setNovoFuncionarioId((current) => current !== null && activeIds.has(current) ? current : firstActive?.id ?? null)
    } catch (e: unknown) {
      setFuncionarios([])
      setFuncionariosError(e instanceof Error ? e.message : 'Erro ao carregar funcionários')
    } finally {
      setFuncionariosLoading(false)
    }
  }

  async function loadVales() {
    const requestId = ++valesRequestId.current
    setLoading(true)
    try {
      const list = await getaoApi.vales.list(filterFuncionarioId === 'all' ? undefined : filterFuncionarioId)
      if (requestId !== valesRequestId.current) return
      setVales(list)
      setValesError(null)
    } catch (e: unknown) {
      if (requestId !== valesRequestId.current) return
      setVales([])
      setValesError(e instanceof Error ? e.message : 'Erro ao carregar vales')
    } finally {
      if (requestId === valesRequestId.current) setLoading(false)
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
    if (!novoFuncionarioId || !ativos.some((f) => f.id === novoFuncionarioId)) {
      toast.error('Cadastre ou selecione um funcionário ativo antes de lançar o vale.')
      return
    }
    if (!novoValor.trim()) {
      toast.error('Informe o valor do vale.')
      return
    }
    const v = parseNonNegativeMoney(novoValor)
    if (v === null) {
      toast.error('Valor inválido')
      return
    }
    const iso = parseBrDate(novoData)
    if (!iso) {
      toast.error('Data inválida (use DD/MM/AAAA)')
      return
    }
    setCreating(true)
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
      toast.success('Vale lançado com sucesso.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar vale')
    } finally {
      setCreating(false)
    }
  }

  async function marcarPago(vale: Vale) {
    setSavingValeId(vale.id)
    try {
      await getaoApi.vales.patch(vale.id, { status: 'pago' })
      await loadVales()
      toast.success('Vale marcado como pago.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar vale')
    } finally {
      setSavingValeId(null)
    }
  }

  async function excluir(vale: Vale) {
    if (!confirm('Excluir este vale?')) return
    setDeletingValeId(vale.id)
    try {
      await getaoApi.vales.delete(vale.id)
      await loadVales()
      toast.success('Vale excluído com sucesso.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir vale')
    } finally {
      setDeletingValeId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de equipe — Vales"
        description="Lançamentos (pendente/pago). Ordenado por data desc. Somente ativos no cadastro."
      />
      <GetaoNav />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            className="grid gap-4 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              void createVale()
            }}
          >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vale-funcionario">Funcionário</Label>
            <Select
              disabled={ativos.length === 0 || funcionariosLoading || creating}
              value={novoFuncionarioId ? String(novoFuncionarioId) : ''}
              onValueChange={(v) => setNovoFuncionarioId(Number(v))}
            >
              <SelectTrigger id="vale-funcionario" className="min-h-11">
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
            <Label htmlFor="vale-valor">Valor (R$)</Label>
            <Input id="vale-valor" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} inputMode="decimal" disabled={creating || funcionariosLoading || ativos.length === 0} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vale-data">Data</Label>
            <Input id="vale-data" value={novoData} onChange={(e) => setNovoData(e.target.value)} placeholder="DD/MM/AAAA" disabled={creating || funcionariosLoading || ativos.length === 0} required />
          </div>

          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="vale-descricao">Descrição</Label>
            <Input id="vale-descricao" maxLength={500} value={novoDesc} onChange={(e) => setNovoDesc(e.target.value)} placeholder="Opcional" disabled={creating || funcionariosLoading || ativos.length === 0} />
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={creating || funcionariosLoading || ativos.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? 'Lançando…' : 'Lançar'}
            </Button>
          </div>
          </form>
        </CardContent>
      </Card>

      {funcionariosError ? (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span role="alert">Não foi possível carregar os funcionários: {funcionariosError}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadFuncionarios()} disabled={funcionariosLoading}>
            {funcionariosLoading ? 'Carregando…' : 'Tentar novamente'}
          </Button>
        </div>
      ) : funcionariosLoading ? (
        <div className="rounded-md border p-3 text-sm text-muted-foreground" role="status">Carregando funcionários…</div>
      ) : ativos.length === 0 ? (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          Não há funcionários ativos para receber vales. Cadastre ou reative alguém na aba Cadastro.
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar</span>
          <Select
            value={filterFuncionarioId === 'all' ? 'all' : String(filterFuncionarioId)}
            onValueChange={(v) => setFilterFuncionarioId(v === 'all' ? 'all' : Number(v))}
          >
            <SelectTrigger className="min-h-11 w-full sm:w-[260px]">
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

      {valesError ? (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span role="alert">Não foi possível carregar os vales: {valesError}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadVales()} disabled={loading}>
            {loading ? 'Carregando…' : 'Tentar novamente'}
          </Button>
        </div>
      ) : null}

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
                      <Button variant="outline" size="sm" onClick={() => void marcarPago(v)} disabled={savingValeId === v.id || deletingValeId === v.id}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {savingValeId === v.id ? 'Salvando…' : 'Marcar pago'}
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" onClick={() => void excluir(v)} disabled={savingValeId === v.id || deletingValeId === v.id} aria-label={`Excluir vale de ${v.funcionario_nome ?? `funcionário ${v.funcionario_id}`}`}>
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
