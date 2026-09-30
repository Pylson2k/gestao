'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/modules/shared/components/page-header'
import { GetaoNav } from '@/modules/getao/components/getao-nav'
import { getaoApi } from '@/modules/getao/api/client'
import type { Funcionario, PresencaMap, PresencaStatus } from '@/modules/getao/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toIsoDate } from '@/modules/getao/lib/date'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

// Monday-first offset (0..6)
function mondayOffset(d: Date) {
  const js = d.getDay() // 0 Sunday .. 6 Saturday
  return (js + 6) % 7
}

const statusLabel: Record<PresencaStatus, string> = {
  presente: 'Diária',
  meio_periodo: 'Meia',
  falta: 'Falta',
}

function statusClass(s: PresencaStatus) {
  switch (s) {
    case 'presente':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
    case 'meio_periodo':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
    case 'falta':
      return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
  }
}

export function GetaoPresencaPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [funcionarioId, setFuncionarioId] = useState<number | null>(null)
  const [mes, setMes] = useState<Date>(() => startOfMonth(new Date()))
  const [map, setMap] = useState<PresencaMap>({})
  const [funcionariosLoading, setFuncionariosLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [funcionariosError, setFuncionariosError] = useState<string | null>(null)
  const [presencaError, setPresencaError] = useState<string | null>(null)
  const [actionDay, setActionDay] = useState<string | null>(null)
  const [savingAction, setSavingAction] = useState(false)

  const ativos = useMemo(() => funcionarios.filter((f) => f.status === 'ativo'), [funcionarios])

  async function loadFuncionarios() {
    setFuncionariosLoading(true)
    try {
      setFuncionariosError(null)
      const list = await getaoApi.funcionarios.list()
      setFuncionarios(list)
      const activeIds = new Set(list.filter((f) => f.status === 'ativo').map((f) => f.id))
      const firstActive = list.find((f) => f.status === 'ativo')
      setFuncionarioId((current) => current !== null && activeIds.has(current) ? current : firstActive?.id ?? null)
    } catch (e: unknown) {
      setFuncionarios([])
      setFuncionarioId(null)
      setFuncionariosError(e instanceof Error ? e.message : 'Erro ao carregar funcionários')
    } finally {
      setFuncionariosLoading(false)
    }
  }

  useEffect(() => {
    void loadFuncionarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let currentRequest = true
    if (!funcionarioId) {
      setMap({})
      setLoading(false)
      return () => {
        currentRequest = false
      }
    }

    setLoading(true)
    setPresencaError(null)
    void getaoApi.funcionarios
      .presencaMes(funcionarioId, mes.getFullYear(), mes.getMonth() + 1)
      .then((result) => {
        if (currentRequest) setMap(result)
      })
      .catch((e: unknown) => {
        if (!currentRequest) return
        setMap({})
        setPresencaError(e instanceof Error ? e.message : 'Erro ao carregar presença')
      })
      .finally(() => {
        if (currentRequest) setLoading(false)
      })

    return () => {
      currentRequest = false
    }
  }, [funcionarioId, mes])

  const grid = useMemo(() => {
    const first = startOfMonth(mes)
    const offset = mondayOffset(first)
    const total = daysInMonth(mes)
    const cells: Array<{ iso: string | null; day: number | null }> = []
    for (let i = 0; i < offset; i++) cells.push({ iso: null, day: null })
    for (let d = 1; d <= total; d++) {
      const dt = new Date(mes.getFullYear(), mes.getMonth(), d)
      cells.push({ iso: toIsoDate(dt), day: d })
    }
    return cells
  }, [mes])

  const selectedName = useMemo(
    () => (funcionarioId ? funcionarios.find((f) => f.id === funcionarioId)?.nome : ''),
    [funcionarios, funcionarioId]
  )

  async function setStatus(iso: string, status: PresencaStatus): Promise<boolean> {
    if (!funcionarioId || savingAction) return false
    setSavingAction(true)
    try {
      setPresencaError(null)
      await getaoApi.funcionarios.presencaSet(funcionarioId, iso, status)
      setMap((prev) => ({ ...prev, [iso]: status }))
      toast.success('Presença atualizada.')
      return true
    } catch (e: unknown) {
      setPresencaError(e instanceof Error ? e.message : 'Erro ao salvar presença')
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar presença')
      return false
    } finally {
      setSavingAction(false)
    }
  }

  async function removeStatus(iso: string): Promise<boolean> {
    if (!funcionarioId || savingAction) return false
    setSavingAction(true)
    try {
      setPresencaError(null)
      await getaoApi.funcionarios.presencaDelete(funcionarioId, iso)
      setMap((prev) => {
        const next = { ...prev }
        delete next[iso]
        return next
      })
      toast.success('Registro removido.')
      return true
    } catch (e: unknown) {
      setPresencaError(e instanceof Error ? e.message : 'Erro ao remover presença')
      toast.error(e instanceof Error ? e.message : 'Erro ao remover presença')
      return false
    } finally {
      setSavingAction(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de equipe — Presença"
        description="Selecione um funcionário ativo e marque o dia como diária, meia ou falta. Remover apaga o registro."
      />
      <GetaoNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-[320px]">
            <Select
              value={funcionarioId ? String(funcionarioId) : ''}
              onValueChange={(v) => setFuncionarioId(Number(v))}
            >
              <SelectTrigger className="min-h-11" disabled={ativos.length === 0} aria-label="Funcionário">
                <SelectValue placeholder="Selecione o funcionário" />
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

          <input
            aria-label="Mês da presença"
            type="month"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
            value={`${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (!y || !m) return
              setMes(new Date(y, m - 1, 1))
            }}
          />
        </div>
        <div className="text-sm text-muted-foreground">{selectedName ? selectedName : '—'}</div>
      </div>

      {funcionariosError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col gap-3 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <span role="alert">Não foi possível carregar os funcionários: {funcionariosError}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadFuncionarios()} disabled={funcionariosLoading}>
              {funcionariosLoading ? 'Carregando…' : 'Tentar novamente'}
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {presencaError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col gap-3 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <span role="alert">Não foi possível carregar ou salvar a presença: {presencaError}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setMes((current) => new Date(current))}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4 sm:p-5">
          {loading || funcionariosLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : !funcionarioId ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum funcionário ativo disponível.</div>
          ) : (
            <>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda da presença">
              <span><strong className="font-semibold text-emerald-700">D</strong> Diária</span>
              <span><strong className="font-semibold text-amber-700">½</strong> Meia diária</span>
              <span><strong className="font-semibold text-rose-700">F</strong> Falta</span>
            </div>
            <div role="region" tabIndex={0} aria-label="Calendário de presença. Em telas pequenas, role horizontalmente para ver os dias." className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="grid min-w-[332px] grid-cols-7 gap-1 sm:min-w-0 sm:gap-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="px-1 pb-1 text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {grid.map((c, idx) => {
                if (!c.iso || !c.day) {
                  return <div key={idx} className="h-11 min-w-11 rounded-md border border-dashed border-border/70 sm:h-14" />
                }
                const s = map[c.iso]
                return (
                  <button
                    key={c.iso}
                    type="button"
                    className={cn(
                      'h-11 min-w-11 rounded-md border px-1 text-left transition-colors sm:h-14 sm:px-2',
                      'hover:bg-muted/30',
                      s ? statusClass(s) : 'border-border/70 bg-background'
                    )}
                    onClick={() => setActionDay(c.iso)}
                    aria-label={`Dia ${c.day}, ${c.iso}${s ? `, ${statusLabel[s]}` : ', sem registro'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums">{c.day}</span>
                      {s ? (
                        <span className="rounded border border-current/10 px-1.5 py-0.5 text-[10px] font-semibold">
                          <span className="sm:hidden" aria-hidden="true">{s === 'presente' ? 'D' : s === 'meio_periodo' ? '½' : 'F'}</span>
                          <span className="hidden sm:inline">{statusLabel[s]}</span>
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
            </div>
            </>
          )}
          {ativos.length === 0 && !loading && !funcionariosLoading ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Cadastre ou reative um funcionário na aba Cadastro para registrar presença.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!actionDay} onOpenChange={(v) => (!v ? setActionDay(null) : null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar presença</DialogTitle>
            <DialogDescription>{actionDay ?? ''}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              type="button"
              disabled={savingAction}
              onClick={() => actionDay && void setStatus(actionDay, 'presente').then((saved) => saved && setActionDay(null))}
            >
              {savingAction ? 'Salvando…' : 'Diária inteira'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={savingAction}
              onClick={() =>
                actionDay && void setStatus(actionDay, 'meio_periodo').then((saved) => saved && setActionDay(null))
              }
            >
              Meia diária
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={savingAction}
              onClick={() => actionDay && void setStatus(actionDay, 'falta').then((saved) => saved && setActionDay(null))}
            >
              Falta
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={savingAction}
              onClick={() => actionDay && void removeStatus(actionDay).then((removed) => removed && setActionDay(null))}
            >
              Remover registro
            </Button>
            <Button type="button" variant="ghost" onClick={() => setActionDay(null)} disabled={savingAction}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
