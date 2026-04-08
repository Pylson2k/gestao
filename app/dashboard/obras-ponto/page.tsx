'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { OWNER_SESSION_USER_ID } from '@/lib/owner-user'
import { useEmployees } from '@/contexts/employees-context'
import { assignmentApprovedTotal } from '@/lib/work-totals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

const hdr = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'x-user-id': OWNER_SESSION_USER_ID,
})

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type WorkAssignmentRow = {
  id: string
  title: string
  mode: string
  status: string
  dailyRate: number | null
  contractTotal: number | null
  approvedPercent: number
  employee: { id: string; name: string }
  steps: { id: string; title: string; amount: number; approvedDone: boolean; sortOrder: number }[]
  dayLogs: { status: string; dayUnits: number | null }[]
  submissions: { status: string }[]
}

type DayLogPending = {
  id: string
  workDate: string
  clockInAt: string
  clockOutAt: string
  workerNote: string | null
  assignment: { id: string; title: string; employee: { name: string } }
}

type SubPending = {
  id: string
  kind: string
  proposedPercent: number | null
  workerNote: string | null
  assignment: { id: string; title: string; employee: { name: string } }
  step: { title: string } | null
}

type WorkerAccountRow = { id: string; employeeId: string; loginUsername: string }

export default function ObrasPontoPage() {
  const { employees } = useEmployees()
  const [assignments, setAssignments] = useState<WorkAssignmentRow[]>([])
  const [pending, setPending] = useState<{ dayLogs: DayLogPending[]; submissions: SubPending[] }>({
    dayLogs: [],
    submissions: [],
  })
  const [accounts, setAccounts] = useState<WorkerAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [mode, setMode] = useState('DAILY')
  const [dailyRate, setDailyRate] = useState('')
  const [contractTotal, setContractTotal] = useState('')
  const [stepRows, setStepRows] = useState<{ title: string; amount: string }[]>([
    { title: '', amount: '' },
  ])
  const [saving, setSaving] = useState(false)

  const [acctEmployee, setAcctEmployee] = useState('')
  const [acctLogin, setAcctLogin] = useState('')
  const [acctPass, setAcctPass] = useState('')
  const [acctSaving, setAcctSaving] = useState(false)

  const load = useCallback(async () => {
    setErr('')
    try {
      const [aRes, pRes, wRes] = await Promise.all([
        fetch('/api/work-assignments', { headers: hdr() }),
        fetch('/api/work-approvals/pending', { headers: hdr() }),
        fetch('/api/worker-accounts', { headers: hdr() }),
      ])
      if (!aRes.ok) throw new Error('Falha ao carregar atribuicoes')
      setAssignments(await aRes.json())
      if (pRes.ok) setPending(await pRes.json())
      if (wRes.ok) setAccounts(await wRes.json())
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalsByEmployee = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()
    for (const a of assignments) {
      if (a.status !== 'ACTIVE' && a.status !== 'CLOSED') continue
      const t = assignmentApprovedTotal({
        mode: a.mode,
        dailyRate: a.dailyRate,
        contractTotal: a.contractTotal,
        approvedPercent: a.approvedPercent,
        steps: a.steps,
        dayLogs: a.dayLogs,
      })
      const cur = map.get(a.employee.id) || { name: a.employee.name, total: 0 }
      cur.total += t
      map.set(a.employee.id, cur)
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }))
  }, [assignments])

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const steps =
        mode === 'CONTRACT_STEPS'
          ? stepRows
              .filter((r) => r.title.trim() || Number(r.amount) > 0)
              .map((r, i) => ({
                title: r.title.trim() || `Etapa ${i + 1}`,
                amount: Number(r.amount) || 0,
                sortOrder: i,
              }))
          : []
      const body: Record<string, unknown> = {
        title: title.trim(),
        employeeId,
        mode,
        dailyRate: mode === 'DAILY' ? Number(dailyRate.replace(',', '.')) || null : null,
        contractTotal:
          mode === 'CONTRACT_PERCENT' ? Number(contractTotal.replace(',', '.')) || null : null,
        steps,
      }
      const res = await fetch('/api/work-assignments', {
        method: 'POST',
        headers: hdr(),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Erro ao criar')
        return
      }
      setDialogOpen(false)
      setTitle('')
      setEmployeeId('')
      setDailyRate('')
      setContractTotal('')
      setStepRows([{ title: '', amount: '' }])
      await load()
    } catch {
      setErr('Erro de rede')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/work-assignments/${id}`, {
      method: 'PATCH',
      headers: hdr(),
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data.error || 'Erro ao atualizar')
      return
    }
    await load()
  }

  async function removeDraft(id: string) {
    if (!confirm('Excluir este rascunho?')) return
    const res = await fetch(`/api/work-assignments/${id}`, { method: 'DELETE', headers: hdr() })
    if (!res.ok) {
      const data = await res.json()
      setErr(data.error || 'Erro')
      return
    }
    await load()
  }

  async function approveLog(logId: string, dayUnits: number) {
    const res = await fetch(`/api/work-day-logs/${logId}`, {
      method: 'PATCH',
      headers: hdr(),
      body: JSON.stringify({ action: 'approve', dayUnits }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data.error || 'Erro')
      return
    }
    await load()
  }

  async function rejectLog(logId: string) {
    const reason = prompt('Motivo da recusa?')
    if (!reason?.trim()) return
    const res = await fetch(`/api/work-day-logs/${logId}`, {
      method: 'PATCH',
      headers: hdr(),
      body: JSON.stringify({ action: 'reject', rejectReason: reason.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data.error || 'Erro')
      return
    }
    await load()
  }

  async function approveSub(subId: string) {
    const res = await fetch(`/api/work-contract-submissions/${subId}`, {
      method: 'PATCH',
      headers: hdr(),
      body: JSON.stringify({ action: 'approve' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data.error || 'Erro')
      return
    }
    await load()
  }

  async function rejectSub(subId: string) {
    const reason = prompt('Motivo da recusa?')
    if (!reason?.trim()) return
    const res = await fetch(`/api/work-contract-submissions/${subId}`, {
      method: 'PATCH',
      headers: hdr(),
      body: JSON.stringify({ action: 'reject', rejectReason: reason.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErr(data.error || 'Erro')
      return
    }
    await load()
  }

  async function createWorkerAccount(e: React.FormEvent) {
    e.preventDefault()
    setAcctSaving(true)
    try {
      const res = await fetch('/api/worker-accounts', {
        method: 'POST',
        headers: hdr(),
        body: JSON.stringify({
          employeeId: acctEmployee,
          loginUsername: acctLogin,
          password: acctPass,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Erro')
        return
      }
      setAcctEmployee('')
      setAcctLogin('')
      setAcctPass('')
      await load()
    } catch {
      setErr('Erro de rede')
    } finally {
      setAcctSaving(false)
    }
  }

  const pendingCount = pending.dayLogs.length + pending.submissions.length

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Obras, diárias e empreitas"
        description={
          <>
            Vínculos aprovados pelo gestor. Totais apenas após aprovação. App do trabalhador:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/trabalhador</code>
          </>
        }
      >
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </PageHeader>

      {err ? (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{err}</p>
      ) : null}

      <Tabs defaultValue="assignments" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="assignments">Atribuições</TabsTrigger>
          <TabsTrigger value="pending">
            Aprovações
            {pendingCount > 0 ? (
              <Badge className="ml-2 bg-amber-500">{pendingCount}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="accounts">Contas trabalhador</TabsTrigger>
          <TabsTrigger value="totals">Totais aprovados</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova atribuição
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova atribuição (rascunho)</DialogTitle>
                </DialogHeader>
                <form onSubmit={createAssignment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Funcionário</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter((e) => e.isActive)
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Título da obra / serviço</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Select value={mode} onValueChange={setMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Diária (ponto)</SelectItem>
                        <SelectItem value="CONTRACT_PERCENT">Empreita por %</SelectItem>
                        <SelectItem value="CONTRACT_STEPS">Empreita por etapas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {mode === 'DAILY' && (
                    <div className="space-y-2">
                      <Label>Valor da diária (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dailyRate}
                        onChange={(e) => setDailyRate(e.target.value)}
                      />
                    </div>
                  )}
                  {mode === 'CONTRACT_PERCENT' && (
                    <div className="space-y-2">
                      <Label>Valor total do contrato (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={contractTotal}
                        onChange={(e) => setContractTotal(e.target.value)}
                      />
                    </div>
                  )}
                  {mode === 'CONTRACT_STEPS' && (
                    <div className="space-y-2">
                      <Label>Etapas</Label>
                      {stepRows.map((row, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            placeholder="Nome"
                            value={row.title}
                            onChange={(e) => {
                              const next = [...stepRows]
                              next[i] = { ...next[i], title: e.target.value }
                              setStepRows(next)
                            }}
                          />
                          <Input
                            placeholder="R$"
                            type="number"
                            className="w-28"
                            value={row.amount}
                            onChange={(e) => {
                              const next = [...stepRows]
                              next[i] = { ...next[i], amount: e.target.value }
                              setStepRows(next)
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStepRows([...stepRows, { title: '', amount: '' }])}
                      >
                        + etapa
                      </Button>
                    </div>
                  )}
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? 'Salvando...' : 'Criar rascunho'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhuma atribuição. Crie um rascunho e depois ative quando estiver correto.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignments.map((a) => {
                const approved = assignmentApprovedTotal({
                  mode: a.mode,
                  dailyRate: a.dailyRate,
                  contractTotal: a.contractTotal,
                  approvedPercent: a.approvedPercent,
                  steps: a.steps,
                  dayLogs: a.dayLogs,
                })
                const pend = a.submissions?.length ?? 0
                return (
                  <Card key={a.id}>
                    <CardHeader className="pb-2 flex flex-row flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{a.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {a.employee.name} ·{' '}
                          {a.mode === 'DAILY' && 'Diária'}
                          {a.mode === 'CONTRACT_PERCENT' && 'Empreita %'}
                          {a.mode === 'CONTRACT_STEPS' && 'Etapas'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={a.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {a.status === 'DRAFT' && 'Rascunho'}
                          {a.status === 'ACTIVE' && 'Ativa'}
                          {a.status === 'CLOSED' && 'Encerrada'}
                        </Badge>
                        {pend > 0 ? <Badge variant="outline">Pendentes: {pend}</Badge> : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p>
                        <span className="text-muted-foreground">Total aprovado nesta atribuição:</span>{' '}
                        <strong>{brl(approved)}</strong>
                      </p>
                      {a.mode === 'DAILY' && a.dailyRate != null && (
                        <p className="text-muted-foreground">Diária: {brl(a.dailyRate)}</p>
                      )}
                      {a.mode === 'CONTRACT_PERCENT' && (
                        <p className="text-muted-foreground">
                          Contrato: {a.contractTotal != null ? brl(a.contractTotal) : '—'} · Avanço
                          aprovado: {a.approvedPercent}%
                        </p>
                      )}
                      {a.mode === 'CONTRACT_STEPS' && a.steps.length > 0 && (
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {a.steps.map((s) => (
                            <li key={s.id}>
                              {s.title} — {brl(s.amount)}{' '}
                              {s.approvedDone ? '(paga)' : '(pendente)'}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {a.status === 'DRAFT' && (
                          <>
                            <Button size="sm" onClick={() => setStatus(a.id, 'ACTIVE')}>
                              Ativar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removeDraft(a.id)}>
                              Excluir rascunho
                            </Button>
                          </>
                        )}
                        {a.status === 'ACTIVE' && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(a.id, 'CLOSED')}>
                            Encerrar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Registros de ponto</h3>
            {pending.dayLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pendente.</p>
            ) : (
              <div className="space-y-3">
                {pending.dayLogs.map((l) => (
                  <Card key={l.id}>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <p>
                        <strong>{l.assignment.employee.name}</strong> — {l.assignment.title}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(l.workDate).toLocaleDateString('pt-BR')} ·{' '}
                        {new Date(l.clockInAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        →{' '}
                        {new Date(l.clockOutAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {l.workerNote && <p className="text-xs italic">{l.workerNote}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => approveLog(l.id, 1)}>
                          Aprovar 1 diária
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => approveLog(l.id, 0.5)}>
                          Aprovar ½ diária
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectLog(l.id)}>
                          Recusar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Empreita (% e etapas)</h3>
            {pending.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pendente.</p>
            ) : (
              <div className="space-y-3">
                {pending.submissions.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <p>
                        <strong>{s.assignment.employee.name}</strong> — {s.assignment.title}
                      </p>
                      {s.kind === 'PERCENT' && (
                        <p>
                          Pedido de avanço para <strong>{s.proposedPercent}%</strong>
                        </p>
                      )}
                      {s.kind === 'STEP_DONE' && s.step && (
                        <p>
                          Conclusão de etapa: <strong>{s.step.title}</strong>
                        </p>
                      )}
                      {s.workerNote && <p className="text-xs italic">{s.workerNote}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => approveSub(s.id)}>
                          Aprovar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectSub(s.id)}>
                          Recusar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criar ou conferir acesso ao app do trabalhador</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createWorkerAccount} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Select value={acctEmployee} onValueChange={setAcctEmployee} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter((e) => e.isActive)
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Login único</Label>
                  <Input
                    value={acctLogin}
                    onChange={(e) => setAcctLogin(e.target.value)}
                    placeholder="ex: joao.silva"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha inicial</Label>
                  <Input
                    type="password"
                    value={acctPass}
                    onChange={(e) => setAcctPass(e.target.value)}
                    required
                    minLength={4}
                  />
                </div>
                <Button type="submit" disabled={acctSaving}>
                  {acctSaving ? 'Salvando...' : 'Criar conta'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas existentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {accounts.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma conta ainda.</p>
              ) : (
                accounts.map((w) => {
                  const emp = employees.find((e) => e.id === w.employeeId)
                  return (
                    <div
                      key={w.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2"
                    >
                      <div>
                        <strong>{emp?.name ?? w.employeeId}</strong>
                        <p className="text-muted-foreground">Login: {w.loginUsername}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const np = prompt('Nova senha (min. 4 caracteres)?')
                          if (!np || np.length < 4) return
                          const res = await fetch(`/api/worker-accounts/${w.employeeId}`, {
                            method: 'PATCH',
                            headers: hdr(),
                            body: JSON.stringify({ password: np }),
                          })
                          const data = await res.json()
                          if (!res.ok) alert(data.error || 'Erro')
                          else await load()
                        }}
                      >
                        Redefinir senha
                      </Button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="totals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Soma aprovada por funcionário</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Inclui apenas vínculos ativos ou encerrados, com valores já aprovados (diárias,
                percentual ou etapas).
              </p>
            </CardHeader>
            <CardContent>
              {totalsByEmployee.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada aprovado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {totalsByEmployee.map((row) => (
                    <li key={row.id} className="flex justify-between border-b pb-2">
                      <span>{row.name}</span>
                      <strong>{brl(row.total)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
