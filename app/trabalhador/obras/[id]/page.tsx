'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/components/app-link'
import { useWorkerAuth } from '@/contexts/worker-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Step = {
  id: string
  title: string
  amount: number
  approvedDone: boolean
  sortOrder: number
}

type Assignment = {
  id: string
  title: string
  mode: string
  dailyRate: number | null
  contractTotal: number | null
  approvedPercent: number
  steps: Step[]
}

type DayLog = {
  id: string
  workDate: string
  status: string
  clockInAt: string
  clockOutAt: string
  dayUnits: number | null
  rejectReason: string | null
}

type Submission = {
  id: string
  kind: string
  status: string
  proposedPercent: number | null
  stepId: string | null
  rejectReason: string | null
  createdAt: string
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TrabalhadorObraPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const router = useRouter()
  const { isAuthenticated, isLoading, logout, authHeaders } = useWorkerAuth()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [dayLogs, setDayLogs] = useState<DayLog[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [err, setErr] = useState('')

  const [workDate, setWorkDate] = useState(todayISO)
  const [clockIn, setClockIn] = useState(() => toDatetimeLocal(new Date()))
  const [clockOut, setClockOut] = useState(() => toDatetimeLocal(new Date()))
  const [dayNote, setDayNote] = useState('')
  const [savingDay, setSavingDay] = useState(false)

  const [proposedPct, setProposedPct] = useState('')
  const [pctNote, setPctNote] = useState('')
  const [savingPct, setSavingPct] = useState(false)

  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      const [aRes, lRes, sRes] = await Promise.all([
        fetch(`/api/worker/assignments/${id}`, { headers: authHeaders() }),
        fetch(`/api/worker/day-logs?assignmentId=${encodeURIComponent(id)}`, { headers: authHeaders() }),
        fetch(`/api/worker/submissions?assignmentId=${encodeURIComponent(id)}`, { headers: authHeaders() }),
      ])
      if (aRes.status === 401) {
        logout()
        router.replace('/trabalhador/login')
        return
      }
      if (!aRes.ok) {
        setErr('Obra nao encontrada ou inativa')
        setAssignment(null)
        return
      }
      setAssignment(await aRes.json())
      setErr('')
      if (lRes.ok) setDayLogs(await lRes.json())
      if (sRes.ok) setSubmissions(await sRes.json())
    } catch {
      setErr('Erro ao carregar')
    }
  }, [authHeaders, id, logout, router])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/trabalhador/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && id) loadAll()
  }, [isAuthenticated, id, loadAll])

  async function submitDayLog(e: React.FormEvent) {
    e.preventDefault()
    setSavingDay(true)
    setErr('')
    try {
      const res = await fetch('/api/worker/day-logs', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          assignmentId: id,
          workDate,
          clockInAt: new Date(clockIn).toISOString(),
          clockOutAt: new Date(clockOut).toISOString(),
          workerNote: dayNote || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Erro ao enviar')
        return
      }
      setDayNote('')
      await loadAll()
    } catch {
      setErr('Erro de rede')
    } finally {
      setSavingDay(false)
    }
  }

  async function submitPercent(e: React.FormEvent) {
    e.preventDefault()
    const p = Number(proposedPct.replace(',', '.'))
    setSavingPct(true)
    setErr('')
    try {
      const res = await fetch('/api/worker/submissions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          assignmentId: id,
          kind: 'PERCENT',
          proposedPercent: p,
          workerNote: pctNote || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Erro ao enviar')
        return
      }
      setProposedPct('')
      setPctNote('')
      await loadAll()
    } catch {
      setErr('Erro de rede')
    } finally {
      setSavingPct(false)
    }
  }

  async function submitStep(stepId: string) {
    setErr('')
    try {
      const res = await fetch('/api/worker/submissions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ assignmentId: id, kind: 'STEP_DONE', stepId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Erro ao enviar')
        return
      }
      await loadAll()
    } catch {
      setErr('Erro de rede')
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Carregando...</div>
    )
  }

  if (!assignment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 space-y-4">
        <Link href="/trabalhador" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <p className="text-foreground">{err || 'Carregando...'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6 pb-24">
      <div>
        <Link href="/trabalhador" className="text-sm text-primary inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" />
          Todas as obras
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Valores pagos só após aprovação do gestor.
        </p>
      </div>

      {err ? <p className="text-sm text-amber-800 dark:text-amber-500">{err}</p> : null}

      {assignment.mode === 'DAILY' && (
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Registrar ponto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitDayLog} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-foreground">Data do trabalho</Label>
                <Input
                  type="date"
                  className="bg-background"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Entrada</Label>
                <Input
                  type="datetime-local"
                  className="bg-background"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Saída</Label>
                <Input
                  type="datetime-local"
                  className="bg-background"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Observação (opcional)</Label>
                <Textarea
                  className="bg-background min-h-[72px]"
                  value={dayNote}
                  onChange={(e) => setDayNote(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full min-h-11" disabled={savingDay}>
                {savingDay ? 'Enviando...' : 'Enviar para aprovação'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {assignment.mode === 'CONTRACT_PERCENT' && (
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Avanço da obra (%)</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Aprovado hoje: {assignment.approvedPercent}% — proponha o novo percentual total executado.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPercent} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-foreground">Novo percentual (0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  className="bg-background"
                  value={proposedPct}
                  onChange={(e) => setProposedPct(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Observação</Label>
                <Textarea
                  className="bg-background min-h-[64px]"
                  value={pctNote}
                  onChange={(e) => setPctNote(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full min-h-11" disabled={savingPct}>
                {savingPct ? 'Enviando...' : 'Pedir aprovação do avanço'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {assignment.mode === 'CONTRACT_STEPS' && (
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Etapas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignment.steps.map((st) => (
              <div
                key={st.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-muted/50"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-foreground font-medium">{st.title}</span>
                  {st.approvedDone ? (
                    <Badge className="border-0 bg-emerald-600 text-white hover:bg-emerald-600">Pago / ok</Badge>
                  ) : (
                    <Badge variant="outline" className="border-border text-foreground">
                      Pendente
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor da etapa:{' '}
                  {st.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                {!st.approvedDone && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => submitStep(st.id)}
                  >
                    Marcar etapa concluída (enviar para aprovação)
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(assignment.mode === 'DAILY' || assignment.mode === 'CONTRACT_PERCENT') && (
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Meus envios recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {assignment.mode === 'DAILY' &&
              dayLogs.slice(0, 12).map((l) => (
                <div key={l.id} className="border-b border-border pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="text-foreground">
                      {new Date(l.workDate).toLocaleDateString('pt-BR')}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        l.status === 'APPROVED'
                          ? 'border-emerald-600 text-emerald-400'
                          : l.status === 'REJECTED'
                            ? 'border-red-600 text-red-400'
                            : 'border-amber-600 text-amber-400'
                      }
                    >
                      {l.status === 'APPROVED'
                        ? `Aprovado (${l.dayUnits} d.)`
                        : l.status === 'REJECTED'
                          ? 'Recusado'
                          : 'Pendente'}
                    </Badge>
                  </div>
                  {l.status === 'REJECTED' && l.rejectReason && (
                    <p className="text-xs text-red-400 mt-1">{l.rejectReason}</p>
                  )}
                </div>
              ))}
            {assignment.mode === 'CONTRACT_PERCENT' &&
              submissions
                .filter((s) => s.kind === 'PERCENT')
                .slice(0, 12)
                .map((s) => (
                  <div key={s.id} className="border-b border-border pb-2 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-foreground">
                        {s.proposedPercent != null ? `${s.proposedPercent}%` : '—'}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          s.status === 'APPROVED'
                            ? 'border-emerald-600 text-emerald-400'
                            : s.status === 'REJECTED'
                              ? 'border-red-600 text-red-400'
                              : 'border-amber-600 text-amber-400'
                        }
                      >
                        {s.status}
                      </Badge>
                    </div>
                    {s.status === 'REJECTED' && s.rejectReason && (
                      <p className="text-xs text-red-400 mt-1">{s.rejectReason}</p>
                    )}
                  </div>
                ))}
          </CardContent>
        </Card>
      )}

      {assignment.mode === 'CONTRACT_STEPS' && submissions.filter((s) => s.kind === 'STEP_DONE').length > 0 && (
        <Card className="border-border/80 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Pedidos de etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {submissions
              .filter((s) => s.kind === 'STEP_DONE')
              .slice(0, 15)
              .map((s) => (
                <div key={s.id} className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString('pt-BR')}
                  </span>
                  <Badge variant="outline" className="border-border">
                    {s.status}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
