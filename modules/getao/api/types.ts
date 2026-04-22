export type FuncionarioStatus = 'ativo' | 'inativo'
export type PresencaStatus = 'presente' | 'falta' | 'meio_periodo'
export type ValeStatus = 'pendente' | 'pago'

export type Funcionario = {
  id: number
  nome: string
  valor_diaria: number | null
  funcao: string | null
  status: FuncionarioStatus
}

export type PresencaMap = Record<string, PresencaStatus>

export type Vale = {
  id: number
  funcionario_id: number
  funcionario_nome?: string
  valor: number
  data: string // YYYY-MM-DD
  descricao: string | null
  status: ValeStatus
}

export type FechamentoRow = {
  funcionario_id: number
  nome: string
  funcao: string | null
  diaria: number
  presentes: number
  meio_periodo: number
  faltas: number
  total_diarias: number
  total_vales_pendentes: number
  saldo_estimado: number
}

