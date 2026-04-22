import { apiJson } from '@/modules/core/http'
import type { Funcionario, PresencaMap, Vale, FechamentoRow } from './types'

export const getaoApi = {
  funcionarios: {
    list: (q?: string) =>
      apiJson<Funcionario[]>(`/api/funcionarios${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    create: (payload: {
      nome: string
      valor_diaria?: number | null
      funcao?: string | null
      status?: 'ativo' | 'inativo'
    }) => apiJson<Funcionario>('/api/funcionarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    patch: (id: number, payload: Partial<{ nome: string; valor_diaria: number | null; funcao: string | null; status: 'ativo' | 'inativo' }>) =>
      apiJson<Funcionario>(`/api/funcionarios/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    delete: (id: number) => apiJson<{ ok: true }>(`/api/funcionarios/${id}`, { method: 'DELETE' }),
    presencaMes: (id: number, year: number, month: number) =>
      apiJson<PresencaMap>(`/api/funcionarios/${id}/presenca?year=${year}&month=${month}`),
    presencaSet: (id: number, data: string, status: 'presente' | 'falta' | 'meio_periodo') =>
      apiJson(`/api/funcionarios/${id}/presenca/${data}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    presencaDelete: (id: number, data: string) =>
      apiJson(`/api/funcionarios/${id}/presenca/${data}`, { method: 'DELETE' }),
  },
  vales: {
    list: (funcionarioId?: number) =>
      apiJson<Vale[]>(`/api/vales${funcionarioId ? `?funcionario_id=${funcionarioId}` : ''}`),
    create: (payload: { funcionario_id: number; valor: number; data: string; descricao?: string | null }) =>
      apiJson<Vale>('/api/vales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    patch: (id: number, payload: Partial<{ status: 'pendente' | 'pago' }>) =>
      apiJson<Vale>(`/api/vales/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    delete: (id: number) => apiJson<{ ok: true }>(`/api/vales/${id}`, { method: 'DELETE' }),
  },
  fechamento: {
    list: (inicio: string, fim: string, apenasAtivos: boolean) =>
      apiJson<FechamentoRow[]>(
        `/api/fechamento?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}&apenas_ativos=${apenasAtivos ? 'true' : 'false'}`
      ),
  },
  kpis: () => apiJson('/api/dashboard/kpis'),
} as const

