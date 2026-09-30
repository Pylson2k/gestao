'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/modules/shared/components/page-header'
import { GetaoNav } from '@/modules/getao/components/getao-nav'
import { getaoApi } from '@/modules/getao/api/client'
import type { FechamentoRow } from '@/modules/getao/api/types'
import { parseBrDate, toBrDate, toIsoDate } from '@/modules/getao/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function csvBOM() {
  return '\uFEFF'
}

function csvText(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 90_000)
}

export function GetaoFechamentoPage() {
  const today = useMemo(() => new Date(), [])
  const [inicioBr, setInicioBr] = useState(() => `01/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`)
  const [fimBr, setFimBr] = useState(() => toBrDate(toIsoDate(today)))
  const [apenasAtivos, setApenasAtivos] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<FechamentoRow[]>([])
  const [periodoGerado, setPeriodoGerado] = useState<{ inicio: string; fim: string } | null>(null)

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total_diarias += r.total_diarias
        acc.vales_pendentes += r.total_vales_pendentes
        acc.saldo += r.saldo_estimado
        return acc
      },
      { total_diarias: 0, vales_pendentes: 0, saldo: 0 }
    )
  }, [rows])

  async function gerar() {
    const inicio = parseBrDate(inicioBr)
    const fim = parseBrDate(fimBr)
    if (!inicio || !fim) {
      toast.error('Datas inválidas (use DD/MM/AAAA)')
      return
    }
    if (inicio > fim) {
      toast.error('A data inicial deve ser anterior ou igual à data final.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getaoApi.fechamento.list(inicio, fim, apenasAtivos)
      setRows(data)
      setPeriodoGerado({ inicio, fim })
      toast.success('Fechamento gerado com sucesso.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao gerar fechamento'
      setRows([])
      setPeriodoGerado(null)
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function exportarCsv() {
    if (!periodoGerado) return
    const inicio = periodoGerado.inicio
    const fim = periodoGerado.fim
    const header =
      'funcionario_id;nome;funcao;diaria;presentes;meio_periodo;faltas;total_diarias;vales_pendentes;saldo_estimado'
    const lines = rows.map((r) =>
      [
        r.funcionario_id,
        csvText(r.nome),
        csvText(r.funcao ?? ''),
        r.diaria,
        r.presentes,
        r.meio_periodo,
        r.faltas,
        r.total_diarias,
        r.total_vales_pendentes,
        r.saldo_estimado,
      ].join(';')
    )
    downloadCsv(`fechamento-${inicio}-a-${fim}.csv`, csvBOM() + [header, ...lines].join('\n'))
    toast.success('CSV exportado com sucesso.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de equipe — Fechamento"
        description="Total de diárias (presente=1, meia=0,5) menos vales pendentes no período."
      />
      <GetaoNav />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            className="grid gap-4 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              void gerar()
            }}
          >
          <div className="space-y-2">
            <Label htmlFor="fechamento-inicio">Início</Label>
            <Input id="fechamento-inicio" value={inicioBr} onChange={(e) => { setInicioBr(e.target.value); setRows([]); setPeriodoGerado(null) }} placeholder="DD/MM/AAAA" required disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechamento-fim">Fim</Label>
            <Input id="fechamento-fim" value={fimBr} onChange={(e) => { setFimBr(e.target.value); setRows([]); setPeriodoGerado(null) }} placeholder="DD/MM/AAAA" required disabled={loading} />
          </div>
          <div className="flex items-end">
            <div className="flex w-full items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Somente ativos</p>
                <p className="text-xs text-muted-foreground">Base de funcionários</p>
              </div>
              <Switch aria-label="Somente funcionários ativos" checked={apenasAtivos} onCheckedChange={(checked) => { setApenasAtivos(checked); setRows([]); setPeriodoGerado(null) }} disabled={loading} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Gerando…' : 'Gerar'}
            </Button>
            <Button type="button" variant="outline" onClick={exportarCsv} disabled={rows.length === 0 || !periodoGerado || loading}>
              CSV
            </Button>
          </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Função</TableHead>
                  <TableHead className="text-right">Diárias (R$)</TableHead>
                  <TableHead className="text-right">Vales pendentes</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {loading ? 'Carregando…' : 'Gere um fechamento para ver os resultados.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((r) => (
                      <TableRow key={r.funcionario_id}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{r.funcao ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.total_diarias)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.total_vales_pendentes)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{money(r.saldo_estimado)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">Totais</TableCell>
                      <TableCell className="hidden md:table-cell" />
                      <TableCell className="text-right font-semibold tabular-nums">{money(totals.total_diarias)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{money(totals.vales_pendentes)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{money(totals.saldo)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
