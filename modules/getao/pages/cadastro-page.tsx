'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/modules/shared/components/page-header'
import { GetaoNav } from '@/modules/getao/components/getao-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getaoApi } from '@/modules/getao/api/client'
import type { Funcionario } from '@/modules/getao/api/types'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type FormState = {
  nome: string
  valor_diaria: string
  funcao: string
  ativo: boolean
}

function emptyForm(): FormState {
  return { nome: '', valor_diaria: '', funcao: '', ativo: true }
}

export function GetaoCadastroPage() {
  const [list, setList] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Funcionario | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter((f) => f.nome.toLowerCase().includes(s))
  }, [list, q])

  async function refresh() {
    setLoading(true)
    try {
      setError(null)
      const data = await getaoApi.funcionarios.list()
      setList(data)
    } catch (e: unknown) {
      setList([])
      setError(e instanceof Error ? e.message : 'Erro ao carregar cadastro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(f: Funcionario) {
    setEditing(f)
    setForm({
      nome: f.nome,
      valor_diaria: f.valor_diaria === null ? '' : String(f.valor_diaria),
      funcao: f.funcao ?? '',
      ativo: f.status === 'ativo',
    })
    setOpen(true)
  }

  async function onSubmit() {
    const nome = form.nome.trim()
    if (!nome) {
      toast.error('Informe o nome')
      return
    }

    const valorRaw = form.valor_diaria.trim()
    const valor =
      valorRaw === ''
        ? null
        : Number(String(valorRaw).replace(',', '.'))

    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
      toast.error('Diária inválida')
      return
    }

    const payload = {
      nome,
      valor_diaria: valor,
      funcao: form.funcao.trim() || null,
      status: form.ativo ? ('ativo' as const) : ('inativo' as const),
    }

    try {
      if (editing) {
        await getaoApi.funcionarios.patch(editing.id, payload)
      } else {
        await getaoApi.funcionarios.create(payload)
      }
      setOpen(false)
      await refresh()
      toast.success(editing ? 'Funcionário atualizado com sucesso.' : 'Funcionário cadastrado com sucesso.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }

  async function onDelete(f: Funcionario) {
    if (!confirm(`Excluir ${f.nome}? Isso removerá também presenças e vales (cascade).`)) return
    try {
      await getaoApi.funcionarios.delete(f.id)
      await refresh()
      toast.success('Funcionário excluído com sucesso.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de equipe — Cadastro"
        description="Funcionários, diária, função e status. Apenas ativos aparecem em Presença e Vales."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar funcionário' : 'Novo funcionário'}</DialogTitle>
                <DialogDescription>Nome e diária são os campos mais importantes.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Diária (R$)</Label>
                    <Input
                      value={form.valor_diaria}
                      onChange={(e) => setForm({ ...form, valor_diaria: e.target.value })}
                      placeholder="Ex.: 150"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <Input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Ativo</p>
                    <p className="text-xs text-muted-foreground">Inativos não aparecem em Presença e Vales.</p>
                  </div>
                  <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={onSubmit}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <GetaoNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="max-w-md"
          placeholder="Buscar por nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">{filtered.length} resultado(s)</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum funcionário.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Função</TableHead>
                  <TableHead className="hidden sm:table-cell">Diária</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{f.funcao ?? '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell tabular-nums">{f.valor_diaria === null ? '—' : money(f.valor_diaria)}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === 'ativo' ? 'default' : 'secondary'} className="font-normal">
                        {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(f)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void onDelete(f)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
