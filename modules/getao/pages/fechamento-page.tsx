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
  const [rows, setRows] = useState<FechamentoRow[]>([])

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
    setLoading(true)
    try {
      const data = await getaoApi.fechamento.list(inicio, fim, apenasAtivos)
      setRows(data)
      toast.success('Fechamento gerado com sucesso.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar fechamento')
    } finally {
      setLoading(false)
    }
  }

  function exportarCsv() {
    const inicio = parseBrDate(inicioBr) || 'inicio'
    const fim = parseBrDate(fimBr) || 'fim'
    const header =
      'funcionario_id;nome;funcao;diaria;presentes;meio_periodo;faltas;total_diarias;vales_pendentes;saldo_estimado'
    const lines = rows.map((r) =>
      [
        r.funcionario_id,
        r.nome,
        r.funcao ?? '',
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
        <CardContent className="grid gap-4 p-4 sm:grid-cols-4 sm:p-5">
          <div className="space-y-2">
            <Label>Início</Label>
            <Input value={inicioBr} onChange={(e) => setInicioBr(e.target.value)} placeholder="DD/MM/AAAA" />
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <Input value={fimBr} onChange={(e) => setFimBr(e.target.value)} placeholder="DD/MM/AAAA" />
          </div>
          <div className="flex items-end">
            <div className="flex w-full items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Somente ativos</p>
                <p className="text-xs text-muted-foreground">Base de funcionários</p>
              </div>
              <Switch checked={apenasAtivos} onCheckedChange={setApenasAtivos} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button className="w-full" onClick={() => void gerar()} disabled={loading}>
              {loading ? 'Gerando…' : 'Gerar'}
            </Button>
            <Button variant="outline" onClick={exportarCsv} disabled={rows.length === 0}>
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

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
